'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { UploadSection, Submission, FileStatus, XeroxStatus, PaymentStatus } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency, formatDate, formatDateShort, formatBytes } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { Modal } from '@/components/Modal';
import { downloadSubmissionsAsZip } from '@/lib/zip-download';
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  FileCheck,
  Printer,
  CheckCircle,
  PackageCheck,
  IndianRupee,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Share2,
} from 'lucide-react';

interface SectionManagePageProps {
  params: Promise<{ id: string }>;
}

export default function SectionManagePage({ params }: SectionManagePageProps) {
  const resolvedParams = use(params);

  const [section, setSection] = useState<UploadSection | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modals
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);
  const [deleteSubId, setDeleteSubId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    try {
      const sec = await DataStore.getSectionById(resolvedParams.id);
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
  };

  useEffect(() => {
    loadData();
    window.addEventListener('printtrack_submissions_updated', loadData);
    return () => window.removeEventListener('printtrack_submissions_updated', loadData);
  }, [resolvedParams.id]);

  const handleToggleStatus = async () => {
    if (!section) return;
    const nextStatus = section.status === 'open' ? 'closed' : 'open';
    await DataStore.updateSection(section.id, { status: nextStatus });
    loadData();
  };

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
      setSelectedIds(filteredSubmissions.map((s) => s.id));
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
    setBulkActionLoading(true);
    await DataStore.bulkUpdateSubmissions(selectedIds, updates);
    setSelectedIds([]);
    setBulkActionLoading(false);
    loadData();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    await DataStore.bulkDeleteSubmissions(selectedIds);
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
    setBulkActionLoading(false);
    loadData();
  };

  const handleDeleteSingle = async () => {
    if (!deleteSubId) return;
    await DataStore.deleteSubmission(deleteSubId);
    setDeleteSubId(null);
    loadData();
  };

  const handleCopyLink = () => {
    if (!section) return;
    const url = `${window.location.origin}/upload/${section.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!section) {
    return (
      <div className="py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Upload Section Not Found</h2>
        <Link
          href="/admin/uploads"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600"
        >
          ← Back to Upload Sections
        </Link>
      </div>
    );
  }

  // Filter Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const q = search.toLowerCase();
    const matchesSearch =
      sub.name.toLowerCase().includes(q) ||
      sub.roll_number.toLowerCase().includes(q) ||
      (sub.department && sub.department.toLowerCase().includes(q));

    if (!matchesSearch) return false;

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

  // Calculate Section Specific Metrics
  const totalSubmissions = submissions.length;
  const verifiedCount = submissions.filter((s) => s.submission_status === 'Verified').length;
  const readyCount = submissions.filter((s) => s.xerox_status === 'Ready to Print').length;
  const printedCount = submissions.filter((s) => s.xerox_status === 'Printed').length;
  const takenCount = submissions.filter((s) => s.xerox_status === 'Taken').length;
  const paidCount = submissions.filter((s) => s.payment_status === 'Paid').length;
  const expectedRevenue = submissions.reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
  const receivedRevenue = submissions
    .filter((sub) => sub.payment_status === 'Paid')
    .reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
  const pendingRevenue = expectedRevenue - receivedRevenue;

  return (
    <div className="space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/uploads"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Sections</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Public Upload Link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Student Link'}</span>
          </button>

          {/* Toggle Open/Closed */}
          <button
            onClick={handleToggleStatus}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              section.status === 'open'
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {section.status === 'open' ? <Lock className="h-3.5 w-3.5 text-slate-400" /> : <Unlock className="h-3.5 w-3.5 text-emerald-600" />}
            <span>{section.status === 'open' ? 'Close Section' : 'Open Section'}</span>
          </button>

          {/* Edit Section */}
          <Link
            href={`/admin/uploads/${section.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Edit className="h-3.5 w-3.5 text-slate-400" />
            <span>Edit Section</span>
          </Link>

          {/* Download All (ZIP) */}
          <button
            onClick={() => downloadSubmissionsAsZip(section.title, submissions)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download All Files (ZIP)</span>
          </button>
        </div>
      </div>

      {/* Section Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={section.status} />
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono text-slate-400">/upload/{section.slug}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{section.title}</h1>
            <p className="mt-1 text-xs text-slate-600 max-w-xl">{section.description}</p>
          </div>

          <div className="flex gap-4 rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-xs shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pricing</span>
              <span className="font-bold text-emerald-700">₹1.50/page + ₹40 calico</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deadline</span>
              <span className="font-semibold text-slate-800">{formatDate(section.deadline)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Submissions</span>
          <span className="text-lg font-bold text-slate-900 mt-1 block">{totalSubmissions}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Verified</span>
          <span className="text-lg font-bold text-indigo-700 mt-1 block">{verifiedCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Ready</span>
          <span className="text-lg font-bold text-blue-700 mt-1 block">{readyCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Printed</span>
          <span className="text-lg font-bold text-amber-700 mt-1 block">{printedCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Taken</span>
          <span className="text-lg font-bold text-emerald-700 mt-1 block">{takenCount}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected</span>
          <span className="text-sm font-bold text-slate-800 mt-1 block">{formatCurrency(expectedRevenue)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Received</span>
          <span className="text-sm font-bold text-emerald-700 mt-1 block">{formatCurrency(receivedRevenue)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending</span>
          <span className="text-sm font-bold text-amber-700 mt-1 block">{formatCurrency(pendingRevenue)}</span>
        </div>
      </div>

      {/* Submissions Management Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        {/* Search & Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-80 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UPLOADED', label: 'Uploaded' },
              { id: 'VERIFIED', label: 'Verified' },
              { id: 'READY', label: 'Ready to Print' },
              { id: 'PRINTED', label: 'Printed' },
              { id: 'TAKEN', label: 'Taken' },
              { id: 'PAID', label: 'Paid' },
              { id: 'UNPAID', label: 'Pending Payment' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 border border-sky-200 p-2.5 animate-in fade-in">
            <span className="text-xs font-bold text-sky-900 ml-2">
              {selectedIds.length} {selectedIds.length === 1 ? 'submission' : 'submissions'} selected
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBulkAction({ submission_status: 'Verified' })}
                disabled={bulkActionLoading}
                className="rounded-md bg-white border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Mark Verified
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Ready to Print' })}
                disabled={bulkActionLoading}
                className="rounded-md bg-white border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
              >
                Mark Ready
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Printed' })}
                disabled={bulkActionLoading}
                className="rounded-md bg-white border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
              >
                Mark Printed
              </button>
              <button
                onClick={() => handleBulkAction({ xerox_status: 'Taken' })}
                disabled={bulkActionLoading}
                className="rounded-md bg-white border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Mark Taken
              </button>
              <button
                onClick={() => handleBulkAction({ payment_status: 'Paid' })}
                disabled={bulkActionLoading}
                className="rounded-md bg-white border border-sky-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Mark Paid
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={bulkActionLoading}
                className="rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Submissions Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredSubmissions.length > 0 &&
                      selectedIds.length === filteredSubmissions.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                </th>
                <th className="py-3 px-3">Roll No</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">File Name</th>
                <th className="py-3 px-3">Uploaded</th>
                <th className="py-3 px-3">File Status</th>
                <th className="py-3 px-3">Xerox Status</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const isSelected = selectedIds.includes(sub.id);
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
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
                        <button
                          onClick={() => setPreviewSub(sub)}
                          className="font-medium text-sky-700 hover:underline max-w-[150px] truncate block text-left"
                          title="Preview File"
                        >
                          {sub.file_name}
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {formatBytes(sub.file_size)} • {sub.page_count} pages • {formatCurrency(sub.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateShort(sub.uploaded_at)}
                      </td>

                      {/* File Verification Status with quick toggles */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={sub.submission_status} size="sm" />
                          {sub.submission_status !== 'Verified' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { submission_status: 'Verified' })
                              }
                              className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
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
                              className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Reject File"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Xerox Status with quick transition buttons */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={sub.xerox_status} size="sm" />
                          {sub.xerox_status === 'Pending' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { xerox_status: 'Ready to Print' })
                              }
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Ready
                            </button>
                          )}
                          {sub.xerox_status !== 'Printed' && sub.xerox_status !== 'Taken' && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(sub.id, { xerox_status: 'Printed' })
                              }
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              Printed
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

                      {/* Payment Status with quick toggles */}
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

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview / View */}
                          <button
                            onClick={() => setPreviewSub(sub)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
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
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No submissions match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREVIEW SUBMISSION MODAL */}
      <Modal
        isOpen={Boolean(previewSub)}
        onClose={() => setPreviewSub(null)}
        title="Submission Details"
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
                  <span className="text-slate-500">Department / Class:</span>
                  <span className="font-semibold text-slate-800">{previewSub.department}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">File Name:</span>
                <span className="font-semibold text-sky-700">{previewSub.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File Size:</span>
                <span className="font-medium text-slate-700">{formatBytes(previewSub.file_size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uploaded Date:</span>
                <span className="font-medium text-slate-700">{formatDate(previewSub.uploaded_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pages:</span>
                <span className="font-medium text-slate-700">{previewSub.page_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Due:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(previewSub.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <StatusBadge status={previewSub.payment_status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Xerox Status:</span>
                <StatusBadge status={previewSub.xerox_status} size="sm" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {previewSub.file_url ? (
                <a
                  href={previewSub.file_url}
                  download={previewSub.file_name}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Document</span>
                </a>
              ) : (
                <button
                  onClick={() => alert(`Document path: ${previewSub.file_path}`)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteSubId)}
        onClose={() => setDeleteSubId(null)}
        title="Delete Submission?"
        variant="danger"
        description="Are you sure you want to permanently delete this student submission? The document will be removed."
      >
        <div className="flex justify-end gap-2.5 pt-4">
          <button
            onClick={() => setDeleteSubId(null)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteSingle}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-2xs"
          >
            Delete Submission
          </button>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Delete Selected Submissions?"
        variant="danger"
        description={`Are you sure you want to delete ${selectedIds.length} selected submissions? This action cannot be undone.`}
      >
        <div className="flex justify-end gap-2.5 pt-4">
          <button
            onClick={() => setShowBulkDeleteConfirm(false)}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkDelete}
            className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-2xs"
          >
            Delete {selectedIds.length} Submissions
          </button>
        </div>
      </Modal>
    </div>
  );
}
