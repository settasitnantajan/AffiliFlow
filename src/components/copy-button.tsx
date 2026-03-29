"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// iOS-safe clipboard copy
function copyToClipboard(text: string): boolean {
  // Try modern API first (works on most browsers)
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // Fallback: textarea trick (works on iOS Chrome/Safari)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label,
  videoId,
}: {
  text: string;
  label?: string;
  videoId?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Copy FIRST (synchronous) before any async work — required for iOS
    copyToClipboard(text);
    setCopied(true);
    toast.success("คัดลอกแล้ว");

    // Then mark as posted (async, non-blocking)
    if (videoId) {
      fetch("/api/videos/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId }),
      }).then(() => {
        router.refresh();
        window.dispatchEvent(new Event("badge-refresh"));
      });
    }

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="shrink-0 active:scale-95 transition-transform"
    >
      {copied ? "คัดลอกแล้ว ✓" : label ?? "คัดลอก"}
    </Button>
  );
}
