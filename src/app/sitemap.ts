import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/play", "/play/solo", "/daily", "/party", "/leaderboard", "/how-to-play", "/privacy", "/terms"].map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "/daily" || path === "/leaderboard" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
