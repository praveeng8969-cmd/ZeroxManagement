import { createClient } from '@supabase/supabase-js';

const PUBLIC_SUPABASE_URL = 'https://jjrdpxuntmhiwzcldphz.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcmRweHVudG1oaXd6Y2xkcGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0OTE1NzIsImV4cCI6MjEwNjA2NzU3Mn0.aMuB3ipObxOqCxOyS_aXhGUom85znTuvijotqB_tucY';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-ref')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
