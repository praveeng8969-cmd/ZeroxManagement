import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayClient, getRazorpayCredentials } from '@/lib/razorpay';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

interface CreateOrderRequestBody {
  amount?: number | string; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  submissionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay credentials are not configured on server.' },
        { status: 401 }
      );
    }

    let body: CreateOrderRequestBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    let amountInPaise: number | null = null;
    let receipt = body.receipt;
    const notes: Record<string, string> = { ...(body.notes || {}) };

    // If submissionId is provided, fetch amount from Supabase database
    if (body.submissionId) {
      try {
        const supabase = createAdminSupabaseClient();
        const { data: submission, error } = await supabase
          .from('submissions')
          .select('id, amount, name, roll_number, payment_status')
          .eq('id', body.submissionId)
          .single();

        if (error || !submission) {
          return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
        }
        if (submission.payment_status === 'Paid') {
          return NextResponse.json({ error: 'This submission is already paid.' }, { status: 409 });
        }

        amountInPaise = Math.round(Number(submission.amount) * 100);
        receipt = receipt || `sub_${submission.id.replace(/-/g, '').slice(0, 30)}`;
        notes.submission_id = submission.id;
        notes.roll_number = submission.roll_number;
        notes.name = submission.name;
      } catch (err) {
        console.error('Failed to lookup submission:', err);
      }
    }

    // If amount is directly provided
    if (amountInPaise === null && body.amount !== undefined) {
      const parsed = Number(body.amount);
      if (!Number.isNaN(parsed)) {
        amountInPaise = Math.round(parsed);
      }
    }

    // Validation: amount must be present and >= 100 paise
    if (amountInPaise === null || !Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json(
        {
          error: 'Invalid amount. Minimum amount is 100 paise (₹1.00).',
          minimum_amount: 100,
        },
        { status: 400 }
      );
    }

    const currency = (body.currency || 'INR').toUpperCase();
    receipt = receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });

    return NextResponse.json(
      {
        order_id: order.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: keyId,
        keyId,
        receipt: order.receipt,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error creating Razorpay order:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create Razorpay order.';
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number((error as { statusCode: number }).statusCode)
        : null;

    if (statusCode === 401 || errorMessage.toLowerCase().includes('authenticate') || errorMessage.toLowerCase().includes('key')) {
      return NextResponse.json(
        { error: 'Razorpay authentication failed. Please verify API keys.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
