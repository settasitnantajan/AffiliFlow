import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Supabase</span>
              <span className="text-green-600">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Groq API (Llama 3.3)</span>
              <span className={process.env.GROQ_API_KEY ? "text-green-600" : "text-red-600"}>
                {process.env.GROQ_API_KEY ? "Configured" : "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pexels API</span>
              <span className={process.env.PEXELS_API_KEY ? "text-green-600" : "text-yellow-600"}>
                {process.env.PEXELS_API_KEY ? "Configured" : "Optional - not set"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cron Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Set up at{" "}
              <a
                href="https://console.cron-job.org/jobs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                cron-job.org
              </a>
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs">
              <p>URL: https://your-domain.vercel.app/api/pipeline/run</p>
              <p>Method: POST</p>
              <p>Schedule: Daily (e.g., 08:00 AM)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Video duration: 30 seconds</p>
            <p>Products per run: Top 5</p>
            <p>AI Model: Llama 3.3 70B (via Groq)</p>
            <p>Video source: YouTube/TikTok + Pexels fallback</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
