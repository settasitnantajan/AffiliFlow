"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyAllButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
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
