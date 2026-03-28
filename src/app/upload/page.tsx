"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_ITEMS = 30;

interface QueueItem {
  shopee_url: string;
  image: File | null;
  preview: string | null;
}

const emptyItem = (): QueueItem => ({
  shopee_url: "",
  image: null,
  preview: null,
});

export default function UploadPage() {
  const [items, setItems] = useState<QueueItem[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateUrl = (index: number, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], shopee_url: value };
      return next;
    });
  };

  const updateImage = (index: number, file: File | null) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        image: file,
        preview: file ? URL.createObjectURL(file) : null,
      };
      return next;
    });
  };

  const addRow = () => {
    if (items.length >= MAX_ITEMS) return;
    setItems((prev) => [...prev, emptyItem()]);
  };

  const addMultipleRows = (count: number) => {
    const remaining = MAX_ITEMS - items.length;
    const toAdd = Math.min(count, remaining);
    if (toAdd <= 0) return;
    setItems((prev) => [...prev, ...Array.from({ length: toAdd }, emptyItem)]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.shopee_url.trim());
    if (validItems.length === 0) {
      setMessage("กรุณาใส่ Shopee URL อย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);
    setMessage("");

    const results = await Promise.allSettled(
      validItems.map(async (item) => {
        const formData = new FormData();
        formData.append("shopee_url", item.shopee_url);
        if (item.image) {
          formData.append("image", item.image);
        }
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
      })
    );
    const successCount = results.filter((r) => r.status === "fulfilled").length;

    setMessage(
      `เพิ่มเข้าคิวสำเร็จ ${successCount}/${validItems.length} รายการ`
    );
    if (successCount > 0) {
      setItems([emptyItem()]);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Upload สินค้า</h1>
      <p className="text-muted-foreground mb-4">
        Screenshot จาก affiliate.shopee.co.th + วาง Shopee URL (สูงสุด {MAX_ITEMS} รายการ)
      </p>

      {/* Header row — hidden on mobile */}
      <div className="hidden sm:grid grid-cols-[40px_120px_1fr_40px] gap-2 mb-2 px-2 text-xs font-medium text-muted-foreground">
        <span>#</span>
        <span>รูป Screenshot</span>
        <span>Shopee URL</span>
        <span></span>
      </div>

      {/* Item rows */}
      <div className="space-y-3 sm:space-y-2 mb-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-col sm:grid sm:grid-cols-[40px_120px_1fr_40px] gap-2 sm:items-center bg-muted/30 sm:bg-transparent p-3 sm:p-0 rounded-lg"
          >
            {/* Number + remove (mobile: inline row) */}
            <div className="flex items-center justify-between sm:contents">
              <span className="text-sm font-bold text-muted-foreground sm:text-center">
                #{i + 1}
              </span>
              <div className="sm:hidden">
                {items.length > 1 && (
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-500 hover:text-red-600 text-lg px-2"
                    title="ลบ"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Image upload */}
            <div className="relative">
              {item.preview ? (
                <div
                  className="w-full sm:w-[120px] h-[80px] rounded-lg border overflow-hidden cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById(`img-${i}`);
                    input?.click();
                  }}
                >
                  <img
                    src={item.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-full sm:w-[120px] h-[60px] sm:h-[80px] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    const input = document.getElementById(`img-${i}`);
                    input?.click();
                  }}
                >
                  <span className="text-xs text-muted-foreground">+ รูป Screenshot</span>
                </div>
              )}
              <input
                id={`img-${i}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => updateImage(i, e.target.files?.[0] ?? null)}
              />
            </div>

            {/* URL input */}
            <Input
              placeholder="https://shopee.co.th/..."
              value={item.shopee_url}
              onChange={(e) => updateUrl(i, e.target.value)}
              className="h-12 sm:h-[80px] text-sm"
            />

            {/* Remove button — desktop only */}
            <div className="hidden sm:block">
              {items.length > 1 ? (
                <button
                  onClick={() => removeRow(i)}
                  className="text-red-500 hover:text-red-600 text-lg"
                  title="ลบ"
                >
                  ×
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={items.length >= MAX_ITEMS}
        >
          + เพิ่ม 1 ช่อง
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMultipleRows(5)}
          disabled={items.length >= MAX_ITEMS}
        >
          + เพิ่ม 5 ช่อง
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addMultipleRows(10)}
          disabled={items.length >= MAX_ITEMS}
        >
          + เพิ่ม 10 ช่อง
        </Button>
        <span className="text-xs text-muted-foreground self-center ml-2">
          {items.length}/{MAX_ITEMS}
        </span>
      </div>

      {/* Sticky submit bar on mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t py-3 -mx-4 px-4 md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:mx-0 md:px-0 md:py-0">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="lg"
          className="w-full sm:w-auto"
        >
          {loading ? "กำลังอัพโหลด..." : `เพิ่มเข้าคิว (${items.filter((i) => i.shopee_url.trim()).length} รายการ)`}
        </Button>
        {message && (
          <p
            className={`text-sm mt-2 ${
              message.includes("สำเร็จ") ? "text-green-500" : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
