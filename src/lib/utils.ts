import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export const PRICE_PER_PAGE = 1.5;
export const CALICO_CHARGE = 40;

export function calculatePrintAmount(pageCount: number): number {
  return Math.max(0, pageCount) * PRICE_PER_PAGE + CALICO_CHARGE;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

export function isFileTypeAllowed(filename: string, mimeType: string, allowedTypes: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  const ext = getFileExtension(filename);
  
  return allowedTypes.some((type) => {
    const t = type.toLowerCase().trim();
    if (t === 'pdf' && (ext === 'pdf' || mimeType.includes('pdf'))) return true;
    if (t === 'docx' && (ext === 'docx' || ext === 'doc' || mimeType.includes('word'))) return true;
    if (t === 'pptx' && (ext === 'pptx' || ext === 'ppt' || mimeType.includes('presentation'))) return true;
    if (t === 'images' && (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || mimeType.startsWith('image/'))) return true;
    if (t === ext) return true;
    return false;
  });
}
