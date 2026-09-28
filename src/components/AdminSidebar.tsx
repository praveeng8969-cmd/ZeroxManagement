'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderPlus,
  FileCheck,
  CreditCard,
  LogOut,
  Menu,
  X,
  Printer,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { AuthStore } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/uploads', label: 'Sections', icon: FolderPlus, exact: false },
  { href: '/admin/submissions', label: 'Submissions', icon: FileCheck, exact: false },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, exact: false },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await AuthStore.signOut();
    }
  };

  const isCurrentActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="md:hidden flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shrink-0">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-white">
            <Printer className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm">PrintTrack Desk</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            target="_blank"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            title="Public Upload Page"
            aria-label="Public Upload Page"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] transform bg-white p-5 shadow-2xl transition-transform duration-200 ease-in-out md:hidden flex flex-col justify-between ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">PrintTrack</p>
                <p className="text-[11px] text-slate-500">Admin Control Panel</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <div className="h-2 w-2 rounded-full bg-sky-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              Public Homepage
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Thumb Friendly) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 rounded-xl transition-all ${
                  active ? 'bg-sky-50' : ''
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
              </div>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 lg:p-6">
        <div>
          <div className="mb-6 px-2">
            <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-1">
              Admin Portal
            </span>
            <h2 className="text-base font-bold text-slate-900">Printing Desk</h2>
            <p className="text-xs text-slate-500">Manage uploads & finances</p>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-sky-50 text-sky-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <div className="h-1.5 w-1.5 rounded-full bg-sky-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              Public Homepage
            </span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
