import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('section_id');

    const adminClient = createAdminSupabaseClient();
    let query = adminClient
      .from('submissions')
      .select('*, upload_section:upload_sections(*)')
      .order('uploaded_at', { ascending: false });

    if (sectionId) {
      query = query.eq('upload_section_id', sectionId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ids } = body as { id?: string; ids?: string[] };

    if (!id && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'Missing id or ids parameter' }, { status: 400 });
    }

    const adminClient = createAdminSupabaseClient();

    if (id) {
      const { error } = await adminClient.from('submissions').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (ids && ids.length > 0) {
      const { error } = await adminClient.from('submissions').delete().in('id', ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
