"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { DoorOpen, Loader2, PartyPopper } from "lucide-react";
import { api } from "@/lib/api/client";
import { describeError, type FriendlyError } from "@/lib/api/errors";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useServiceStatus } from "@/hooks/use-service-status";
import Link from "next/link";
import { displayNameSchema, roomCodeSchema } from "@/lib/validation/game";
import { Button } from "@/components/ui/button";
import { PartyArt } from "@/components/play/mode-art";
import { riseIn, staggerChildren } from "@/lib/motion/tokens";
import { useHydrated } from "@/hooks/use-hydrated";
import type { PartyView } from "@/features/party/engine";

const NAME_KEY = "astroquint:name";

export function savedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
export function rememberName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export function NameField({ value, onChange, error, id = "party-name" }: { value: string; onChange: (v: string) => void; error?: string | null; id?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        Your name
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        autoComplete="nickname"
        placeholder="e.g. Nova"
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-help`}
        className="min-h-12 w-full rounded-xl border border-line-strong bg-space/60 px-4 text-lg outline-none focus-visible:border-action"
      />
      <p id={`${id}-help`} className={`mt-1 text-sm ${error ? "text-danger" : "text-fg-muted"}`}>
        {error ?? "Shown to the other players. 2–20 characters."}
      </p>
    </div>
  );
}

export function PartyLanding() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [typedName, setName] = useState<string | null>(null);
  // Remembered name appears after hydration (no server/client mismatch, no effect needed).
  const name = typedName ?? (hydrated ? savedName() : "");
  const [code, setCode] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [failure, setFailure] = useState<{ error: FriendlyError; retry: () => void } | null>(null);
  const service = useServiceStatus();
  const unavailable = service !== null && !service.modes.party;

  const validName = () => {
    const r = displayNameSchema.safeParse(name);
    if (!r.success) {
      setNameError(r.error.issues[0]?.message ?? "Invalid name");
      return null;
    }
    rememberName(r.data);
    return r.data;
  };

  const create = async () => {
    const n = validName();
    if (!n) return;
    setPending("create");
    setFailure(null);
    try {
      const room = await api<PartyView>("/api/party", { body: { name: n } });
      router.push(`/party/${room.code}`, { transitionTypes: ["nav-forward"] });
    } catch (err) {
      const e = describeError(err, "party-create");
      if (e.kind === "input") setNameError(e.message);
      else setFailure({ error: e, retry: () => void create() });
      setPending(null);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    void joinRoom();
  };

  const joinRoom = async () => {
    const n = validName();
    const c = code.trim().toUpperCase();
    if (!roomCodeSchema.safeParse(c).success) {
      setCodeError("Room codes are 6 letters or numbers, like K7QX4M.");
      return;
    }
    if (!n) return;
    setPending("join");
    setFailure(null);
    try {
      await api<PartyView>(`/api/party/${c}/actions`, { body: { type: "join", name: n } });
      router.push(`/party/${c}`, { transitionTypes: ["nav-forward"] });
    } catch (err) {
      const e = describeError(err, "party-join");
      if (e.kind === "state" || e.kind === "input") setCodeError(e.message);
      else setFailure({ error: e, retry: () => void joinRoom() });
      setPending(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl overflow-x-clip px-4 pt-4 sm:px-6 sm:pt-8">
      <motion.div variants={staggerChildren(0.05)} initial="hidden" animate="visible" className="grid items-start gap-8 md:grid-cols-[1fr_0.8fr]">
        <div>
          <motion.p variants={riseIn} className="hud-label text-w4">
            Party Mode · 2–8 players
          </motion.p>
          <motion.h1 variants={riseIn} className="mt-2 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-bold leading-none tracking-[-0.03em]">
            Race your friends through five worlds
          </motion.h1>
          <motion.p variants={riseIn} className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-fg-muted">
            Open a private room, share the code, and play the same rounds at the same time. The server keeps the clock and the score.
          </motion.p>

          {unavailable && (
            <motion.div variants={riseIn} className="mt-6">
              <ErrorNotice
                error={{
                  kind: service!.checks.sessionSecret === "missing" ? "config" : "storage",
                  code: service!.checks.sessionSecret === "missing" ? "session_secret_missing" : "storage_not_configured",
                  title: "Party Mode isn't online yet",
                  message:
                    service!.checks.sessionSecret === "missing"
                      ? "The game server is still being set up, so rooms can't be created right now."
                      : "Party rooms need Astroquint's online database, which isn't connected on this deployment yet.",
                  retryable: false,
                }}
              >
                <p className="mt-2 text-sm">
                  <Link href="/play/solo" className="font-medium text-action underline underline-offset-2">
                    Play Solo Orbit instead
                  </Link>
                </p>
              </ErrorNotice>
            </motion.div>
          )}
          {failure && (
            <div className="mt-6">
              <ErrorNotice error={failure.error} onRetry={failure.retry} retrying={pending !== null} />
            </div>
          )}

          <motion.div variants={riseIn} className="panel mt-8 space-y-4 rounded-[1.5rem] p-5 sm:p-6">
            <NameField value={name} onChange={(v) => { setName(v); setNameError(null); }} error={nameError} />
            <Button size="lg" className="w-full" onClick={create} disabled={pending !== null} icon={pending === "create" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <PartyPopper className="h-5 w-5" aria-hidden="true" />}>
              Create a room
            </Button>
            <div className="flex items-center gap-3 text-sm text-fg-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-line" /> or join one <span className="h-px flex-1 bg-line" />
            </div>
            <form onSubmit={join} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
              <div className="flex-1">
                <label htmlFor="room-code" className="sr-only">
                  Room code
                </label>
                <input
                  id="room-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                    setCodeError(null);
                  }}
                  placeholder="ROOM CODE"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby="room-code-help"
                  className="tabular min-h-12 w-full rounded-xl border border-line-strong bg-space/60 px-4 font-display text-lg uppercase tracking-[0.3em] outline-none focus-visible:border-action"
                />
                {codeError && (
                  <p id="room-code-help" className="mt-1 text-sm text-danger" role="alert">
                    {codeError}
                  </p>
                )}
              </div>
              <Button type="submit" variant="secondary" size="lg" disabled={pending !== null} icon={<DoorOpen className="h-5 w-5" aria-hidden="true" />}>
                Join
              </Button>
            </form>
          </motion.div>
        </div>
        <motion.div variants={riseIn} className="mx-auto w-[min(70vw,320px)] md:mt-10 md:w-[82%]">
          <PartyArt />
        </motion.div>
      </motion.div>
    </div>
  );
}
