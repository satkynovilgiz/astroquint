import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/layout/page-transition";
import { PartyRoom } from "@/components/party/party-room";
import { roomCodeSchema } from "@/lib/validation/game";

export const metadata: Metadata = { title: "Party room", robots: { index: false } };

export default function PartyRoomPage({ params }: PageProps<"/party/[code]">) {
  return (
    <PageTransition>
      <Suspense fallback={<p className="p-8 text-center text-fg-muted">Loading room…</p>}>
        <Room params={params} />
      </Suspense>
    </PageTransition>
  );
}

async function Room({ params }: { params: PageProps<"/party/[code]">["params"] }) {
  const { code } = await params;
  const upper = code.toUpperCase();
  if (!roomCodeSchema.safeParse(upper).success) notFound();
  return <PartyRoom code={upper} />;
}
