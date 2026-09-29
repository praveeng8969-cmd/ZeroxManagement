import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 });
    }

    const adminClient = await createAdminSupabaseClient();
    const { data: submission, error } = await adminClient
      .from('submissions')
      .select('*, upload_section:upload_sections(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Return safe submission status fields for public student tracking
    return NextResponse.json({
      success: true,
      data: {
        id: submission.id,
        name: submission.name,
        roll_number: submission.roll_number,
        department: submission.department,
        file_name: submission.file_name,
        page_count: submission.page_count,
        amount: submission.payment_amount || submission.amount,
        submission_status: submission.submission_status,
        xerox_status: submission.xerox_status,
        payment_status: submission.payment_status,
        payment_source: submission.payment_source,
        payment_method: submission.payment_method,
        razorpay_payment_id: submission.razorpay_payment_id,
        payment_paid_at: submission.payment_paid_at,
        uploaded_at: submission.uploaded_at,
        upload_section: submission.upload_section,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch submission' },
      { status: 500 }
    );
  }
}
