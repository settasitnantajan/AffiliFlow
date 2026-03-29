"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteQueueButton } from "@/components/delete-queue-button";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Eye, Pencil, Save, X } from "lucide-react";
import { formatThai } from "@/lib/utils";
import { toast } from "sonner";

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  processing: "default",
  done: "secondary",
  failed: "destructive",
};

interface QueueItem {
  id: string;
  status: string;
  product_name?: string;
  price?: string;
  commission_rate?: string;
  image_url?: string;
  shopee_url: string;
  created_at: string;
  processed_at?: string;
  lens_products?: { title: string; price: string; source: string }[];
}

function QueueDetailModal({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: QueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCommission, setEditCommission] = useState("");

  const startEdit = () => {
    if (!item) return;
    setEditName(item.product_name ?? "");
    setEditPrice(item.price ?? "");
    setEditCommission(item.commission_rate ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/queue/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: editName,
          price: editPrice,
          commission_rate: editCommission,
        }),
      });
      if (res.ok) {
        toast.success("บันทึกแล้ว");
        setEditing(false);
        onSaved?.();
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;
  const canEdit = item.status === "queued";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base leading-snug">
                {item.product_name ?? "รอ AI วิเคราะห์..."}
              </DialogTitle>
              <DialogDescription>
                เพิ่มเมื่อ {formatThai(item.created_at)}
              </DialogDescription>
            </div>
            {canEdit && !editing && (
              <Button variant="outline" size="sm" onClick={startEdit} className="shrink-0 gap-1.5">
                <Pencil className="h-3 w-3" />
                แก้ไข
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Image — constrained height */}
          {item.image_url && (
            <img
              src={item.image_url}
              alt=""
              className="max-h-48 w-auto mx-auto rounded-lg border object-contain"
            />
          )}

          {/* Edit form */}
          {editing ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ชื่อสินค้า</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ราคา</label>
                  <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ค่าคอม</label>
                  <Input value={editCommission} onChange={(e) => setEditCommission(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  <X className="h-3 w-3 mr-1" />
                  ยกเลิก
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  บันทึก
                </Button>
              </div>
            </div>
          ) : (
            /* Details (read-only) */
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">สถานะ:</span>
                <Badge variant={statusColors[item.status] ?? "outline"}>
                  {item.status}
                </Badge>
              </div>

              {item.price && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ราคา:</span>
                  <span>{item.price}</span>
                </div>
              )}

              {item.commission_rate && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ค่าคอม:</span>
                  <span className="text-green-500">{item.commission_rate}</span>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">ลิงก์:</span>
                <a
                  href={item.shopee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline break-all block mt-0.5"
                >
                  {item.shopee_url}
                </a>
              </div>

              {item.processed_at && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ประมวลผลเมื่อ:</span>
                  <span>{formatThai(item.processed_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Google Lens results */}
          {item.lens_products && item.lens_products.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1.5">สินค้าที่คล้าย (Google Lens)</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {item.lens_products.map((lp, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-muted/50 px-2 py-1.5 rounded-md text-xs">
                    <span className="truncate flex-1">{lp.title}</span>
                    <span className="shrink-0 text-green-500">{lp.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QueueList({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const pending = items.filter((q) => q.status === "queued");
  const others = items
    .filter((q) => q.status !== "queued")
    .sort((a, b) => new Date(b.processed_at ?? b.created_at).getTime() - new Date(a.processed_at ?? a.created_at).getTime());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [modalItem, setModalItem] = useState<QueueItem | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((p) => p.id)));
    }
  };

  const runSingle = async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/pipeline/run-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        toast.success("Pipeline เสร็จสิ้น");
      } else {
        toast.error("Pipeline ล้มเหลว");
      }
      router.refresh();
      window.dispatchEvent(new Event("badge-refresh"));
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const runSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setBatchRunning(true);
    setRunningIds(new Set(ids));
    toast.info(`กำลังรัน ${ids.length} รายการ...`);
    try {
      const res = await fetch("/api/pipeline/run-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        toast.success(`รันเสร็จ ${ids.length} รายการ`);
      } else {
        toast.error("Pipeline ล้มเหลว");
      }
      setSelected(new Set());
      router.refresh();
      window.dispatchEvent(new Event("badge-refresh"));
    } finally {
      setBatchRunning(false);
      setRunningIds(new Set());
    }
  };

  const isAnyRunning = runningIds.size > 0;

  const renderCard = (item: QueueItem, i?: number) => {
    const isPending = item.status === "queued";
    const isItemRunning = runningIds.has(item.id);

    return (
      <Card
        key={item.id}
        className={
          isPending && selected.has(item.id) ? "ring-2 ring-primary/50" : ""
        }
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Left: checkbox (pending only) */}
            {isPending && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <Checkbox
                  checked={selected.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  disabled={isAnyRunning}
                />
                <span className="text-xs font-bold text-muted-foreground">
                  {(i ?? 0) + 1}
                </span>
              </div>
            )}

            {/* Thumbnail — clickable to open modal */}
            {item.image_url && (
              <button
                onClick={() => setModalItem(item)}
                className="shrink-0 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-all"
              >
                <img
                  src={item.image_url}
                  alt=""
                  className={`${isPending ? "w-14 h-14" : "w-12 h-12"} object-cover`}
                />
              </button>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setModalItem(item)}
                  className="text-sm font-medium break-words line-clamp-2 text-left hover:underline"
                >
                  {item.product_name ?? (isPending ? "รอ AI วิเคราะห์..." : "-")}
                </button>
                <Badge
                  variant={
                    statusColors[isItemRunning ? "processing" : item.status] ??
                    "outline"
                  }
                  className="shrink-0 text-[10px]"
                >
                  {isItemRunning ? "processing" : item.status}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                {item.price && <span>{item.price}</span>}
                {item.commission_rate && (
                  <span className="text-green-500">
                    ค่าคอม {item.commission_rate}
                  </span>
                )}
              </div>

              {/* Bottom row: date + actions */}
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {item.processed_at
                    ? formatThai(item.processed_at)
                    : formatThai(item.created_at)}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setModalItem(item)}
                    title="ดูรายละเอียด"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {isPending && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setModalItem(item)}
                      title="แก้ไข"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {(isPending || item.status === "done" || item.status === "failed") && (
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => runSingle(item.id)}
                      disabled={isAnyRunning}
                      title={isPending ? "รัน Pipeline" : "รันซ้ำ"}
                    >
                      {isItemRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  <DeleteQueueButton id={item.id} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Modal */}
      <QueueDetailModal
        item={modalItem}
        open={!!modalItem}
        onOpenChange={(open) => !open && setModalItem(null)}
        onSaved={() => { setModalItem(null); router.refresh(); }}
      />

      {/* Pending queue header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">รอคิว ({pending.length})</h2>
        {pending.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={isAnyRunning}
            >
              {selected.size === pending.length
                ? "ยกเลิกทั้งหมด"
                : "เลือกทั้งหมด"}
            </Button>
            {selected.size > 0 && (
              <Button
                size="sm"
                onClick={runSelected}
                disabled={batchRunning}
                className="gap-1.5"
              >
                {batchRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                รัน {selected.size} รายการ
              </Button>
            )}
          </div>
        )}
      </div>

      {pending.length > 0 ? (
        <div className="space-y-2 mb-8">
          {pending.map((item, i) => renderCard(item, i))}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">
              ไม่มีสินค้าในคิว — เพิ่มสินค้าเพื่อเริ่มผลิตวีดีโอ
            </p>
            <a
              href="/upload"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              ไปหน้าอัพโหลด
            </a>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {others.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            ประวัติ ({others.length})
          </h2>
          <div className="space-y-2">
            {others.map((item) => renderCard(item))}
          </div>
        </>
      )}
    </>
  );
}
