"use client";

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
} from "lucide-react";

const navItems = [
  { href: "/news", label: "ข่าวสาร", icon: Newspaper },
  { href: "/trends", label: "เทรนด์", icon: TrendingUp },
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/upload", label: "อัพโหลด", icon: Upload },
  { href: "/queue", label: "คิว", icon: ListOrdered },
  { href: "/videos", label: "วีดีโอ", icon: Film },
  { href: "/pipeline", label: "Pipeline", icon: Zap },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

// Bottom tab items (subset for mobile — 5 tabs max for iOS)
const bottomTabs = [
  { href: "/news", label: "ข่าวสาร", icon: Newspaper },
  { href: "/trends", label: "เทรนด์", icon: TrendingUp },
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/upload", label: "อัพโหลด", icon: Upload },
  { href: "/videos", label: "วีดีโอ", icon: Film },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
        <h1 className="text-lg font-bold">AffiliFlow</h1>
        <div className="flex gap-1">
          <Link
            href="/pipeline"
            className={cn(
              "p-2 rounded-lg hover:bg-accent",
              pathname === "/pipeline" ? "bg-accent" : ""
            )}
            aria-label="Pipeline"
          >
            <Zap className="h-5 w-5" />
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 min-w-[64px] min-h-[44px] justify-center transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
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
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
