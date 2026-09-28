'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { UploadSection, Submission } from '@/types';
import { DataStore } from '@/lib/data-store';
import { calculatePrintAmount, formatCurrency, formatDate, formatBytes } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { PDFDocument } from 'pdf-lib';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  CreditCard,
  ArrowLeft,
  Lock,
  Sparkles,
  RefreshCw,
  User,
  Hash,
  Building2,
  ShieldCheck,
  Printer,
  Clock,
  Check,
} from 'lucide-react';

import { RazorpaySuccessResponse } from '@/types/razorpay';

interface UploadPageProps {
  params: Promise<{ slug: string }>;
}

export default function UploadPage({ params }: UploadPageProps) {
  const resolvedParams = use(params);
  const [section, setSection] = useState<UploadSection | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [detectingPages, setDetectingPages] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // UI & Flow State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [successSubmission, setSuccessSubmission] = useState<Submission | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<{ paymentId: string; orderId: string } | null>(null);

  const loadRazorpay = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePaymentAndSubmit = async (replaceExisting = false) => {
    if (!section) return;
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!rollNumber.trim()) {
      setErrorMessage('Please enter your Roll Number / Register Number.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select or drop a PDF file to upload.');
      return;
    }
    if (!Number.isInteger(Number(pageCount)) || Number(pageCount) < 1) {
      setErrorMessage('Please enter a valid number of pages.');
      return;
    }

    setErrorMessage('');
    setPaymentError('');

    // 1. Check duplicate submission first before initiating payment
    if (!replaceExisting) {
      try {
        const found = await DataStore.getSubmissionByRollNumber(section.id, rollNumber);
        if (found) {
          setExistingSubmission(found);
          setShowDuplicateModal(true);
          return;
        }
      } catch (err) {
        console.warn('Duplicate check warning:', err);
      }
    }

    const totalAmount = calculatePrintAmount(
      Number(pageCount),
      section.xerox_rate,
      section.extra_charge
    );
    const amountInPaise = Math.max(100, Math.round(totalAmount * 100));

    setIsPaying(true);

    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load the payment window. Check your internet connection and retry.');
      }

      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}_${rollNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`,
          notes: {
            roll_number: rollNumber,
            name,
            department: department || '',
            section_id: section.id,
            section_title: section.title,
          },
        }),
      });

      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || 'Unable to start payment.');

      const checkout = new window.Razorpay({
        key: order.key_id || order.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Xerox Printing Desk',
        description: `${section?.title || 'Document printing'} - ${rollNumber}`,
        order_id: order.order_id || order.orderId,
        prefill: { name },
        notes: {
          roll_number: rollNumber,
          section_id: section.id,
        },
        theme: { color: '#0284c7' },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
            setErrorMessage('Payment was cancelled. Your document has NOT been submitted and no invoice was generated.');
          },
        },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            setIsPaying(false);
            setIsUploading(true);
            setUploadProgress(20);

            // Verify payment signature on backend
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyResult = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyResult.success) {
              throw new Error(verifyResult.error || 'Payment signature verification failed.');
            }

            // ONLY AFTER PAYMENT IS COMPLETED & VERIFIED: upload file and create submission record!
            const progressTimer = setInterval(() => {
              setUploadProgress((prev) => {
                if (prev >= 90) {
                  clearInterval(progressTimer);
                  return 90;
                }
                return prev + 25;
              });
            }, 120);

            const res = await DataStore.createOrReplaceSubmission({
              upload_section_id: section.id,
              name,
              roll_number: rollNumber,
              department,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/pdf',
              pageCount: Number(pageCount),
              file,
              replaceExisting,
              payment_status: 'Paid',
              payment_method: `Razorpay (${response.razorpay_payment_id})`,
            });

            clearInterval(progressTimer);
            setUploadProgress(100);

            setTimeout(() => {
              setIsUploading(false);
              setShowDuplicateModal(false);
              setPaymentDetails({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
              });
              setSuccessSubmission(res.submission);
            }, 300);
          } catch (error) {
            setIsUploading(false);
            setUploadProgress(0);
            setErrorMessage(error instanceof Error ? error.message : 'Unable to complete submission after payment.');
          }
        },
      });

      checkout.on('payment.failed', (response) => {
        setErrorMessage(response.error?.description || 'Payment failed. Document has NOT been submitted.');
        setIsPaying(false);
      });
      checkout.open();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start payment.');
      setIsPaying(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadSection() {
      try {
        const found = await DataStore.getSectionBySlug(resolvedParams.slug);
        if (active) setSection(found);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadSection();
    };

    loadSection();

    window.addEventListener('printtrack_sections_updated', loadSection);
    window.addEventListener('storage', loadSection);
    window.addEventListener('focus', loadSection);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('printtrack_sections_updated', loadSection);
      window.removeEventListener('storage', loadSection);
      window.removeEventListener('focus', loadSection);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [resolvedParams.slug]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = async (selectedFile: File) => {
    setErrorMessage('');
    setFile(null);
    setPageCount('');
    if (!section) return;

    // Check size
    const maxBytes = section.max_file_size * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setErrorMessage(`File is too large. Maximum allowed size is ${section.max_file_size} MB.`);
      setFile(null);
      return;
    }

    const isPdf = selectedFile.type.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Automatic page pricing requires a PDF file. Please convert your document to PDF and upload it again.');
      return;
    }

    setDetectingPages(true);
    try {
      const pdf = await PDFDocument.load(await selectedFile.arrayBuffer());
      const detectedPages = pdf.getPageCount();
      if (detectedPages < 1) throw new Error('The PDF does not contain any pages.');
      setPageCount(String(detectedPages));
    } catch {
      setFile(null);
      setPageCount('');
      setErrorMessage('Could not read the PDF page count. Please upload a valid, unlocked PDF.');
      return;
    } finally {
      setDetectingPages(false);
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!rollNumber.trim()) {
      setErrorMessage('Please enter your Roll Number / Register Number.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select or drop a PDF file to upload.');
      return;
    }
    if (!Number.isInteger(Number(pageCount)) || Number(pageCount) < 1) {
      setErrorMessage('Please enter a valid number of pages.');
      return;
    }

    await handlePaymentAndSubmit(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
          <Printer className="absolute h-6 w-6 text-sky-600 animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">Loading Section & Rates...</p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mb-4 shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Upload Section Not Found</h2>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          The requested upload section does not exist or may have been deleted by the administrator.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-700 shadow-md shadow-sky-600/20 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Sections
        </Link>
      </div>
    );
  }

  const isClosed = section.status === 'closed';
  const calculatedTotal = file && Number(pageCount) > 0
    ? calculatePrintAmount(Number(pageCount), section.xerox_rate, section.extra_charge)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-100/60 pb-16 pt-4 sm:pt-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-xs border border-slate-200/80 px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-white hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
            <span>All Sections</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Official Student Portal</span>
          </div>
        </div>

        {/* SUCCESS STATE - OFFICIAL DIGITAL RECEIPT */}
        {successSubmission ? (
          <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-emerald-500/5 animate-in fade-in zoom-in-95">
            {/* Header Badge */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/25">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200">
                Payment & Upload Complete
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                Print Request Received!
              </h1>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                Your report has been submitted to the printing desk queue. Present your Roll Number at the counter for collection.
              </p>
            </div>

            {/* Official Digital Receipt Card */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-100/70 px-5 py-3 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-sky-600" />
                  <span>Xerox Desk Digital Receipt</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {formatDate(successSubmission.uploaded_at)}
                </span>
              </div>

              <div className="divide-y divide-slate-200/60 p-5 text-xs sm:text-sm">
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-500 text-xs">Upload Section</span>
                  <span className="font-bold text-slate-900 text-right">{section.title}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-500 text-xs">Student Name</span>
                  <span className="font-bold text-slate-900 text-right">{successSubmission.name}</span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-500 text-xs">Roll Number</span>
                  <span className="font-mono font-bold text-sky-700 text-right">
                    {successSubmission.roll_number}
                  </span>
                </div>
                {successSubmission.department && (
                  <div className="grid grid-cols-2 py-2">
                    <span className="text-slate-500 text-xs">Department / Class</span>
                    <span className="font-medium text-slate-800 text-right">
                      {successSubmission.department}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-500 text-xs">Submitted Document</span>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {successSubmission.file_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 py-2">
                  <span className="text-slate-500 text-xs">Pages Detected</span>
                  <span className="font-bold text-slate-900 text-right">
                    {successSubmission.page_count} pages
                  </span>
                </div>
                <div className="grid grid-cols-2 py-2.5 bg-emerald-50/50 -mx-5 px-5">
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-emerald-700" />
                    Amount Paid
                  </span>
                  <span className="font-extrabold text-emerald-700 text-right text-base">
                    {formatCurrency(successSubmission.amount)}
                  </span>
                </div>
                {paymentDetails?.paymentId && (
                  <div className="grid grid-cols-2 py-2 text-[11px]">
                    <span className="text-slate-500">Transaction Ref</span>
                    <span className="font-mono font-semibold text-slate-600 text-right truncate">
                      {paymentDetails.paymentId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                <span>Print / Save Receipt</span>
              </button>

              <button
                onClick={() => {
                  setSuccessSubmission(null);
                  setFile(null);
                  setName('');
                  setRollNumber('');
                  setDepartment('');
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload Another Report</span>
              </button>
            </div>

            {section.public_submission_list && (
              <div className="mt-4 text-center">
                <Link
                  href={`/submissions/${section.slug}`}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                >
                  View Public Submissions Queue for this Section →
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE UPLOAD FORM VIEW */
          <div className="space-y-5">
            {/* Section Information Hero Card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40">
              {/* Header Gradient Top Banner */}
              <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 px-6 py-7 sm:px-8 sm:py-8 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-medium text-white border border-white/20">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isClosed ? 'Closed' : 'Accepting Submissions'}</span>
                  </div>

                  <span className="font-mono text-xs text-sky-100 bg-sky-800/40 px-2.5 py-0.5 rounded-lg border border-sky-400/20">
                    /{section.slug}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                  {section.title}
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-2xl">
                  {section.description || 'Upload your final document for high-quality Xerox and report printing.'}
                </p>
              </div>

              {/* Rates and Deadline Highlight Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-slate-100 bg-slate-50/80 p-4 sm:p-5 text-xs">
                <div className="px-2 sm:px-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Printing Rate
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                      {formatCurrency(section.xerox_rate)}
                    </span>
                    <span className="text-slate-500 font-medium">/ page</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    + {formatCurrency(section.extra_charge)} handling/binding
                  </span>
                </div>

                <div className="px-2 sm:px-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Submission Deadline
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800 text-xs sm:text-sm">
                    <Calendar className="h-4 w-4 text-sky-600 shrink-0" />
                    <span>{formatDate(section.deadline)}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Strict deadline enforcement
                  </span>
                </div>

                <div className="hidden sm:block px-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Format & Size
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800 text-sm">
                    <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>PDF Only</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Max size: {section.max_file_size} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Professional Guidelines & Caution Banner */}
            <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/40 p-4 sm:p-5 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 border border-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900 uppercase tracking-wide text-xs">
                      Formatting & Submission Notice
                    </span>
                    <span className="rounded bg-amber-200/70 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                      Important
                    </span>
                  </div>
                  <p className="text-amber-900/90 leading-relaxed">
                    Verify all font alignments, diagram margins, and page numbering before submitting.
                    Documents are printed exactly as uploaded. Only unlocked <span className="font-bold">PDF files</span> are
                    accepted for automated page calculation.
                  </p>
                </div>
              </div>
            </div>

            {/* CLOSED STATE ALERT */}
            {isClosed ? (
              <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg shadow-rose-500/5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3 border border-rose-100">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Submissions are Closed</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Submissions for this section have concluded. Please contact your coordinator or the Xerox counter desk for manual assistance.
                </p>
                {section.public_submission_list && (
                  <Link
                    href={`/submissions/${section.slug}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    <span>Check Submitted Student Roster</span>
                    <span>→</span>
                  </Link>
                )}
              </div>
            ) : (
              /* MODERN UPLOAD & PAYMENT FORM */
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/30 space-y-6"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Student Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    No login required. Enter your details accurately so your printed copies can be tagged properly.
                  </p>
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. PRAVEEN G"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Roll Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Roll Number / Reg No <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 25CS174"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                        className="w-full uppercase font-mono rounded-xl border border-slate-200 bg-slate-50/40 pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  {/* Department (Optional) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Department / Class <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Computer Science - Section B"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/40 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Modern Drag and Drop Document Area */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Upload Document (PDF) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-sky-600 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Auto Price Calculator
                    </span>
                  </div>

                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-all duration-200 ${
                      dragActive
                        ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                        : file
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={handleFileChange}
                      accept=".pdf,application/pdf"
                    />

                    {detectingPages ? (
                      <div className="flex flex-col items-center py-4">
                        <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin mb-3" />
                        <p className="text-sm font-bold text-slate-800">Analyzing Document...</p>
                        <p className="text-xs text-slate-500 mt-1">Reading PDF page count and calculating fee...</p>
                      </div>
                    ) : file ? (
                      <div className="flex flex-col items-center max-w-md">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-3 shadow-xs">
                          <FileText className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                          {file.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                            {formatBytes(file.size)}
                          </span>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            {pageCount} Pages Detected
                          </span>
                        </div>
                        <span className="mt-3 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer">
                          Click or drop another PDF to replace
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3 border border-sky-100 shadow-xs">
                          <UploadCloud className="h-7 w-7" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          Drop your student PDF here, or <span className="text-sky-600 underline">browse</span>
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400 max-w-sm">
                          PDF files up to {section.max_file_size} MB. Pages and price will be calculated instantly.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Order Summary Card (Displayed when file is selected) */}
                {file && Number(pageCount) > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 p-4 sm:p-5 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-600" />
                        Printing Price Breakdown
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {pageCount} Pages Total
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>
                          Printing ({pageCount} pages × {formatCurrency(section.xerox_rate)})
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(Number(pageCount) * section.xerox_rate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Additional / Binding Charge</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(section.extra_charge)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-emerald-200/60">
                        <span className="text-sm font-bold text-slate-900">Total Payable Amount</span>
                        <span className="text-xl font-extrabold text-emerald-700">
                          {formatCurrency(calculatedTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>100% Safe Checkout via Razorpay • UPI, GooglePay, PhonePe, Cards, NetBanking</span>
                    </div>
                  </div>
                )}

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200 animate-in fade-in">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" />
                        Uploading document & finalizing receipt...
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit / Pay Button */}
                <button
                  type="submit"
                  disabled={isUploading || isPaying}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-600 to-indigo-600 px-6 py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-sky-600/25 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Uploading Report & Generating Receipt...</span>
                    </>
                  ) : isPaying ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Opening Secure Razorpay Window...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>
                        {file && calculatedTotal > 0
                          ? `Pay ${formatCurrency(calculatedTotal)} & Submit Report`
                          : 'Select Document to Calculate Fee'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* DUPLICATE SUBMISSION MODAL */}
        <Modal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          title="Duplicate Submission Detected"
          variant="warning"
          description={`Roll Number "${rollNumber}" already has an uploaded file in this section.`}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 border border-amber-200">
              <p className="font-bold">You already have a submission in this upload section.</p>
              {existingSubmission && (
                <p className="mt-1 text-[11px] text-amber-800">
                  Previous file: <span className="font-semibold">{existingSubmission.file_name}</span> (uploaded {formatDate(existingSubmission.uploaded_at)})
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Replacing the submission will overwrite your previous document with the new one.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  void handlePaymentAndSubmit(true);
                }}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm cursor-pointer"
              >
                Replace Existing File
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
