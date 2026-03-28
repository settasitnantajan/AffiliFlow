"use client";

import { useEffect, useRef, useState } from "react";

interface GoogleTrendsWidgetProps {
  keyword: string;
  geo?: string;
  time?: string;
  type?: "TIMESERIES" | "GEO_MAP" | "RELATED_QUERIES" | "RELATED_TOPICS";
}

declare global {
  interface Window {
    trends?: {
      embed: {
        renderExploreWidgetTo: (
          el: HTMLElement,
          type: string,
          config: Record<string, unknown>,
          options: Record<string, unknown>
        ) => void;
      };
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTrendsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded && window.trends) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement("script");
    script.src =
      "https://ssl.gstatic.com/trends_nrtr/3826_RC01/embed_loader.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export function GoogleTrendsWidget({
  keyword,
  geo = "TH",
  time = "today 3-m",
  type = "TIMESERIES",
}: GoogleTrendsWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadTrendsScript().then(() => {
      if (cancelled || !containerRef.current || !window.trends) return;

      // Clear previous render
      containerRef.current.innerHTML = "";

      window.trends.embed.renderExploreWidgetTo(
        containerRef.current,
        type,
        {
          comparisonItem: [{ keyword, geo, time }],
          category: 0,
          property: "",
        },
        {
          exploreQuery: `date=${encodeURIComponent(time)}&geo=${geo}&q=${encodeURIComponent(keyword)}&hl=th`,
          guestPath: "https://trends.google.com:443/trends/embed/",
        }
      );

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [keyword, geo, time, type]);

  return (
    <div>
      {loading && (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            กำลังโหลดข้อมูล Google Trends...
          </p>
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
