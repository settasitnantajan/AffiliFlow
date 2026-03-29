import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import Link from "next/link";
import { DeleteVideoButton } from "@/components/delete-video-button";
import { AddToProductionButton } from "@/components/add-to-production-button";
import { RemoveVideoItemButton } from "@/components/remove-video-item-button";
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

interface VideoItem {
  video_url: string;
  caption_text: string;
  hashtags: string[];
}

export default async function VideosPage() {
  const supabase = createServerSupabase();

  const [{ data: videos }, { data: productionItems }] = await Promise.all([
    supabase
      .from("video_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("production_items")
      .select("video_url"),
  ]);

  const productionUrls = new Set(
    (productionItems ?? []).map((p: { video_url: string }) => p.video_url)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">วีดีโอพร้อมโพสต์</h1>
      <div className="space-y-6">
        {videos && videos.length > 0 ? (
          videos.map((v) => {
            const multiVideos: VideoItem[] =
              Array.isArray(v.videos) && v.videos.length > 0
                ? (v.videos as VideoItem[])
                : v.video_url
                  ? [{
                      video_url: v.video_url,
                      caption_text: v.caption_text ?? "",
                      hashtags: v.hashtags ?? [],
                    }]
                  : [];

            const links = (v.product_links as ProductLink[]) ?? [];

            return (
              <Card key={v.id} className={v.status !== "posted" ? "border-destructive border-2" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {formatThai(v.created_at)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={v.status === "posted" ? "default" : "secondary"}
                      >
                        {v.status}
                      </Badge>
                      <DeleteVideoButton id={v.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Videos + Captions */}
                  {multiVideos.length > 0 ? (
                    <div className="space-y-2">
                      {multiVideos.map((mv, i) => {
                        const captionWithTags = `${mv.caption_text}\n${mv.hashtags.join(" ")}`.trim();
                        const alreadyInProduction = productionUrls.has(mv.video_url);
                        return (
                          <div key={i} className="border rounded-lg p-2 flex gap-3">
                            {/* Video thumbnail */}
                            <div className="shrink-0 w-24 sm:w-32">
                              <video
                                src={mv.video_url}
                                controls
                                className="w-full rounded-md"
                              />
                              <DownloadButton url={mv.video_url} />
                            </div>

                            {/* Caption + actions */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <p className="text-[11px] font-bold text-muted-foreground">
                                  #{i + 1}
                                </p>
                                <div className="flex items-center gap-1">
                                  <AddToProductionButton
                                    videoResultId={v.id}
                                    videoUrl={mv.video_url}
                                    captionText={mv.caption_text}
                                    hashtags={mv.hashtags}
                                    productLinks={links}
                                    alreadyAdded={alreadyInProduction}
                                  />
                                  <CopyButton text={captionWithTags} videoId={v.id} />
                                  <RemoveVideoItemButton
                                    videoResultId={v.id}
                                    videoUrl={mv.video_url}
                                  />
                                </div>
                              </div>
                              <p className="text-xs line-clamp-3">
                                {mv.caption_text}
                              </p>
                              {mv.hashtags.length > 0 && (
                                <p className="text-[11px] text-blue-400 mt-1 line-clamp-2">
                                  {mv.hashtags.join(" ")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No video</p>
                  )}

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
