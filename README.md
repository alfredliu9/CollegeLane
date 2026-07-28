# CollegeLane

Mobile-first web app that helps **Canadian high-school track-and-field athletes** understand collegiate recruiting, assess pathways, research programs (NCAA I/II/III + U SPORTS), plan outreach, and prepare coach emails. Educational — it does not guarantee recruitment, admission, roster placement, or scholarships.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript)
- **Supabase** — Auth (email/password + Google), Postgres (app data), Storage (uploads)
- Tailwind v4 + a custom design system in `app/globals.css`
- Deploys to **Vercel**

## Run locally

1. `npm install`
2. Create `.env` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and optionally `OPENAI_API_KEY` (for the AI assistant + coach lookup).
3. Do the one-time Supabase setup in **[SETUP.md](SETUP.md)** (run `supabase/schema.sql`, create a private `uploads` Storage bucket, add the auth redirect URLs).
4. `npm run dev` → http://localhost:3000

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # eslint
```

## Project shape

- `app/` — App Router pages + API routes. Signed-in product pages live under `app/(app)/` (shared nav shell); auth callbacks under `app/auth/`.
- `components/` — `ui.tsx` (design-system primitives), `AppShell.tsx` (signed-in nav).
- `lib/` — Supabase clients (`lib/supabase/*`), `auth.ts` (session → user), `state.ts` + `account-state.ts` (account-scoped storage), `recruiting.ts` (assessment engine), `recommendations.ts` (deterministic recommendations).
- `data/` — bundled school directory + verified metrics (static, not in the DB).
- `supabase/schema.sql` — database tables. `AGENTS.md` — full architecture brief.

## Important

CollegeLane is educational. Assessments are estimates and do not guarantee recruitment, admission, roster placement, or scholarships. Confirm eligibility and policy through official NCAA, U SPORTS, conference, and university sources.
