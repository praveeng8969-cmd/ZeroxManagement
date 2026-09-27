'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats, UploadSection, Submission } from '@/types';
import { DataStore } from '@/lib/data-store';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import {
  FolderPlus,
  FileCheck,
  Printer,
  CheckCircle,
  PackageCheck,
  IndianRupee,
  Clock,
  ArrowRight,
  TrendingUp,
  Plus,
  RefreshCw,
  ExternalLink,
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
      const [s, secList, subList] = await Promise.all([
        DataStore.getDashboardStats(),
        DataStore.getSections(),
        DataStore.getSubmissions(),
      ]);
      setStats(s);
      setSections(secList.slice(0, 5));
      setRecentSubmissions(subList.slice(0, 6));
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
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Printing & Xerox Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time overview of document uploads, printing workflow, and payment collections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/uploads/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Upload Section</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (8 metrics specified in prompt) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Upload Sections */}
        <StatCard
          label="Upload Sections"
          value={stats.total_sections}
          subValue="Active & closed categories"
          icon={FolderPlus}
          variant="primary"
        />

        {/* Total Submissions */}
        <StatCard
          label="Total Submissions"
          value={stats.total_submissions}
          subValue="Uploaded student files"
          icon={FileCheck}
          variant="info"
        />

        {/* Ready to Print */}
        <StatCard
          label="Ready to Print"
          value={stats.ready_to_print}
          subValue="Waiting in printer queue"
          icon={Printer}
          variant="warning"
        />

        {/* Printed */}
        <StatCard
          label="Printed"
          value={stats.printed}
          subValue="Completed prints"
          icon={CheckCircle}
          variant="primary"
        />

        {/* Xerox Taken */}
        <StatCard
          label="Xerox Taken"
          value={stats.xerox_taken}
          subValue="Collected by students"
          icon={PackageCheck}
          variant="success"
        />

        {/* Expected Amount */}
        <StatCard
          label="Total Expected"
          value={formatCurrency(stats.expected_amount)}
          subValue="All submissions × rates"
          icon={IndianRupee}
          variant="default"
        />

        {/* Received Amount */}
        <StatCard
          label="Total Received"
          value={formatCurrency(stats.received_amount)}
          subValue="Paid by students"
          icon={IndianRupee}
          variant="success"
        />

        {/* Pending Amount */}
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
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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

          <div className="space-y-3">
            {sections.map((sec) => (
              <div
                key={sec.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/uploads/${sec.id}`}
                      className="text-xs font-bold text-slate-900 hover:text-sky-600 line-clamp-1"
                    >
                      {sec.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ₹1.50/page + ₹40 calico • {sec.submissions_count ?? 0} files
                    </p>
                  </div>
                  <StatusBadge status={sec.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions Queue */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="pb-2">Roll No</th>
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Xerox Status</th>
                    <th className="pb-2">Payment</th>
                    <th className="pb-2 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-mono font-bold text-slate-900">{sub.roll_number}</td>
                      <td className="py-2.5">
                        <span className="font-medium text-slate-800 block truncate max-w-[130px]">
                          {sub.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                          {sub.file_name}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={sub.xerox_status} size="sm" />
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={sub.payment_status} size="sm" />
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sub.xerox_status !== 'Printed' && sub.xerox_status !== 'Taken' && (
                            <button
                              onClick={() => handleQuickStatus(sub.id, { xerox_status: 'Printed' })}
                              className="rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              title="Mark Printed"
                            >
                              Print
                            </button>
                          )}
                          {sub.xerox_status === 'Printed' && (
                            <button
                              onClick={() => handleQuickStatus(sub.id, { xerox_status: 'Taken' })}
                              className="rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              title="Mark Xerox Taken"
                            >
                              Taken
                            </button>
                          )}
                          {sub.payment_status === 'Pending' ? (
                            <button
                              onClick={() => handleQuickStatus(sub.id, { payment_status: 'Paid' })}
                              className="rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              title="Mark Paid"
                            >
                              Paid
                            </button>
                          ) : (
                            <button
                              onClick={() => handleQuickStatus(sub.id, { payment_status: 'Pending' })}
                              className="rounded px-2 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                              title="Mark Unpaid"
                            >
                              Unpaid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No submissions uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
