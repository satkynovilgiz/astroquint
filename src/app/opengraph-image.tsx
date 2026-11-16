import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config/site";
import { WORLDS } from "@/features/worlds/worlds";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "radial-gradient(circle at 80% 20%, #3b2a7a 0%, #0B1020 55%)",
          color: "#F8FAFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          astro<span style={{ color: "#BFA8FF" }}>quint</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 800, lineHeight: 1, marginTop: 36, letterSpacing: -3 }}>
          <span>Five Worlds.</span>
          <span style={{ color: "#B9F46D" }}>One Brilliant Mind.</span>
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 56 }}>
          {WORLDS.map((w) => (
            <div
              key={w.id}
              style={{
                width: 64,
                height: 64,
                borderRadius: 64,
                background: `radial-gradient(circle at 35% 30%, ${w.palette.highlight}, ${w.palette.primary} 45%, ${w.palette.shadow})`,
                boxShadow: `0 0 40px ${w.palette.glow}`,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
