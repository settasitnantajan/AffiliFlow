import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CaptionsPage() {
  const supabase = createServerSupabase();
  const { data: captions } = await supabase
    .from("captions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Step 5: Captions + Hashtags</h1>
      <div className="space-y-4">
        {captions && captions.length > 0 ? (
          captions.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {new Date(c.created_at).toLocaleString("th-TH")}
                  </CardTitle>
                  <Badge variant="outline">{c.ai_model}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Caption:</p>
                  <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                    {c.caption_text ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Hashtags:</p>
                  <div className="flex flex-wrap gap-1">
                    {c.hashtags?.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    )) ?? "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-sm">No captions yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
