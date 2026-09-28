import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('section_id');

    const adminClient = await createAdminSupabaseClient();
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

    const adminClient = await createAdminSupabaseClient();

    if (id) {
      // 1. Fetch file_path to delete from storage
      try {
        const { data: sub } = await adminClient
          .from('submissions')
          .select('file_path')
          .eq('id', id)
          .maybeSingle();

        if (sub?.file_path) {
          await adminClient.storage.from('submissions').remove([sub.file_path]);
        }
      } catch (storageErr) {
        console.warn('Storage file deletion warning:', storageErr);
      }

      // 2. Delete row from submissions table
      const { data, error } = await adminClient
        .from('submissions')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: data?.length ?? 1 });
    } else if (ids && ids.length > 0) {
      // 1. Fetch file_paths to delete from storage
      try {
        const { data: subs } = await adminClient
          .from('submissions')
          .select('file_path')
          .in('id', ids);

        const paths = (subs || []).map((s: { file_path?: string }) => s.file_path).filter(Boolean) as string[];
        if (paths.length > 0) {
          await adminClient.storage.from('submissions').remove(paths);
        }
      } catch (storageErr) {
        console.warn('Storage bulk file deletion warning:', storageErr);
      }

      // 2. Delete rows from submissions table
      const { data, error } = await adminClient
        .from('submissions')
        .delete()
        .in('id', ids)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: data?.length ?? ids.length });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
