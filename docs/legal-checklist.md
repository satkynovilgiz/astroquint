# Legal pages — information the owner must provide

`/privacy` and `/terms` are **templates**. They describe how the software actually works, but every item below is
still marked in `[brackets]` on the pages and must be supplied by the owner and reviewed by a qualified lawyer
before public launch. Nothing here has been invented or assumed.

## Privacy Policy (`src/app/privacy/page.tsx`)

| # | Needed | Why / notes |
|---|---|---|
| 1 | Operator's legal name (person or company), postal address, contact email | Identifies the data controller |
| 2 | "Last updated" date | Set when the reviewed text goes live |
| 3 | Jurisdiction(s) the policy is written for and the **legal basis** for processing (e.g. legitimate interests / consent / contract) | Depends on where you and your players are (e.g. GDPR/UK GDPR, CCPA) |
| 4 | Retention period for profiles, ranked results and match history | See `docs/data-retention.md` — currently **not decided**, so not stated |
| 5 | Retention period for practice matches, Party rooms and IP hashes | Proposed: 30 days / on expiry / 1 day — **not enabled until confirmed** |
| 6 | Vercel log retention for your plan, and the Vercel region(s) used | From your Vercel account settings |
| 7 | Supabase project region | From the Supabase dashboard (Project settings → General) |
| 8 | Data processing agreements with Vercel and Supabase; international transfer safeguards | Both providers publish DPAs; confirm which apply to your account |
| 9 | How players exercise rights (access, correction, deletion) and the response time | Note: guests have no account; deletion requests need a way to identify the guest (e.g. display name + approximate dates) |
| 10 | Supervisory authority / complaints contact | Jurisdiction-dependent |
| 11 | Minimum age / children's data position | Affects COPPA (US), GDPR-K (EU) obligations |
| 12 | Whether analytics or error tracking will be added later | Currently none; the policy says "no third-party tracking scripts" |

## Terms of Use (`src/app/terms/page.tsx`)

| # | Needed | Notes |
|---|---|---|
| 1 | Operator's legal name | Same as Privacy #1 |
| 2 | "Last updated" date | |
| 3 | Contact for reporting question errors and abuse | |
| 4 | Governing law and venue | Jurisdiction-dependent |
| 5 | Limitation of liability / warranty wording | Must be drafted or approved by a lawyer for your jurisdiction |
| 6 | Minimum age to play | Same as Privacy #11 |
| 7 | Moderation policy for display names (what is not allowed, how it is enforced) | The game currently validates format only (letters, numbers, spaces, `._-`); there is no profanity filter |

## Already accurate (no input needed)

- What is stored, where (Vercel hosting, Supabase database/realtime), the guest cookie, on-device preferences.
- No advertising, no third-party tracking scripts, no selling of data.
- Map data attribution (Natural Earth, public domain).
