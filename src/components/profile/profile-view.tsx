"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, Lock, Pencil } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api/client";
import { displayNameSchema } from "@/lib/validation/game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Overview {
  profile: { displayName: string; memberSince: number };
  stats: { rankedDays: number; bestDailyScore: number | null; averageDailyScore: number | null; gamesCompleted: number };
  history: { matchId: string; mode: string; ranked: boolean; date: string | null; score: number; correct: number; completedAt: number | null }[];
  achievements: { id: string; name: string; rule: string; glyph: string; unlockedAt: number | null }[];
}

export function ProfileView() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Overview>("/api/profile")
      .then((d) => {
        setData(d);
        setName(d.profile.displayName);
      })
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Couldn't load your profile."));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ displayName: string }>("/api/profile", { method: "PATCH", body: { displayName: parsed.data } });
      setData((d) => (d ? { ...d, profile: { ...d.profile, displayName: r.displayName } } : d));
      setEditing(false);
      setNameError(null);
    } catch (err) {
      setNameError(err instanceof ApiRequestError ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p role="alert" className="panel rounded-2xl p-5 text-danger">{error}</p>;
  if (!data)
    return (
      <p className="inline-flex items-center gap-2 text-fg-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your logbook…
      </p>
    );

  const unlocked = data.achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-10">
      <section className="panel rounded-[1.5rem] p-5 sm:p-6" aria-labelledby="pilot-name">
        <p className="hud-label text-fg-muted">Pilot name</p>
        {editing ? (
          <form onSubmit={save} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
            <div className="flex-1">
              <label htmlFor="display-name" className="sr-only">
                Display name
              </label>
              <input
                id="display-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                maxLength={24}
                autoComplete="nickname"
                aria-invalid={nameError ? true : undefined}
                aria-describedby="name-help"
                className="min-h-12 w-full rounded-xl border border-line-strong bg-space/60 px-4 font-display text-lg outline-none focus-visible:border-action"
              />
              <p id="name-help" className={cn("mt-1 text-sm", nameError ? "text-danger" : "text-fg-muted")}>
                {nameError ?? "2–20 characters. Other players see this on leaderboards."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} icon={<Check className="h-4 w-4" aria-hidden="true" />}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 id="pilot-name" className="font-display text-3xl font-bold">
              {data.profile.displayName}
            </h2>
            <Button variant="ghost" onClick={() => setEditing(true)} icon={<Pencil className="h-4 w-4" aria-hidden="true" />}>
              Rename
            </Button>
          </div>
        )}
        <p className="mt-3 text-sm text-fg-muted">
          Guest pilot since {new Date(data.profile.memberSince).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Your progress is
          tied to this browser.
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Ranked days", v: data.stats.rankedDays },
          { k: "Best daily", v: data.stats.bestDailyScore ?? "—" },
          { k: "Average daily", v: data.stats.averageDailyScore ?? "—" },
          { k: "Games finished", v: data.stats.gamesCompleted },
        ].map((s) => (
          <div key={s.k} className="panel rounded-2xl p-4">
            <dt className="hud-label text-fg-muted">{s.k}</dt>
            <dd className="tabular mt-1 font-display text-2xl font-bold">{s.v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="ach-heading">
        <h2 id="ach-heading" className="font-display text-xl font-bold">
          Achievements <span className="text-fg-muted">· {unlocked} of {data.achievements.length}</span>
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.achievements.map((a) => (
            <li key={a.id} className={cn("panel flex items-center gap-3 rounded-2xl p-3.5", a.unlockedAt ? "border-reward/50" : "opacity-55")}>
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl", a.unlockedAt ? "bg-reward/20" : "bg-white/5")} aria-hidden="true">
                {a.unlockedAt ? a.glyph : <Lock className="h-4 w-4 text-fg-muted" />}
              </span>
              <span>
                <span className="block font-display font-semibold">{a.name}</span>
                <span className="block text-sm text-fg-muted">{a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : a.rule}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-fg-muted">Achievements are saved from Daily Orbit games, where the server verifies every round. Solo runs are practice and show achievements only on their results screen.</p>
      </section>

      <section aria-labelledby="hist-heading">
        <h2 id="hist-heading" className="font-display text-xl font-bold">
          Flight log
        </h2>
        {data.history.length === 0 ? (
          <p className="panel mt-3 rounded-2xl p-5 text-fg-muted">
            No server-recorded games yet.{" "}
            <Link href="/daily" className="text-action hover:underline">
              Play today&apos;s Daily Orbit
            </Link>{" "}
            to start your logbook.
          </p>
        ) : (
          <ul className="panel mt-3 divide-y divide-line rounded-2xl">
            {data.history.map((h) => (
              <li key={h.matchId}>
                <Link href={`/results/${h.matchId}`} transitionTypes={["nav-forward"]} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-white/5">
                  <span className={cn("hud-label rounded-pill px-2 py-1", h.ranked ? "bg-w5 text-space" : "border border-line text-fg-muted")}>{h.ranked ? "Ranked" : "Practice"}</span>
                  <span className="flex-1 text-sm text-fg-muted">{h.date}</span>
                  <span className="text-sm text-fg-muted">{h.correct}/5</span>
                  <span className="tabular w-14 text-right font-display font-bold">{h.score}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
