'use client';

import React, { useEffect, useState } from 'react';
import { DataStore } from '@/lib/data-store';
import { UploadSectionCard } from '@/components/UploadSectionCard';
import { UploadSection } from '@/types';

export default function HomePage() {
  const [sections, setSections] = useState<UploadSection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSections = async () => {
    const allSections = await DataStore.getSections();

    // Only show Java Report upload sections
    const javaSections = allSections.filter(
      (sec) =>
        sec.title.toLowerCase().includes('java') || sec.slug.includes('java')
    );

    setSections(javaSections.length > 0 ? javaSections : allSections.slice(0, 1));
    setLoading(false);
  };

  useEffect(() => {
    loadSections();

    // Re-sync whenever admin updates sections (same tab or another tab via storage event)
    window.addEventListener('printtrack_sections_updated', loadSections);
    window.addEventListener('storage', loadSections);

    return () => {
      window.removeEventListener('printtrack_sections_updated', loadSections);
      window.removeEventListener('storage', loadSections);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-14 flex justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-14">
      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((sec) => (
            <UploadSectionCard key={sec.id} section={sec} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center px-4">
          <h3 className="text-sm font-bold text-slate-800">
            No Java Report upload section available
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Please check back later or contact the administrator.
          </p>
        </div>
      )}
    </div>
  );
}
