# CollegeLane

CollegeLane is a mobile-first prototype that helps Canadian high school track-and-field athletes understand collegiate recruiting, assess sample pathways, research programs, plan outreach, and prepare coach emails.

## Prototype scope

This stage is a functional browser-persistent application. One athlete profile drives the dashboard, assessment engine, school-fit labels, coach-email builder, and recruiting assistant context. Saved schools, plan progress, outreach records, school notes, chat history, and email drafts persist locally. School records and recruiting benchmarks remain educational sample data.

The assistant uses the server-side OpenAI Responses API when `OPENAI_API_KEY` is configured. Without a key it automatically uses the profile-aware guided response engine, so the chat remains functional during local development.

## Run locally

CollegeLane is local-development only. There is no hosting target configured.

1. Install dependencies with `npm install`.
2. Create a `.env` file with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and (optionally) `OPENAI_API_KEY`. One `NAME=value` pair per line. Sign-in and sign-up return a configuration error until the three Supabase variables are set.
3. Start the development server with `npm run dev`.
4. Open the local address shown in the terminal, create an account, then complete onboarding.

`npm run dev` applies any pending database migrations to the local Cloudflare D1 first (via `predev`), then starts the server. This is automatic and idempotent, so there is no separate migration step. Do not run `npm run db:migrate` by hand while `npm run dev` is already running — both write the same local Miniflare database, and running them at once wedges the dev server until it is restarted.

`npm run build` produces a local production bundle in `dist/`. Nothing deploys it.

## Technology

- Next.js App Router
- React and TypeScript
- Tailwind CSS with a responsive custom design system
- Typed mock-data modules
- Local browser storage for prototype persistence

## Stage two

The structure is ready for Supabase authentication and data, Row Level Security, verified school information, rule-based recruiting assessments, an OpenAI-powered assistant, an administrator dashboard, and privacy and consent systems. None of these integrations are implemented in this prototype.

## Important

CollegeLane is educational. Assessments are estimates and do not guarantee recruitment, admission, roster placement, or scholarships. Confirm eligibility and policy information through official sources.
