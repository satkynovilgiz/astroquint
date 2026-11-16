export const siteConfig = {
  name: "Astroquint",
  tagline: "Five Worlds. One Brilliant Mind.",
  description:
    "Challenge your logic, knowledge, and instincts in a five-world adventure. Play solo or compete with friends.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
} as const;

export type NavItem = { href: string; label: string };

export const primaryNav: NavItem[] = [
  { href: "/play", label: "Play" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/leaderboard", label: "Leaderboard" },
];
