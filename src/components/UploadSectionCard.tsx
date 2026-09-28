import React from 'react';
import Link from 'next/link';
import { UploadSection } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { Calendar, FileText, UploadCloud, Users, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface UploadSectionCardProps {
  section: UploadSection;
}

export function UploadSectionCard({ section }: UploadSectionCardProps) {
  const isOpen = section.status === 'open';

  return (
    <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-md shadow-slate-200/40 hover:shadow-xl hover:border-sky-300 transition-all duration-200">
      <div>
        {/* Top Meta: Status and Slug */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <StatusBadge status={section.status} />
          <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
            /{section.slug}
          </span>
        </div>

        {/* Section Title */}
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-sky-600 transition-colors">
          {section.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mt-1.5 mb-4 leading-relaxed">
          {section.description || 'Upload your document for Xerox and printing processing.'}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50/80 p-3 text-xs mb-5 border border-slate-100">
          {/* Pricing */}
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shrink-0 text-xs">
              ₹
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Printing Rate
              </span>
              <span className="font-extrabold text-emerald-700 text-xs sm:text-sm">
                {formatCurrency(section.xerox_rate)}/page
              </span>
              <span className="text-[10px] text-slate-400 block">
                +{formatCurrency(section.extra_charge)} extra
              </span>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-start gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Deadline
              </span>
              <span className="font-bold text-slate-800 text-xs">
                {formatDateShort(section.deadline)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Strict cutoff
              </span>
            </div>
          </div>

          {/* Formats */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600 uppercase">
              {section.allowed_file_types?.join(', ') || 'PDF'} (Max {section.max_file_size}MB)
            </span>
          </div>

          {/* Uploaded count */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-600">
              {section.submissions_count ?? 0} submitted
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        {isOpen ? (
          <Link
            href={`/upload/${section.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-600/20 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Document & Pay</span>
          </Link>
        ) : (
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 border border-slate-200"
          >
            <Lock className="h-4 w-4" />
            <span>Submissions Closed</span>
          </button>
        )}

        {section.public_submission_list && (
          <Link
            href={`/submissions/${section.slug}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span>Check Submitted Roll Numbers</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </Link>
        )}
      </div>
    </div>
  );
}
