export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailedResponse {
  error: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface RazorpayOptions {
  key?: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
  handler?: (response: RazorpaySuccessResponse) => void | Promise<void>;
  [key: string]: unknown;
}

export interface RazorpayCheckoutInstance {
  open: () => void;
  on: (
    event: 'payment.failed' | string,
    callback: (response: RazorpayFailedResponse) => void
  ) => void;
  close?: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckoutInstance;
  }
}
