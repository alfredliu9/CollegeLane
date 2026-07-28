# CollegeLane Project Brief

This file is the durable handoff for agents working in this repository. Read it before making changes. Keep it current when architecture, deployment, authentication, data coverage, or product scope changes.

## Product

CollegeLane is a mobile-first web application for Canadian high-school track-and-field athletes exploring university recruitment in Canada and the United States.

The product helps an athlete:

- create a persistent account and athlete profile;
- record academic information, goals, and up to three track-and-field results;
- receive an educational rating and suggested NCAA/U SPORTS pathway;
- search NCAA Division I, II, III, and U SPORTS institutions;
- compare personal results with gender- and event-specific roster averages;
- generate deterministic school recommendations;
- build a recruiting plan and save school lists;
- research coaches and create a read-only coach-email draft;
- upload an MP4 competition video and PDF transcript;
- track outreach;
- optionally use a profile-aware AI recruiting assistant through its direct route.

The product is moving away from AI for core school selection. School recommendations are deterministic and must not call OpenAI. The AI assistant still exists at `/assistant`, but it is hidden from the primary navigation and should not become a dependency of recommendations, search, assessment, planning, or other core workflows.

CollegeLane is educational. It must never guarantee recruitment, admission, eligibility, roster placement, scholarships, financial aid, or coach interest.

## Audience and product principles

- Primary audience: Canadian high-school track-and-field athletes and families.
- Explain unfamiliar recruiting concepts in beginner-friendly language.
- Treat Canadian and American recruiting as distinct systems.
- Prefer practical next steps over vague motivation.
- Clearly distinguish official rules from common recruiting practice.
- Time-sensitive rules must be checked against current official sources.
- Never present a roster average as a recruiting standard or offer threshold.
- Never invent coach details, roster needs, scholarship amounts, admissions outcomes, or verified marks.
- Preserve account isolation: one athlete must never see another athlete's profile, uploads, lists, plans, or assistant context.

## Current deployment

CollegeLane is **local-development only**. There is no configured hosting target.

The project previously deployed through OpenAI Sites. That integration was removed on 2026-07-27 because it was not reliable enough to build against. Removed along with it: `.openai/hosting.json`, the `build/sites-vite-plugin.ts` packaging plugin, and the `dist/.openai` deploy bundle. Any earlier `*.chatgpt.site` deployment is no longer connected to this repository.

Local Cloudflare bindings are declared directly in `vite.config.ts` and served by the Cloudflare Vite plugin's Miniflare emulation:

- D1 database: `DB` (local database name `site-creator-d1`, migrations in `drizzle/`)
- R2 bucket: `UPLOADS` (local bucket name `site-creator-r2`)

Local Miniflare state lives in the git-ignored `.wrangler/` directory. Deleting it resets the local database and uploads.

If a hosting target is chosen later, prefer a normal Cloudflare Workers deploy (`wrangler.jsonc` plus `wrangler deploy`), since the app already targets Workers, D1, and R2. Whatever is chosen, CollegeLane's Supabase authentication remains responsible for protecting private application pages — do not depend on a hosting-layer access check for that.

Do not place hosting credentials, bypass tokens, API keys, OAuth secrets, SMTP passwords, or personal account identifiers in source files or documentation.

## Technology

- Vinext on Vite/Cloudflare Workers
- Next.js-compatible App Router
- React 19 and TypeScript
- Tailwind CSS plus custom CSS in `app/globals.css` and `app/functional.css`
- Supabase Auth through `@supabase/supabase-js` and `@supabase/ssr`
- Cloudflare D1 for application accounts, sessions, user state, coach cache, and upload metadata
- Cloudflare R2 for athlete uploads
- OpenAI Responses API for the recruiting assistant and on-demand coach research
- Drizzle SQL migrations in `drizzle/`

Useful commands:

```text
npm install
npm run dev          # runs pending migrations (predev), then starts the server
npm run build
npm test
npm run lint
npm run db:generate
```

`npm run dev` has a `predev` hook that runs `npm run db:migrate` first, so the local D1 schema is always current before the server starts. The migration step is idempotent — Wrangler skips already-applied migrations — so it adds about a second on an up-to-date database and needs no manual intervention.

`npm run db:migrate` uses `wrangler.local.jsonc`, a CLI-only config that points Wrangler at the same Miniflare D1 the dev server uses. It is deliberately not named `wrangler.jsonc` so the Cloudflare Vite plugin does not auto-detect it; `vite.config.ts` remains the only source of binding config for `npm run dev`.

Do not run `npm run db:migrate` by hand while `npm run dev` is already running. A second process writing the Miniflare database while the dev server holds it wedges the dev server's worker, which then returns HTTP 500 for every route until it is restarted. The `predev` hook is safe because it completes before the server starts.

The validated build command is the Vinext build behind `npm run build`. Its output in `dist/` is a local artifact only — nothing publishes it.

## Environment variables

Required production variables are managed by Sites, not committed:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OPENAI_API_KEY
```

Rules:

- The Supabase publishable key may be sent to the browser.
- `SUPABASE_SECRET_KEY` is server-only and must never appear in client bundles, logs, screenshots, or responses.
- `OPENAI_API_KEY` is server-only.
- Google OAuth client secrets remain in Google/Supabase configuration, not in this repository.
- Keep `.env.example` limited to variable names and blank example values.

## Authentication

Authentication is a two-layer system:

1. Supabase verifies email/password or Google identity.
2. CollegeLane links the verified Supabase identity to an application user in D1 and issues its own secure application session cookie.

Implemented flows:

- email signup;
- confirmation email;
- resend confirmation email;
- password login;
- Google sign-in;
- OAuth callback;
- logout;
- existing-account linking by verified email;
- persistent sessions;
- server-side protected-page gating;
- protected APIs returning `401` when unauthenticated.

Important files:

- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — request-scoped server client and cookie forwarding
- `lib/supabase/admin.ts` — server-only administrator client
- `lib/supabase/config.ts` — environment validation
- `lib/auth.ts` — D1 user linking and CollegeLane sessions
- `app/api/auth/signup/route.ts`
- `app/api/auth/resend/route.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/google/route.ts`
- `app/auth/callback/route.ts`
- `app/auth/confirm/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`

Protected roots are defined in `app/[...slug]/page.tsx`. They currently include:

```text
/onboarding
/dashboard
/assessment
/schools
/school/*
/plan
/assistant
/email-builder
/outreach
/profile
```

`/recommended` should be treated as private even though it is not currently listed in `protectedRoots`; add it when touching route gating.

### Confirmation email configuration

- Supabase custom SMTP is enabled.
- The prototype uses Gmail SMTP with port `587`.
- The Gmail SMTP password is a Google App Password, not the normal Google password.
- Supabase's minimum resend interval is approximately 50–60 seconds.
- The app has a dedicated resend endpoint and UI.
- Personal Gmail SMTP is acceptable for prototype testing but is not ideal for production deliverability. A transactional provider such as Resend, Postmark, Brevo, or SendGrid is the recommended next step.

Never read, print, request in chat, or commit the SMTP App Password.

## Persistence and database

The D1 migrations currently create or extend:

- `users`
- `sessions`
- `user_state`
- `coaches`
- `user_uploads`
- `auth_identities`

The `auth_identities` table maps a Supabase provider subject to the existing CollegeLane D1 user. This mapping is essential for preserving pre-existing profiles and preventing duplicate users.

`user_state` stores account-scoped JSON by state key. Client state also uses account-scoped local storage as a cache/fallback, but D1 is the durable source across browsers and logins.

Common state keys include:

- athlete profile;
- saved schools;
- recruiting-plan completion;
- outreach records;
- school notes;
- assistant conversation/context;
- email-builder state and uploads.

Current explicit state keys include:

```text
cl-athlete
cl-schools
cl-tasks
cl-outreach
cl-chat
cl-note-<school-id>
```

The old `cl-plan-dates` state may exist for accounts that used the earlier planning UI, but due dates are no longer displayed or edited. Do not reintroduce due dates unless the user explicitly requests them.

Do not replace server persistence with unscoped `localStorage`. Any local cache key must include the current CollegeLane user ID.

## Athlete profile

The profile is defined in `lib/recruiting.ts` and edited in onboarding/profile screens.

It includes:

- first and last name;
- competition gender (`Men` or `Women`);
- graduation year;
- province;
- high school and competition category;
- academic average;
- intended major selected from a normal-major dropdown;
- preferred region with typed suggestions;
- school-size preference;
- selected NCAA/U SPORTS pathways;
- goals and evolving goal notes;
- primary result;
- two secondary results.

Supported events currently are:

- 100 metres
- 200 metres
- 400 metres
- Long jump
- Triple jump

Running marks are stored in seconds. Jump marks are stored in metres.

The primary-result UI intentionally does not include an upcoming competition or verification-link field.

Profile changes should automatically affect the dashboard, assessment, recommendations, school comparisons, email builder, plan, and assistant context.

## School directory and roster data

Bundled data lives in:

- `data/schoolDirectory.json`
- `data/verifiedMetrics.json`
- `data/schoolCatalog.ts`

Current catalog snapshot:

- 1,141 institutions total
- 1,082 NCAA institutions
- 59 U SPORTS institutions
- NCAA divisions I, II, and III represented
- 3,223 verified metric rows
- 717 schools with at least one verified metric
- current verified metrics are men's data only
- women's verified-metric count is currently zero

School membership sources:

- NCAA institutions use the official NCAA Membership Directory.
- U SPORTS institutions use U SPORTS member information.

Metric sources currently use 2026 outdoor TFRRS team performance lists and store:

- school ID;
- event;
- gender;
- roster average;
- sample size;
- season;
- source URL and label;
- review date.

The school search endpoint is `app/api/schools/route.ts`. It supports:

- school ID;
- query text;
- pathway;
- division;
- event;
- gender.

Search matches school name, city, region, and conference. Results with verified metrics appear before unverified results.

The UI must:

- search as the user types;
- let users filter NCAA/U SPORTS and NCAA division;
- display the athlete's result and the matching gender/event roster average;
- show `Not verified` when no matching metric exists;
- preserve source links and review dates;
- not show a recruiting benchmark;
- not show the old `n=6 2025–2026` prototype caption.

Known limitation: the app cannot yet generate women-specific recommendations because the bundled metric set currently contains no women's verified data. Do not silently substitute men's data.

## Deterministic recommendations

Recommendation logic lives in `lib/recommendations.ts` and `app/api/recommendations/route.ts`.

Current behavior:

- recommendations are deterministic, not AI-generated;
- primary result weight is 60%;
- each additional result weight is 20%;
- marks are compared only with compatible gender/event roster metrics;
- pathway and region preferences affect ordering;
- results are grouped as Reach, Competitive, and Strong Fit;
- missing major, school-size, and admissions data are explicitly not scored;
- low-confidence schools are offered as research-only rather than falsely ranked;
- identical profile/data versions should produce the same order.

The primary navigation links to `/recommended` as **Recommended**. The former **Assistant** navigation item was replaced. The assistant route remains available only as a non-core optional tool.

The recommendations endpoint:

- requires an authenticated CollegeLane session;
- reads the athlete profile from D1 rather than trusting a client-supplied profile;
- evaluates every eligible bundled school before limiting results;
- returns `Cache-Control: private, no-store`;
- returns structured comparisons, reasons, limitations, confidence, source metadata, methodology version, catalog version, and profile hash;
- explicitly refuses women-specific recommendations until verified women's metrics exist.

Initial recommendation score components are athletic alignment, pathway/division preference, and region preference. Intended major, school size, academic average, admissions probability, scholarship probability, and coach interest are not currently scored because the necessary authoritative data does not exist.

The current methodology version is `1.0.0`. The catalog version is defined in `lib/recommendations.ts`.

## Assessment

The assessment engine is in `lib/recruiting.ts`.

It:

- assigns a CollegeLane rating on a broad 35–100 scale;
- assigns one to five stars;
- compares marks across a spectrum from lower-edge collegiate participation through national-level collegiate performance;
- uses event- and gender-specific piecewise reference points;
- recommends a likely research pathway such as NCAA division or U SPORTS;
- is CollegeLane's original educational model, not TrackXC Portal's proprietary formula.

The old “What this means” section was intentionally removed.

Do not calibrate strong marks as elite marks. For example, a 7 m long jump must be compared against the full collegiate spectrum, including top recruits and lower-edge collegiate participants.

## AI recruiting assistant

The endpoint is `app/api/assistant/route.ts`.

The assistant is not present in the main navigation and is not used for deterministic school recommendations. Keep those boundaries intact. If token usage is being reduced, prefer structured guides, official-source links, calculators, search, and deterministic tools over expanding AI usage.

The assistant:

- uses the OpenAI Responses API;
- is profile-aware;
- reads saved goals, plan progress, saved schools, and outreach activity;
- maintains athlete-specific context;
- covers NCAA I/II/III and U SPORTS recruiting;
- should search current official sources for time-sensitive rules;
- must cite consequential current claims;
- must clearly state uncertainty and limitations.

It should help with:

- eligibility and amateurism;
- recruiting calendars and communication;
- coach outreach;
- roster research;
- admissions and academics;
- scholarships and athletic financial awards;
- visits;
- highlight materials;
- timelines;
- school-list strategy;
- Canadian versus American recruiting differences.

If `OPENAI_API_KEY` is missing, the production endpoint returns a configuration error. The README's statement that the app automatically falls back to local guided responses is outdated.

## Coach email builder

The builder is available at `/email-builder`.

Implemented behavior:

- school name is searchable from the same school directory;
- selecting a school loads track-and-field coaches;
- users can filter coaches by name or event role;
- multiple recipients may be selected;
- draft text updates automatically from the athlete profile and selected program;
- the draft is read-only;
- the old “reason for interest” and video-link fields were removed;
- MP4 competition video upload limit is 100 MB;
- PDF transcript upload limit is 10 MB;
- uploaded files appear as attachments in the draft UI;
- CollegeLane copies the draft but does not send the email.

Coach data is not a complete static database. `app/api/coaches/route.ts` performs an OpenAI-assisted official-web lookup and caches verified results in D1 for 30 days. Source URLs must be official school athletics pages.

## Uploads

`app/api/uploads/route.ts` stores files in R2 and metadata in D1.

Requirements:

- authenticate every upload and download;
- scope upload metadata and object access to the current application user;
- accept only the intended file formats and size limits;
- never expose another user's object key or upload;
- keep R2 object access server-controlled.

## UI and visual direction

Current visual direction:

- mobile-first;
- minimal, clean, modern, and restrained;
- no decorative clip art;
- transparent CollegeLane logo in `public/collegelane-logo.png`;
- logo replaces previous text/default logos throughout the site;
- current typography uses Inter through the application font variable, with Arial as a fallback;
- subtle site-wide button and tab animations remain;
- animations include small lift/press feedback, hover fades, active tab motion, and reduced-motion support;
- do not make animations flashy or interfere with input, navigation, or accessibility.

The home page is a general marketing page. It must not display a personal “Your current mark” section.

The signed-in dashboard currently includes:

- current educational assessment;
- profile completion;
- three suggested next actions;
- recruiting-plan completion;
- account-backed saved schools loaded from the real school directory.

The saved-schools card must use `cl-schools`, show a loading state, link each saved school to `/school/:id`, and show a useful empty state. Do not restore the old fictional `data/mock.ts` school cards. The dashboard's former **Quick Start** card was intentionally removed.

The planning page is a functioning account-backed checklist:

- nine recruiting steps;
- complete/incomplete toggles saved under `cl-tasks`;
- progress count and percentage;
- All, Complete, and Incomplete filters;
- an action link from every step to the relevant CollegeLane tool;
- no due-date controls.

## Route map

Public product routes:

- `/`
- `/login`
- `/signup`
- `/disclaimer`
- `/auth/callback`
- `/auth/confirm`

Private product routes:

- `/onboarding`
- `/dashboard`
- `/assessment`
- `/schools`
- `/school/:id`
- `/recommended`
- `/plan`
- `/assistant`
- `/email-builder`
- `/outreach`
- `/profile`

The main UI is currently concentrated in `components/Prototype.tsx`. Preserve behavior carefully when refactoring this large component.

## Important tests

Run at least `npm run build` after code changes. Authentication work should also verify:

1. Anonymous users can view the homepage.
2. Anonymous users are redirected from every private page.
3. New email signup shows “Check your email.”
4. Resend respects the Supabase cooldown and reports useful errors.
5. Confirmation returns to CollegeLane.
6. Correct-password login succeeds.
7. Incorrect-password login gives a generic error.
8. Google OAuth returns through `/auth/callback`.
9. Refresh and browser restart preserve a valid session.
10. Logout blocks protected pages and APIs.
11. Existing-profile linking does not create duplicates or erase data.
12. Two accounts cannot see each other's profile, lists, plans, uploads, or assistant history.
13. Server-only secrets are absent from browser bundles and network responses.

School/recommendation work should verify:

- text search;
- pathway and division filters;
- gender/event metric selection;
- running and jump units;
- missing-metric behavior;
- stable deterministic recommendation ordering;
- no false women-specific result when only men's data exists;
- official source links remain attached to metrics.

## Known gaps and next work

- There is no hosting target. A deployment platform must be chosen before ordinary users can visit and create CollegeLane accounts.
- Women's roster metrics still need verified coverage.
- The static school directory is broad, but locations, majors, sizes, track-program status, and metrics are incomplete for many schools.
- Coach coverage is on-demand rather than a complete prebuilt NCAA/U SPORTS coach database.
- Gmail SMTP should be replaced by a transactional email provider before public launch.
- The README is outdated and still describes an earlier local-storage prototype.
- `/recommended` should be added to the server-side protected-root set.
- Production readiness still requires broader end-to-end authentication, account-isolation, upload-access, and mobile-browser testing.
- Privacy policy, consent language, data-retention policy, account deletion, password recovery, admin moderation, and operational monitoring need a launch review.

## Safe working rules

- Do not commit secrets or personal credentials.
- Do not print password fields, SMTP App Passwords, OAuth secrets, Supabase secret keys, OpenAI keys, session cookies, or hosting bypass tokens.
- Do not weaken server-side route or API authorization.
- Do not use client-supplied user IDs for authorization.
- Do not overwrite unrelated user changes in a dirty worktree.
- Use `apply_patch` for manual source edits.
- Keep data claims source-backed and preserve source metadata.
- Do not fabricate verification.
- Do not alter functioning behavior when a request is purely visual.
- Preserve the transparent CollegeLane logo and mobile layout.
- Build before publishing.
- There is no hosting integration. Do not reintroduce Sites, `.openai/hosting.json`, or any deploy step without an explicit request.

## Documentation maintenance

When a material change lands, update this file if it affects:

- product scope;
- route access;
- environment variables;
- authentication or account linking;
- D1/R2 schema;
- school or metric coverage;
- recommendation methodology;
- AI behavior;
- upload constraints;
- hosting access;
- known production limitations.
