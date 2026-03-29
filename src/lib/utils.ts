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

/** Clean product name — strip junk from Shopee/Lens titles */
export function cleanProductName(raw: string): string {
  return raw
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s*\|\s*(Shopee|Lazada|Shopee Thailand|Lazada\.co\.th).*/gi, "")
    .replace(/ใส่ได้\d*โค้ด\)?/g, "")
    .replace(/ลด\d+%/g, "")
    .replace(/ส่งฟรี/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2600}-\u{26FF}\u{2700}-\u{27BF}‼️‼]+/gu, "")
    .replace(/\b[A-Z]\d{4,}[A-Z]?\b/g, "")
    .replace(/[!]{2,}/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
