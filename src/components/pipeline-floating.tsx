"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const stepLabels: Record<string, string> = {
  queue: "ดึงสินค้าจากคิว...",
  vision: "AI วิเคราะห์รูป...",
  video: "ค้นหาวีดีโอ...",
  caption: "เขียนแคปชั่น...",
  saving: "บันทึกผลลัพธ์...",
  done: "เสร็จสิ้น!",
};

interface PipelineStatus {
  running: boolean;
  step_current?: string;
  progress?: number;
  lastRun?: {
    status: string;
    error_log: string | null;
  } | null;
}

export function PipelineFloating() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepKey, setStepKey] = useState("");
  const wasRunningRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/status");
      if (!res.ok) return;
      const data: PipelineStatus = await res.json();

      if (data.running) {
        setIsRunning(true);
        setProgress(data.progress ?? 0);
        setStepKey(data.step_current ?? "");
        wasRunningRef.current = true;
      } else {
        if (wasRunningRef.current && data.lastRun) {
          wasRunningRef.current = false;
          if (data.lastRun.status === "success") {
            toast.success("Pipeline เสร็จสิ้น!");
          } else if (data.lastRun.status === "failed") {
            toast.error(data.lastRun.error_log ?? "Pipeline ล้มเหลว");
          }
          router.refresh();
          window.dispatchEvent(new Event("badge-refresh"));
        }
        setIsRunning(false);
      }
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [poll]);

  if (!isRunning) return null;

  const stepLabel = stepLabels[stepKey] ?? stepKey;
  const barColor =
    progress >= 90
      ? "linear-gradient(90deg, #16a34a, #4ade80, #16a34a)"
      : progress >= 40
      ? "linear-gradient(90deg, #2563eb, #38bdf8, #a78bfa, #2563eb)"
      : "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)";
  const glowColor =
    progress >= 90
      ? "0 0 12px #4ade80, 0 0 4px #22c55e"
      : progress >= 40
      ? "0 0 12px #60a5fa, 0 0 4px #3b82f6"
      : "0 0 12px #fbbf24, 0 0 4px #f59e0b";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10 p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin" />
          <span className="text-xs font-medium">Pipeline</span>
        </div>
        <span className="text-xs font-mono font-medium">{progress}%</span>
      </div>

      {/* Step label */}
      <p className="text-[11px] text-muted-foreground mb-2 truncate">{stepLabel}</p>

      {/* Progress bar */}
      <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden border border-white/10">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundImage: barColor,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s linear infinite",
            boxShadow: glowColor,
          }}
        />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Step dots */}
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
        <span className={progress >= 10 ? "text-foreground" : ""}>คิว</span>
        <span className={progress >= 20 ? "text-foreground" : ""}>วิเคราะห์</span>
        <span className={progress >= 40 ? "text-foreground" : ""}>วีดีโอ</span>
        <span className={progress >= 70 ? "text-foreground" : ""}>แคปชั่น</span>
        <span className={progress >= 90 ? "text-foreground" : ""}>บันทึก</span>
        <span className={progress >= 100 ? "text-foreground" : ""}>เสร็จ</span>
      </div>
    </div>
  );
}
