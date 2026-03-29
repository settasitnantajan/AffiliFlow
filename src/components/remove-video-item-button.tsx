"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function RemoveVideoItemButton({
  videoResultId,
  videoUrl,
}: {
  videoResultId: string;
  videoUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/videos/remove-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoResultId, videoUrl }),
      });
      if (res.ok) {
        toast.success("ลบวีดีโอแล้ว");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="ลบวีดีโอนี้"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบวีดีโอนี้?</DialogTitle>
            <DialogDescription>
              วีดีโอจะถูกลบออกจากรายการ ไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
