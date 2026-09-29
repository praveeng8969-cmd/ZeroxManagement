let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  // If already loaded on window
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve(true);
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve) => {
    // Check if script tag already exists in DOM
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}
