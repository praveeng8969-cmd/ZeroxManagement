import React from 'react';
import { Printer } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-sky-600" />
            <span className="font-semibold text-slate-800">PrintTrack</span>
            <span className="text-slate-300">|</span>
            <span>Student Xerox & Printing Management</span>
          </div>

          <p className="text-[11px] text-slate-400">
            No login required • PDF preferred for high precision printing
          </p>
        </div>
      </div>
    </footer>
  );
}
