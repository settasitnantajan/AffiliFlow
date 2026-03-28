"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/trends", label: "Trends", icon: "🔥" },
  { href: "/products", label: "Products", icon: "🛍️" },
  { href: "/sources", label: "Video Sources", icon: "🎥" },
  { href: "/production", label: "Production", icon: "✂️" },
  { href: "/captions", label: "Captions", icon: "📝" },
  { href: "/videos", label: "Videos", icon: "🎬" },
  { href: "/pipeline", label: "Pipeline Runs", icon: "⚡" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4 flex flex-col gap-1 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold">AffiliFlow</h1>
        <p className="text-xs text-muted-foreground">Shopee Video Automation</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
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
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
