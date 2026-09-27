'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataStore } from '@/lib/data-store';
import { slugify } from '@/lib/utils';
import { ArrowLeft, FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { UploadSectionStatus } from '@/types';

const FILE_TYPE_OPTIONS = [
  { id: 'pdf', label: 'PDF Documents (Recommended)' },
  { id: 'docx', label: 'Word Documents (DOC / DOCX)' },
  { id: 'pptx', label: 'PowerPoint (PPT / PPTX)' },
  { id: 'images', label: 'Images (JPG, PNG)' },
];

export default function CreateUploadSectionPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('2026-10-31T23:59');
  const [pricePerPage, setPricePerPage] = useState('1.5');
  const [extraCharge, setExtraCharge] = useState('40');
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>(['pdf']);
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [status, setStatus] = useState<UploadSectionStatus>('open');
  const [publicSubmissionList, setPublicSubmissionList] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const toggleFileType = (typeId: string) => {
    setAllowedFileTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for this upload section.');
      return;
    }
    if (!slug.trim()) {
      setError('Please provide a valid slug for the upload section.');
      return;
    }
    if (allowedFileTypes.length === 0) {
      setError('Please select at least one accepted file format.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const created = await DataStore.createSection({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        xerox_rate: parseFloat(pricePerPage) || 0,
        extra_charge: parseFloat(extraCharge) || 0,
        allowed_file_types: allowedFileTypes,
        max_file_size: parseInt(maxFileSize) || 10,
        status,
        public_submission_list: publicSubmissionList,
      });

      router.push(`/admin/uploads/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create section. Slug may already be in use.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Top back link */}
      <Link
        href="/admin/uploads"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Upload Sections</span>
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Create New Upload Section
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure printing rates, deadlines, and accepted document formats.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Section Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Java Project Report"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 focus-within:border-sky-500">
              <span className="text-xs text-slate-400 mr-1 font-mono">/upload/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                className="w-full bg-transparent font-mono text-xs text-slate-900 focus:outline-hidden"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Public link: /upload/{slug || 'java-project-report'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instructions & Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Upload completed Java project report including source code documentation."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Section settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Price per Page (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={pricePerPage}
                onChange={(e) => setPricePerPage(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Extra / Calico Charge (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={extraCharge}
                onChange={(e) => setExtraCharge(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Submission Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Maximum File Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Max File Size (MB) <span className="text-rose-500">*</span>
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

            {/* Status (Open / Closed) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UploadSectionStatus)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-hidden"
              >
                <option value="open">Open (Accepting Submissions)</option>
                <option value="closed">Closed (Submissions Blocked)</option>
              </select>
            </div>
          </div>

          {/* Allowed File Types */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Allowed File Formats <span className="text-rose-500">*</span>
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
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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

          {/* Public Submission List Toggle */}
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
                  Allows students to view roll numbers of registered submissions at /submissions/{slug || '...'} without exposing actual file downloads.
                </span>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>{loading ? 'Creating Section...' : 'Create Upload Section'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
