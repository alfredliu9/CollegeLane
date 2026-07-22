# CollegeLane

CollegeLane is a mobile-first prototype that helps Canadian high school track-and-field athletes understand collegiate recruiting, assess sample pathways, research programs, plan outreach, and prepare coach emails.

## Prototype scope

This stage is a functional browser-persistent application. One athlete profile drives the dashboard, assessment engine, school-fit labels, coach-email builder, and recruiting assistant context. Saved schools, plan progress, outreach records, school notes, chat history, and email drafts persist locally. School records and recruiting benchmarks remain educational sample data.

The assistant uses the server-side OpenAI Responses API when `OPENAI_API_KEY` is configured. Without a key it automatically uses the profile-aware guided response engine, so the chat remains functional during local development.

## Run locally

1. Install dependencies with `pnpm install`.
2. Start the development server with `pnpm dev`.
3. Copy `.env.example` to `.env.local` and add an OpenAI API key if AI-generated answers are required.
4. Open the local address shown in the terminal.
5. Create a sample account or log in, then complete onboarding.

Build the deployment bundle with `pnpm build`.

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
