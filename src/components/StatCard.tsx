import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'primary';
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantStyles = {
    default: {
      border: 'border-slate-200/80',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    primary: {
      border: 'border-sky-200',
      iconBg: 'bg-sky-50 text-sky-700',
    },
    success: {
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-700',
    },
    warning: {
      border: 'border-amber-200',
      iconBg: 'bg-amber-50 text-amber-700',
    },
    info: {
      border: 'border-blue-200',
      iconBg: 'bg-blue-50 text-blue-700',
    },
  }[variant];

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 shadow-2xs transition-all hover:shadow-xs',
        variantStyles.border,
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', variantStyles.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {subValue && <p className="mt-1 text-xs text-slate-500 font-medium">{subValue}</p>}
      </div>
    </div>
  );
}
