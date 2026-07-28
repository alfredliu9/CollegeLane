# CollegeLane — local setup

Standard **Next.js + Supabase** app. No Cloudflare, no wrangler, no migrations tooling.

## 1. Install

```bash
npm install
```

## 2. Environment (`.env`)

Already present: the three Supabase keys. Add your OpenAI key to enable the AI
assistant and coach lookup (optional — those features show a friendly
"not configured" state without it):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
OPENAI_API_KEY=...        # optional, for /assistant and coach lookup
```

## 3. Supabase project setup (one time)

Do these in the [Supabase dashboard](https://supabase.com/dashboard) for your project:

1. **Create the tables.** SQL Editor → New query → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → Run. This creates
   `user_state`, `coaches`, and `user_uploads` (RLS on, service-role only).
2. **Create the uploads bucket.** Storage → New bucket → name it **`uploads`**,
   keep it **Private**. (Used for athlete video/transcript uploads.)
3. **Auth URLs.** Authentication → URL Configuration:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` and
     `http://localhost:3000/auth/confirm`
   - When you deploy to Vercel, add the production equivalents too.
4. **Google sign-in** is already enabled on your project — just make sure the
   redirect URLs above are allowed.
5. **Email confirmations** use Supabase's built-in email (no custom SMTP needed).

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel (later)

Import the repo in Vercel (framework auto-detects **Next.js**), set the same
four environment variables in the Vercel project settings, and add your
production domain to the Supabase Auth redirect URLs. No adapter or extra
config needed.
