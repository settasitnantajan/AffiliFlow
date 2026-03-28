import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function parsePrice(str: string): number {
  return parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
}

/** Format date to Thai timezone (Asia/Bangkok) */
export function formatThai(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    ...options,
  });
}

/** Short Thai date: "28 มี.ค. 15:30" */
export function formatThaiShort(date: string | Date): string {
  return formatThai(date, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
