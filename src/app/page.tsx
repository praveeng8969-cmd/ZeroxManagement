'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { DataStore } from '@/lib/data-store';
import { UploadSectionCard } from '@/components/UploadSectionCard';
import { UploadSection } from '@/types';
import {
  Printer,
  Sparkles,
  ShieldCheck,
  CreditCard,
  FileCheck2,
  Clock,
  Search,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadSections = async () => {
    try {
      const allSections = await DataStore.getSections();
      setSections(allSections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();

    window.addEventListener('printtrack_sections_updated', loadSections);
    window.addEventListener('storage', loadSections);

    return () => {
      window.removeEventListener('printtrack_sections_updated', loadSections);
      window.removeEventListener('storage', loadSections);
    };
  }, []);

  const filtered = sections.filter(
    (sec) =>
      sec.title.toLowerCase().includes(search.toLowerCase()) ||
      sec.slug.toLowerCase().includes(search.toLowerCase()) ||
      (sec.description && sec.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-100/60 pb-20">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 py-10 sm:py-16 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-700 border border-sky-200/80 mb-4 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Official Student Xerox & Report Printing Portal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Fast, Automated Document Printing & Xerox Desk
          </h1>

          <p className="mt-3.5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload your student reports, project documentation, or lab records. Instant automated page calculation, secure online payment, and zero-wait counter collection.
          </p>

          {/* Value Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Auto Page Counter</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-1.5">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <span>Razorpay UPI & Cards</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
              <span>No Login Required</span>
            </div>
          </div>
        </div>

        {/* 3 Step Student Flow */}
        <div className="mx-auto max-w-4xl mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 font-bold text-xs mb-2.5">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900">Select Upload Section</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose your lab, project, or assignment category below.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs mb-2.5">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900">Upload PDF Report</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pages and printing charges are calculated automatically.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs mb-2.5">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900">Pay & Collect at Counter</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pay securely and collect your labeled printout using your Roll No.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content: Available Sections */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Available Upload Sections</h2>
            <p className="text-xs text-slate-500">
              Active queues accepting student document submissions.
            </p>
          </div>

          {/* Search filter if multiple sections exist */}
          {sections.length > 1 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search category or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-10 w-10 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading Active Upload Sections...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((sec) => (
              <UploadSectionCard key={sec.id} section={sec} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-3 border border-slate-100">
              <Printer className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Active Upload Sections Found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no open sections matching your search. Please check back later or check with the administrator.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
