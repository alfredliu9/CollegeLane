import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

// OAuth (Google) + PKCE code exchange. Supabase sets the session cookies via the
// server client's cookie adapter; then we redirect into the app.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/dashboard");

  if (providerError || !code) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", providerError || "The sign-in link is missing its authorization code.");
    return NextResponse.redirect(dest);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", error.message);
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
