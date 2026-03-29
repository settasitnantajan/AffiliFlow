"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const stepLabels: Record<string, string> = {
  queue: "กำลังดึงสินค้าจากคิว...",
  vision: "AI กำลังวิเคราะห์รูปสินค้า...",
  video: "กำลังค้นหาและดาวน์โหลดวีดีโอ...",
  caption: "AI กำลังเขียนแคปชั่น...",
  saving: "กำลังบันทึกผลลัพธ์...",
  done: "เสร็จสิ้น!",
};

interface PipelineStatus {
  running: boolean;
  id?: string;
  status?: string;
  step_current?: string;
  progress?: number;
  error_log?: string;
  lastRun?: {
    id: string;
    status: string;
    step_current: string;
    progress: number;
    completed_at: string;
    error_log: string | null;
  } | null;
}

export function PipelineRunner() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepKey, setStepKey] = useState("");
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasRunningRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/status");
      if (!res.ok) return;
      const data: PipelineStatus = await res.json();

      if (data.running) {
        // Pipeline is running
        setIsRunning(true);
        setProgress(data.progress ?? 0);
        setStepKey(data.step_current ?? "");
        wasRunningRef.current = true;
      } else {
        // Pipeline is NOT running
        setIsRunning(false);
        setProgress(0);
        setStepKey("");
        stopPolling();

        // Show result only if we were tracking a run
        if (wasRunningRef.current && data.lastRun) {
          wasRunningRef.current = false;
          if (data.lastRun.status === "success") {
            setResult({ type: "success", message: "Pipeline เสร็จสิ้น!" });
            toast.success("Pipeline เสร็จสิ้น!");
          } else if (data.lastRun.status === "failed") {
            const errMsg = data.lastRun.error_log ?? "Pipeline ล้มเหลว";
            setResult({ type: "error", message: errMsg });
            toast.error(errMsg);
          }
          router.refresh();
          window.dispatchEvent(new Event("badge-refresh"));
        }
      }
    } catch {
      // Ignore fetch errors during poll
    }
  }, [router, stopPolling]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already polling
    pollStatus();
    intervalRef.current = setInterval(pollStatus, 2000);
  }, [pollStatus]);

  const startPipeline = async () => {
    setIsRunning(true);
    setResult(null);
    setProgress(0);
    setStepKey("queue");
    wasRunningRef.current = true;

    try {
      // Fire & forget — don't await the full pipeline
      fetch("/api/pipeline/run", { method: "POST" });

      // Start polling after a short delay
      setTimeout(startPolling, 1000);
    } catch {
      setIsRunning(false);
      setResult({ type: "error", message: "ไม่สามารถเริ่ม Pipeline ได้" });
    }
  };

  // Check if already running on mount
  useEffect(() => {
    async function checkInitial() {
      try {
        const res = await fetch("/api/pipeline/status");
        if (!res.ok) return;
        const data: PipelineStatus = await res.json();

        if (data.running) {
          setIsRunning(true);
          setProgress(data.progress ?? 0);
          setStepKey(data.step_current ?? "");
          wasRunningRef.current = true;
          startPolling();
        }
        // If not running, do nothing — stay idle
      } catch {
        // Ignore
      }
    }

    checkInitial();

    return stopPolling;
  }, [startPolling, stopPolling]);

  const stepLabel = stepLabels[stepKey] ?? stepKey;

  return (
    <Card className="mb-6">
      <CardContent className="pt-5 pb-4 space-y-4">
        {/* Header row: title + button */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">รัน Pipeline</p>
            <p className="text-xs text-muted-foreground">
              ประมวลผลสินค้าถัดไปในคิว
            </p>
          </div>
          <Button
            onClick={startPipeline}
            disabled={isRunning}
            size="default"
            className="min-w-[120px] active:scale-95 transition-transform"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <Spinner />
                กำลังทำงาน
              </span>
            ) : (
              "เริ่ม Pipeline"
            )}
          </Button>
        </div>

        {/* Progress section — only show when running */}
        {isRunning && (
          <div className="space-y-2">
            {/* Step label */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stepLabel}</span>
              <span className="font-mono font-medium">{progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-4 w-full rounded-full bg-muted/50 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    progress >= 90
                      ? "linear-gradient(90deg, #16a34a, #4ade80, #16a34a)"
                      : progress >= 40
                      ? "linear-gradient(90deg, #2563eb, #38bdf8, #a78bfa, #2563eb)"
                      : "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s linear infinite",
                  boxShadow:
                    progress >= 90
                      ? "0 0 12px #4ade80, 0 0 4px #22c55e"
                      : progress >= 40
                      ? "0 0 12px #60a5fa, 0 0 4px #3b82f6"
                      : "0 0 12px #fbbf24, 0 0 4px #f59e0b",
                }}
              />
            </div>
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>

            {/* Step indicators */}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className={progress >= 10 ? "text-foreground" : ""}>คิว</span>
              <span className={progress >= 20 ? "text-foreground" : ""}>วิเคราะห์</span>
              <span className={progress >= 40 ? "text-foreground" : ""}>วีดีโอ</span>
              <span className={progress >= 70 ? "text-foreground" : ""}>แคปชั่น</span>
              <span className={progress >= 90 ? "text-foreground" : ""}>บันทึก</span>
              <span className={progress >= 100 ? "text-foreground" : ""}>เสร็จ</span>
            </div>
          </div>
        )}

        {/* Result message */}
        {result && !isRunning && (
          <div
            className={`text-sm px-3 py-2 rounded-lg ${
              result.type === "success"
                ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {result.type === "success" ? "✓ " : "✕ "}
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** CSS-only spinner */
function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"
      role="status"
      aria-label="loading"
    />
  );
}
