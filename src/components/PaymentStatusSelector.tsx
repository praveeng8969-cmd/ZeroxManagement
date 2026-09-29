'use client';

import React, { useState } from 'react';
import { PaymentStatus, PaymentSource } from '@/types';
import { Clock, Loader2, ChevronDown, ShieldCheck, Banknote, AlertCircle } from 'lucide-react';

interface PaymentStatusSelectorProps {
  currentStatus: PaymentStatus;
  paymentSource?: PaymentSource;
  paymentMethod?: string | null;
  razorpayPaymentId?: string | null;
  submissionId: string;
  onStatusChange: (
    newStatus: PaymentStatus,
    newSource?: PaymentSource
  ) => Promise<void> | void;
}

export function PaymentStatusSelector({
  currentStatus,
  paymentSource = 'manual',
  paymentMethod,
  razorpayPaymentId,
  onStatusChange,
}: PaymentStatusSelectorProps) {
  const [loading, setLoading] = useState(false);

  const isPaid = currentStatus === 'Paid';
  const isRazorpay = isPaid && paymentSource === 'razorpay';
  const isFailed = currentStatus === 'Failed';
  const isRefunded = currentStatus === 'Refunded';

  const handleSelect = async (val: string) => {
    let newStatus: PaymentStatus = 'Pending';
    let newSource: PaymentSource = 'manual';

    if (val === 'Paid_Razorpay') {
      newStatus = 'Paid';
      newSource = 'razorpay';
    } else if (val === 'Paid_Cash') {
      newStatus = 'Paid';
      newSource = 'cash';
    } else if (val === 'Paid') {
      newStatus = 'Paid';
      newSource = paymentSource || 'manual';
    } else if (val === 'Pending') {
      newStatus = 'Pending';
      newSource = 'manual';
    } else if (val === 'Failed') {
      newStatus = 'Failed';
      newSource = paymentSource;
    } else if (val === 'Refunded') {
      newStatus = 'Refunded';
      newSource = paymentSource;
    }

    if (newStatus === currentStatus && newSource === paymentSource) return;

    // Safety: If verified via Razorpay, confirm before changing to unpaid
    if (isRazorpay && newStatus !== 'Paid') {
      const confirmChange = confirm(
        `This payment was verified via Razorpay (${razorpayPaymentId || 'online'}). Are you sure you want to change its status?`
      );
      if (!confirmChange) return;
    }

    setLoading(true);
    try {
      await onStatusChange(newStatus, newSource);
    } finally {
      setLoading(false);
    }
  };

  const selectedValue =
    currentStatus === 'Paid'
      ? paymentSource === 'razorpay'
        ? 'Paid_Razorpay'
        : 'Paid_Cash'
      : currentStatus;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedValue}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={loading}
        title={paymentMethod ? `Method: ${paymentMethod}` : undefined}
        aria-label="Payment status"
        className={`cursor-pointer appearance-none rounded-lg border pl-7 pr-6 py-1.5 text-xs font-semibold shadow-2xs transition-all ${
          isPaid
            ? isRazorpay
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
            : isFailed
            ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            : isRefunded
            ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
        } focus:outline-hidden focus:ring-2 focus:ring-sky-500 disabled:opacity-50`}
      >
        <option value="Paid_Razorpay">Paid (Razorpay)</option>
        <option value="Paid_Cash">Paid (Cash / Counter)</option>
        <option value="Pending">Pending</option>
        <option value="Failed">Failed</option>
        <option value="Refunded">Refunded</option>
      </select>

      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
        ) : isPaid ? (
          isRazorpay ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Banknote className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          )
        ) : isFailed ? (
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        )}
      </div>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
    </div>
  );
}
