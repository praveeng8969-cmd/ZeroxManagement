'use client';

import React, { useState } from 'react';
import { PaymentStatus } from '@/types';
import { loadRazorpayCheckoutScript } from '@/lib/payments/loadScript';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface RazorpayPaymentButtonProps {
  submissionId: string;
  amountInRupees: number;
  studentName?: string;
  studentRoll?: string;
  sectionTitle?: string;
  currentPaymentStatus?: PaymentStatus;
  onPaymentSuccess?: (result: { paymentId: string; amount: number }) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function RazorpayPaymentButton({
  submissionId,
  amountInRupees,
  studentName = '',
  studentRoll = '',
  sectionTitle = '',
  currentPaymentStatus = 'Pending',
  onPaymentSuccess,
  onPaymentError,
  className = '',
  size = 'md',
}: RazorpayPaymentButtonProps) {
  const [btnState, setBtnState] = useState<
    'idle' | 'creating_order' | 'checkout_open' | 'verifying' | 'paid' | 'failed'
  >(currentPaymentStatus === 'Paid' ? 'paid' : 'idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isAlreadyPaid = currentPaymentStatus === 'Paid' || btnState === 'paid';

  const handlePayClick = async () => {
    if (isAlreadyPaid || btnState === 'creating_order' || btnState === 'verifying') {
      return;
    }

    setErrorMessage('');
    setBtnState('creating_order');

    try {
      // 1. Create order on secure server endpoint
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        if (orderData.alreadyPaid) {
          setBtnState('paid');
          return;
        }
        if (orderData.zeroPayment) {
          setBtnState('paid');
          onPaymentSuccess?.({ paymentId: 'zero_charge', amount: 0 });
          return;
        }
        throw new Error(orderData.error || 'Failed to create payment order.');
      }

      // 2. Load Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayCheckoutScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment window. Please check your internet connection.');
      }

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'PrintTrack',
        description: `Xerox Payment - ${orderData.sectionTitle || sectionTitle || 'Print Request'}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.studentName || studentName || undefined,
        },
        notes: {
          submission_id: submissionId,
          roll_number: orderData.studentRoll || studentRoll || undefined,
        },
        theme: {
          color: '#0284c7', // Sky-600
        },
        modal: {
          ondismiss: () => {
            // User closed the modal without completing payment
            // DO NOT permanently mark payment as failed. Keep report safe.
            setBtnState('idle');
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setBtnState('verifying');
          try {
            // 4. Server-side signature & transaction verification
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            setBtnState('paid');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('printtrack_submissions_updated'));
            }
            onPaymentSuccess?.({
              paymentId: response.razorpay_payment_id,
              amount: verifyData.amount || amountInRupees,
            });
          } catch (verifyErr: unknown) {
            const msg =
              verifyErr instanceof Error
                ? verifyErr.message
                : 'Payment verification failed. Your file is safe; please contact support or retry.';
            setErrorMessage(msg);
            setBtnState('failed');
            onPaymentError?.(msg);
          }
        },
      };

      setBtnState('checkout_open');
      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (failResponse: { error?: { description?: string } }) => {
        console.warn('Razorpay checkout payment.failed:', failResponse?.error);
        const description =
          failResponse?.error?.description || 'Payment was declined or failed.';
        setErrorMessage(description);
        setBtnState('failed');
        onPaymentError?.(description);
      });

      rzp.open();
    } catch (err: unknown) {
      console.error('Error during checkout flow:', err);
      const msg = err instanceof Error ? err.message : 'Unable to initiate payment.';
      setErrorMessage(msg);
      setBtnState('failed');
      onPaymentError?.(msg);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-xs sm:text-sm',
    lg: 'px-6 py-3 text-sm sm:text-base',
  }[size];

  // Already Paid State
  if (isAlreadyPaid) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs sm:text-sm font-bold text-emerald-800 shadow-2xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Payment Received</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handlePayClick}
        disabled={btnState === 'creating_order' || btnState === 'verifying'}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${
          btnState === 'failed'
            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
            : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-sky-600/25'
        } ${sizeClasses} ${className}`}
      >
        {btnState === 'creating_order' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing secure payment...</span>
          </>
        ) : btnState === 'checkout_open' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing in Razorpay...</span>
          </>
        ) : btnState === 'verifying' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying payment...</span>
          </>
        ) : btnState === 'failed' ? (
          <>
            <RefreshCw className="h-4 w-4" />
            <span>Retry Payment ({formatCurrency(amountInRupees)})</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            <span>Pay {formatCurrency(amountInRupees)}</span>
          </>
        )}
      </button>

      {errorMessage && btnState === 'failed' && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 mt-1 max-w-sm">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
