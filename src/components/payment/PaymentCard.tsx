'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Submission, UploadSection, PaymentStatus } from '@/types';
import { RazorpayPaymentButton } from './RazorpayPaymentButton';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import {
  CheckCircle2,
  IndianRupee,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Home,
  Lock,
} from 'lucide-react';

interface PaymentCardProps {
  submission: Submission;
  section: UploadSection;
  onPaymentSuccess?: (paymentId: string) => void;
}

export function PaymentCard({
  submission,
  section,
  onPaymentSuccess,
}: PaymentCardProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    submission.payment_status || 'Pending'
  );
  const [paymentId, setPaymentId] = useState<string>(
    submission.razorpay_payment_id || ''
  );
  const [errorMessage, setErrorMessage] = useState('');

  const amount = Number(submission.payment_amount) || Number(submission.amount) || 0;
  const isPaid = paymentStatus.toLowerCase() === 'paid';

  const handleSuccess = (res: { paymentId: string; amount: number }) => {
    setPaymentStatus('Paid');
    setPaymentId(res.paymentId);
    setErrorMessage('');
    onPaymentSuccess?.(res.paymentId);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in-95">
      {/* Header Banner */}
      <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
        <div
          className={`relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md transition-all ${
            isPaid
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/25'
              : 'bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-sky-600/25'
          }`}
        >
          {isPaid ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <CreditCard className="h-7 w-7" />
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
            isPaid
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-sky-50 text-sky-700 border-sky-200'
          }`}
        >
          {isPaid ? 'Payment Confirmed ✅' : 'Submission Successful ✅'}
        </span>

        <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
          {isPaid ? 'Payment Successful' : 'Xerox Printing Charge'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-md">
          {isPaid
            ? 'Your payment has been securely verified. Your report is now ready in the printing queue.'
            : 'Complete your online payment to queue your document for immediate Xerox printing.'}
        </p>
      </div>

      {/* Submission & Payment Details Breakdown */}
      <div className="my-6 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 text-xs sm:text-sm">
        <div className="grid grid-cols-2 py-2">
          <span className="text-slate-500">Student Name</span>
          <span className="font-bold text-slate-900 text-right">{submission.name}</span>
        </div>

        <div className="grid grid-cols-2 py-2">
          <span className="text-slate-500">Roll Number</span>
          <span className="font-mono font-bold text-sky-700 text-right">
            {submission.roll_number}
          </span>
        </div>

        <div className="grid grid-cols-2 py-2">
          <span className="text-slate-500">Upload Section</span>
          <span className="font-semibold text-slate-800 text-right">{section.title}</span>
        </div>

        <div className="grid grid-cols-2 py-2">
          <span className="text-slate-500">Document</span>
          <span className="font-medium text-slate-700 text-right truncate max-w-[180px] sm:max-w-xs ml-auto">
            {submission.file_name} ({submission.page_count} pages)
          </span>
        </div>

        <div className="grid grid-cols-2 py-2">
          <span className="text-slate-500">Payment Status</span>
          <div className="text-right">
            <StatusBadge status={paymentStatus} size="sm" />
          </div>
        </div>

        {paymentId && isPaid && (
          <div className="grid grid-cols-2 py-2 bg-emerald-50/60 -mx-4 sm:-mx-5 px-4 sm:px-5">
            <span className="text-emerald-800 font-medium">Razorpay Payment ID</span>
            <span className="font-mono text-emerald-900 font-bold text-right text-xs truncate">
              {paymentId}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 py-3 bg-slate-100/80 -mx-4 sm:-mx-5 px-4 sm:px-5 rounded-b-xl">
          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-slate-700" />
            <span>Xerox Charge</span>
          </span>
          <span className="font-extrabold text-slate-900 text-right text-base sm:text-lg">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* Failure Alert if applicable */}
      {errorMessage && !isPaid && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>Payment Failed</span>
          </div>
          <p className="text-[11px] text-rose-700">
            Your uploaded file is safe and intact. You can retry the payment below.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isPaid ? (
          <div className="flex flex-col items-center gap-3">
            <RazorpayPaymentButton
              submissionId={submission.id}
              amountInRupees={amount}
              studentName={submission.name}
              studentRoll={submission.roll_number}
              sectionTitle={section.title}
              currentPaymentStatus={paymentStatus}
              onPaymentSuccess={handleSuccess}
              onPaymentError={handleError}
              size="lg"
              className="w-full"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <Lock className="h-3 w-3 text-slate-400" />
              <span>256-bit encrypted checkout powered by Razorpay</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/submissions/status/${submission.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all text-center"
            >
              <span>View Submission Status</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-center"
            >
              <Home className="h-4 w-4 text-slate-400" />
              <span>Back to Home</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
