"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { Trash2, Clapperboard, CheckCircle } from "lucide-react";
import { formatThai } from "@/lib/utils";
import { toast } from "sonner";

interface ProductionItem {
  id: string;
  video_url: string;
  caption_text: string;
  hashtags: string[];
  product_links: { url: string }[];
  status: string;
  created_at: string;
}

export function ProductionList({ items }: { items: ProductionItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ready = items.filter((i) => i.status === "ready");
  const posted = items.filter((i) => i.status === "posted");

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/production/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ลบแล้ว");
        router.refresh();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkPosted = async (id: string) => {
    const res = await fetch(`/api/production/${id}`, { method: "PATCH" });
    if (res.ok) {
      toast.success("โพสต์แล้ว!");
      router.refresh();
    }
  };

  const renderItem = (item: ProductionItem) => {
    const captionWithTags = `${item.caption_text}\n${item.hashtags?.join(" ") ?? ""}`.trim();
    const linksText = (item.product_links ?? []).map((p) => p.url).join("\n");
    const allText = [captionWithTags, linksText].filter(Boolean).join("\n\n");

    return (
      <Card
        key={item.id}
        className={item.status === "posted" ? "opacity-60" : "border-green-500/50 border"}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            {/* Video */}
            <div className="shrink-0 w-24 sm:w-32">
              <video
                src={item.video_url}
                controls
                className="w-full rounded-md"
              />
              <DownloadButton url={item.video_url} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status + date */}
              <div className="flex items-center justify-between mb-1">
                <Badge variant={item.status === "posted" ? "default" : "secondary"}>
                  {item.status === "posted" ? "โพสต์แล้ว" : "พร้อมโพสต์"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatThai(item.created_at)}
                </span>
              </div>

              {/* Caption */}
              <p className="text-xs line-clamp-3 mb-1">{item.caption_text}</p>
              {item.hashtags?.length > 0 && (
                <p className="text-[11px] text-blue-400 line-clamp-1 mb-2">
                  {item.hashtags.join(" ")}
                </p>
              )}

              {/* Links */}
              {(item.product_links ?? []).map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline truncate block"
                >
                  {p.url}
                </a>
              ))}

              {/* Actions */}
              <div className="flex items-center gap-1.5 mt-2">
                <CopyButton text={allText} label="คัดลอกทั้งหมด" />
                {item.status !== "posted" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkPosted(item.id)}
                    className="gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    โพสต์แล้ว
                  </Button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-muted-foreground text-sm">
            วีดีโอที่เลือกแล้ว พร้อมโพสต์ลง Shopee Video
          </p>
        </div>
      </div>

      {/* Ready to post */}
      <h2 className="text-lg font-semibold mb-3">
        พร้อมโพสต์ ({ready.length})
      </h2>
      {ready.length > 0 ? (
        <div className="space-y-2 mb-8">
          {ready.map(renderItem)}
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center">
            <Clapperboard className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              ยังไม่มีวีดีโอ — ไปเลือกจากหน้าวีดีโอ
            </p>
          </CardContent>
        </Card>
      )}

      {/* Posted */}
      {posted.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">
            โพสต์แล้ว ({posted.length})
          </h2>
          <div className="space-y-2">
            {posted.map(renderItem)}
          </div>
        </>
      )}
    </>
  );
}
