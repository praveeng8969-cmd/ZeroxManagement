import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getRazorpayClient, getRazorpayKeySecret, isRazorpayConfigured } from '@/lib/payments/razorpay';
import { verifyPaymentSignature } from '@/lib/payments/verifySignature';
import { rupeesToPaise } from '@/lib/payments/money';

export const dynamic = 'force-dynamic';

const VerifyPaymentSchema = z.object({
  submissionId: z.string().min(1, 'submissionId is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = VerifyPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { submissionId, razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      parseResult.data;

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Payment gateway configuration missing' },
        { status: 503 }
      );
    }

    const adminClient = await createAdminSupabaseClient();

    // 1. Fetch submission from database
    const { data: submission, error: subError } = await adminClient
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (subError || !submission) {
      return NextResponse.json(
        { error: 'Submission record not found.' },
        { status: 404 }
      );
    }

    // 2. Idempotency check: if already verified and marked Paid, return safe response
    if (String(submission.payment_status).toLowerCase() === 'paid') {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        status: 'Paid',
        payment_id: submission.razorpay_payment_id || razorpay_payment_id,
        order_id: submission.razorpay_order_id || razorpay_order_id,
        amount: submission.payment_amount || submission.amount,
      });
    }

    // 3. MANDATORY SECURITY: Use the order ID stored in OUR database, NOT the client's
    const authoritativeOrderId = submission.razorpay_order_id;
    if (!authoritativeOrderId) {
      return NextResponse.json(
        { error: 'No active Razorpay order associated with this submission.' },
        { status: 400 }
      );
    }

    if (authoritativeOrderId !== razorpay_order_id) {
      console.warn('Order ID mismatch in verification:', {
        stored: authoritativeOrderId,
        received: razorpay_order_id,
        submissionId,
      });
      return NextResponse.json(
        { error: 'Razorpay order identifier does not match our records.' },
        { status: 400 }
      );
    }

    // 4. Server-side HMAC SHA256 timing-safe verification
    const secret = getRazorpayKeySecret();
    const isSignatureValid = verifyPaymentSignature({
      orderId: authoritativeOrderId,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      secret,
    });

    if (!isSignatureValid) {
      console.error('Razorpay signature verification failed for submission:', submissionId);
      return NextResponse.json(
        { error: 'Payment signature verification failed. Payment cannot be confirmed.' },
        { status: 400 }
      );
    }

    // 5. Fetch payment directly from Razorpay API to confirm details
    const razorpay = getRazorpayClient();
    let paymentDetails;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchErr) {
      console.error('Error fetching payment from Razorpay API:', fetchErr);
      return NextResponse.json(
        { error: 'Unable to verify payment status with Razorpay servers.' },
        { status: 502 }
      );
    }

    if (!paymentDetails) {
      return NextResponse.json(
        { error: 'Payment details could not be retrieved.' },
        { status: 404 }
      );
    }

    // 6. Validate fetched payment against expected parameters
    if (paymentDetails.order_id !== authoritativeOrderId) {
      console.error('Fetched payment order mismatch:', {
        paymentOrderId: paymentDetails.order_id,
        authoritativeOrderId,
      });
      return NextResponse.json(
        { error: 'Payment does not belong to this order.' },
        { status: 400 }
      );
    }

    const expectedRupees = Number(submission.payment_amount) || Number(submission.amount) || 0;
    const expectedPaise = rupeesToPaise(expectedRupees);

    if (Number(paymentDetails.amount) !== expectedPaise) {
      console.error('Payment amount mismatch:', {
        expectedPaise,
        receivedPaise: paymentDetails.amount,
      });
      return NextResponse.json(
        { error: 'Payment amount mismatch detected. Please contact support.' },
        { status: 400 }
      );
    }

    if (paymentDetails.currency !== 'INR') {
      return NextResponse.json(
        { error: 'Invalid currency. Only INR payments are supported.' },
        { status: 400 }
      );
    }

    // Status must be 'captured' or 'authorized'
    const allowedPaymentStatuses = ['captured', 'authorized'];
    if (!allowedPaymentStatuses.includes(paymentDetails.status)) {
      console.warn('Payment not in final captured status:', paymentDetails.status);
      return NextResponse.json(
        { error: `Payment is currently ${paymentDetails.status}. Verification cannot proceed.` },
        { status: 400 }
      );
    }

    // 7. Update the submission record in database
    const nowIso = new Date().toISOString();
    const paidAtIso = paymentDetails.created_at
      ? new Date(Number(paymentDetails.created_at) * 1000).toISOString()
      : nowIso;

    const { error: updateError } = await adminClient
      .from('submissions')
      .update({
        payment_status: 'Paid',
        payment_source: 'razorpay',
        razorpay_payment_id: paymentDetails.id,
        payment_amount: expectedRupees,
        payment_currency: 'INR',
        payment_method: paymentDetails.method || 'online',
        payment_verified_at: nowIso,
        payment_paid_at: paidAtIso,
        updated_at: nowIso,
      })
      .eq('id', submission.id);

    if (updateError) {
      console.error('Error updating submission payment status in Supabase:', updateError);
      return NextResponse.json(
        { error: 'Failed to record payment confirmation in database.' },
        { status: 500 }
      );
    }

    // 8. Optionally record in payments audit table
    try {
      await adminClient.from('payments').insert([
        {
          submission_id: submission.id,
          amount: expectedRupees,
          payment_status: 'Paid',
          payment_method: `Razorpay (${paymentDetails.method || 'online'})`,
          paid_at: paidAtIso,
          updated_at: nowIso,
        },
      ]);
    } catch (auditErr) {
      // Non-fatal audit log warning
      console.warn('Payments audit table insert warning:', auditErr);
    }

    return NextResponse.json({
      success: true,
      status: 'Paid',
      payment_id: paymentDetails.id,
      order_id: authoritativeOrderId,
      amount: expectedRupees,
      method: paymentDetails.method,
    });
  } catch (err: unknown) {
    console.error('Error during payment verification:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Server error verifying payment.',
      },
      { status: 500 }
    );
  }
}
