'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Printer, ArrowUpRight } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs group-hover:bg-sky-700 transition-colors">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900">PrintTrack</span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                Xerox Desk
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none">
              Print. Track.
            </p>
          </div>
        </Link>

        {/* Navigation links - completely clean, no public admin link */}
        <nav className="flex items-center gap-4">
          {isAdminRoute && (
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
            >
              <span>View Public Site</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
