# CollegeLane Project Brief

Durable handoff for agents working in this repo. Read before making changes; keep it current when architecture, auth, data, or product scope changes.

## Product

CollegeLane is a mobile-first web app for **Canadian high-school track-and-field athletes** exploring university recruitment in Canada (U SPORTS) and the United States (NCAA). It is **educational** — it must never guarantee recruitment, admission, eligibility, roster placement, scholarships, financial aid, or coach interest.

It helps an athlete: create an account + athlete profile; record academics, goals, and up to three results; get an educational rating and suggested NCAA/U SPORTS pathway; search NCAA I/II/III and U SPORTS institutions; compare results with gender/event roster averages; get deterministic school recommendations; build a recruiting plan and save school lists; research coaches and draft a read-only coach email; upload an MP4 video + PDF transcript; track outreach; and optionally use an AI recruiting assistant.

School recommendations are **deterministic and must not call OpenAI**. The AI assistant lives at `/assistant` and is an optional tool, not a dependency of recommendations, search, assessment, or planning.

### Product principles
- Explain unfamiliar recruiting concepts in beginner-friendly language; treat Canadian and American recruiting as distinct systems.
- Never present a roster average as a recruiting standard or offer threshold.
- Never invent coach details, roster needs, scholarship amounts, admissions outcomes, or verified marks.
- Preserve account isolation: one athlete must never see another's profile, uploads, lists, plans, or assistant context.

## Technology

- **Next.js 16** (App Router, React 19, TypeScript) — standard `next dev` / `next build` / `next start`.
- **Supabase** for everything server-side:
  - **Auth** (email/password + Google) via `@supabase/ssr` + `@supabase/supabase-js`.
  - **Postgres** for application data (accessed with the service-role client).
  - **Storage** for athlete uploads (bucket `uploads`).
- Tailwind v4 (`@tailwindcss/postcss`) + a custom design system in `app/globals.css`.
- Deploy target: **Vercel** (nothing is deployed yet — local dev only).

There is **no Cloudflare, wrangler, D1, R2, drizzle, or vinext** — that stack was removed. Do not reintroduce it.

Commands:

```text
npm install
npm run dev
npm run build
npm run lint
```

See `SETUP.md` for the one-time Supabase setup (run `supabase/schema.sql`, create the `uploads` bucket, set auth redirect URLs).

## Environment variables (`.env`, not committed)

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY        # server-only, bypasses RLS — never expose to the client
OPENAI_API_KEY             # server-only, optional; enables /assistant + coach lookup
```

Next loads `.env` automatically. `NEXT_PUBLIC_*` vars reach the browser; the others are server-only. Do not commit secrets.

## Authentication

**Supabase-native.** There is no custom session table or identity-linking layer anymore.

- Browser auth via `lib/supabase/client.ts` (`signInWithPassword`, `signUp`, `signInWithOAuth`, `signOut`, `resend`) — the login/signup pages call these directly.
- `middleware.ts` refreshes the Supabase session cookie on every request **and** protects private routes (redirects unauthenticated users to `/login?next=…`). Private prefixes are listed in `PRIVATE` there (includes `/recommended`).
- `lib/supabase/server.ts` — request-scoped SSR client (reads/writes cookies via `next/headers`).
- `lib/supabase/admin.ts` — service-role client for server-side data access.
- `lib/auth.ts` — `currentUser()` returns `{ id, email }` from the Supabase session; `id` is the Supabase Auth uuid and is the key all data is scoped by.
- OAuth + email confirmation land on `app/auth/callback/route.ts` (code exchange) and `app/auth/confirm/route.ts` (token_hash). Confirmation emails use Supabase's built-in email.

## Data

Supabase Postgres (schema in `supabase/schema.sql`), reached only through the service-role client, so route handlers MUST scope every query by the authenticated `user.id`.

- `user_state` — account-scoped key/value JSON store; holds nearly all app data. Keys: `cl-athlete`, `cl-schools`, `cl-tasks`, `cl-outreach`, `cl-chat`, `cl-note-<school-id>`, `cl-email-uploads`.
- `coaches` — verified coach cache per school (~30-day TTL).
- `user_uploads` — metadata for uploads; files live in Supabase Storage bucket `uploads`.

Access helpers:
- `lib/state.ts` — `readState` / `readStateEntry` / `writeState` for the KV store.
- `lib/account-state.ts` — `useAccountState<T>(key, fallback)` client hook (GET/PUT `/api/state`). **All client persistence goes through this; never use raw localStorage.**

School directory + verified metrics are **bundled static data** (`data/schoolCatalog.ts`, `data/schoolDirectory.json`, `data/verifiedMetrics.json`) — not in the database. Verified metrics now cover **all outdoor events for both men and women** (~21,600 roster-average rows across ~776 schools), scraped from TFRRS via `scripts/import-tfrrs-metrics.py`. Recommendations work for both genders; events/schools without a verified row fall back to research-only rather than being estimated.

## API routes (`app/api/*`)

All require an authenticated session (`currentUser()`), return `401` otherwise.
- `state` — GET/PUT the `user_state` KV.
- `schools` — search the bundled catalog (`q`, `event`, `gender`, `pathway`, `division`, `id`).
- `recommendations` — deterministic school recommendations (`lib/recommendations.ts`); reads `cl-athlete` from Postgres; refuses women-specific results.
- `coaches` — OpenAI-assisted official-web coach lookup, cached in `coaches`.
- `uploads` — POST/GET athlete files via Supabase Storage (MP4 ≤100MB, PDF ≤10MB).
- `assistant` — profile-aware OpenAI Responses API chat; persists `cl-chat`.

## UI

Full minimal-clean redesign. Design system + tokens live in `app/globals.css`; shared primitives in `components/ui.tsx` (Button, Card, Field, Input, Select, Textarea, Badge, Stat, Progress, PageHead, Notice, Empty). The signed-in shell/nav is `components/AppShell.tsx`, wired via the `app/(app)/layout.tsx` route-group layout — every private page lives under `app/(app)/…` and renders inside `<div className="page">` with a `<PageHead>`. Keep the logo (`public/collegelane-logo.png`) + name, mobile-first layout, and educational framing.

The pre-redesign UI is preserved as reference text in `reference/` (excluded from the build). Safe to delete once no longer needed.

## Routes

Public: `/`, `/login`, `/signup`, `/disclaimer`, `/auth/callback`, `/auth/confirm`.
Private (under `app/(app)/`, except `/onboarding` which is full-screen): `/onboarding`, `/dashboard`, `/assessment`, `/schools`, `/school/:id`, `/recommended`, `/plan`, `/outreach`, `/email-builder`, `/assistant`, `/profile`.

## Known gaps / next work

- Nothing is deployed. Import to Vercel + set env vars + add prod redirect URLs to Supabase when ready.
- Supabase project setup (`supabase/schema.sql`, `uploads` bucket, auth URLs) is a manual one-time step — see `SETUP.md`.
- Women's roster metrics still need verified coverage.
- Coach coverage is on-demand (OpenAI), not a prebuilt database.
- Privacy policy, consent, data-retention, account deletion, password recovery, and monitoring need a launch review.

## Safe working rules

- Do not commit secrets. Do not weaken middleware route protection or the `currentUser()`-based API auth. Do not trust client-supplied user IDs.
- Keep recommendations deterministic (no OpenAI). Keep data claims source-backed; do not fabricate verification.
- Run `npm run build` after changes. Keep the logo + mobile layout.
