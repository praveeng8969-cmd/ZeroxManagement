import { supabase, isSupabaseConfigured } from './supabase/client';

const ADMIN_SESSION_KEY = 'printtrack_admin_session';

export interface AdminUser {
  email: string;
  role: 'admin';
}

export const AuthStore = {
  async signIn(email: string, password: string):Promise<{ success: boolean; error?: string }> {
    // 1. If real Supabase is configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.session) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, role: 'admin', token: data.session.access_token }));
            document.cookie = `printtrack_auth=true; path=/; max-age=86400; SameSite=Lax`;
          }
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Authentication failed' };
      }
    }

    // 2. Local Fallback Authentication
    const validEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'praveeng8969@gmail.com').toLowerCase();
    const validPassword = 'PRAVEEN@008969';

    if (email.toLowerCase().trim() === validEmail && password === validPassword) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email: validEmail, role: 'admin' }));
        document.cookie = `printtrack_auth=true; path=/; max-age=86400; SameSite=Lax`;
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid email or password. Please verify your admin credentials.',
    };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error', e);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      document.cookie = `printtrack_auth=; path=/; max-age=0`;
      window.location.href = '/admin/login';
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const session = localStorage.getItem(ADMIN_SESSION_KEY);
      return Boolean(session);
    } catch {
      return false;
    }
  },

  getUser(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const session = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!session) return null;
      return JSON.parse(session);
    } catch {
      return null;
    }
  },
};
