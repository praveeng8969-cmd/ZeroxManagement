'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SectionFinancialSummary, Submission, UploadSection } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { PaymentStatusSelector } from '@/components/PaymentStatusSelector';
import { XeroxStatusSelector } from '@/components/XeroxStatusSelector';
import {
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Folder,
} from 'lucide-react';

export default function AdminPaymentsPage() {
  const [summaries, setSummaries] = useState<SectionFinancialSummary[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter for individual records
  const [search, setSearch] = useState('');
  const [payFilter, setPayFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

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
    updates: { payment_status?: any; xerox_status?: any }
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, ...updates } : s))
    );
    await DataStore.updateSubmissionStatus(subId, updates);
    loadData();
  };

  // Global calculations
  const totalExpected = summaries.reduce((acc, s) => acc + s.expected_amount, 0);
  const totalReceived = summaries.reduce((acc, s) => acc + s.received_amount, 0);
  const totalPending = Math.max(0, totalExpected - totalReceived);

  // Filter individual student roster
  const filteredSubmissions = submissions.filter((sub) => {
    const q = search.toLowerCase();
    const matchesSearch =
      sub.name.toLowerCase().includes(q) ||
      sub.roll_number.toLowerCase().includes(q) ||
      (sub.department && sub.department.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (sectionFilter !== 'ALL' && sub.upload_section_id !== sectionFilter) return false;
    if (payFilter === 'PAID' && sub.payment_status !== 'Paid') return false;
    if (payFilter === 'PENDING' && sub.payment_status !== 'Pending') return false;

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
            Automated financial reconciliation of student printing rates and counter collections.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Total Expected"
          value={formatCurrency(totalExpected)}
          subValue="All uploaded documents"
          icon={IndianRupee}
          variant="default"
        />
        <StatCard
          label="Total Received"
          value={formatCurrency(totalReceived)}
          subValue="Collected via online / cash"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Outstanding Pending"
          value={formatCurrency(totalPending)}
          subValue="To collect upon Xerox pickup"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Section-wise Financial Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Section-wise Payment Summary</h3>
          <p className="text-xs text-slate-500">
            Revenue breakdown across courses and sections.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 sm:px-4">Upload Section</th>
                <th className="py-3 px-3 sm:px-4">Files</th>
                <th className="py-3 px-3 sm:px-4">Paid</th>
                <th className="py-3 px-3 sm:px-4">Unpaid</th>
                <th className="py-3 px-3 sm:px-4">Expected</th>
                <th className="py-3 px-3 sm:px-4">Received</th>
                <th className="py-3 px-3 sm:px-4 text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaries.map((sec) => (
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
              ))}
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
              Easily toggle payment and print statuses per student.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or roll number..."
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

            <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs">
              <button
                onClick={() => setPayFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  payFilter === 'ALL'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPayFilter('PAID')}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  payFilter === 'PAID'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setPayFilter('PENDING')}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  payFilter === 'PENDING'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View for Payments */}
        <div className="block md:hidden divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions.map((sub) => {
              const sec = sections.find((s) => s.id === sub.upload_section_id);
              const amount = Number(sub.amount) || 0;

              return (
                <div key={sub.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{sub.roll_number}</span>
                        {sub.department && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-medium">
                            {sub.department}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5">{sub.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(amount)}</span>
                      <span className="block text-[10px] text-slate-400">{sub.page_count} pages</span>
                    </div>
                  </div>

                  {sec && (
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <Folder className="h-3 w-3 text-slate-400" />
                      <span>{sec.title}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Payment:</span>
                      <PaymentStatusSelector
                        currentStatus={sub.payment_status}
                        submissionId={sub.id}
                        onStatusChange={(newStatus) =>
                          handleUpdateStatus(sub.id, { payment_status: newStatus })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Print:</span>
                      <XeroxStatusSelector
                        currentStatus={sub.xerox_status}
                        submissionId={sub.id}
                        onStatusChange={(newStatus) =>
                          handleUpdateStatus(sub.id, { xerox_status: newStatus })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No payment records match the current filter.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Xerox Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => {
                  const sec = sections.find((s) => s.id === sub.upload_section_id);
                  const amount = Number(sub.amount) || 0;

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
                        <span className="block text-[10px] font-normal text-slate-400">{sub.page_count} pages</span>
                      </td>

                      <td className="py-3 px-4">
                        <PaymentStatusSelector
                          currentStatus={sub.payment_status}
                          submissionId={sub.id}
                          onStatusChange={(newStatus) =>
                            handleUpdateStatus(sub.id, { payment_status: newStatus })
                          }
                        />
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No payment records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
