'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

import {
  RazorpaySuccessResponse,
  RazorpayOptions,
} from '@/types/razorpay';

export interface RazorpayCheckoutButtonProps {
  /**
   * Amount in paise (1 INR = 100 paise). Minimum 100 paise.
   */
  amount: number;
  currency?: string;
  receipt?: string;
  submissionId?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  buttonText?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  showStatusMessages?: boolean;
  onSuccess?: (data: {
    payment_id: string;
    order_id: string;
    signature: string;
  }) => void;
  onFailure?: (error: string) => void;
  onDismiss?: () => void;
}

/**
 * Loads the Razorpay standard checkout.js script asynchronously.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const scriptSrc = 'https://checkout.razorpay.com/v1/checkout.js';
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);

    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({
  amount,
  currency = 'INR',
  receipt,
  submissionId,
  name = 'PrintTrack Xerox Management',
  description = 'Online Print Payment',
  prefill,
  notes,
  themeColor = '#0284c7',
  buttonText,
  className = '',
  disabled = false,
  showStatusMessages = true,
  onSuccess,
  onFailure,
  onDismiss,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setStatusMessage(null);

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay checkout script. Please check your network connection.');
      }

      // 2. Call backend order creation endpoint: POST /api/create-order
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
          submissionId,
          notes,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create payment order.');
      }

      // Key fallback order: returned key_id > env variable
      const razorpayKey =
        orderData.key_id ||
        orderData.keyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      // 3. Configure Razorpay modal options
      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name,
        description,
        order_id: orderData.order_id || orderData.orderId,
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
          contact: prefill?.contact || '',
        },
        notes: {
          ...(notes || {}),
          ...(submissionId ? { submission_id: submissionId } : {}),
        },
        theme: {
          color: themeColor,
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatusMessage({
              type: 'info',
              text: 'Payment was cancelled or closed.',
            });
            onDismiss?.();
          },
        },
        // 4. On payment success, verify signature on backend: POST /api/verify-payment
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            setLoading(true);
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                submission_id: submissionId,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.error || 'Payment signature verification failed.'
              );
            }

            setStatusMessage({
              type: 'success',
              text: `Payment successful! ID: ${response.razorpay_payment_id}`,
            });

            onSuccess?.({
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
          } catch (err: unknown) {
            const msg =
              err instanceof Error
                ? err.message
                : 'Payment verification failed.';
            setStatusMessage({ type: 'error', text: msg });
            onFailure?.(msg);
          } finally {
            setLoading(false);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      // 5. Handle payment failure event
      razorpayInstance.on('payment.failed', (failedResponse) => {
        const errorMsg =
          failedResponse.error?.description ||
          failedResponse.error?.reason ||
          'Payment processing failed. Please try again.';
        setStatusMessage({ type: 'error', text: errorMsg });
        onFailure?.(errorMsg);
        setLoading(false);
      });

      razorpayInstance.open();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to initiate payment.';
      setStatusMessage({ type: 'error', text: msg });
      onFailure?.(msg);
      setLoading(false);
    }
  };

  const defaultButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer';

  return (
    <div className="w-full">
      <button
        type="button"
        id="razorpay-checkout-button"
        onClick={handlePayment}
        disabled={disabled || loading}
        className={className || defaultButtonClass}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          buttonText || (
            <>
              <CreditCard className="h-4 w-4" />
              <span>
                Pay ₹{(amount / 100).toFixed(2)} with Razorpay
              </span>
            </>
          )
        )}
      </button>

      {showStatusMessages && statusMessage && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
