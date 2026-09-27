'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { UploadSection, Submission } from '@/types';
import { DataStore } from '@/lib/data-store';
import { calculatePrintAmount, formatCurrency, formatDate, formatBytes, isFileTypeAllowed } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  ArrowLeft,
  X,
  Lock,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';

interface UploadPageProps {
  params: Promise<{ slug: string }>;
}

export default function UploadPage({ params }: UploadPageProps) {
  const resolvedParams = use(params);
  const [section, setSection] = useState<UploadSection | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // UI & Flow State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [successSubmission, setSuccessSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSection() {
      try {
        const found = await DataStore.getSectionBySlug(resolvedParams.slug);
        if (active) setSection(found);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadSection();
    };

    loadSection();

    window.addEventListener('printtrack_sections_updated', loadSection);
    window.addEventListener('storage', loadSection);
    window.addEventListener('focus', loadSection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('printtrack_sections_updated', loadSection);
      window.removeEventListener('storage', loadSection);
      window.removeEventListener('focus', loadSection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resolvedParams.slug]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage('');
    if (!section) return;

    // Check size
    const maxBytes = section.max_file_size * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setErrorMessage(`File is too large. Maximum allowed size is ${section.max_file_size} MB.`);
      setFile(null);
      return;
    }

    // Check allowed extension
    const allowed = isFileTypeAllowed(selectedFile.name, selectedFile.type, section.allowed_file_types);
    if (!allowed) {
      setErrorMessage(
        `Invalid file type. Allowed formats: ${section.allowed_file_types.join(', ').toUpperCase()}`
      );
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const executeUpload = async (replaceExisting = false) => {
    if (!section || !file) return;

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage('');

    try {
      // Simulate smooth upload progress
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return prev + 25;
        });
      }, 150);

      // Create object URL for local preview/download if needed
      const fileBlobUrl = URL.createObjectURL(file);

      const res = await DataStore.createOrReplaceSubmission({
        upload_section_id: section.id,
        name,
        roll_number: rollNumber,
        department,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        pageCount: Number(pageCount),
        fileBlobUrl,
        replaceExisting,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setShowDuplicateModal(false);
        setSuccessSubmission(res.submission);
      }, 300);
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);

      if (err.message === 'DUPLICATE_SUBMISSION') {
        const found = await DataStore.getSubmissionByRollNumber(section.id, rollNumber);
        setExistingSubmission(found);
        setShowDuplicateModal(true);
      } else {
        setErrorMessage(err.message || 'Failed to upload document. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!rollNumber.trim()) {
      setErrorMessage('Please enter your Roll Number / Register Number.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select or drop a file to upload.');
      return;
    }
    if (!Number.isInteger(Number(pageCount)) || Number(pageCount) < 1) {
      setErrorMessage('Please enter a valid number of pages.');
      return;
    }

    await executeUpload(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold text-slate-500">Loading section details...</p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900">Upload Section Not Found</h2>
        <p className="mt-2 text-xs text-slate-500">
          The requested upload section does not exist or may have been deleted by the administrator.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Sections
        </Link>
      </div>
    );
  }

  const isClosed = section.status === 'closed';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Upload Sections</span>
      </Link>

      {/* SUCCESS STATE */}
      {successSubmission ? (
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-10 shadow-sm animate-in fade-in">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Upload Successful</h2>
            <p className="mt-1 text-xs text-slate-500">
              Your document has been safely submitted to the Xerox Desk queue.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200/90 bg-slate-50/70 p-5 text-sm space-y-3">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Section</span>
              <span className="font-semibold text-slate-900 text-xs">{section.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Student Name</span>
              <span className="font-semibold text-slate-900 text-xs">{successSubmission.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Roll Number</span>
              <span className="font-semibold text-slate-900 text-xs">{successSubmission.roll_number}</span>
            </div>
            {successSubmission.department && (
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 text-xs">Department</span>
                <span className="font-semibold text-slate-900 text-xs">{successSubmission.department}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">File</span>
              <span className="font-semibold text-sky-700 text-xs truncate max-w-[200px]">
                {successSubmission.file_name}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Pages</span>
              <span className="font-semibold text-slate-900 text-xs">{successSubmission.page_count}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Total Amount</span>
              <span className="font-bold text-emerald-700 text-xs">{formatCurrency(successSubmission.amount)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 text-xs">Uploaded At</span>
              <span className="font-medium text-slate-700 text-xs">{formatDate(successSubmission.uploaded_at)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 text-xs">Submission ID</span>
              <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                {successSubmission.id}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setSuccessSubmission(null);
                setFile(null);
                setName('');
                setRollNumber('');
                setDepartment('');
              }}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center"
            >
              Upload Another Document
            </button>
            {section.public_submission_list && (
              <Link
                href={`/submissions/${section.slug}`}
                className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 text-center"
              >
                View Section Submissions List
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* NORMAL UPLOAD VIEW */
        <div className="space-y-6">
          {/* Section Summary Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={section.status} />
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Xerox Desk
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {section.title}
                </h1>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
                  {section.description || 'Upload your document for Xerox and printing processing.'}
                </p>
              </div>

              {/* Rate & Deadline Highlight Pill */}
              <div className="flex sm:flex-col gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3.5 shrink-0 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pricing</span>
                  <span className="font-bold text-emerald-700">₹1.50/page + ₹40 calico</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline</span>
                  <span className="font-semibold text-slate-800">{formatDate(section.deadline)}</span>
                </div>
              </div>
            </div>

            {/* CAUTION MESSAGE BOX - Prompt Required */}
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold tracking-wide">⚠️ CAUTION</p>
                  <p className="text-amber-800 leading-relaxed">
                    Please check the alignment and formatting of your document before uploading.
                    Uploading the final file as a <span className="font-bold">PDF is strongly recommended</span> to
                    prevent formatting or alignment issues during printing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CLOSED STATE ALERT */}
          {isClosed ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">🔴 Submissions Closed</h3>
              <p className="mt-1 text-xs text-slate-600 max-w-md mx-auto">
                Submissions for this section have been closed by the administrator. Contact the Xerox Desk or course coordinator if you need assistance.
              </p>
              {section.public_submission_list && (
                <Link
                  href={`/submissions/${section.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  <span>Check submitted roll numbers</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          ) : (
            /* UPLOAD FORM */
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6"
            >
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-900">Student & Document Information</h3>
                <p className="text-xs text-slate-500">
                  No login required. Fill out your details accurately so your printout can be labeled correctly.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRAVEEN G"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                {/* Roll Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Roll Number / Register Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 25CS174"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    className="w-full uppercase rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Used to label printed copies & detect duplicates.
                  </p>
                </div>

                {/* Department (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Department / Class <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE / Section B"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Number of Pages <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    value={pageCount}
                    onChange={(e) => setPageCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Total: {formatCurrency(calculatePrintAmount(Number(pageCount) || 0))}
                  </p>
                </div>
              </div>

              {/* Drag and Drop File Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document File <span className="text-rose-500">*</span>
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                    dragActive
                      ? 'border-sky-500 bg-sky-50/50'
                      : file
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleFileChange}
                    accept={section.allowed_file_types
                      .map((t) => (t === 'images' ? 'image/*' : `.${t}`))
                      .join(',')}
                  />

                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-2">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 max-w-sm truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
                      <span className="mt-2 text-xs font-medium text-sky-600 hover:underline">
                        Click or drag to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mb-2">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Drop your document here, or <span className="text-sky-600">browse</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Accepted: {section.allowed_file_types.join(', ').toUpperCase()} • Max {section.max_file_size} MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 animate-in fade-in">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Uploading document...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload Report ({formatCurrency(calculatePrintAmount(Number(pageCount) || 0))})</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* DUPLICATE SUBMISSION MODAL */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicate Submission Detected"
        variant="warning"
        description={`Roll Number "${rollNumber}" already has an uploaded file in this section.`}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50/80 p-3 text-xs text-amber-900 border border-amber-200">
            <p className="font-medium">
              You already have a submission for this upload section.
            </p>
            {existingSubmission && (
              <p className="mt-1 text-[11px] text-amber-800">
                Previous file: <span className="font-semibold">{existingSubmission.file_name}</span> (uploaded {formatDate(existingSubmission.uploaded_at)})
              </p>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Would you like to replace your previous file with the newly selected file?
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => executeUpload(true)}
              className="flex-1 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs"
            >
              Replace Existing File
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
