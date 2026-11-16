"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState, type CSSProperties } from "react";
import { Check, Copy, Crown, DoorOpen, Loader2, LogOut, RotateCcw, Share2, SkipForward, Trophy, UserX, WifiOff } from "lucide-react";
import { getWorld, nextWorld, WORLDS } from "@/features/worlds/worlds";
import { usePartyRoom } from "@/features/party/use-party-room";
import type { PartyView } from "@/features/party/engine";
import type { Answer } from "@/features/questions/types";
import { displayNameSchema } from "@/lib/validation/game";
import { useHydrated } from "@/hooks/use-hydrated";
import { playSound } from "@/features/audio/synth";
import { Button, ButtonLink } from "@/components/ui/button";
import { Planet } from "@/components/animations/planet";
import { Timer } from "@/components/game/timer";
import { ScoreCounter } from "@/components/game/score-counter";
import { RouteProgress } from "@/components/game/route-progress";
import { WorldIntro } from "@/components/game/world-intro";
import { Travel } from "@/components/game/travel";
import { PatternBreak } from "@/components/worlds/pattern-break";
import { TruthTrap } from "@/components/worlds/truth-trap";
import { Timeline } from "@/components/worlds/timeline";
import { GeoTap } from "@/components/worlds/geotap";
import { FinalBetQuestion, WagerPicker } from "@/components/worlds/final-bet";
import { duration, ease, spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { Countdown, useSecondsLeft } from "./countdown";
import { NameField, rememberName, savedName } from "./party-landing";

const scene = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.arrive } },
  exit: { opacity: 0, y: -12, transition: { duration: duration.fast, ease: ease.depart } },
};

export function PartyRoom({ code }: { code: string }) {
  const room = usePartyRoom(code);
  const { view, error } = room;

  if (error?.code === "room_not_found") {
    return (
      <Centered>
        <h1 className="font-display text-3xl font-bold">Room not found</h1>
        <p className="mt-2 text-fg-muted">The code {code} doesn&apos;t match an open room. It may have expired.</p>
        <ButtonLink href="/party" className="mt-6" transitionTypes={["nav-back"]}>
          Back to Party Mode
        </ButtonLink>
      </Centered>
    );
  }
  if (!view) {
    return (
      <Centered>
        <p className="inline-flex items-center gap-2 text-fg-muted" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Docking with room {code}…
        </p>
      </Centered>
    );
  }
  if (!view.you) return <JoinGate view={view} room={room} />;

  const world = getWorld(view.worldId);
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
      <div
        aria-hidden="true"
        className="world-atmosphere"
        style={{ "--world-glow": view.phase === "lobby" || view.phase === "complete" ? "#3DD6C4" : world.palette.glow } as CSSProperties}
      />
      {!room.online && (
        <p role="status" className="mt-3 flex items-center gap-2 rounded-2xl border border-reward/40 bg-reward/10 px-4 py-2 text-sm">
          <WifiOff className="h-4 w-4" aria-hidden="true" /> Connection lost. Reconnecting…
        </p>
      )}
      {room.actionError && (
        <p role="alert" className="mt-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm">
          {room.actionError}
        </p>
      )}
      {view.phase === "lobby" ? <Lobby view={view} room={room} /> : view.phase === "complete" ? <Podium view={view} room={room} /> : <InGame view={view} room={room} />}
    </div>
  );
}

type Room = ReturnType<typeof usePartyRoom>;

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">{children}</div>;
}

function JoinGate({ view, room }: { view: PartyView; room: Room }) {
  const hydrated = useHydrated();
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? (hydrated ? savedName() : "");
  const [err, setErr] = useState<string | null>(null);

  if (view.phase !== "lobby") {
    return (
      <Centered>
        <h1 className="font-display text-3xl font-bold">Game in progress</h1>
        <p className="mt-2 text-fg-muted">This room is mid-game. You can join when it returns to the lobby.</p>
        <ButtonLink href="/party" className="mt-6" variant="secondary" transitionTypes={["nav-back"]}>
          Back to Party Mode
        </ButtonLink>
      </Centered>
    );
  }
  const full = view.players.length >= 8;
  return (
    <Centered>
      <p className="hud-label text-w4">You&apos;re invited</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Join room {view.code}</h1>
      <p className="mt-2 text-fg-muted">
        {view.players.length} pilot{view.players.length === 1 ? "" : "s"} waiting: {view.players.map((p) => p.name).join(", ")}
      </p>
      <form
        className="mt-6 w-full space-y-3 text-left"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const r = displayNameSchema.safeParse(name);
          if (!r.success) return setErr(r.error.issues[0]?.message ?? "Invalid name");
          rememberName(r.data);
          await room.send({ type: "join", name: r.data });
        }}
      >
        <NameField value={name} onChange={(v) => { setTyped(v); setErr(null); }} error={err} id="join-name" />
        <Button type="submit" size="lg" className="w-full" disabled={room.busy || full} icon={<DoorOpen className="h-5 w-5" aria-hidden="true" />}>
          {full ? "Room is full" : "Join the crew"}
        </Button>
      </form>
    </Centered>
  );
}

function PlayerList({ view, room, showKick }: { view: PartyView; room: Room; showKick: boolean }) {
  return (
    <ul className="space-y-2" aria-label="Players">
      <AnimatePresence initial={false}>
        {view.players.map((p) => (
          <motion.li
            key={p.id}
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={spring.settle}
            className={cn("panel flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2", p.isYou && "border-w4/50")}
          >
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", p.connected ? "bg-action shadow-[0_0_8px_rgb(185_244_109/0.8)]" : "bg-fg-muted/40")} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium">
              {p.name}
              {p.isYou && <span className="ml-2 text-sm text-fg-muted">(you)</span>}
            </span>
            <span className="sr-only">{p.connected ? "online" : "offline"}</span>
            {p.isHost && (
              <span className="inline-flex items-center gap-1 text-sm text-w5">
                <Crown className="h-4 w-4" aria-hidden="true" /> Host
              </span>
            )}
            {!p.isHost && (
              <span className={cn("hud-label rounded-pill px-2 py-1", p.ready ? "bg-action text-action-fg" : "border border-line text-fg-muted")}>{p.ready ? "Ready" : "Not ready"}</span>
            )}
            {showKick && !p.isYou && (
              <button
                type="button"
                onClick={() => room.send({ type: "kick", playerId: p.id })}
                aria-label={`Remove ${p.name}`}
                className="grid h-10 w-10 place-items-center rounded-xl text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <UserX className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Lobby({ view, room }: { view: PartyView; room: Room }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const me = view.players.find((p) => p.isYou)!;
  const isHost = view.you!.isHost;
  const link = typeof window !== "undefined" ? `${window.location.origin}/party/${view.code}` : `/party/${view.code}`;

  const invite = async () => {
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "Join my Astroquint room", text: `Room ${view.code}`, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="grid gap-8 pt-6 md:grid-cols-[1fr_1.1fr]">
      <section aria-labelledby="room-code-heading">
        <p className="hud-label text-w4">Party lobby{view.matchNo > 0 ? ` · Rematch ${view.matchNo + 1}` : ""}</p>
        <h1 id="room-code-heading" className="mt-2 font-display text-2xl font-bold">
          Room code
        </h1>
        <p className="tabular mt-2 font-display text-[clamp(2.75rem,12vw,4.5rem)] font-bold tracking-[0.18em] text-w4" aria-label={`Room code ${view.code.split("").join(" ")}`}>
          {view.code}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={invite} icon={copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}>
            {copied ? "Link copied!" : "Invite friends"}
          </Button>
          <Button
            variant="ghost"
            icon={<Copy className="h-4 w-4" aria-hidden="true" />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(view.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* ignore */
              }
            }}
          >
            Copy code
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? "Copied to clipboard" : ""}
        </p>
        <p className="mt-6 text-sm text-fg-muted">
          Everyone plays the same five worlds at the same time. Correct answers score 100 points plus a speed bonus of up to 100, and the
          final wager decides it.
        </p>
      </section>

      <section aria-labelledby="crew-heading">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="crew-heading" className="font-display text-xl font-bold">
            Crew <span className="text-fg-muted">· {view.players.length}/8</span>
          </h2>
        </div>
        <PlayerList view={view} room={room} showKick={isHost} />
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {isHost ? (
            <Button
              size="lg"
              className="flex-1"
              disabled={!!view.startBlocker || room.busy}
              onClick={() => {
                playSound("launch");
                void room.send({ type: "start" });
              }}
            >
              Launch the game
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1"
              variant={me.ready ? "secondary" : "primary"}
              disabled={room.busy}
              onClick={() => void room.send({ type: "ready", ready: !me.ready })}
              icon={me.ready ? <Check className="h-5 w-5" aria-hidden="true" /> : undefined}
            >
              {me.ready ? "Ready! (tap to undo)" : "I'm ready"}
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
            onClick={async () => {
              await room.send({ type: "leave" });
              router.push("/party", { transitionTypes: ["nav-back"] });
            }}
          >
            Leave
          </Button>
        </div>
        <p className="mt-2 text-sm text-fg-muted" aria-live="polite">
          {isHost ? (view.startBlocker ?? "Everyone's ready. Launch when you are!") : me.ready ? "Waiting for the host to launch…" : "Tap “I'm ready” when you're set."}
        </p>
      </section>
    </div>
  );
}

function InGame({ view, room }: { view: PartyView; room: Room }) {
  const world = getWorld(view.worldId);
  const [travelSeen, setTravelSeen] = useState<number>(-1);
  const endsAt = room.toLocal(view.phaseEndsAt);
  const answeredCount = view.players.filter((p) => p.answered).length;
  const secondsLeft = useSecondsLeft(endsAt);
  // Play the travel animation at the start of a later round's intro (it has 6.5s; travel takes ~1.9s).
  const showTravel = view.phase === "intro" && view.roundIndex > 0 && travelSeen !== view.roundIndex && secondsLeft !== null && secondsLeft > 4;
  const prevWorld = view.roundIndex > 0 ? WORLDS[view.roundIndex - 1] : world;
  const submit = (answer: Answer) => {
    if (view.phase === "playing" && !view.yourAnswer && !room.busy) void room.send({ type: "answer", answer });
  };
  const roundsForProgress = WORLDS.map((w, i) => ({ worldId: w.id, outcome: view.yourRounds[i], points: 0, wager: null, wagerDelta: null }));

  const key = view.phase === "reveal" || view.phase === "playing" ? `play-${view.roundIndex}` : `${view.phase}-${view.roundIndex}-${showTravel ? "t" : "i"}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3 py-3">
        <RouteProgress rounds={roundsForProgress} current={view.roundIndex} />
        <ScoreCounter value={view.you!.score} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={key} {...scene}>
          {view.phase === "intro" &&
            (showTravel ? (
              <Travel from={prevWorld} to={world} onDone={() => setTravelSeen(view.roundIndex)} />
            ) : (
              <WorldIntro
                world={world}
                relaxed={false}
                waitingLabel={
                  <p className="inline-flex items-center gap-2 rounded-pill border border-line px-4 py-2 font-display text-lg" role="status">
                    <Countdown endsAt={endsAt} label={world.id === "final-bet" ? "Wagers open in" : "Starting in"} />
                  </p>
                }
              />
            ))}

          {view.phase === "wager" &&
            (view.yourWager === null ? (
              <div>
                <p className="mb-3 text-sm text-fg-muted">
                  <Countdown endsAt={endsAt} label="Wagers close in" /> (no bet = 0)
                </p>
                <WagerPicker score={view.you!.score} onLock={(w) => void room.send({ type: "wager", wager: w })} busy={room.busy} />
              </div>
            ) : (
              <Centered>
                <p className="hud-label text-w5">Wager locked</p>
                <p className="tabular mt-2 font-display text-5xl font-bold text-w5">{view.yourWager}</p>
                <p className="mt-3 text-fg-muted">
                  Waiting for the others… <Countdown endsAt={endsAt} label="" />
                </p>
              </Centered>
            ))}

          {(view.phase === "playing" || view.phase === "reveal") && view.question && (
            <div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: world.palette.glow }} aria-hidden="true" />
                  <span className="hud-label" style={{ color: world.palette.text }}>
                    {world.code} · {world.name}
                  </span>
                </p>
                <Timer deadline={view.phase === "playing" ? endsAt : endsAt} limitMs={view.phase === "playing" ? world.timeLimitMs : 9_000} frozen={view.phase !== "playing"} color={world.palette.glow} />
              </div>
              <PartyWorld view={view} onSubmit={submit} locked={view.phase !== "playing" || !!view.yourAnswer || room.busy} />
              {view.phase === "playing" && view.yourAnswer && (
                <p className="mt-5 rounded-2xl border border-line px-4 py-3 text-center text-fg-muted" role="status">
                  Locked in. Waiting for the crew: {answeredCount}/{view.players.length} answered
                </p>
              )}
              {view.phase === "reveal" && <RoundResults view={view} room={room} endsAt={endsAt} />}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PartyWorld({ view, onSubmit, locked }: { view: PartyView; onSubmit: (a: Answer) => void; locked: boolean }) {
  const q = view.question!;
  const world = getWorld(q.world);
  const common = { world, locked, submitted: view.yourAnswer, reveal: view.reveal, onSubmit };
  switch (q.world) {
    case "pattern-break":
      return <PatternBreak key={q.id} question={q} {...common} />;
    case "truth-trap":
      return <TruthTrap key={q.id} question={q} {...common} />;
    case "timeline":
      return <Timeline key={q.id} question={q} {...common} />;
    case "geotap":
      return <GeoTap key={q.id} question={q} {...common} />;
    case "final-bet":
      return <FinalBetQuestion key={q.id} question={q} {...common} wager={view.yourWager ?? 0} />;
  }
}

function RoundResults({ view, room, endsAt }: { view: PartyView; room: Room; endsAt: number | null }) {
  const upcoming = nextWorld(view.worldId);
  const sorted = [...view.players].sort((a, b) => (b.round?.points ?? 0) + (b.round?.wagerDelta ?? 0) - ((a.round?.points ?? 0) + (a.round?.wagerDelta ?? 0)));
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.settle, delay: view.worldId === "final-bet" ? 0.9 : 0.15 }}
      className="panel mt-6 rounded-[1.5rem] p-5"
      aria-labelledby="round-results"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="round-results" className="font-display text-xl font-bold">
          Round results
        </h3>
        <span className="text-sm text-fg-muted">
          <Countdown endsAt={endsAt} label={upcoming ? `${upcoming.name} in` : "Final standings in"} />
        </span>
      </div>
      {view.reveal && <p className="mt-2 text-sm leading-relaxed text-fg-muted">{view.reveal.explanation}</p>}
      <ol className="mt-4 space-y-1.5">
        {sorted.map((p) => {
          const delta = (p.round?.points ?? 0) + (p.round?.wagerDelta ?? 0);
          return (
            <li key={p.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", p.isYou && "bg-white/5")}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs font-bold", p.round?.outcome === "correct" ? "bg-action text-action-fg" : "bg-danger/80 text-space")} aria-hidden="true">
                {p.round?.outcome === "correct" ? "✓" : "✕"}
              </span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="sr-only">{p.round?.outcome === "correct" ? "correct" : p.round?.outcome === "timeout" ? "timed out" : "incorrect"}</span>
              <span className={cn("tabular font-display font-bold", delta > 0 ? "text-action" : delta < 0 ? "text-danger" : "text-fg-muted")}>
                {delta >= 0 ? "+" : "−"}
                {Math.abs(delta)}
              </span>
              <span className="tabular w-14 text-right text-sm text-fg-muted">{p.score}</span>
            </li>
          );
        })}
      </ol>
      {view.you!.isHost && (
        <Button className="mt-4" variant="secondary" onClick={() => void room.send({ type: "next" })} disabled={room.busy} icon={<SkipForward className="h-4 w-4" aria-hidden="true" />}>
          {upcoming ? `Continue to ${upcoming.name}` : "Show final standings"}
        </Button>
      )}
    </motion.section>
  );
}

function Podium({ view, room }: { view: PartyView; room: Room }) {
  const router = useRouter();
  const top = view.standings.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const heights = { 1: "h-36", 2: "h-28", 3: "h-20" } as Record<number, string>;
  const you = view.standings.find((s) => s.isYou);
  return (
    <div className="pt-6">
      <div className="text-center">
        <p className="hud-label text-w4">Final standings · Room {view.code}</p>
        <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring.settle} className="mt-2 font-display text-4xl font-bold">
          {you?.rank === 1 ? "You win the galaxy!" : `${view.standings[0]?.name} wins!`}
        </motion.h1>
        {you && (
          <p className="mt-2 text-fg-muted">
            You finished #{you.rank} of {view.standings.length} with <span className="tabular font-semibold text-fg">{you.score}</span> points.
          </p>
        )}
      </div>
      <ol className="mx-auto mt-10 flex max-w-lg items-end justify-center gap-3" aria-label="Podium">
        {order.map((p, i) => (
          <motion.li
            key={p.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.settle, delay: 0.3 + (p.rank === 1 ? 0.5 : p.rank === 2 ? 0.25 : 0) + i * 0 }}
            className="flex w-1/3 flex-col items-center"
          >
            <div className="w-14 sm:w-16">
              <Planet palette={WORLDS[(p.rank + 3) % 5].palette} surface={WORLDS[(p.rank + 3) % 5].surface} glow={p.rank === 1 ? 1 : 0.5} spinSeconds={20} />
            </div>
            <p className="mt-2 w-full truncate text-center font-medium">{p.name}</p>
            <p className="tabular font-display font-bold">{p.score}</p>
            <div className={cn("mt-2 grid w-full place-items-center rounded-t-2xl border border-b-0 border-line-strong bg-surface-2/80 font-display text-2xl font-bold", heights[p.rank] ?? "h-16", p.rank === 1 && "text-w5")}>
              {p.rank === 1 ? <Trophy className="h-7 w-7" aria-label="First place" /> : `#${p.rank}`}
            </div>
          </motion.li>
        ))}
      </ol>
      <ol className="panel mx-auto mt-0 max-w-lg divide-y divide-line rounded-2xl" aria-label="Full ranking">
        {view.standings.map((s) => (
          <li key={s.id} className={cn("flex items-center gap-3 px-4 py-3", s.isYou && "bg-action/10")}>
            <span className="tabular w-8 font-display font-bold text-fg-muted">#{s.rank}</span>
            <span className="flex-1 truncate">{s.name}</span>
            <span className="tabular font-display font-bold">{s.score}</span>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-6 flex max-w-lg flex-col gap-2 sm:flex-row">
        {view.you!.isHost ? (
          <Button size="lg" className="flex-1" onClick={() => void room.send({ type: "rematch" })} disabled={room.busy} icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}>
            Rematch
          </Button>
        ) : (
          <p className="flex-1 self-center text-center text-sm text-fg-muted">Waiting for the host to start a rematch…</p>
        )}
        <Button
          size="lg"
          variant="ghost"
          onClick={async () => {
            await room.send({ type: "leave" });
            router.push("/party", { transitionTypes: ["nav-back"] });
          }}
          icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
        >
          Leave room
        </Button>
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/play" className="text-fg-muted hover:text-fg">
          Back to all modes
        </Link>
      </p>
    </div>
  );
}
