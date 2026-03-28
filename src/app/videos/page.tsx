import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";

export const dynamic = "force-dynamic";

interface ProductLink {
  rank: number;
  name: string;
  url: string;
  price: number;
  commission_rate: number;
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
      <h1 className="text-2xl font-bold mb-6">Step 6: Videos Ready</h1>
      <div className="space-y-6">
        {videos && videos.length > 0 ? (
          videos.map((v) => {
            // รวม caption + hashtag เป็นก้อนเดียว
            const hashtagsText = v.hashtags?.join(" ") ?? "";
            const fullCaption = `${v.caption_text ?? ""}\n\n${hashtagsText}`.trim();

            return (
              <Card key={v.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {new Date(v.created_at).toLocaleString("th-TH")}
                    </CardTitle>
                    <Badge
                      variant={v.status === "posted" ? "default" : "secondary"}
                    >
                      {v.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video + Download */}
                  <div>
                    {v.video_url ? (
                      <div className="space-y-2">
                        <video
                          src={v.video_url}
                          controls
                          className="w-full max-w-md rounded-lg"
                        />
                        <DownloadButton url={v.video_url} />
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No video</p>
                    )}
                  </div>

                  {/* Caption + Hashtags รวมกัน */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Caption + Hashtags:</p>
                      <CopyButton text={fullCaption} />
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

                  {/* Product Links */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Product Links ({(v.product_links as ProductLink[])?.length ?? 0}):
                    </p>
                    <div className="space-y-2">
                      {(v.product_links as ProductLink[])?.map(
                        (p: ProductLink, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-muted/50 p-2 rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{p.rank}</Badge>
                              <span className="font-medium">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span>฿{p.price?.toLocaleString()}</span>
                              <span className="text-green-600 font-medium">
                                {p.commission_rate}%
                              </span>
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        )
                      ) ?? (
                        <p className="text-muted-foreground text-sm">
                          No product links
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
            <CardContent className="py-6">
              <p className="text-muted-foreground text-sm">
                No videos ready yet. Run the pipeline first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
