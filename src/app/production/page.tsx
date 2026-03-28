import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const supabase = createServerSupabase();
  const { data: productions } = await supabase
    .from("video_productions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Step 4: Video Production</h1>
      <Card>
        <CardHeader>
          <CardTitle>Production History</CardTitle>
        </CardHeader>
        <CardContent>
          {productions && productions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.duration}s</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "done"
                            ? "default"
                            : p.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.output_url ? (
                        <a
                          href={p.output_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          View
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-red-500 text-sm max-w-[200px] truncate">
                      {p.error_log ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleString("th-TH")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No productions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
