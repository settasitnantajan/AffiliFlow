import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PipelineRunner } from "@/components/pipeline-runner";
import { Zap } from "lucide-react";
import { formatThai } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "success"
          ? "default"
          : status === "failed"
          ? "destructive"
          : "secondary"
      }
    >
      {status}
    </Badge>
  );
}

export default async function PipelinePage() {
  const supabase = createServerSupabase();
  const { data: runs } = await supabase
    .from("pipeline_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pipeline</h1>

      {/* Live runner with progress bar */}
      <PipelineRunner />

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติการรัน</CardTitle>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เริ่ม</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Trends</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Videos</TableHead>
                      <TableHead>เสร็จ</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {formatThai(r.started_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>{r.step_current ?? "-"}</TableCell>
                        <TableCell>{r.trends_found}</TableCell>
                        <TableCell>{r.products_found}</TableCell>
                        <TableCell>{r.videos_produced}</TableCell>
                        <TableCell className="text-sm">
                          {r.completed_at
                            ? formatThai(r.completed_at)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-red-400 text-sm max-w-[150px] truncate">
                          {r.error_log ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: card list */}
              <div className="md:hidden space-y-3">
                {runs.map((r) => (
                  <div key={r.id} className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {formatThai(r.started_at)}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Step:</span>
                      <span>{r.step_current ?? "-"}</span>
                      <span className="text-muted-foreground">Trends:</span>
                      <span>{r.trends_found}</span>
                      <span className="text-muted-foreground">Products:</span>
                      <span>{r.products_found}</span>
                      <span className="text-muted-foreground">Videos:</span>
                      <span>{r.videos_produced}</span>
                    </div>
                    {r.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        เสร็จ: {formatThai(r.completed_at)}
                      </p>
                    )}
                    {r.error_log && (
                      <p className="text-xs text-red-400 break-words">{r.error_log}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                ยังไม่มีประวัติ — กดปุ่มด้านบนเพื่อเริ่มรัน Pipeline
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
