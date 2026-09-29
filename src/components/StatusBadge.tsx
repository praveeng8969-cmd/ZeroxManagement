import React from 'react';
import { cn } from '@/lib/utils';
import { UploadSectionStatus, FileStatus, XeroxStatus, PaymentStatus } from '@/types';

type BadgeType = UploadSectionStatus | FileStatus | XeroxStatus | PaymentStatus | string;

interface StatusBadgeProps {
  status: BadgeType;
  type?: 'section' | 'file' | 'xerox' | 'payment';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const norm = String(status || '').toLowerCase().trim();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let displayLabel = status;

  // Section status
  if (norm === 'open') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    displayLabel = 'Open';
  } else if (norm === 'closed') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
    displayLabel = 'Closed';
  }
  // File verification status
  else if (norm === 'uploaded') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200';
    dotColor = 'bg-sky-500';
    displayLabel = 'Uploaded';
  } else if (norm === 'verified') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    dotColor = 'bg-indigo-500';
    displayLabel = 'Verified';
  } else if (norm === 'rejected') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
    displayLabel = 'Rejected';
  }
  // Xerox printing status
  else if (norm === 'ready to print' || norm === 'ready') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500';
    displayLabel = 'Ready to Print';
  } else if (norm === 'printed') {
    styles = 'bg-amber-50 text-amber-800 border-amber-300';
    dotColor = 'bg-amber-500';
    displayLabel = 'Printed';
  } else if (norm === 'taken') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    dotColor = 'bg-emerald-500';
    displayLabel = 'Taken';
  }
  // Payment status
  else if (norm === 'paid') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    displayLabel = 'Paid';
  } else if (norm === 'pending') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
    displayLabel = 'Pending';
  } else if (norm === 'failed') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
    displayLabel = 'Failed';
  } else if (norm === 'refunded') {
    styles = 'bg-purple-50 text-purple-700 border-purple-200';
    dotColor = 'bg-purple-500';
    displayLabel = 'Refunded';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium gap-1',
    md: 'text-xs px-2.5 py-1 font-semibold gap-1.5',
    lg: 'text-sm px-3 py-1.5 font-semibold gap-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border shadow-2xs transition-colors',
        sizeClasses,
        styles,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)} />
      {displayLabel}
    </span>
  );
}
