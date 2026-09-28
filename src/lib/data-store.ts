import {
  UploadSection,
  Submission,
  DashboardStats,
  SectionFinancialSummary,
  CreateSectionInput,
  FileStatus,
  XeroxStatus,
  PaymentStatus,
} from '@/types';
import { supabase, isSupabaseConfigured } from './supabase/client';
import { calculatePrintAmount } from './utils';

// Initial pre-configured seed data matching user prompt requirements: only Java Project Report
const INITIAL_SECTIONS: UploadSection[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    title: 'Java Project Report',
    slug: 'java-project-report',
    description: 'Upload your completed Java project report including source code documentation and test screenshots.',
    deadline: '2026-09-30T23:59:59Z',
    xerox_rate: 1.5,
    extra_charge: 40,
    allowed_file_types: ['pdf'],
    max_file_size: 10,
    status: 'open',
    public_submission_list: true,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
];

const INITIAL_SUBMISSIONS: Submission[] = [];

const SECTIONS_STORAGE_KEY = 'printtrack_sections_v3';
const SUBMISSIONS_STORAGE_KEY = 'printtrack_submissions_v3';
const SECTIONS_UPDATED_KEY = 'printtrack_sections_updated_at';

// In-memory cache for server-side execution
let memorySections = [...INITIAL_SECTIONS];
let memorySubmissions = [...INITIAL_SUBMISSIONS];

function notifySectionsUpdated() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('printtrack_sections_updated'));
  localStorage.setItem(SECTIONS_UPDATED_KEY, new Date().toISOString());
}

function notifySubmissionsUpdated() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('printtrack_submissions_updated'));
  localStorage.setItem('printtrack_submissions_updated_at', new Date().toISOString());
}

function getStoredSections(): UploadSection[] {
  if (typeof window === 'undefined') {
    return memorySections;
  }
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(INITIAL_SECTIONS));
      return INITIAL_SECTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Storage error', e);
    return memorySections;
  }
}

function saveStoredSections(sections: UploadSection[]) {
  memorySections = sections;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
      notifySectionsUpdated();
    } catch (e) {
      console.error('Storage write error', e);
    }
  }
}

function getStoredSubmissions(): Submission[] {
  if (typeof window === 'undefined') {
    return memorySubmissions;
  }
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
      return INITIAL_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Storage error', e);
    return memorySubmissions;
  }
}

function saveStoredSubmissions(submissions: Submission[]) {
  memorySubmissions = submissions;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
      window.dispatchEvent(new Event('printtrack_submissions_updated'));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }
}

// ========================================================
// REPOSITORIES
// ========================================================

export const DataStore = {
  // 1. UPLOAD SECTIONS
  async getSections(): Promise<UploadSection[]> {
    // 1. Try server API route (bypasses browser JWT expiry & RLS)
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch('/api/sections', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            saveStoredSections(json.data);
            return json.data;
          }
        }
      }
    } catch (e) {
      console.warn('API getSections fetch failed, trying direct Supabase', e);
    }

    // 2. Direct Supabase Client fallback
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('upload_sections')
          .select('*, submissions(count)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = data.map((sec: any) => ({
            ...sec,
            submissions_count: sec.submissions?.[0]?.count ?? 0,
          }));
          saveStoredSections(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase query failed, using local store', err);
      }
    }

    const sections = getStoredSections();
    const submissions = getStoredSubmissions();

    return sections.map((sec) => ({
      ...sec,
      submissions_count: submissions.filter((s) => s.upload_section_id === sec.id).length,
    }));
  },

  async getSectionBySlug(slug: string): Promise<UploadSection | null> {
    const sections = await this.getSections();
    const found = sections.find((s) => s.slug === slug);
    if (found) return found;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('upload_sections')
          .select('*, submissions(count)')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          return {
            ...data,
            submissions_count: data.submissions?.[0]?.count ?? 0,
          };
        }
      } catch (err) {
        console.warn('Supabase getSectionBySlug fallback', err);
      }
    }

    return null;
  },

  async getSectionById(id: string): Promise<UploadSection | null> {
    const sections = await this.getSections();
    const found = sections.find((s) => s.id === id);
    if (found) return found;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('upload_sections')
          .select('*, submissions(count)')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            ...data,
            submissions_count: data.submissions?.[0]?.count ?? 0,
          };
        }
      } catch (err) {
        console.warn('Supabase getSectionById fallback', err);
      }
    }

    return null;
  },

  async createSection(input: CreateSectionInput): Promise<UploadSection> {
    // 1. Try server API route
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const current = getStoredSections();
          saveStoredSections([json.data, ...current.filter((s) => s.id !== json.data.id)]);
          notifySectionsUpdated();
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API createSection error, fallback to direct supabase:', apiErr);
    }

    const newSection: UploadSection = {
      ...input,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sec-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submissions_count: 0,
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('upload_sections')
        .insert([newSection])
        .select()
        .single();

      if (error) {
        throw new Error(`Unable to create upload section: ${error.message}`);
      }

      notifySectionsUpdated();
      return { ...data, submissions_count: 0 };
    }

    const sections = getStoredSections();
    sections.unshift(newSection);
    saveStoredSections(sections);
    return newSection;
  },

  async updateSection(id: string, updates: Partial<UploadSection>): Promise<UploadSection | null> {
    // 1. Try server API route
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const sections = getStoredSections();
          const idx = sections.findIndex((s) => s.id === id);
          if (idx !== -1) {
            sections[idx] = { ...sections[idx], ...json.data };
          }
          saveStoredSections(sections);
          notifySectionsUpdated();
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('API updateSection error, fallback to direct supabase:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('upload_sections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Unable to save upload section: ${error.message}`);
      }

      if ('xerox_rate' in updates || 'extra_charge' in updates) {
        const { data: sectionSubmissions } = await supabase
          .from('submissions')
          .select('id, page_count')
          .eq('upload_section_id', id);

        const pricePerPage = Number(data.xerox_rate) || 0;
        const extraCharge = Number(data.extra_charge) || 0;
        for (const submission of sectionSubmissions || []) {
          await supabase
            .from('submissions')
            .update({
              amount: calculatePrintAmount(
                Number(submission.page_count) || 1,
                pricePerPage,
                extraCharge
              ),
              updated_at: new Date().toISOString(),
            })
            .eq('id', submission.id);
        }
      }

      notifySectionsUpdated();
      return data;
    }

    const sections = getStoredSections();
    const index = sections.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated = {
      ...sections[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    sections[index] = updated;
    saveStoredSections(sections);
    notifySectionsUpdated();
    return updated;
  },

  async deleteSection(id: string): Promise<boolean> {
    // 1. Try server API route
    try {
      const res = await fetch(`/api/sections?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const sections = getStoredSections().filter((s) => s.id !== id);
        saveStoredSections(sections);
        const submissions = getStoredSubmissions().filter((s) => s.upload_section_id !== id);
        saveStoredSubmissions(submissions);
        notifySectionsUpdated();
        notifySubmissionsUpdated();
        return true;
      }
    } catch (apiErr) {
      console.warn('API deleteSection error, fallback to direct supabase:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('upload_sections').delete().eq('id', id);
        if (!error) {
          const sections = getStoredSections().filter((s) => s.id !== id);
          saveStoredSections(sections);
          const submissions = getStoredSubmissions().filter((s) => s.upload_section_id !== id);
          saveStoredSubmissions(submissions);
          notifySectionsUpdated();
          notifySubmissionsUpdated();
          return true;
        }
      } catch (err) {
        console.warn('Supabase deleteSection fallback', err);
      }
    }

    const sections = getStoredSections().filter((s) => s.id !== id);
    saveStoredSections(sections);
    const submissions = getStoredSubmissions().filter((s) => s.upload_section_id !== id);
    saveStoredSubmissions(submissions);
    notifySectionsUpdated();
    notifySubmissionsUpdated();
    return true;
  },

  // 2. SUBMISSIONS
  async getSubmissions(sectionId?: string): Promise<Submission[]> {
    // 1. Try server API route
    try {
      if (typeof window !== 'undefined') {
        const url = `/api/submissions${sectionId ? `?section_id=${encodeURIComponent(sectionId)}` : ''}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            if (!sectionId) {
              saveStoredSubmissions(json.data);
            }
            return json.data;
          }
        }
      }
    } catch (apiErr) {
      console.warn('API getSubmissions fetch failed, trying direct Supabase', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('submissions')
          .select('*, upload_section:upload_sections(*)')
          .order('uploaded_at', { ascending: false });

        if (sectionId) {
          query = query.eq('upload_section_id', sectionId);
        }

        const { data, error } = await query;
        if (!error && data) {
          if (!sectionId) {
            saveStoredSubmissions(data);
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase getSubmissions fallback', err);
      }
    }

    const submissions = getStoredSubmissions();
    const sections = getStoredSections();

    const populated = submissions.map((sub) => ({
      ...sub,
      upload_section: sections.find((sec) => sec.id === sub.upload_section_id),
    }));

    if (sectionId) {
      return populated.filter((s) => s.upload_section_id === sectionId);
    }
    return populated;
  },

  async getSubmissionByRollNumber(sectionId: string, rollNumber: string): Promise<Submission | null> {
    const cleanRoll = rollNumber.trim().toUpperCase();
    const list = await this.getSubmissions(sectionId);
    return list.find((s) => s.roll_number.toUpperCase() === cleanRoll) || null;
  },

  async createOrReplaceSubmission(params: {
    upload_section_id: string;
    name: string;
    roll_number: string;
    department?: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    pageCount: number;
    file: File;
    replaceExisting?: boolean;
    payment_status?: PaymentStatus;
    payment_method?: string;
  }): Promise<{ submission: Submission; replaced: boolean }> {
    const cleanRoll = params.roll_number.trim().toUpperCase();
    const cleanName = params.name.trim().toUpperCase();
    const cleanDept = (params.department || '').trim().toUpperCase();

    const existing = await this.getSubmissionByRollNumber(params.upload_section_id, cleanRoll);

    if (existing && !params.replaceExisting) {
      throw new Error('DUPLICATE_SUBMISSION');
    }

    const section = await this.getSectionById(params.upload_section_id);
    const sectionSlug = section?.slug || 'section';
    const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${sectionSlug}/${cleanRoll}/${Date.now()}-${safeFileName}`;
    const amount = calculatePrintAmount(
      params.pageCount,
      Number(section?.xerox_rate ?? 1.5),
      Number(section?.extra_charge ?? 40)
    );

    let fileUrl = URL.createObjectURL(params.file);
    if (isSupabaseConfigured() && supabase) {
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, params.file, { contentType: params.mimeType, upsert: false });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      fileUrl = '';
    }

    if (existing && params.replaceExisting) {
      // Update existing record
      const updated: Submission = {
        ...existing,
        name: cleanName,
        department: cleanDept || existing.department,
        file_name: params.fileName,
        file_path: filePath,
        file_url: fileUrl,
        file_size: params.fileSize,
        mime_type: params.mimeType,
        page_count: params.pageCount,
        amount,
        uploaded_at: new Date().toISOString(),
        submission_status: 'Uploaded', // Reset verification on replacement as requested
        // Preserve payment/Xerox status unless altered by admin
        xerox_status: existing.xerox_status,
        payment_status: params.payment_status || existing.payment_status,
      };

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('submissions')
          .update(updated)
          .eq('id', existing.id);
        if (error) throw new Error(`Unable to replace submission: ${error.message}`);
        return { submission: updated, replaced: true };
      }

      const all = getStoredSubmissions();
      const idx = all.findIndex((s) => s.id === existing.id);
      if (idx !== -1) {
        all[idx] = updated;
        saveStoredSubmissions(all);
      }
      return { submission: updated, replaced: true };
    }

    // New submission
    const newSub: Submission = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sub-' + Date.now(),
      upload_section_id: params.upload_section_id,
      name: cleanName,
      roll_number: cleanRoll,
      department: cleanDept,
      file_name: params.fileName,
      file_path: filePath,
      file_url: fileUrl,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      page_count: params.pageCount,
      amount,
      submission_status: 'Uploaded',
      xerox_status: 'Pending',
      payment_status: params.payment_status || 'Pending',
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('submissions').insert([newSub]);
      if (error) throw new Error(`Unable to save submission: ${error.message}`);
      return { submission: newSub, replaced: false };
    }

    const all = getStoredSubmissions();
    all.unshift(newSub);
    saveStoredSubmissions(all);
    return { submission: newSub, replaced: false };
  },

  async updateSubmissionStatus(
    id: string,
    updates: {
      submission_status?: FileStatus;
      xerox_status?: XeroxStatus;
      payment_status?: PaymentStatus;
    }
  ): Promise<Submission | null> {
    try {
      const res = await fetch('/api/submissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });
      if (res.ok) {
        const result = await res.json();
        const all = getStoredSubmissions();
        const idx = all.findIndex((s) => s.id === id);
        if (idx !== -1) {
          all[idx] = {
            ...all[idx],
            ...updates,
            updated_at: new Date().toISOString(),
          };
          saveStoredSubmissions(all);
        }
        notifySubmissionsUpdated();
        if (result.data) {
          return result.data as Submission;
        }
      }
    } catch (apiErr) {
      console.warn('API status update fallback:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          notifySubmissionsUpdated();
          return data;
        }
      } catch (e) {
        console.warn('Supabase updateSubmissionStatus error', e);
      }
    }

    const all = getStoredSubmissions();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    all[idx] = {
      ...all[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveStoredSubmissions(all);
    notifySubmissionsUpdated();
    return all[idx];
  },

  async bulkUpdateSubmissions(
    ids: string[],
    updates: {
      submission_status?: FileStatus;
      xerox_status?: XeroxStatus;
      payment_status?: PaymentStatus;
    }
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/submissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });
      if (res.ok) {
        const all = getStoredSubmissions();
        const updated = all.map((sub) => {
          if (ids.includes(sub.id)) {
            return {
              ...sub,
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
          return sub;
        });
        saveStoredSubmissions(updated);
        notifySubmissionsUpdated();
        return true;
      }
    } catch (apiErr) {
      console.warn('API bulk status update fallback:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('submissions')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .in('id', ids);

        if (!error) {
          notifySubmissionsUpdated();
          return true;
        }
      } catch (e) {
        console.warn('Supabase bulk update error', e);
      }
    }

    const all = getStoredSubmissions();
    const updated = all.map((sub) => {
      if (ids.includes(sub.id)) {
        return {
          ...sub,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      return sub;
    });

    saveStoredSubmissions(updated);
    notifySubmissionsUpdated();
    return true;
  },

  async deleteSubmission(id: string): Promise<boolean> {
    // 1. Try server API route
    try {
      const res = await fetch('/api/submissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const all = getStoredSubmissions().filter((s) => s.id !== id);
        saveStoredSubmissions(all);
        notifySubmissionsUpdated();
        return true;
      }
    } catch (apiErr) {
      console.warn('API deleteSubmission error, fallback to direct supabase:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('submissions').delete().eq('id', id);
        if (!error) {
          const all = getStoredSubmissions().filter((s) => s.id !== id);
          saveStoredSubmissions(all);
          notifySubmissionsUpdated();
          return true;
        }
      } catch (e) {
        console.warn('Supabase delete submission error', e);
      }
    }

    const all = getStoredSubmissions().filter((s) => s.id !== id);
    saveStoredSubmissions(all);
    notifySubmissionsUpdated();
    return true;
  },

  async bulkDeleteSubmissions(ids: string[]): Promise<boolean> {
    // 1. Try server API route
    try {
      const res = await fetch('/api/submissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const all = getStoredSubmissions().filter((s) => !ids.includes(s.id));
        saveStoredSubmissions(all);
        notifySubmissionsUpdated();
        return true;
      }
    } catch (apiErr) {
      console.warn('API bulkDeleteSubmissions error, fallback to direct supabase:', apiErr);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('submissions').delete().in('id', ids);
        if (!error) {
          const all = getStoredSubmissions().filter((s) => !ids.includes(s.id));
          saveStoredSubmissions(all);
          notifySubmissionsUpdated();
          return true;
        }
      } catch (e) {
        console.warn('Supabase bulk delete submissions error', e);
      }
    }

    const all = getStoredSubmissions().filter((s) => !ids.includes(s.id));
    saveStoredSubmissions(all);
    notifySubmissionsUpdated();
    return true;
  },

  // 3. FINANCIAL & DASHBOARD STATISTICS
  async getDashboardStats(): Promise<DashboardStats> {
    const sections = await this.getSections();
    const submissions = await this.getSubmissions();

    let ready_to_print = 0;
    let printed = 0;
    let xerox_taken = 0;
    let expected_amount = 0;
    let received_amount = 0;

    submissions.forEach((sub) => {
      if (sub.xerox_status === 'Ready to Print') ready_to_print++;
      if (sub.xerox_status === 'Printed') printed++;
      if (sub.xerox_status === 'Taken') xerox_taken++;

      const amount = Number(sub.amount) || 0;
      expected_amount += amount;

      if (sub.payment_status === 'Paid') {
        received_amount += amount;
      }
    });

    const pending_amount = Math.max(0, expected_amount - received_amount);

    return {
      total_sections: sections.length,
      total_submissions: submissions.length,
      ready_to_print,
      printed,
      xerox_taken,
      expected_amount,
      received_amount,
      pending_amount,
    };
  },

  async getSectionFinancialSummaries(): Promise<SectionFinancialSummary[]> {
    const sections = await this.getSections();
    const submissions = await this.getSubmissions();

    return sections.map((sec) => {
      const secSubs = submissions.filter((s) => s.upload_section_id === sec.id);
      const count = secSubs.length;
      const paid = secSubs.filter((s) => s.payment_status === 'Paid').length;
      const pending = count - paid;
      const expected = secSubs.reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
      const received = secSubs
        .filter((sub) => sub.payment_status === 'Paid')
        .reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
      const pendingAmt = expected - received;

      return {
        section_id: sec.id,
        title: sec.title,
        slug: sec.slug,
        status: sec.status,
        submissions_count: count,
        paid_count: paid,
        pending_count: pending,
        expected_amount: expected,
        received_amount: received,
        pending_amount: pendingAmt,
      };
    });
  },
};
