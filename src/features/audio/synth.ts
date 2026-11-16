/**
 * Original UI sounds synthesised with the Web Audio API — no audio files, no
 * licensing concerns. Sounds only play after the player has turned sound on
 * (which is itself a user gesture, satisfying browser autoplay rules).
 */

import { getPreferences } from "@/features/preferences/store";

export type SoundName = "tap" | "select" | "launch" | "toggle-on";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  to?: number;
  at?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  tap: [{ freq: 660, to: 520, dur: 0.06, type: "triangle", gain: 0.05 }],
  select: [
    { freq: 520, dur: 0.07, type: "triangle", gain: 0.05 },
    { freq: 780, at: 0.05, dur: 0.09, type: "triangle", gain: 0.05 },
  ],
  "toggle-on": [
    { freq: 440, dur: 0.06, type: "sine", gain: 0.06 },
    { freq: 660, at: 0.06, dur: 0.06, type: "sine", gain: 0.06 },
    { freq: 990, at: 0.12, dur: 0.1, type: "sine", gain: 0.05 },
  ],
  launch: [
    { freq: 140, to: 720, dur: 0.6, type: "sawtooth", gain: 0.025 },
    { freq: 280, to: 1440, dur: 0.6, type: "sine", gain: 0.03 },
  ],
};

export function playSound(name: SoundName, { force = false } = {}): void {
  if (!force && !getPreferences().sound) return;
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime;
  for (const tone of SOUNDS[name]) {
    const start = now + (tone.at ?? 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, start);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, start + tone.dur);
    // Soft attack and release so nothing clicks or startles.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.05, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + tone.dur + 0.02);
  }
}
