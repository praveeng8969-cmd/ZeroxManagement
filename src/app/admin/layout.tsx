'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AuthStore } from '@/lib/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoginPage) {
      const authenticated = AuthStore.isAuthenticated();
      if (!authenticated) {
        router.replace('/admin/login');
        return;
      }
      AuthStore.ensureValidSession();
    }
    setChecked(true);

    if (isLoginPage) return;

    // Periodically verify & refresh session while tab is open
    const interval = setInterval(() => {
      AuthStore.ensureValidSession();
    }, 5 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        AuthStore.ensureValidSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <div className="flex-1 bg-slate-50/50 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
