// Environment access for the Supabase clients. Standard Node/Next.js env vars
// (loaded by Next from `.env`); no runtime-specific binding layer.

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("Supabase authentication is not configured.");
  return { url, publishableKey };
}

export function supabaseSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Supabase administrator access is not configured.");
  return secret;
}
