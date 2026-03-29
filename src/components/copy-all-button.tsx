"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyAllButton({
  text,
  videoId,
}: {
  text: string;
  videoId?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("คัดลอกทั้งหมดแล้ว");

    // Mark video as posted
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
      variant="default"
      size="lg"
      onClick={handleCopy}
      className="w-full text-base active:scale-[0.98] transition-transform"
    >
      {copied ? "คัดลอกแล้ว ✓" : "คัดลอกทั้งหมด (แคปชั่น + ลิงก์)"}
    </Button>
  );
}
