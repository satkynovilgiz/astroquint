"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export interface ServiceStatus {
  ok: boolean;
  modes: { solo: boolean; daily: boolean; party: boolean };
  checks: { sessionSecret: string; storage: string; database: string; realtime: string };
}

let cached: Promise<ServiceStatus | null> | null = null;

/** Which modes the deployment can actually serve (null while loading or if unknown). */
export function useServiceStatus(): ServiceStatus | null {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  useEffect(() => {
    cached ??= api<ServiceStatus>("/api/health").catch(() => {
      cached = null; // retry next time
      return null;
    });
    let alive = true;
    void cached.then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
