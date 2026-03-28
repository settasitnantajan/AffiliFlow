"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <Button
      variant="outline"
      size="default"
      onClick={handleRefresh}
      disabled={refreshing}
      className="active:scale-95 transition-transform"
    >
      {refreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
    </Button>
  );
}
