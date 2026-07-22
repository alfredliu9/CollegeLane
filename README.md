# CollegeLane

CollegeLane is a mobile-first prototype that helps Canadian high school track-and-field athletes understand collegiate recruiting, assess sample pathways, research programs, plan outreach, and prepare coach emails.

## Prototype scope

This first stage is a frontend-only demonstration. It uses typed sample data and browser storage for saved schools, plan progress, outreach records, and email drafts. Authentication, assessments, schools, chat replies, and coach details are simulated. No database, external authentication, AI, email delivery, payments, or analytics are connected.

## Run locally

1. Install dependencies with `pnpm install`.
2. Start the development server with `pnpm dev`.
3. Open the local address shown in the terminal.
4. Create a sample account or log in, then complete onboarding.

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
