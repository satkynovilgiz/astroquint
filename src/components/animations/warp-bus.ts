/**
 * Tiny event bus so any component (launch button, planet travel in Milestone 2)
 * can ask the persistent starfield to "jump to warp" without prop drilling.
 */

const EVENT = "astroquint:warp";

export interface WarpRequest {
  /** Total warp duration in ms (ramp up + cruise + ramp down). */
  durationMs: number;
  /** Peak intensity 0–1. */
  intensity?: number;
}

export function requestWarp(req: WarpRequest): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WarpRequest>(EVENT, { detail: req }));
}

export function onWarp(handler: (req: WarpRequest) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<WarpRequest>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
