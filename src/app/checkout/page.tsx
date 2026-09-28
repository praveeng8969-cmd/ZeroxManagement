'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { RazorpayCheckoutButton } from '@/components/RazorpayCheckoutButton';

export default function CheckoutPage() {
  const [amountRupees, setAmountRupees] = useState<number>(10);
  const [studentName, setStudentName] = useState('John Doe');
  const [rollNumber, setRollNumber] = useState('21CS042');
  const [email, setEmail] = useState('student@university.edu');
  const [phone, setPhone] = useState('9876543210');
  const [lastPayment, setLastPayment] = useState<{
    paymentId: string;
    orderId: string;
    amount: number;
    time: string;
  } | null>(null);

  // Amount in paise: 1 INR = 100 paise (min 100 paise)
  const amountInPaise = Math.max(100, Math.round(Number(amountRupees || 1) * 100));

  const presets = [1, 5, 20, 50, 100];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Upload Sections</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 mb-2">
              <Sparkles className="h-3 w-3" />
              <span>Razorpay Standard Web Checkout</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Online Print & Xerox Payment
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Seamlessly pay Xerox charges using UPI, NetBanking, Cards, or Wallets.
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-xs">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Payment Amount Configuration */}
        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select or Enter Amount (₹)
            </label>
            <div className="flex items-center gap-2 mb-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountRupees(val)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    amountRupees === val
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="0.5"
                value={amountRupees}
                onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                placeholder="Enter amount in INR"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Equivalent to <span className="font-mono font-medium">{amountInPaise} paise</span> (Minimum: 100 paise)
            </p>
          </div>

          {/* Student / Customer Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number
              </label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Service Description</span>
              <span className="font-medium text-slate-800">PrintTrack Xerox Service</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Gateway</span>
              <span className="font-medium text-slate-800">Razorpay Standard Checkout</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Verification</span>
              <span className="font-medium text-slate-800">HMAC-SHA256 Server Signature</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/80 pt-2 text-sm font-bold text-slate-900">
              <span>Total Payable</span>
              <span className="text-emerald-700">₹{amountRupees.toFixed(2)}</span>
            </div>
          </div>

          {/* RAZORPAY CHECKOUT BUTTON INTEGRATION */}
          <div className="pt-2">
            <RazorpayCheckoutButton
              amount={amountInPaise}
              currency="INR"
              name="PrintTrack Xerox Desk"
              description={`Xerox Payment - ${rollNumber}`}
              prefill={{
                name: studentName,
                email,
                contact: phone,
              }}
              notes={{
                student_name: studentName,
                roll_number: rollNumber,
              }}
              onSuccess={(result) => {
                setLastPayment({
                  paymentId: result.payment_id,
                  orderId: result.order_id,
                  amount: amountRupees,
                  time: new Date().toLocaleTimeString(),
                });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 active:scale-[0.99] transition-all cursor-pointer"
              buttonText={
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Pay ₹{amountRupees.toFixed(2)} with Razorpay</span>
                </span>
              }
            />
          </div>

          {/* Success Display */}
          {lastPayment && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Payment & Verification Completed Successfully!</span>
              </div>
              <div className="space-y-1 text-slate-700 font-mono text-[11px]">
                <p>Payment ID: <span className="font-semibold text-emerald-900">{lastPayment.paymentId}</span></p>
                <p>Order ID: <span className="font-semibold text-slate-800">{lastPayment.orderId}</span></p>
                <p>Amount Verified: <span className="font-semibold text-slate-800">₹{lastPayment.amount.toFixed(2)}</span></p>
                <p>Timestamp: <span className="text-slate-500">{lastPayment.time}</span></p>
              </div>
            </div>
          )}

          {/* Security & Verification note */}
          <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Protected by Razorpay 256-bit encryption. Payment authenticity is verified via server-side HMAC-SHA256 signature verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
