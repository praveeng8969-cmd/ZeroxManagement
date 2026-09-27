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
  { href: '/admin/uploads', label: 'Upload Sections', icon: FolderPlus, exact: false },
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
      {/* Mobile Top Header */}
      <div className="md:hidden flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-white">
            <Printer className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm">PrintTrack Admin</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 transform bg-white p-4 shadow-xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">PrintTrack</p>
              <p className="text-[10px] text-slate-500">Admin Control Panel</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-slate-100 pt-4 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Public Uploads Page
            </span>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 lg:p-6">
        <div>
          {/* Admin Header */}
          <div className="mb-6 px-2">
            <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 uppercase tracking-wider mb-1">
              Admin Portal
            </span>
            <h2 className="text-base font-bold text-slate-900">Printing Desk</h2>
            <p className="text-xs text-slate-500">Manage uploads & finances</p>
          </div>

          {/* Navigation Links */}
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

        {/* Bottom Actions */}
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
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
