'use client';

import React, { useState } from 'react';
import { PaymentStatus } from '@/types';
import { CheckCircle2, Clock, Loader2, ChevronDown } from 'lucide-react';

interface PaymentStatusSelectorProps {
  currentStatus: PaymentStatus;
  submissionId: string;
  onStatusChange: (newStatus: PaymentStatus) => Promise<void> | void;
}

export function PaymentStatusSelector({
  currentStatus,
  onStatusChange,
}: PaymentStatusSelectorProps) {
  const [loading, setLoading] = useState(false);

  const isPaid = currentStatus === 'Paid';

  const handleSelect = async (newStatus: PaymentStatus) => {
    if (newStatus === currentStatus || loading) return;
    setLoading(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentStatus}
        onChange={(e) => handleSelect(e.target.value as PaymentStatus)}
        disabled={loading}
        aria-label="Payment status"
        className={`cursor-pointer appearance-none rounded-lg border pl-7 pr-6 py-1.5 text-xs font-semibold shadow-2xs transition-all ${
          isPaid
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
        } focus:outline-hidden focus:ring-2 focus:ring-sky-500 disabled:opacity-50`}
      >
        <option value="Paid">Paid</option>
        <option value="Pending">Pending</option>
      </select>

      <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
        ) : isPaid ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        )}
      </div>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
    </div>
  );
}
