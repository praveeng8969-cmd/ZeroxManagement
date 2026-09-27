'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataStore } from '@/lib/data-store';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { UploadSection, UploadSectionStatus } from '@/types';

const FILE_TYPE_OPTIONS = [
  { id: 'pdf', label: 'PDF Documents' },
  { id: 'docx', label: 'Word Documents (DOC / DOCX)' },
  { id: 'pptx', label: 'PowerPoint (PPT / PPTX)' },
  { id: 'images', label: 'Images (JPG, PNG)' },
];

interface EditSectionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditUploadSectionPage({ params }: EditSectionPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [section, setSection] = useState<UploadSection | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [xeroxRate, setXeroxRate] = useState('');
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(['pdf']);
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [status, setStatus] = useState<UploadSectionStatus>('open');
  const [publicSubmissionList, setPublicSubmissionList] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const sec = await DataStore.getSectionById(resolvedParams.id);
        if (sec) {
          setSection(sec);
          setTitle(sec.title);
          setSlug(sec.slug);
          setDescription(sec.description || '');
          setDeadline(
            sec.deadline ? new Date(sec.deadline).toISOString().slice(0, 16) : ''
          );
          setXeroxRate(String(sec.xerox_rate));
          setAllowedFileTypes(sec.allowed_file_types || ['pdf']);
          setMaxFileSize(String(sec.max_file_size || 10));
          setStatus(sec.status);
          setPublicSubmissionList(sec.public_submission_list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams.id]);

  const toggleFileType = (typeId: string) => {
    setAllowedFileTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await DataStore.updateSection(resolvedParams.id, {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        xerox_rate: parseFloat(xeroxRate) || 0,
        allowed_file_types: allowedFileTypes,
        max_file_size: parseInt(maxFileSize) || 10,
        status,
        public_submission_list: publicSubmissionList,
      });

      router.push(`/admin/uploads/${resolvedParams.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update section.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/admin/uploads/${resolvedParams.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Section Details</span>
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Edit Upload Section
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Modify rates, deadline, or toggle submission availability.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Section Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL Slug
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Xerox Rate per Student (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={xeroxRate}
                onChange={(e) => setXeroxRate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Deadline
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Max File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UploadSectionStatus)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-hidden"
              >
                <option value="open">Open (Submissions Allowed)</option>
                <option value="closed">Closed (Submissions Blocked)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Allowed File Formats
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FILE_TYPE_OPTIONS.map((opt) => {
                const checked = allowedFileTypes.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    onClick={() => toggleFileType(opt.id)}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-colors ${
                      checked
                        ? 'border-sky-500 bg-sky-50/50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={publicSubmissionList}
                onChange={(e) => setPublicSubmissionList(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Enable Public Submission Status List
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Allows students to view roll numbers of registered submissions at /submissions/{slug}.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Section Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
