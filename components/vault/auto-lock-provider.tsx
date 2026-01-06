"use client";

import { useEffect } from "react";
import { getActivityTrackingScript } from "@/lib/auto-lock";

/**
 * Client-side auto-lock activity tracking
 * Injects activity tracking script
 */
export function AutoLockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Inject activity tracking
    const script = document.createElement("script");
    script.innerHTML = getActivityTrackingScript();
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <>{children}</>;
}

