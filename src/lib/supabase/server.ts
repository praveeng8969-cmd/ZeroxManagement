import 'server-only';

import { createClient } from '@supabase/supabase-js';

const PUBLIC_SUPABASE_URL = 'https://jjrdpxuntmhiwzcldphz.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmRweHVudG1oaXd6Y2xkcGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTE1NzIsImV4cCI6MjEwNjA2NzU3Mn0.aMuB3ipObxOqCxOyS_aXhGUom85znTuvijotqB_tucY';

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase server credentials are not configured.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
