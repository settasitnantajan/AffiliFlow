import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { CopyAllButton } from "@/components/copy-all-button";
import Link from "next/link";
import { Film } from "lucide-react";
import { formatThai } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProductLink {
  rank: number;
  name: string;
  url: string;
  price: string;
  commission_rate: string;
}

export default async function VideosPage() {
  const supabase = createServerSupabase();
  const { data: videos } = await supabase
    .from("video_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">วีดีโอพร้อมโพสต์</h1>
      <div className="space-y-6">
        {videos && videos.length > 0 ? (
          videos.map((v) => {
            const hashtagsText = v.hashtags?.join(" ") ?? "";
            const fullCaption = `${v.caption_text ?? ""}\n\n${hashtagsText}`.trim();

            const links = (v.product_links as ProductLink[]) ?? [];
            const linksText = links.map((p) => `${p.name}\n${p.url}`).join("\n\n");
            const megaCopyText = [fullCaption, linksText].filter(Boolean).join("\n\n---\n\n");

            return (
              <Card key={v.id} className={v.status !== "posted" ? "border-destructive border-2" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {formatThai(v.created_at)}
                    </CardTitle>
                    <Badge
                      variant={v.status === "posted" ? "default" : "secondary"}
                    >
                      {v.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mega copy button */}
                  <CopyAllButton text={megaCopyText} videoId={v.id} />

                  {/* Video + Download */}
                  <div>
                    {v.video_url ? (
                      <div className="space-y-2">
                        <video
                          src={v.video_url}
                          controls
                          className="w-full max-w-50 sm:max-w-60 mx-auto rounded-lg"
                        />
                        <DownloadButton url={v.video_url} />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No video</p>
                    )}
                  </div>

                  {/* Caption + Hashtags */}
                  <div className="border-l-2 border-primary/30 pl-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium whitespace-nowrap">แคปชั่น + แฮชแท็ก:</p>
                      <CopyButton text={fullCaption} videoId={v.id} />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {v.caption_text ?? "-"}
                      </p>
                      {v.hashtags && (
                        <p className="text-sm text-blue-400 mt-2">
                          {v.hashtags.join(" ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-border" />

                  {/* Product Links */}
                  <div className="border-l-2 border-green-500/30 pl-3">
                    <p className="text-sm font-medium mb-2">
                      ลิงก์สินค้า ({links.length}):
                    </p>
                    <div className="space-y-2">
                      {links.map((p, i) => (
                        <div
                          key={i}
                          className="bg-muted/50 p-2 rounded-lg flex items-center gap-2 min-w-0 overflow-hidden"
                        >
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 truncate min-w-0 flex-1 hover:underline"
                          >
                            {p.url}
                          </a>
                          <CopyButton text={p.url} videoId={v.id} />
                        </div>
                      ))}
                      {links.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          ไม่มีลิงก์สินค้า
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Film className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground text-sm mb-4">
                ยังไม่มีวีดีโอ — อัพโหลดสินค้าแล้วรัน Pipeline เลย
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                ไปหน้าอัพโหลด
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
