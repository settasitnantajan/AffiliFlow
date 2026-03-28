"use client";

import { useEffect, useRef, useState } from "react";
import { Newspaper } from "lucide-react";

interface FacebookEmbedProps {
  pageUrl: string;
  pageName: string;
}

export function FacebookEmbed({ pageUrl, pageName }: FacebookEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    // Load Facebook SDK
    if (window.FB) {
      window.FB.XFBML.parse(containerRef.current ?? undefined);
      setStatus("ready");
      return;
    }

    // Set init callback before loading script
    (window as unknown as Record<string, unknown>).fbAsyncInit = function () {
      window.FB?.XFBML.parse(containerRef.current ?? undefined);
      setStatus("ready");
    };

    const script = document.createElement("script");
    script.src =
      "https://connect.facebook.net/th_TH/sdk.js#xfbml=1&version=v21.0";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";

    // Fallback timeout — if SDK doesn't load in 8s, show error
    const timeout = setTimeout(() => {
      if (status === "loading") setStatus("error");
    }, 8000);

    script.onload = () => clearTimeout(timeout);
    script.onerror = () => {
      clearTimeout(timeout);
      setStatus("error");
    };

    document.body.appendChild(script);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {/* Loading state */}
      {status === "loading" && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground animate-pulse">
            กำลังโหลดโพสต์จาก {pageName}...
          </p>
        </div>
      )}

      {/* Error / blocked state */}
      {status === "error" && (
        <div className="text-center py-12 space-y-3">
          <Newspaper className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            โหลด Facebook ไม่ได้ — อาจถูกบล็อกโดย ad blocker
          </p>
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            เปิดเพจใน Facebook
          </a>
        </div>
      )}

      {/* Facebook Page Plugin — official embed, max 500px width */}
      <div
        className="fb-page"
        data-href={pageUrl}
        data-tabs="timeline"
        data-width="500"
        data-height="900"
        data-small-header="false"
        data-adapt-container-width="true"
        data-hide-cover="false"
        data-show-facepile="false"
      >
        <blockquote cite={pageUrl} className="fb-xfbml-parse-ignore">
          <a href={pageUrl} target="_blank" rel="noopener noreferrer">
            {pageName}
          </a>
        </blockquote>
      </div>

      {/* Bottom link */}
      <a
        href={pageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-sm text-blue-400 hover:underline"
      >
        เปิดเพจเต็มใน Facebook
      </a>
    </div>
  );
}
