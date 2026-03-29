"use client";

import { useState, useRef, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, ImagePlus } from "lucide-react";

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
  const [dragging, setDragging] = useState(false);
  const bulkUrlRef = useRef<HTMLTextAreaElement>(null);

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

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Bulk add URLs from textarea
  const handleBulkUrls = () => {
    const text = bulkUrlRef.current?.value ?? "";
    const urls = text
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) return;

    setItems((prev) => {
      // Fill empty rows first, then add new ones
      const next = [...prev];
      let urlIdx = 0;

      for (let i = 0; i < next.length && urlIdx < urls.length; i++) {
        if (!next[i].shopee_url.trim()) {
          next[i] = { ...next[i], shopee_url: urls[urlIdx++] };
        }
      }

      // Add remaining URLs as new rows
      while (urlIdx < urls.length && next.length < MAX_ITEMS) {
        next.push({ shopee_url: urls[urlIdx++], image: null, preview: null });
      }

      return next;
    });

    if (bulkUrlRef.current) bulkUrlRef.current.value = "";
    setMessage(`เพิ่ม ${Math.min(urls.length, MAX_ITEMS)} URL แล้ว`);
    setTimeout(() => setMessage(""), 2000);
  };

  // Handle multiple images dropped or selected
  const addImages = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setItems((prev) => {
      const next = [...prev];
      let fileIdx = 0;

      // Fill empty image slots first
      for (let i = 0; i < next.length && fileIdx < imageFiles.length; i++) {
        if (!next[i].image) {
          const file = imageFiles[fileIdx++];
          next[i] = { ...next[i], image: file, preview: URL.createObjectURL(file) };
        }
      }

      // Add remaining images as new rows
      while (fileIdx < imageFiles.length && next.length < MAX_ITEMS) {
        const file = imageFiles[fileIdx++];
        next.push({ shopee_url: "", image: file, preview: URL.createObjectURL(file) });
      }

      return next;
    });
  };

  // Drag & drop handlers
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  };

  // Multi-file input
  const multiFileRef = useRef<HTMLInputElement>(null);

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
      window.dispatchEvent(new Event("badge-refresh"));
    }
    setLoading(false);
  };

  const validCount = items.filter((i) => i.shopee_url.trim()).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Upload สินค้า</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Screenshot จาก affiliate.shopee.co.th + วาง Shopee URL
      </p>

      {/* Bulk URL input */}
      <Card className="mb-4">
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-medium">วาง URL หลายรายการ</p>
          <textarea
            ref={bulkUrlRef}
            placeholder={"วาง URL ทีละบรรทัด เช่น:\nhttps://s.shopee.co.th/abc\nhttps://s.shopee.co.th/def"}
            className="w-full h-20 text-sm rounded-lg border bg-transparent px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" variant="outline" onClick={handleBulkUrls}>
            เพิ่ม URL ทั้งหมด
          </Button>
        </CardContent>
      </Card>

      {/* Drag & drop zone for multiple images */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => multiFileRef.current?.click()}
        className={`mb-4 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <ImagePlus className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          ลากรูปหลายรูปมาวาง หรือกดเลือก
        </p>
        <input
          ref={multiFileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            addImages(files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Item rows */}
      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-2 items-center bg-muted/20 p-2 rounded-lg"
          >
            {/* Number */}
            <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
              {i + 1}
            </span>

            {/* Image thumbnail */}
            <div
              className="shrink-0 w-12 h-12 rounded-md border overflow-hidden cursor-pointer flex items-center justify-center bg-muted/30"
              onClick={() => {
                const input = document.getElementById(`img-${i}`);
                input?.click();
              }}
            >
              {item.preview ? (
                <img src={item.preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
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
              className="h-10 text-sm flex-1 min-w-0"
            />

            {/* Remove */}
            {items.length > 1 && (
              <button
                onClick={() => removeRow(i)}
                className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add row buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={addRow} disabled={items.length >= MAX_ITEMS}>
          + 1 ช่อง
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const remaining = MAX_ITEMS - items.length;
          const toAdd = Math.min(5, remaining);
          if (toAdd > 0) setItems((prev) => [...prev, ...Array.from({ length: toAdd }, emptyItem)]);
        }} disabled={items.length >= MAX_ITEMS}>
          + 5 ช่อง
        </Button>
        <span className="text-xs text-muted-foreground self-center ml-2">
          {items.length}/{MAX_ITEMS}
        </span>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t py-3 -mx-4 px-4 md:static md:border-0 md:bg-transparent md:backdrop-blur-none md:mx-0 md:px-0 md:py-0">
        <Button
          onClick={handleSubmit}
          disabled={loading || validCount === 0}
          size="lg"
          className="w-full sm:w-auto"
        >
          {loading ? "กำลังอัพโหลด..." : `เพิ่มเข้าคิว (${validCount} รายการ)`}
        </Button>
        {message && (
          <p
            className={`text-sm mt-2 ${
              message.includes("สำเร็จ") || !message.includes("กรุณา")
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
