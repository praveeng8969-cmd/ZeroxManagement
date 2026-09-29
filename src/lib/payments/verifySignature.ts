import 'server-only';
import crypto from 'crypto';

interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}

interface VerifyWebhookParams {
  rawBody: string;
  signature: string;
  secret: string;
}

/**
 * Timing-safe HMAC SHA256 verification for Razorpay payment checkout signatures.
 * Signature formula: HMAC_SHA256(order_id + "|" + razorpay_payment_id, secret)
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
  secret,
}: VerifyPaymentParams): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    console.error('Error verifying payment signature:', err);
    return false;
  }
}

/**
 * Timing-safe HMAC SHA256 verification for Razorpay webhook payloads.
 * Webhook signature comes in 'x-razorpay-signature' header.
 * Raw unparsed body must be matched against the secret.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  secret,
}: VerifyWebhookParams): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return false;
  }
}
