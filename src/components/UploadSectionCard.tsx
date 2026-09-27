import React from 'react';
import Link from 'next/link';
import { UploadSection } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { Calendar, FileText, Upload, Users, IndianRupee, ArrowRight, Lock } from 'lucide-react';

interface UploadSectionCardProps {
  section: UploadSection;
}

export function UploadSectionCard({ section }: UploadSectionCardProps) {
  const isOpen = section.status === 'open';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div>
        {/* Header: Title + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {section.title}
          </h3>
          <StatusBadge status={section.status} />
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {section.description || 'No description provided.'}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-slate-50/80 p-3 text-xs mb-5 border border-slate-100">
          {/* Xerox Rate */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-emerald-600 shadow-2xs border border-slate-100 font-semibold">
              ₹
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rate</span>
              <span className="font-bold text-slate-900 text-sm">{formatCurrency(section.xerox_rate)}</span>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-600 shadow-2xs border border-slate-100">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Deadline</span>
              <span className="font-medium text-slate-800">{formatDateShort(section.deadline)}</span>
            </div>
          </div>

          {/* Accepted Formats */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-600 shadow-2xs border border-slate-100">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Format</span>
              <span className="font-medium text-slate-800 uppercase">
                {section.allowed_file_types?.join(', ') || 'PDF'}
              </span>
            </div>
          </div>

          {/* Submissions count (if enabled) */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-600 shadow-2xs border border-slate-100">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Uploaded</span>
              <span className="font-medium text-slate-800">
                {section.submissions_count ?? 0} files
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {isOpen ? (
          <Link
            href={`/upload/${section.slug}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-[0.99] transition-all"
          >
            <Upload className="h-4 w-4" />
            <span>Upload File</span>
          </Link>
        ) : (
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400 border border-slate-200"
          >
            <Lock className="h-4 w-4" />
            <span>Submissions Closed</span>
          </button>
        )}

        {section.public_submission_list && (
          <Link
            href={`/submissions/${section.slug}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span>View Submissions List</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </Link>
        )}
      </div>
    </div>
  );
}
