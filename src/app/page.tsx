import { createServerSupabase } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabase();

  const [
    { count: pipelineCount },
    { count: trendsCount },
    { count: productsCount },
    { count: videosCount },
  ] = await Promise.all([
    supabase.from("pipeline_runs").select("*", { count: "exact", head: true }),
    supabase.from("trend_searches").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("video_results").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { title: "Pipeline Runs", value: pipelineCount ?? 0, icon: "⚡" },
    { title: "Trends Found", value: trendsCount ?? 0, icon: "🔥" },
    { title: "Products Analyzed", value: productsCount ?? 0, icon: "🛍️" },
    { title: "Videos Ready", value: videosCount ?? 0, icon: "🎬" },
  ];

  const { data: recentRuns } = await supabase
    .from("pipeline_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pipeline Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRuns && recentRuns.length > 0 ? (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {new Date(run.started_at).toLocaleString("th-TH")}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Step: {run.step_current ?? "-"}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      run.status === "success"
                        ? "bg-green-100 text-green-700"
                        : run.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No pipeline runs yet. Set up cron-job.org to trigger /api/pipeline/run
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
