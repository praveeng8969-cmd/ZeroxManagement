import 'server-only';
import Razorpay from 'razorpay';

export function getRazorpayKeyId(): string {
  const key = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  return key.trim();
}

export function getRazorpayKeySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return secret.trim();
}

export function getRazorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  return secret.trim();
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

export function isRazorpayTestMode(): boolean {
  const key = getRazorpayKeyId();
  return key.startsWith('rzp_test_');
}

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials are not configured. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}
