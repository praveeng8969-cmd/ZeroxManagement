'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { Submission } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { RazorpayPaymentButton } from '@/components/payment/RazorpayPaymentButton';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  IndianRupee,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface SubmissionStatusPageProps {
  params: Promise<{ id: string }>;
}

export default function SubmissionStatusPage({ params }: SubmissionStatusPageProps) {
  const resolvedParams = use(params);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${resolvedParams.id}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Submission not found or could not be loaded.');
      }
      const json = await res.json();
      if (json.success && json.data) {
        setSubmission(json.data);
      } else {
        throw new Error(json.error || 'Failed to retrieve submission details.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching status');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      try {
        const res = await fetch(`/api/submissions/${resolvedParams.id}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Submission not found or could not be loaded.');
        }
        const json = await res.json();
        if (active) {
          if (json.success && json.data) {
            setSubmission(json.data);
          } else {
            setError(json.error || 'Failed to retrieve submission details.');
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error fetching status');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      active = false;
    };
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
          <Printer className="absolute h-5 w-5 text-sky-600 animate-pulse" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-600">Retrieving Live Print Status...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Submission Not Found</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {error || 'The requested submission could not be found or the link may be invalid.'}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  const section = submission.upload_section;
  const isPaid = String(submission.payment_status).toLowerCase() === 'paid';
  const amount = Number(submission.payment_amount) || Number(submission.amount) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-100/60 pb-16 pt-4 sm:pt-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Navigation & Live Status indicator */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
            <span>Home</span>
          </Link>

          <button
            onClick={() => void fetchStatus()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-sky-600" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Main Status Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 p-6 sm:p-8 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                Live Tracking Desk
              </span>
              <span className="text-[11px] text-sky-100">
                {formatDate(submission.uploaded_at)}
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {section?.title || 'Report Submission'}
            </h1>
            <p className="mt-1 text-xs text-sky-100/90">
              {submission.name} • <span className="font-mono">{submission.roll_number}</span>
              {submission.department ? ` • ${submission.department}` : ''}
            </p>
          </div>

          {/* Workflow Status Checklist */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3.5 divide-y divide-slate-100 text-xs sm:text-sm">
              {/* 1. File Upload */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">File Upload</span>
                    <span className="text-[11px] text-slate-400">
                      {submission.file_name} ({submission.page_count} pages)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Uploaded</span>
                </div>
              </div>

              {/* 2. Payment Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                  >
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Payment</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isPaid
                        ? `Paid via ${submission.payment_source === 'razorpay' ? 'Razorpay' : 'Cash/Counter'}${
                            submission.razorpay_payment_id ? ` (${submission.razorpay_payment_id})` : ''
                          }`
                        : 'Pending online or cash payment'}
                    </span>
                  </div>
                </div>

                <div>
                  {isPaid ? (
                    <div className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{formatCurrency(amount)} Paid</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <RazorpayPaymentButton
                        submissionId={submission.id}
                        amountInRupees={amount}
                        studentName={submission.name}
                        studentRoll={submission.roll_number}
                        sectionTitle={section?.title}
                        currentPaymentStatus={submission.payment_status}
                        onPaymentSuccess={() => void fetchStatus()}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Verification Status */}
              <div className="flex items-center justify-between pt-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">File Verification</span>
                    <span className="text-[11px] text-slate-400">Admin document review</span>
                  </div>
                </div>
                <StatusBadge status={submission.submission_status} size="sm" />
              </div>

              {/* 4. Printing Status */}
              <div className="flex items-center justify-between pt-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Xerox Printing</span>
                    <span className="text-[11px] text-slate-400">Desk queue processing</span>
                  </div>
                </div>
                <StatusBadge status={submission.xerox_status} size="sm" />
              </div>
            </div>

            {/* Receipt / Counter Note */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block">Student Note:</span>
              <p>
                Keep this page bookmarked or present your Roll Number (
                <span className="font-mono font-bold text-sky-700">{submission.roll_number}</span>) at
                the Xerox shop counter to collect your printed document once status changes to{' '}
                <span className="font-bold text-amber-700">Printed</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
