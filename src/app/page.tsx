import React from 'react';
import { DataStore } from '@/lib/data-store';
import { UploadSectionCard } from '@/components/UploadSectionCard';

export const revalidate = 0; // ensure fresh data

export default async function HomePage() {
  const allSections = await DataStore.getSections();

  // User requirement: Only Java Project Report upload section, no other details above
  const javaSections = allSections.filter((sec) =>
    sec.title.toLowerCase().includes('java') || sec.slug.includes('java')
  );

  const sectionsToDisplay = javaSections.length > 0 ? javaSections : allSections.slice(0, 1);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-14">
      {sectionsToDisplay.length > 0 ? (
        <div className="space-y-4">
          {sectionsToDisplay.map((sec) => (
            <UploadSectionCard key={sec.id} section={sec} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center px-4">
          <h3 className="text-sm font-bold text-slate-800">No Java Report upload section available</h3>
          <p className="mt-1 text-xs text-slate-500">
            Please check back later or contact the administrator.
          </p>
        </div>
      )}
    </div>
  );
}
