import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

// Email confirmation / magic-link verification. Supabase's built-in confirmation
// emails point here with a token_hash + type.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"), "/dashboard");

  if (!token_hash || !type) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", "The confirmation link is incomplete.");
    return NextResponse.redirect(dest);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", error.message);
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
