'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats, UploadSection, Submission } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { XeroxStatusSelector } from '@/components/XeroxStatusSelector';
import { PaymentStatusSelector } from '@/components/PaymentStatusSelector';
import {
  FolderPlus,
  FileCheck,
  Printer,
  CheckCircle,
  PackageCheck,
  IndianRupee,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_sections: 0,
    total_submissions: 0,
    ready_to_print: 0,
    printed: 0,
    xerox_taken: 0,
    expected_amount: 0,
    received_amount: 0,
    pending_amount: 0,
  });
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [allSections, allSubmissions] = await Promise.all([
        DataStore.getSections(),
        DataStore.getSubmissions(),
      ]);

      setSections(allSections);
      setRecentSubmissions(allSubmissions.slice(0, 10));

      const readyToPrint = allSubmissions.filter((s) => s.xerox_status === 'Ready to Print').length;
      const printed = allSubmissions.filter((s) => s.xerox_status === 'Printed').length;
      const xeroxTaken = allSubmissions.filter((s) => s.xerox_status === 'Taken').length;
      const expectedAmount = allSubmissions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const receivedAmount = allSubmissions
        .filter((s) => s.payment_status === 'Paid')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      const pendingAmount = expectedAmount - receivedAmount;

      setStats({
        total_sections: allSections.length,
        total_submissions: allSubmissions.length,
        ready_to_print: readyToPrint,
        printed,
        xerox_taken: xeroxTaken,
        expected_amount: expectedAmount,
        received_amount: receivedAmount,
        pending_amount: pendingAmount,
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
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

  const handleQuickStatus = async (
    subId: string,
    updates: { xerox_status?: any; payment_status?: any; submission_status?: any }
  ) => {
    setRecentSubmissions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, ...updates } : s))
    );
    await DataStore.updateSubmissionStatus(subId, updates);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Printing & Xerox Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time overview of document uploads, printing workflow, and payment collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/uploads/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Section</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (8 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Upload Sections"
          value={stats.total_sections}
          subValue="Active & closed categories"
          icon={FolderPlus}
          variant="primary"
        />

        <StatCard
          label="Total Submissions"
          value={stats.total_submissions}
          subValue="Uploaded student files"
          icon={FileCheck}
          variant="info"
        />

        <StatCard
          label="Ready to Print"
          value={stats.ready_to_print}
          subValue="Waiting in printer queue"
          icon={Printer}
          variant="warning"
        />

        <StatCard
          label="Printed"
          value={stats.printed}
          subValue="Completed prints"
          icon={CheckCircle}
          variant="primary"
        />

        <StatCard
          label="Xerox Taken"
          value={stats.xerox_taken}
          subValue="Collected by students"
          icon={PackageCheck}
          variant="success"
        />

        <StatCard
          label="Total Expected"
          value={formatCurrency(stats.expected_amount)}
          subValue="All submissions × rates"
          icon={IndianRupee}
          variant="default"
        />

        <StatCard
          label="Total Received"
          value={formatCurrency(stats.received_amount)}
          subValue="Paid by students"
          icon={IndianRupee}
          variant="success"
        />

        <StatCard
          label="Pending Amount"
          value={formatCurrency(stats.pending_amount)}
          subValue="To be collected at desk"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Sections and Recent Activity Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Sections Overview */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">Upload Sections</h3>
            <Link
              href="/admin/uploads"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {sections.slice(0, 5).map((sec) => (
              <div
                key={sec.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/uploads/${sec.id}`}
                      className="text-xs font-bold text-slate-900 hover:text-sky-600 truncate block"
                    >
                      {sec.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {formatCurrency(sec.xerox_rate)}/page + {formatCurrency(sec.extra_charge)} extra • {sec.submissions_count ?? 0} files
                    </p>
                  </div>
                  <StatusBadge status={sec.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions Queue */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Submissions</h3>
              <p className="text-[11px] text-slate-500">Quickly toggle print and payment states</p>
            </div>
            <Link
              href="/admin/submissions"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentSubmissions.length > 0 ? (
            <>
              {/* Mobile Card List for Recent Submissions */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {recentSubmissions.map((sub) => (
                  <div key={sub.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{sub.roll_number}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{sub.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900">{formatCurrency(sub.amount)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{sub.file_name}</div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <XeroxStatusSelector
                        currentStatus={sub.xerox_status}
                        submissionId={sub.id}
                        onStatusChange={(newStatus) =>
                          handleQuickStatus(sub.id, { xerox_status: newStatus })
                        }
                      />
                      <PaymentStatusSelector
                        currentStatus={sub.payment_status}
                        submissionId={sub.id}
                        onStatusChange={(newStatus) =>
                          handleQuickStatus(sub.id, { payment_status: newStatus })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="pb-2">Roll No</th>
                      <th className="pb-2">Student</th>
                      <th className="pb-2">Xerox Print Status</th>
                      <th className="pb-2 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-mono font-bold text-slate-900">{sub.roll_number}</td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                            {sub.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                            {sub.file_name} • {formatCurrency(sub.amount)}
                          </span>
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <XeroxStatusSelector
                            currentStatus={sub.xerox_status}
                            submissionId={sub.id}
                            onStatusChange={(newStatus) =>
                              handleQuickStatus(sub.id, { xerox_status: newStatus })
                            }
                          />
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <PaymentStatusSelector
                            currentStatus={sub.payment_status}
                            submissionId={sub.id}
                            onStatusChange={(newStatus) =>
                              handleQuickStatus(sub.id, { payment_status: newStatus })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No submissions uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
