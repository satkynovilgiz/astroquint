/** Tiny typed fetch wrapper for Astroquint's API. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
      signal: init?.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiRequestError(0, "network", "Can't reach the game server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: { code: string; message: string; requestId?: string } }) | null;
  if (!res.ok) {
    // Non-JSON failures (e.g. a platform 502/504 page) still get a meaningful code.
    const fallbackCode = res.status >= 500 ? "server_unavailable" : "error";
    throw new ApiRequestError(res.status, data?.error?.code ?? fallbackCode, data?.error?.message ?? `The server responded with an error (${res.status}).`, data?.error?.requestId);
  }
  return data as T;
}
