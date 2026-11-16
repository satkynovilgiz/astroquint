import { STORAGE_KEY } from "@/features/preferences/store";

/**
 * Runs before first paint (inline in <head>) so a saved Light theme never
 * flashes Dark first, and vice versa. Dark is the default. Kept tiny and
 * dependency-free; failures fall back to the default theme.
 */
const script = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}");var t=p.theme==="light"?"light":"dark";var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;if(p.motion==="reduced")d.dataset.motion="reduced";}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export const THEME_COLORS = { dark: "#050505", light: "#f4f4f8" } as const;
