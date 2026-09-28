import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { calculatePrintAmount } from '@/lib/utils';
import { CreateSectionInput, UploadSection } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminClient = createAdminSupabaseClient();
    const { data, error } = await adminClient
      .from('upload_sections')
      .select('*, submissions(count)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('API getSections Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sections = (data || []).map((sec: any) => ({
      ...sec,
      submissions_count: sec.submissions?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ success: true, data: sections });
  } catch (err: unknown) {
    console.error('API getSections error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const input: CreateSectionInput = await request.json();
    const newSection: UploadSection = {
      ...input,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'sec-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submissions_count: 0,
    };

    const adminClient = createAdminSupabaseClient();
    const { data, error } = await adminClient
      .from('upload_sections')
      .insert([newSection])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { ...data, submissions_count: 0 } });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create section' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body as { id: string; updates: Partial<UploadSection> };

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates parameter' }, { status: 400 });
    }

    const adminClient = createAdminSupabaseClient();
    const { data, error } = await adminClient
      .from('upload_sections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Recalculate submission amounts if rates changed
    if ('xerox_rate' in updates || 'extra_charge' in updates) {
      try {
        const { data: sectionSubmissions } = await adminClient
          .from('submissions')
          .select('id, page_count')
          .eq('upload_section_id', id);

        const pricePerPage = Number(data.xerox_rate) || 0;
        const extraCharge = Number(data.extra_charge) || 0;

        for (const sub of sectionSubmissions || []) {
          await adminClient
            .from('submissions')
            .update({
              amount: calculatePrintAmount(Number(sub.page_count) || 1, pricePerPage, extraCharge),
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);
        }
      } catch (calcErr) {
        console.warn('Recalculate pricing error:', calcErr);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update section' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing section id' }, { status: 400 });
    }

    const adminClient = createAdminSupabaseClient();
    const { error } = await adminClient.from('upload_sections').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete section' },
      { status: 500 }
    );
  }
}
