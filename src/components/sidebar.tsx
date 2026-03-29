"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Newspaper,
  LayoutDashboard,
  Upload,
  ListOrdered,
  Film,
  Zap,
  Settings,
  TrendingUp,
  Clapperboard,
  Loader2,
} from "lucide-react";

const navItems = [
  { href: "/news", label: "ข่าวสาร", icon: Newspaper, badgeKey: null },
  { href: "/trends", label: "เทรนด์", icon: TrendingUp, badgeKey: null },
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard, badgeKey: null },
  { href: "/upload", label: "อัพโหลด", icon: Upload, badgeKey: null },
  { href: "/queue", label: "คิว", icon: ListOrdered, badgeKey: "queue" as const },
  { href: "/videos", label: "วีดีโอ", icon: Film, badgeKey: "videos" as const },
  { href: "/production", label: "Production", icon: Clapperboard, badgeKey: "production" as const },
  { href: "/pipeline", label: "Pipeline", icon: Zap, badgeKey: null },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, badgeKey: null },
];

// Bottom tab items (subset for mobile — 5 tabs max for iOS)
const bottomTabs = [
  { href: "/news", label: "ข่าวสาร", icon: Newspaper, badgeKey: null },
  { href: "/trends", label: "เทรนด์", icon: TrendingUp, badgeKey: null },
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard, badgeKey: null },
  { href: "/upload", label: "อัพโหลด", icon: Upload, badgeKey: null },
  { href: "/videos", label: "วีดีโอ", icon: Film, badgeKey: "videos" as const },
];

type BadgeCounts = { queue: number; videos: number; production: number };

function BadgeDot({ count, color = "red" }: { count: number; color?: "red" | "green" }) {
  if (count <= 0) return null;
  return (
    <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-none ${
      color === "green"
        ? "bg-green-500 text-white"
        : "bg-destructive text-destructive-foreground"
    }`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeCounts>({ queue: 0, videos: 0, production: 0 });
  const [pipelineRunning, setPipelineRunning] = useState(false);

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch("/api/badge-counts");
        if (res.ok) setBadges(await res.json());
      } catch {
        // ignore
      }
    }

    async function checkPipeline() {
      try {
        const res = await fetch("/api/pipeline/status");
        if (res.ok) {
          const data = await res.json();
          setPipelineRunning(data.running === true);
        }
      } catch {
        // ignore
      }
    }

    fetchBadges();
    checkPipeline();
    const badgeInterval = setInterval(fetchBadges, 30000);
    const pipelineInterval = setInterval(checkPipeline, 3000);

    // Listen for badge-refresh events from other components
    const onRefresh = () => { fetchBadges(); checkPipeline(); };
    window.addEventListener("badge-refresh", onRefresh);

    return () => {
      clearInterval(badgeInterval);
      clearInterval(pipelineInterval);
      window.removeEventListener("badge-refresh", onRefresh);
    };
  }, []);

  // Refetch on route change
  useEffect(() => {
    fetch("/api/badge-counts")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setBadges(d))
      .catch(() => {});
  }, [pathname]);

  const getBadge = (key: "queue" | "videos" | "production" | null) => {
    if (!key) return 0;
    return badges[key] ?? 0;
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">AffiliFlow</h1>
        <div className="flex gap-1">
          <Link
            href="/queue"
            className={cn(
              "relative p-2 rounded-lg hover:bg-accent",
              pathname === "/queue" ? "bg-accent" : ""
            )}
            aria-label="คิว"
          >
            <ListOrdered className="h-5 w-5" />
            <BadgeDot count={getBadge("queue")} />
          </Link>
          <Link
            href="/production"
            className={cn(
              "relative p-2 rounded-lg hover:bg-accent",
              pathname === "/production" ? "bg-accent" : ""
            )}
            aria-label="Production"
          >
            <Clapperboard className="h-5 w-5" />
            <BadgeDot count={getBadge("production")} color="green" />
          </Link>
          <Link
            href="/pipeline"
            className={cn(
              "p-2 rounded-lg hover:bg-accent",
              pathname === "/pipeline" ? "bg-accent" : ""
            )}
            aria-label="Pipeline"
          >
            {pipelineRunning ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
          </Link>
          <Link
            href="/settings"
            className={cn(
              "p-2 rounded-lg hover:bg-accent",
              pathname === "/settings" ? "bg-accent" : ""
            )}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm flex justify-around items-center" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const badgeCount = getBadge(item.badgeKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-16 min-h-11 justify-center transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                <BadgeDot count={badgeCount} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex sticky top-0 left-0 z-40 h-screen w-64 border-r bg-muted/30 p-4 flex-col gap-1">
        <div className="mb-6">
          <h1 className="text-xl font-bold">AffiliFlow</h1>
          <p className="text-xs text-muted-foreground">Shopee Video Automation</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeCount = getBadge(item.badgeKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.href === "/pipeline" && pipelineRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={`flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold ${
                    item.badgeKey === "production"
                      ? "bg-green-500 text-white"
                      : "bg-destructive text-destructive-foreground"
                  }`}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
