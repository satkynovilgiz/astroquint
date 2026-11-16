"use client";

/** Last-resort boundary for errors in the root layout itself. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0B1020", color: "#F8FAFF", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.18em", fontSize: 12, color: "#FF7A8A", textTransform: "uppercase" }}>System fault</p>
          <h1 style={{ fontSize: 32, margin: "8px 0" }}>Astroquint hit turbulence</h1>
          <p style={{ color: "#A4AEC6" }}>Something went wrong while loading the game.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 20, minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#B9F46D", color: "#10180A", fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
