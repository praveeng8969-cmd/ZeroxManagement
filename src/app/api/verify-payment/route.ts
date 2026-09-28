import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature, getRazorpayCredentials, getRazorpayClient } from '@/lib/razorpay';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

interface VerifyPaymentRequestBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  // Aliases for versatility
  order_id?: string;
  payment_id?: string;
  signature?: string;
  orderId?: string;
  paymentId?: string;
  submission_id?: string;
  submissionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: 'Razorpay secret is not configured on server.' },
        { status: 500 }
      );
    }

    let body: VerifyPaymentRequestBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const orderId = body.razorpay_order_id || body.order_id || body.orderId;
    const paymentId = body.razorpay_payment_id || body.payment_id || body.paymentId;
    const signature = body.razorpay_signature || body.signature;

    // Validate required fields
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payment verification fields (order_id, payment_id, signature).',
        },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA256 signature
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature, keySecret);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Signature verification failed. Potential tampering detected.',
        },
        { status: 400 }
      );
    }

    // Determine if linked to a submission in the database
    let submissionId = body.submission_id || body.submissionId;

    // If submissionId not directly provided, try inspecting order notes from Razorpay
    if (!submissionId) {
      try {
        const client = getRazorpayClient();
        const order = (await client.orders.fetch(orderId)) as { notes?: Record<string, string> };
        if (order?.notes?.submission_id) {
          submissionId = order.notes.submission_id;
        }
      } catch (err) {
        console.warn('Could not fetch order notes for submission association:', err);
      }
    }

    // If associated with a submission, update payment status in Supabase database
    if (submissionId) {
      try {
        const supabase = createAdminSupabaseClient();
        const paidAt = new Date().toISOString();

        // 1. Get submission to verify amount
        const { data: submission } = await supabase
          .from('submissions')
          .select('id, amount')
          .eq('id', submissionId)
          .maybeSingle();

        // 2. Upsert payment record
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('submission_id', submissionId)
          .maybeSingle();

        if (existingPayment) {
          await supabase
            .from('payments')
            .update({
              amount: submission?.amount || 0,
              payment_status: 'Paid',
              payment_method: `Razorpay (${paymentId})`,
              paid_at: paidAt,
              updated_at: paidAt,
            })
            .eq('id', existingPayment.id);
        } else {
          await supabase.from('payments').insert({
            submission_id: submissionId,
            amount: submission?.amount || 0,
            payment_status: 'Paid',
            payment_method: `Razorpay (${paymentId})`,
            paid_at: paidAt,
            updated_at: paidAt,
          });
        }

        // 3. Mark submission as Paid
        await supabase
          .from('submissions')
          .update({
            payment_status: 'Paid',
            updated_at: paidAt,
          })
          .eq('id', submissionId);
      } catch (dbError) {
        console.error('Error recording payment in database:', dbError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment signature verified successfully.',
        order_id: orderId,
        payment_id: paymentId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error verifying Razorpay payment:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal error verifying payment.';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
