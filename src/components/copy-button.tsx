"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    if (videoId) {
      await fetch("/api/videos/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId }),
      });
      router.refresh();
      window.dispatchEvent(new Event("badge-refresh"));
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
