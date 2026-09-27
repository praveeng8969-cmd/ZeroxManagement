'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Submission, UploadSection, FileStatus, XeroxStatus, PaymentStatus } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency, formatDateShort, formatBytes } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  FileCheck,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  Eye,
  Download,
  Folder,
  RefreshCw,
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
    return () => window.removeEventListener('printtrack_submissions_updated', loadData);
  }, []);

  const handleUpdateStatus = async (
    subId: string,
    updates: {
      submission_status?: FileStatus;
      xerox_status?: XeroxStatus;
      payment_status?: PaymentStatus;
    }
  ) => {
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Submissions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Global queue of all uploaded student documents across all courses and sections.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Section selector */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="ALL">All Upload Sections</option>
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="UPLOADED">File: Uploaded</option>
              <option value="VERIFIED">File: Verified</option>
              <option value="REJECTED">File: Rejected</option>
              <option value="READY">Xerox: Ready to Print</option>
              <option value="PRINTED">Xerox: Printed</option>
              <option value="TAKEN">Xerox: Taken</option>
              <option value="PAID">Payment: Paid</option>
              <option value="UNPAID">Payment: Pending</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 border border-sky-200 p-2.5">
            <span className="text-xs font-bold text-sky-900 ml-1">
              {selectedIds.length} items selected
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBulkAction({ submission_status: 'Verified' })}
                disabled={bulkLoading}
                className="rounded bg-white border border-sky-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Mark Verified
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Ready to Print' })}
                disabled={bulkLoading}
                className="rounded bg-white border border-sky-200 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
              >
                Mark Ready
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Printed' })}
                disabled={bulkLoading}
                className="rounded bg-white border border-sky-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
              >
                Mark Printed
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Taken' })}
                disabled={bulkLoading}
                className="rounded bg-white border border-sky-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Mark Taken
              </button>
              <button
                onClick={() => handleBulkAction({ payment_status: 'Paid' })}
                disabled={bulkLoading}
                className="rounded bg-white border border-sky-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Mark Paid
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="rounded bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submissions Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
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
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
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
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(sub.id)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
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
                          className="font-medium text-sky-700 hover:underline max-w-[140px] truncate block text-left"
                        >
                          {sub.file_name}
                        </button>
                        <span className="text-[10px] text-slate-400">{formatBytes(sub.file_size)}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <StatusBadge status={sub.submission_status} size="sm" />
                          {sub.submission_status !== 'Verified' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { submission_status: 'Verified' })
                              }
                              className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Verify"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <StatusBadge status={sub.xerox_status} size="sm" />
                          {sub.xerox_status !== 'Printed' && sub.xerox_status !== 'Taken' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { xerox_status: 'Printed' })
                              }
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              Print
                            </button>
                          )}
                          {sub.xerox_status === 'Printed' && (
                            <button
                              onClick={() => handleUpdateStatus(sub.id, { xerox_status: 'Taken' })}
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            >
                              Taken
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleUpdateStatus(sub.id, {
                              payment_status: sub.payment_status === 'Paid' ? 'Pending' : 'Paid',
                            })
                          }
                          className="cursor-pointer"
                          title="Click to toggle payment"
                        >
                          <StatusBadge status={sub.payment_status} size="sm" />
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewSub(sub)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteSubId(sub.id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{previewSub.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{previewSub.roll_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File:</span>
                <span className="font-semibold text-sky-700">{previewSub.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded At:</span>
                <span className="font-medium text-slate-700">{formatDateShort(previewSub.uploaded_at)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert(`File ready for printer spool: ${previewSub.file_path}`);
                setPreviewSub(null);
              }}
              className="w-full rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Confirm / Close
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
        description="Are you sure you want to delete this submission?"
      >
        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={() => setDeleteSubId(null)}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteSingle}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
