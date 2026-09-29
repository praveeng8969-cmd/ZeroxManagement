import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getRazorpayClient, getRazorpayKeyId, isRazorpayConfigured } from '@/lib/payments/razorpay';
import { rupeesToPaise } from '@/lib/payments/money';
import { calculatePrintAmount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CreateOrderSchema = z.object({
  submissionId: z.string().min(1, 'submissionId is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { submissionId } = parseResult.data;

    // Check if Razorpay keys are configured
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payment gateway is not currently configured. Please contact administrator.' },
        { status: 503 }
      );
    }

    const adminClient = await createAdminSupabaseClient();

    // 1. Fetch submission with associated section
    const { data: submission, error: subError } = await adminClient
      .from('submissions')
      .select('*, upload_section:upload_sections(*)')
      .eq('id', submissionId)
      .maybeSingle();

    if (subError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found or could not be loaded.' },
        { status: 404 }
      );
    }

    // 2. Prevent repeated order creation if already paid
    const currentPaymentStatus = String(submission.payment_status || '').toLowerCase();
    if (currentPaymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'This submission has already been marked as Paid.', alreadyPaid: true },
        { status: 400 }
      );
    }

    // 3. Server determines authoritative amount
    // Snapshot priority: submission.payment_amount -> submission.amount -> calculate from section rate
    const section = submission.upload_section;
    if (!section) {
      return NextResponse.json(
        { error: 'Upload category for this submission could not be found.' },
        { status: 404 }
      );
    }

    let authoritativeRupees = Number(submission.payment_amount);
    if (!authoritativeRupees || isNaN(authoritativeRupees) || authoritativeRupees <= 0) {
      authoritativeRupees = Number(submission.amount);
    }
    if (!authoritativeRupees || isNaN(authoritativeRupees) || authoritativeRupees <= 0) {
      authoritativeRupees = calculatePrintAmount(
        Number(submission.page_count) || 1,
        Number(section.xerox_rate) || 1.5,
        Number(section.extra_charge) || 40
      );
    }

    // If Xerox rate / price is zero
    if (authoritativeRupees <= 0) {
      // Mark as Paid directly since no charge is due
      await adminClient
        .from('submissions')
        .update({
          payment_status: 'Paid',
          payment_source: 'manual',
          payment_amount: 0,
          payment_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      return NextResponse.json({
        zeroPayment: true,
        message: 'No payment is required for this submission.',
        amountInRupees: 0,
      });
    }

    const amountInPaise = rupeesToPaise(authoritativeRupees);

    if (amountInPaise < 100) {
      // Razorpay minimum charge is 100 paise (₹1.00)
      return NextResponse.json(
        { error: 'Payment amount must be at least ₹1.00.' },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayClient();

    // 4. Check if an active unpaid Razorpay order already exists on this submission
    let razorpayOrder: { id: string; amount: number | string; currency: string } | null = null;

    if (submission.razorpay_order_id) {
      try {
        const existingOrder = await razorpay.orders.fetch(submission.razorpay_order_id);
        if (
          existingOrder &&
          existingOrder.status === 'created' &&
          Number(existingOrder.amount) === amountInPaise &&
          existingOrder.currency === 'INR'
        ) {
          razorpayOrder = existingOrder as { id: string; amount: number | string; currency: string };
        }
      } catch {
        // If order expired or fetch failed, we will create a fresh order below
        razorpayOrder = null;
      }
    }

    // 5. Create fresh Razorpay order if not reusing
    if (!razorpayOrder) {
      const cleanRoll = submission.roll_number.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
      const shortId = submission.id.replace(/-/g, '').slice(0, 12);
      const receipt = `PRT_${cleanRoll}_${shortId}`.slice(0, 40);

      const orderOptions = {
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          submission_id: submission.id,
          roll_number: submission.roll_number,
          student_name: submission.name,
          upload_section_id: section.id,
          upload_section_title: String(section.title).slice(0, 40),
        },
      };

      const createdOrder = await razorpay.orders.create(orderOptions);
      razorpayOrder = createdOrder as { id: string; amount: number | string; currency: string };

      // Persist order id and snapshot amount on submission
      await adminClient
        .from('submissions')
        .update({
          razorpay_order_id: razorpayOrder.id,
          payment_amount: authoritativeRupees,
          payment_currency: 'INR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
    }

    // 6. Return safe public payment details to client
    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: Number(razorpayOrder.amount),
      currency: razorpayOrder.currency,
      keyId: getRazorpayKeyId(),
      submissionId: submission.id,
      studentName: submission.name,
      studentRoll: submission.roll_number,
      sectionTitle: section.title,
      amountInRupees: authoritativeRupees,
    });
  } catch (err: unknown) {
    console.error('Error creating Razorpay order:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unable to create payment order. Please try again.',
      },
      { status: 500 }
    );
  }
}
