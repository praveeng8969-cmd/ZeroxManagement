import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { supabase as publicSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids, updates } = body as {
      id?: string;
      ids?: string[];
      updates: {
        submission_status?: string;
        xerox_status?: string;
        payment_status?: string;
      };
    };

    if ((!id && (!ids || ids.length === 0)) || !updates) {
      return NextResponse.json(
        { error: 'Missing required parameters (id or ids, updates).' },
        { status: 400 }
      );
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Try service role client first (bypasses RLS)
    let dbSuccess = false;
    let updatedData: unknown = null;

    try {
      const adminClient = createAdminSupabaseClient();
      if (id) {
        const { data, error } = await adminClient
          .from('submissions')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          dbSuccess = true;
          updatedData = data;
        } else if (error) {
          console.warn('Admin Supabase client update error:', error.message);
        }
      } else if (ids && ids.length > 0) {
        const { error } = await adminClient
          .from('submissions')
          .update(payload)
          .in('id', ids);

        if (!error) {
          dbSuccess = true;
        } else if (error) {
          console.warn('Admin Supabase client bulk update error:', error.message);
        }
      }
    } catch {
      // If service role key not set, try public supabase client
      if (isSupabaseConfigured() && publicSupabase) {
        try {
          if (id) {
            const { data, error } = await publicSupabase
              .from('submissions')
              .update(payload)
              .eq('id', id)
              .select()
              .single();

            if (!error && data) {
              dbSuccess = true;
              updatedData = data;
            }
          } else if (ids && ids.length > 0) {
            const { error } = await publicSupabase
              .from('submissions')
              .update(payload)
              .in('id', ids);

            if (!error) {
              dbSuccess = true;
            }
          }
        } catch (anonErr) {
          console.warn('Public Supabase client error:', anonErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dbUpdated: dbSuccess,
      data: updatedData,
      payload,
    });
  } catch (err: unknown) {
    console.error('Error updating submission status:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update submission status.' },
      { status: 500 }
    );
  }
}
