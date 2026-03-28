"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto pt-16 md:pt-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
