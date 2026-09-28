'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Submission, UploadSection, FileStatus, XeroxStatus, PaymentStatus } from '@/types';
import { DataStore } from '@/lib/data-store';
import { downloadSubmissionFile } from '@/lib/zip-download';
import { formatCurrency, formatDateShort, formatBytes } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { XeroxStatusSelector } from '@/components/XeroxStatusSelector';
import { PaymentStatusSelector } from '@/components/PaymentStatusSelector';
import {
  FileCheck,
  Search,
  Check,
  X,
  Trash2,
  Eye,
  Download,
  Folder,
  RefreshCw,
  FileText,
} from 'lucide-react';

export default function AdminAllSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modals
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [subs, secs] = await Promise.all([
        DataStore.getSubmissions(),
        DataStore.getSections(),
      ]);
      setSubmissions(subs);
      setSections(secs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('printtrack_submissions_updated', loadData);
    window.addEventListener('printtrack_sections_updated', loadData);
    return () => {
      window.removeEventListener('printtrack_submissions_updated', loadData);
      window.removeEventListener('printtrack_sections_updated', loadData);
    };
  }, []);

  const handleUpdateStatus = async (
    subId: string,
    updates: {
      submission_status?: FileStatus;
      xerox_status?: XeroxStatus;
      payment_status?: PaymentStatus;
    }
  ) => {
    // Optimistic UI update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, ...updates } : s))
    );
    await DataStore.updateSubmissionStatus(subId, updates);
    loadData();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (updates: {
    submission_status?: FileStatus;
    xerox_status?: XeroxStatus;
    payment_status?: PaymentStatus;
  }) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    await DataStore.bulkUpdateSubmissions(selectedIds, updates);
    setSelectedIds([]);
    setBulkLoading(false);
    loadData();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} submissions?`)) return;
    setBulkLoading(true);
    await DataStore.bulkDeleteSubmissions(selectedIds);
    setSelectedIds([]);
    setBulkLoading(false);
    loadData();
  };

  const handleDeleteSingle = async () => {
    if (!deleteSubId) return;
    await DataStore.deleteSubmission(deleteSubId);
    setDeleteSubId(null);
    loadData();
  };

  const filtered = submissions.filter((sub) => {
    const q = search.toLowerCase();
    const matchesSearch =
      sub.name.toLowerCase().includes(q) ||
      sub.roll_number.toLowerCase().includes(q) ||
      (sub.department && sub.department.toLowerCase().includes(q)) ||
      sub.file_name.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (sectionFilter !== 'ALL' && sub.upload_section_id !== sectionFilter) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'UPLOADED') return sub.submission_status === 'Uploaded';
    if (statusFilter === 'VERIFIED') return sub.submission_status === 'Verified';
    if (statusFilter === 'REJECTED') return sub.submission_status === 'Rejected';
    if (statusFilter === 'READY') return sub.xerox_status === 'Ready to Print';
    if (statusFilter === 'PRINTED') return sub.xerox_status === 'Printed';
    if (statusFilter === 'TAKEN') return sub.xerox_status === 'Taken';
    if (statusFilter === 'PAID') return sub.payment_status === 'Paid';
    if (statusFilter === 'UNPAID') return sub.payment_status === 'Pending';
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Submissions Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage print requests, mark xerox printed/taken, and track payments.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2">
            {/* Section selector */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              aria-label="Filter by section"
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>

            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Xerox: Ready to Print</option>
              <option value="PRINTED">Xerox: Printed</option>
              <option value="TAKEN">Xerox: Taken</option>
              <option value="PAID">Payment: Paid</option>
              <option value="UNPAID">Payment: Pending</option>
              <option value="UPLOADED">File: Uploaded</option>
              <option value="VERIFIED">File: Verified</option>
              <option value="REJECTED">File: Rejected</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 border border-sky-200 p-2.5">
            <span className="text-xs font-bold text-sky-900 ml-1">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Printed' })}
                disabled={bulkLoading}
                className="rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-indigo-700"
              >
                Mark Printed
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Taken' })}
                disabled={bulkLoading}
                className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-emerald-700"
              >
                Mark Taken
              </button>
              <button
                onClick={() => handleBulkAction({ payment_status: 'Paid' })}
                disabled={bulkLoading}
                className="rounded-lg bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 text-xs font-semibold hover:bg-emerald-50"
              >
                Mark Paid
              </button>
              <button
                onClick={() => handleBulkAction({ submission_status: 'Verified' })}
                disabled={bulkLoading}
                className="rounded-lg bg-white border border-slate-200 text-slate-700 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
              >
                Verify
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Submissions List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <>
            {/* MOBILE CARD VIEW (Visible only on mobile devices) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {/* Select All Row on Mobile */}
              <div className="flex items-center justify-between p-3 bg-slate-50/70 border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                    aria-label="Select all submissions"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Select All ({filtered.length})</span>
                </label>
                <span className="text-[11px] text-slate-400">Tap status to change</span>
              </div>

              {filtered.map((sub) => {
                const isSelected = selectedIds.includes(sub.id);
                const sec = sections.find((s) => s.id === sub.upload_section_id);

                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 space-y-3 transition-colors ${
                      isSelected ? 'bg-sky-50/40' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Top Row: Checkbox, Roll No, Student Name, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(sub.id)}
                          aria-label={`Select ${sub.roll_number}`}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {sub.roll_number}
                            </span>
                            {sub.department && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                {sub.department}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 text-xs mt-0.5">{sub.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPreviewSub(sub)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 active:scale-95"
                          title="View Info"
                          aria-label="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadSubmissionFile(sub).catch((e) => alert(e.message))}
                          className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 active:scale-95"
                          title="Download Document"
                          aria-label="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteSubId(sub.id)}
                          className="rounded-lg p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95"
                          title="Delete Submission"
                          aria-label="Delete Submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* File and Section Details */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{sub.file_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span>{sub.page_count} pages</span>
                          <span>•</span>
                          <span>{formatBytes(sub.file_size)}</span>
                          {sec && (
                            <>
                              <span>•</span>
                              <span className="truncate text-slate-600 font-medium">{sec.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(sub.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Touch-Friendly Status Controls */}
                    <div className="space-y-2 pt-1">
                      {/* Xerox Print Status Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Print Status:
                        </span>
                        <XeroxStatusSelector
                          currentStatus={sub.xerox_status}
                          submissionId={sub.id}
                          onStatusChange={(newStatus) =>
                            handleUpdateStatus(sub.id, { xerox_status: newStatus })
                          }
                        />
                      </div>

                      {/* Payment Status Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Payment:
                        </span>
                        <PaymentStatusSelector
                          currentStatus={sub.payment_status}
                          submissionId={sub.id}
                          onStatusChange={(newStatus) =>
                            handleUpdateStatus(sub.id, { payment_status: newStatus })
                          }
                        />
                      </div>

                      {/* File Verification Row */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          File Verification:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={sub.submission_status} size="sm" />
                          {sub.submission_status !== 'Verified' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { submission_status: 'Verified' })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Visible on md and larger screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 && selectedIds.length === filtered.length
                        }
                        onChange={handleSelectAll}
                        aria-label="Select all visible submissions"
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </th>
                    <th className="py-3 px-3">Roll No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Section</th>
                    <th className="py-3 px-3">File Name</th>
                    <th className="py-3 px-3">File Status</th>
                    <th className="py-3 px-3">Xerox Status</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((sub) => {
                    const isSelected = selectedIds.includes(sub.id);
                    const sec = sections.find((s) => s.id === sub.upload_section_id);

                    return (
                      <tr
                        key={sub.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-sky-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <label className="flex h-8 w-8 cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(sub.id)}
                              aria-label={`Select submission ${sub.roll_number}`}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </label>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {sub.roll_number}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">{sub.name}</span>
                          {sub.department && (
                            <span className="text-[10px] text-slate-400 block">{sub.department}</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {sec ? (
                            <Link
                              href={`/admin/uploads/${sec.id}`}
                              className="font-medium text-slate-700 hover:text-sky-600 flex items-center gap-1"
                            >
                              <Folder className="h-3 w-3 text-slate-400" />
                              <span className="truncate max-w-[120px]">{sec.title}</span>
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <button
                            onClick={() => setPreviewSub(sub)}
                            className="font-medium text-sky-700 hover:underline max-w-[140px] truncate block text-left cursor-pointer"
                          >
                            {sub.file_name}
                          </button>
                          <span className="text-[10px] text-slate-400">
                            {formatBytes(sub.file_size)} • {sub.page_count} pages • {formatCurrency(sub.amount)}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <StatusBadge status={sub.submission_status} size="sm" />
                            {sub.submission_status !== 'Verified' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(sub.id, { submission_status: 'Verified' })
                                }
                                className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                title="Verify File"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            {sub.submission_status !== 'Rejected' && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(sub.id, { submission_status: 'Rejected' })
                                }
                                className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Reject File"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Xerox Status with native selector and 1-tap quick action */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <XeroxStatusSelector
                            currentStatus={sub.xerox_status}
                            submissionId={sub.id}
                            onStatusChange={(newStatus) =>
                              handleUpdateStatus(sub.id, { xerox_status: newStatus })
                            }
                          />
                        </td>

                        {/* Payment Status with native toggle dropdown */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <PaymentStatusSelector
                            currentStatus={sub.payment_status}
                            submissionId={sub.id}
                            onStatusChange={(newStatus) =>
                              handleUpdateStatus(sub.id, { payment_status: newStatus })
                            }
                          />
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => downloadSubmissionFile(sub).catch((e) => alert(e.message))}
                              className="rounded p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 cursor-pointer"
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPreviewSub(sub)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600 cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteSubId(sub.id)}
                              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              title="Delete Submission"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <FileCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No submissions found matching criteria</p>
            <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search query or filters.</p>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      <Modal
        isOpen={Boolean(previewSub)}
        onClose={() => setPreviewSub(null)}
        title="Submission Inspection"
        variant="info"
      >
        {previewSub && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{previewSub.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{previewSub.roll_number}</span>
              </div>
              {previewSub.department && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-800">{previewSub.department}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">File Name:</span>
                <span className="font-semibold text-sky-700 truncate max-w-[200px]">{previewSub.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Page Count:</span>
                <span className="font-bold text-slate-900">{previewSub.page_count} pages</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(previewSub.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded:</span>
                <span className="font-medium text-slate-700">{formatDateShort(previewSub.uploaded_at)}</span>
              </div>
            </div>

            {/* Quick Status Adjusters in Modal */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Xerox Print Status:</span>
                <XeroxStatusSelector
                  currentStatus={previewSub.xerox_status}
                  submissionId={previewSub.id}
                  onStatusChange={async (newStatus) => {
                    await handleUpdateStatus(previewSub.id, { xerox_status: newStatus });
                    setPreviewSub((prev) => prev ? { ...prev, xerox_status: newStatus } : null);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Payment Status:</span>
                <PaymentStatusSelector
                  currentStatus={previewSub.payment_status}
                  submissionId={previewSub.id}
                  onStatusChange={async (newStatus) => {
                    await handleUpdateStatus(previewSub.id, { payment_status: newStatus });
                    setPreviewSub((prev) => prev ? { ...prev, payment_status: newStatus } : null);
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => downloadSubmissionFile(previewSub).catch((error) => alert(error.message))}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-700 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              Download Document ({formatBytes(previewSub.file_size)})
            </button>
          </div>
        )}
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={Boolean(deleteSubId)}
        onClose={() => setDeleteSubId(null)}
        title="Delete Submission?"
        variant="danger"
        description="Are you sure you want to delete this submission record? This cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={() => setDeleteSubId(null)}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteSingle}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
