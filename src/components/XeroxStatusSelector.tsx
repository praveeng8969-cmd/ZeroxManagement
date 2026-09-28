'use client';

import React, { useState } from 'react';
import { XeroxStatus } from '@/types';
import { ChevronDown, Loader2, Printer, CheckCircle2, Clock, RotateCcw } from 'lucide-react';

interface XeroxStatusSelectorProps {
  currentStatus: XeroxStatus;
  submissionId: string;
  onStatusChange: (newStatus: XeroxStatus) => Promise<void> | void;
  showQuickToggle?: boolean;
}

const STATUS_CONFIG: Record<
  XeroxStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
    nextStatus?: XeroxStatus;
    nextActionLabel: string;
    nextActionClass: string;
    nextActionIcon?: React.ComponentType<{ className?: string }>;
  }
> = {
  Pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
    nextStatus: 'Printed',
    nextActionLabel: 'Print',
    nextActionClass: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700 shadow-xs',
    nextActionIcon: Printer,
  },
  'Ready to Print': {
    label: 'Ready to Print',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: Printer,
    nextStatus: 'Printed',
    nextActionLabel: 'Print',
    nextActionClass: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700 shadow-xs',
    nextActionIcon: Printer,
  },
  Printed: {
    label: 'Printed',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: Printer,
    nextStatus: 'Taken',
    nextActionLabel: 'Mark Taken',
    nextActionClass: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 shadow-xs',
    nextActionIcon: CheckCircle2,
  },
  Taken: {
    label: 'Taken',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: CheckCircle2,
    nextStatus: 'Printed',
    nextActionLabel: 'Undo',
    nextActionClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300',
    nextActionIcon: RotateCcw,
  },
};

export function XeroxStatusSelector({
  currentStatus,
  onStatusChange,
  showQuickToggle = true,
}: XeroxStatusSelectorProps) {
  const [loading, setLoading] = useState(false);

  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Pending;
  const Icon = config.icon;
  const NextIcon = config.nextActionIcon;

  const handleSelect = async (newStatus: XeroxStatus) => {
    if (newStatus === currentStatus || loading) return;
    setLoading(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickNext = async () => {
    if (!config.nextStatus || loading) return;
    setLoading(true);
    try {
      await onStatusChange(config.nextStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-nowrap">
      {/* Dropdown Selector */}
      <div className="relative inline-flex items-center">
        <select
          value={currentStatus}
          onChange={(e) => handleSelect(e.target.value as XeroxStatus)}
          disabled={loading}
          aria-label="Xerox print status"
          className={`cursor-pointer appearance-none rounded-lg border pl-7 pr-6 py-1.5 text-xs font-semibold shadow-2xs transition-all ${config.bg} ${config.text} ${config.border} hover:opacity-95 focus:outline-hidden focus:ring-2 focus:ring-sky-500 disabled:opacity-50`}
        >
          <option value="Pending">Pending</option>
          <option value="Ready to Print">Ready to Print</option>
          <option value="Printed">Printed</option>
          <option value="Taken">Taken</option>
        </select>

        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Icon className="h-3.5 w-3.5 shrink-0" />
          )}
        </div>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
      </div>

      {/* Quick Action 1-Tap Button */}
      {showQuickToggle && config.nextStatus && (
        <button
          type="button"
          onClick={handleQuickNext}
          disabled={loading}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0 ${config.nextActionClass}`}
          title={`Quick action: Change to ${config.nextStatus}`}
        >
          {NextIcon && <NextIcon className="h-3 w-3" />}
          <span>{config.nextActionLabel}</span>
        </button>
      )}
    </div>
  );
}
