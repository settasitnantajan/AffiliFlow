"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// iOS-safe clipboard copy
function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
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
  } catch { /* ignore */ }
}

export function CopyAllButton({
  text,
  videoId,
}: {
  text: string;
  videoId?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    toast.success("คัดลอกทั้งหมดแล้ว");

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
      variant="default"
      size="lg"
      onClick={handleCopy}
      className="w-full text-base active:scale-[0.98] transition-transform"
    >
      {copied ? "คัดลอกแล้ว ✓" : "คัดลอกทั้งหมด (แคปชั่น + ลิงก์)"}
    </Button>
  );
}
