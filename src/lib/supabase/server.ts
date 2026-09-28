import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PUBLIC_SUPABASE_URL = 'https://jjrdpxuntmhiwzcldphz.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmRweHVudG1oaXd6Y2xkcGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTE1NzIsImV4cCI6MjEwNjA2NzU3Mn0.aMuB3ipObxOqCxOyS_aXhGUom85znTuvijotqB_tucY';

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export async function createAdminSupabaseClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. If service role key is explicitly configured, use it (bypasses RLS)
  if (serviceRoleKey) {
    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // 2. Otherwise authenticate using admin account to obtain authenticated privileges for RLS
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'praveeng8969@gmail.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'PRAVEEN@008969';

  const now = Date.now();
  if (cachedAccessToken && tokenExpiresAt > now) {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${cachedAccessToken}` } },
    });
  }

  const baseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await baseClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (!error && data?.session) {
      cachedAccessToken = data.session.access_token;
      tokenExpiresAt = now + (data.session.expires_in - 60) * 1000;
      return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${cachedAccessToken}` } },
      });
    }
    if (error) {
      console.warn('Admin auto-auth failed in server client:', error.message);
    }
  } catch (err) {
    console.warn('Error authenticating admin Supabase client:', err);
  }

  return baseClient;
}
