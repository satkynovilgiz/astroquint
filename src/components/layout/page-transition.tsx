import { ViewTransition, type ReactNode } from "react";

/**
 * Wrap each page's content. Navigations tagged with a transition type animate:
 *  - nav-forward / nav-back: short directional slide
 *  - warp: zoom-through used when launching into play
 * Untagged navigations (browser back, refresh) swap instantly.
 */
const classes = { "nav-forward": "nav-forward", "nav-back": "nav-back", warp: "warp", default: "none" };

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={classes} exit={classes} default="none">
      {children}
    </ViewTransition>
  );
}
