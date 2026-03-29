"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  videoResultId: string;
  videoUrl: string;
  captionText: string;
  hashtags: string[];
  productLinks: { url: string }[];
  alreadyAdded?: boolean;
}

export function AddToProductionButton({
  videoResultId,
  videoUrl,
  captionText,
  hashtags,
  productLinks,
  alreadyAdded = false,
}: Props) {
  const router = useRouter();
  const [added, setAdded] = useState(alreadyAdded);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (added) {
        // Remove from production
        const res = await fetch("/api/production", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_url: videoUrl }),
        });
        if (res.ok) {
          setAdded(false);
          toast.success("ยกเลิกเลือกแล้ว");
          router.refresh();
          window.dispatchEvent(new Event("badge-refresh"));
        }
      } else {
        // Add to production
        const res = await fetch("/api/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_result_id: videoResultId,
            video_url: videoUrl,
            caption_text: captionText,
            hashtags,
            product_links: productLinks,
          }),
        });
        if (res.ok) {
          setAdded(true);
          toast.success("เพิ่มไป Production แล้ว");
          router.refresh();
          window.dispatchEvent(new Event("badge-refresh"));
        } else if (res.status === 409) {
          setAdded(true);
          toast.info("เพิ่มไปแล้ว");
        } else {
          toast.error("เพิ่มไม่สำเร็จ");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={added ? "default" : "outline"}
      onClick={handleToggle}
      disabled={loading}
      className="gap-1"
    >
      {added ? (
        <><Check className="h-3 w-3" /> เลือกแล้ว</>
      ) : (
        <><Plus className="h-3 w-3" /> เลือก</>
      )}
    </Button>
  );
}
