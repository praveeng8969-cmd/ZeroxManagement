/**
 * Utility functions for precise, floating-point safe monetary calculations.
 * Razorpay expects all amounts in paise (1 INR = 100 paise).
 */

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'number' ? rupees : parseFloat(String(rupees)) || 0;
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number | string): number {
  const num = typeof paise === 'number' ? paise : parseInt(String(paise), 10) || 0;
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num) / 100;
}

export function isZeroPayment(rupees: number | string): boolean {
  return rupeesToPaise(rupees) <= 0;
}
