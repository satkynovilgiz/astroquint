import { WORLDS } from "@/features/worlds/worlds";
import type { GameSummary } from "@/features/gameplay/summary";

const SIZE = { w: 1080, h: 1350 };

/** Draws a spoiler-free result card (no question content) and returns a PNG blob. */
export async function renderShareCard(summary: GameSummary, title: string, subtitle?: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE.w;
  canvas.height = SIZE.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await document.fonts?.ready;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-space-grotesk").split(",")[0]?.trim() || "sans-serif";

  // Space background
  const bg = ctx.createLinearGradient(0, 0, 0, SIZE.h);
  bg.addColorStop(0, "#1A1440");
  bg.addColorStop(0.55, "#0B1020");
  bg.addColorStop(1, "#0B1020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE.w, SIZE.h);
  for (let i = 0; i < 140; i++) {
    const x = (i * 7919) % SIZE.w;
    const y = (i * 104729) % SIZE.h;
    ctx.fillStyle = `rgba(248,250,255,${0.15 + ((i * 31) % 70) / 100})`;
    ctx.beginPath();
    ctx.arc(x, y, ((i * 13) % 3) * 0.7 + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#F8FAFF";
  ctx.font = `700 64px ${display}`;
  ctx.fillText("astro", SIZE.w / 2 - 84, 160);
  ctx.fillStyle = "#BFA8FF";
  ctx.fillText("quint", SIZE.w / 2 + 84, 160);

  ctx.fillStyle = "#A4AEC6";
  ctx.font = `600 34px ${display}`;
  ctx.fillText(title.toUpperCase(), SIZE.w / 2, 250);
  if (subtitle) {
    ctx.font = `400 30px ${display}`;
    ctx.fillText(subtitle, SIZE.w / 2, 296);
  }

  // Score
  ctx.fillStyle = "#B9F46D";
  ctx.font = `700 230px ${display}`;
  ctx.fillText(String(summary.total), SIZE.w / 2, 560);
  ctx.fillStyle = "#A4AEC6";
  ctx.font = `500 38px ${display}`;
  ctx.fillText("points", SIZE.w / 2, 620);

  // Planets row
  const gap = 180;
  const startX = SIZE.w / 2 - gap * 2;
  summary.perWorld.forEach((r, i) => {
    const w = WORLDS.find((x) => x.id === r.worldId)!;
    const cx = startX + i * gap;
    const cy = 790;
    const ok = r.outcome === "correct";
    const grad = ctx.createRadialGradient(cx - 22, cy - 26, 6, cx, cy, 66);
    grad.addColorStop(0, ok ? w.palette.highlight : "#7A8199");
    grad.addColorStop(0.5, ok ? w.palette.primary : "#3A4366");
    grad.addColorStop(1, ok ? w.palette.shadow : "#1A1F33");
    ctx.shadowColor = ok ? w.palette.glow : "transparent";
    ctx.shadowBlur = ok ? 40 : 0;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = ok ? "#B9F46D" : "#FF7A8A";
    ctx.beginPath();
    ctx.arc(cx + 44, cy + 44, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0B1020";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (ok) {
      ctx.moveTo(cx + 34, cy + 45);
      ctx.lineTo(cx + 42, cy + 53);
      ctx.lineTo(cx + 55, cy + 36);
    } else {
      ctx.moveTo(cx + 36, cy + 36);
      ctx.lineTo(cx + 52, cy + 52);
      ctx.moveTo(cx + 52, cy + 36);
      ctx.lineTo(cx + 36, cy + 52);
    }
    ctx.stroke();
    ctx.fillStyle = "#A4AEC6";
    ctx.font = `600 24px ${display}`;
    ctx.fillText(w.code, cx, cy + 112);
  });

  ctx.fillStyle = "#F8FAFF";
  ctx.font = `600 44px ${display}`;
  ctx.fillText(`${summary.correct} of 5 worlds conquered`, SIZE.w / 2, 1020);
  if (summary.achievements.length) {
    ctx.fillStyle = "#FFB681";
    ctx.font = `500 32px ${display}`;
    ctx.fillText(`${summary.achievements.length} achievement${summary.achievements.length === 1 ? "" : "s"} unlocked`, SIZE.w / 2, 1080);
  }
  ctx.fillStyle = "#A4AEC6";
  ctx.font = `500 30px ${display}`;
  ctx.fillText("Five Worlds. One Brilliant Mind.", SIZE.w / 2, 1250);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png"));
}

export async function shareOrDownloadCard(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    await navigator.share({ files: [file] });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
