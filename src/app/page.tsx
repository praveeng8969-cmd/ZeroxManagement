'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { DataStore } from '@/lib/data-store';
import { UploadSectionCard } from '@/components/UploadSectionCard';
import { UploadSection } from '@/types';
import { Printer, Search } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-6 sm:pt-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Upload Sections
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your category below to upload your document and pay online.
            </p>
          </div>

          {sections.length > 1 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sections..."
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
            <p className="text-xs font-semibold text-slate-500">Loading Upload Sections...</p>
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
              There are currently no open sections matching your search. Please check back later or contact the administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
