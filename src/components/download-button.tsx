"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DownloadButton({ url }: { url: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `affiliflow_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleDownload}
      disabled={downloading}
      className="w-full sm:w-auto active:scale-95 transition-transform"
    >
      {downloading ? "กำลังดาวน์โหลด..." : "ดาวน์โหลดวีดีโอ"}
    </Button>
  );
}
