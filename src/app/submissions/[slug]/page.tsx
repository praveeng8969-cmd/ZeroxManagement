'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { UploadSection, Submission } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Search,
  FileCheck,
  Upload,
  Shield,
  AlertTriangle,
  Lock,
  Clock,
  UserCheck,
} from 'lucide-react';

interface SubmissionsPageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicSubmissionsPage({ params }: SubmissionsPageProps) {
  const resolvedParams = use(params);
  const [section, setSection] = useState<UploadSection | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const sec = await DataStore.getSectionBySlug(resolvedParams.slug);
        setSection(sec);
        if (sec) {
          const subs = await DataStore.getSubmissions(sec.id);
          setSubmissions(subs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [resolvedParams.slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold text-slate-500">Loading submissions list...</p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900">Section Not Found</h2>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  const filtered = submissions.filter((sub) => {
    const q = search.toLowerCase();
    return sub.roll_number.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Sections</span>
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={section.status} />
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">Public Status Board</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{section.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Verify if your file is registered in the printing queue. (Private file contents are secured and not publicly downloadable).
            </p>
          </div>

          {section.status === 'open' ? (
            <Link
              href={`/upload/${section.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 shadow-2xs"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Document</span>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Section Closed</span>
            </div>
          )}
        </div>

        {/* Security badge note */}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 border border-slate-100">
          <Shield className="h-3.5 w-3.5 text-sky-600 shrink-0" />
          <span>
            Privacy protection active: Only basic submission timestamps and roll numbers are shown. Document downloads are restricted to Xerox shop administrators.
          </span>
        </div>
      </div>

      {/* Search and count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-bold text-slate-800">
            {submissions.length} Total Registered Submissions
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roll number or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Submissions Table / Cards */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">File Status</th>
                  <th className="py-3 px-4 text-right">Upload Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sub, index) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sub.roll_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{sub.name}</td>
                    <td className="py-3 px-4 text-slate-500">{sub.department || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sub.submission_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatDateShort(sub.uploaded_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center px-4">
            <FileCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No submissions found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {search
                ? `No submissions match "${search}".`
                : 'No students have submitted to this section yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
