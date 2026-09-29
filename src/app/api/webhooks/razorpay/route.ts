import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getRazorpayWebhookSecret } from '@/lib/payments/razorpay';
import { verifyWebhookSignature } from '@/lib/payments/verifySignature';
import { rupeesToPaise } from '@/lib/payments/money';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. MUST READ RAW BODY FIRST for HMAC verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('Webhook received without x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const webhookSecret = getRazorpayWebhookSecret();
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured in environment variables');
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 500 }
      );
    }

    // 2. Timing-safe verification of the RAW request body
    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
      secret: webhookSecret,
    });

    if (!isValid) {
      console.error('Invalid Razorpay webhook signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    // 3. Parse JSON only AFTER signature verification has succeeded
    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const eventEntity = payload.payload;

    if (!event || !eventEntity) {
      return NextResponse.json({ error: 'Malformed webhook event payload' }, { status: 400 });
    }

    // Construct unique event key for idempotency
    const eventId =
      payload.event_id ||
      payload.id ||
      `${event}_${eventEntity.payment?.entity?.id || eventEntity.order?.entity?.id || Date.now()}`;

    const adminClient = await createAdminSupabaseClient();

    // 4. Check idempotency: check if this event has already been processed
    const { data: existingEvent } = await adminClient
      .from('payment_webhook_events')
      .select('id, status')
      .eq('event_key', eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ status: 'already_processed', event_id: eventId }, { status: 200 });
    }

    // 5. Extract payment and order information
    const payment = eventEntity.payment?.entity;
    const order = eventEntity.order?.entity;
    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;

    // 6. Process specific events
    if (event === 'payment.captured' || event === 'order.paid') {
      if (orderId) {
        // Find matching submission by stored razorpay_order_id or notes
        let { data: submission } = await adminClient
          .from('submissions')
          .select('*')
          .eq('razorpay_order_id', orderId)
          .maybeSingle();

        // Fallback to notes.submission_id if order_id lookup didn't match
        if (!submission && payment?.notes?.submission_id) {
          const { data: subByNote } = await adminClient
            .from('submissions')
            .select('*')
            .eq('id', payment.notes.submission_id)
            .maybeSingle();
          submission = subByNote;
        }

        if (submission) {
          const isAlreadyPaid = String(submission.payment_status).toLowerCase() === 'paid';

          if (!isAlreadyPaid) {
            const expectedRupees =
              Number(submission.payment_amount) || Number(submission.amount) || 0;
            const expectedPaise = rupeesToPaise(expectedRupees);

            // If amount matches or payment captured
            const amountMatches = payment ? Number(payment.amount) === expectedPaise : true;
            if (amountMatches) {
              const nowIso = new Date().toISOString();
              const paidAtIso = payment?.created_at
                ? new Date(Number(payment.created_at) * 1000).toISOString()
                : nowIso;

              await adminClient
                .from('submissions')
                .update({
                  payment_status: 'Paid',
                  payment_source: 'razorpay',
                  razorpay_payment_id: paymentId || submission.razorpay_payment_id,
                  razorpay_order_id: orderId,
                  payment_amount: expectedRupees,
                  payment_currency: 'INR',
                  payment_method: payment?.method || submission.payment_method || 'online',
                  payment_verified_at: nowIso,
                  payment_paid_at: paidAtIso,
                  updated_at: nowIso,
                })
                .eq('id', submission.id);

              // Record in payments audit table
              try {
                await adminClient.from('payments').insert([
                  {
                    submission_id: submission.id,
                    amount: expectedRupees,
                    payment_status: 'Paid',
                    payment_method: `Razorpay (${payment?.method || 'online'})`,
                    paid_at: paidAtIso,
                    updated_at: nowIso,
                  },
                ]);
              } catch (auditErr) {
                console.warn('Webhook audit log warning:', auditErr);
              }
            }
          }
        }
      }
    } else if (event === 'payment.failed') {
      if (orderId) {
        const { data: submission } = await adminClient
          .from('submissions')
          .select('id, payment_status')
          .eq('razorpay_order_id', orderId)
          .maybeSingle();

        // ONLY mark failed if NOT already Paid! Paid status takes strict priority.
        if (submission && String(submission.payment_status).toLowerCase() !== 'paid') {
          await adminClient
            .from('submissions')
            .update({
              payment_status: 'Failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', submission.id);
        }
      }
    } else if (event === 'refund.processed' || event === 'refund.created') {
      if (orderId) {
        const { data: submission } = await adminClient
          .from('submissions')
          .select('id')
          .eq('razorpay_order_id', orderId)
          .maybeSingle();

        if (submission) {
          await adminClient
            .from('submissions')
            .update({
              payment_status: 'Refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', submission.id);
        }
      }
    }

    // 7. Record event in idempotency table
    try {
      await adminClient.from('payment_webhook_events').insert([
        {
          event_key: eventId,
          event_type: event,
          razorpay_payment_id: paymentId || null,
          razorpay_order_id: orderId || null,
          received_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          status: 'processed',
          payload: {
            event,
            order_id: orderId,
            payment_id: paymentId,
          },
        },
      ]);
    } catch (saveErr) {
      console.warn('Webhook idempotency record warning:', saveErr);
    }

    return NextResponse.json({ received: true, event }, { status: 200 });
  } catch (err: unknown) {
    console.error('Error handling Razorpay webhook:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook handler error' },
      { status: 500 }
    );
  }
}
