import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatThai } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const supabase = createServerSupabase();
  const { data: sources } = await supabase
    .from("video_sources")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Step 3: Video Sources</h1>
      <Card>
        <CardHeader>
          <CardTitle>Source History</CardTitle>
        </CardHeader>
        <CardContent>
          {sources && sources.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Source Type</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {(s.products as { name: string } | null)?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.source_type ?? "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {s.source_url ? (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm max-w-[200px] truncate block"
                        >
                          {s.source_url.slice(0, 50)}...
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.status === "downloaded" ? "default" : "secondary"}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatThai(s.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No video sources yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
