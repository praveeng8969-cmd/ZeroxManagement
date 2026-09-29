'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SectionFinancialSummary, Submission, UploadSection, PaymentStatus, PaymentSource } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { PaymentStatusSelector } from '@/components/PaymentStatusSelector';
import { XeroxStatusSelector } from '@/components/XeroxStatusSelector';
import { Modal } from '@/components/Modal';
import {
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Folder,
  ShieldCheck,
  Banknote,
  Eye,
  AlertTriangle,
  Receipt,
  ExternalLink,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [summaries, setSummaries] = useState<SectionFinancialSummary[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter for individual records
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  // Detail Modal State
  const [detailSub, setDetailSub] = useState<Submission | null>(null);

  const loadData = async () => {
    try {
      const [sum, subs, secs] = await Promise.all([
        DataStore.getSectionFinancialSummaries(),
        DataStore.getSubmissions(),
        DataStore.getSections(),
      ]);
      setSummaries(sum);
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
    updates: { payment_status?: PaymentStatus; payment_source?: PaymentSource; xerox_status?: any }
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, ...updates } : s))
    );
    await DataStore.updateSubmissionStatus(subId, updates);
    loadData();
  };

  // Safe Financial Aggregations based on database records
  const isPaid = (s: Submission) => String(s.payment_status || '').toLowerCase() === 'paid';
  const getSubAmount = (s: Submission) => Number(s.payment_amount) || Number(s.amount) || 0;

  const totalExpected = submissions.reduce((acc, s) => acc + getSubAmount(s), 0);
  const totalReceived = submissions.filter(isPaid).reduce((acc, s) => acc + getSubAmount(s), 0);
  const totalPending = Math.max(0, totalExpected - totalReceived);
  const onlineReceived = submissions
    .filter((s) => isPaid(s) && s.payment_source === 'razorpay')
    .reduce((acc, s) => acc + getSubAmount(s), 0);
  const cashReceived = totalReceived - onlineReceived;

  // Filter individual student roster
  const filteredSubmissions = submissions.filter((sub) => {
    const q = search.toLowerCase();
    const sec = sections.find((s) => s.id === sub.upload_section_id);
    const matchesSearch =
      sub.name.toLowerCase().includes(q) ||
      sub.roll_number.toLowerCase().includes(q) ||
      (sec && sec.title.toLowerCase().includes(q)) ||
      (sub.department && sub.department.toLowerCase().includes(q)) ||
      (sub.razorpay_payment_id && sub.razorpay_payment_id.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (sectionFilter !== 'ALL' && sub.upload_section_id !== sectionFilter) return false;

    const normStatus = String(sub.payment_status || '').toLowerCase();
    if (payFilter === 'PAID' && normStatus !== 'paid') return false;
    if (payFilter === 'PENDING' && normStatus !== 'pending') return false;
    if (payFilter === 'FAILED' && normStatus !== 'failed') return false;
    if (payFilter === 'REFUNDED' && normStatus !== 'refunded') return false;

    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Payment & Collections
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Razorpay gateway transactions, online collections, and manual counter reconciliations.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Financial Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Expected"
          value={formatCurrency(totalExpected)}
          subValue={`${submissions.length} total uploads`}
          icon={IndianRupee}
          variant="default"
        />
        <StatCard
          label="Total Received"
          value={formatCurrency(totalReceived)}
          subValue={`Online + Manual collections`}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Razorpay Online"
          value={formatCurrency(onlineReceived)}
          subValue="Verified via Gateway"
          icon={ShieldCheck}
          variant="primary"
        />
        <StatCard
          label="Outstanding Pending"
          value={formatCurrency(totalPending)}
          subValue="Due at print pickup"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Section-wise Financial Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Upload Section Rates & Revenue Summary</h3>
          <p className="text-xs text-slate-500">
            Financial progress and collection totals broken down by active upload section.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 sm:px-4">Upload Section</th>
                <th className="py-3 px-3 sm:px-4">Base Rate</th>
                <th className="py-3 px-3 sm:px-4">Submissions</th>
                <th className="py-3 px-3 sm:px-4">Paid</th>
                <th className="py-3 px-3 sm:px-4">Pending</th>
                <th className="py-3 px-3 sm:px-4">Expected</th>
                <th className="py-3 px-3 sm:px-4">Received</th>
                <th className="py-3 px-3 sm:px-4 text-right">Pending Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((sec) => {
                const fullSec = sections.find((s) => s.id === sec.section_id);
                return (
                  <tr key={sec.section_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 sm:px-4">
                      <Link
                        href={`/admin/uploads/${sec.section_id}`}
                        className="font-bold text-slate-900 hover:text-sky-600 block"
                      >
                        {sec.title}
                      </Link>
                      <span className="text-[10px] text-slate-400">/{sec.slug}</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-700 font-medium">
                      {fullSec ? formatCurrency(fullSec.xerox_rate) : '—'}/pg
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-medium text-slate-700">
                      {sec.submissions_count}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-emerald-700 font-semibold">
                      {sec.paid_count}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-amber-700 font-semibold">
                      {sec.pending_count}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-bold text-slate-800">
                      {formatCurrency(sec.expected_amount)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-bold text-emerald-700">
                      {formatCurrency(sec.received_amount)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-bold text-amber-700">
                      {formatCurrency(sec.pending_amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Payment Management Roster */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Student Payment Records</h3>
            <p className="text-xs text-slate-500">
              Track Razorpay online payments, handle manual cash payments, and view payment audit IDs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, roll, section, payment ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="ALL">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>

            {/* Filter Pills */}
            <div className="flex flex-wrap rounded-xl border border-slate-200 bg-white p-0.5 text-xs">
              {(['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => setPayFilter(filterVal)}
                  className={`rounded-lg px-2.5 py-1 transition-colors ${
                    payFilter === filterVal
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filterVal === 'ALL'
                    ? 'All'
                    : filterVal.charAt(0) + filterVal.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Upload Section</th>
                <th className="py-3 px-4">Rate / Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Method & ID</th>
                <th className="py-3 px-4">Xerox Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const sec = sections.find((s) => s.id === sub.upload_section_id);
                  const amount = getSubAmount(sub);
                  const isOnline = sub.payment_source === 'razorpay';
                  const isSubPaid = isPaid(sub);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sub.roll_number}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{sub.name}</span>
                        {sub.department && (
                          <span className="text-[10px] text-slate-400 block">{sub.department}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {sec?.title || '—'}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(amount)}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {sub.page_count} pages
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <PaymentStatusSelector
                          currentStatus={sub.payment_status}
                          paymentSource={sub.payment_source}
                          paymentMethod={sub.payment_method}
                          razorpayPaymentId={sub.razorpay_payment_id}
                          submissionId={sub.id}
                          onStatusChange={(newStatus, newSource) =>
                            handleUpdateStatus(sub.id, {
                              payment_status: newStatus,
                              payment_source: newSource,
                            })
                          }
                        />
                      </td>

                      {/* Payment Method & Razorpay ID */}
                      <td className="py-3 px-4">
                        {isSubPaid ? (
                          isOnline ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Razorpay ({sub.payment_method || 'Online'})</span>
                              </span>
                              {sub.razorpay_payment_id && (
                                <span className="font-mono text-[10px] text-slate-500 block truncate max-w-[120px]">
                                  {sub.razorpay_payment_id}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                              <Banknote className="h-3 w-3" />
                              <span>Cash / Counter</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">Awaiting payment</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <XeroxStatusSelector
                          currentStatus={sub.xerox_status}
                          submissionId={sub.id}
                          onStatusChange={(newStatus) =>
                            handleUpdateStatus(sub.id, { xerox_status: newStatus })
                          }
                        />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDetailSub(sub)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No payment records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={Boolean(detailSub)}
        onClose={() => setDetailSub(null)}
        title="Payment & Transaction Details"
        variant="info"
      >
        {detailSub && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{detailSub.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-bold text-slate-900">{detailSub.roll_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Upload Section:</span>
                <span className="font-medium text-slate-800">
                  {sections.find((s) => s.id === detailSub.upload_section_id)?.title || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Xerox Amount:</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatCurrency(getSubAmount(detailSub))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <StatusBadge status={detailSub.payment_status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Source:</span>
                <span className="font-bold uppercase tracking-wider text-slate-800">
                  {detailSub.payment_source === 'razorpay' ? 'Razorpay Gateway' : 'Cash / Counter'}
                </span>
              </div>
              {detailSub.payment_method && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {detailSub.payment_method}
                  </span>
                </div>
              )}
              {detailSub.razorpay_payment_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay Payment ID:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {detailSub.razorpay_payment_id}
                  </span>
                </div>
              )}
              {detailSub.razorpay_order_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay Order ID:</span>
                  <span className="font-mono text-slate-600">{detailSub.razorpay_order_id}</span>
                </div>
              )}
              {detailSub.payment_paid_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid At:</span>
                  <span className="font-medium text-slate-700">
                    {formatDate(detailSub.payment_paid_at)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDetailSub(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
