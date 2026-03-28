import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createServerSupabase();
  const { data: runs } = await supabase
    .from("pipeline_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipeline Runs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Trends</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.started_at).toLocaleString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "success"
                            ? "default"
                            : r.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.step_current ?? "-"}</TableCell>
                    <TableCell>{r.trends_found}</TableCell>
                    <TableCell>{r.products_found}</TableCell>
                    <TableCell>{r.videos_produced}</TableCell>
                    <TableCell className="text-sm">
                      {r.completed_at
                        ? new Date(r.completed_at).toLocaleString("th-TH")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-red-500 text-sm max-w-[150px] truncate">
                      {r.error_log ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No pipeline runs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
