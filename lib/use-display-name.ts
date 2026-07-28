"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "@/components/account-context";

function firstNameOf(full: string, email: string) {
  const f = (full || "").trim();
  return f ? f.split(/\s+/)[0] : (email || "").split("@")[0];
}

// The athlete's display first-name. Inside the signed-in (app) shell this comes
// from server-provided context (instant, no round-trip). Elsewhere (e.g. the
// full-screen onboarding route) it falls back to a client-side identity lookup.
export function useDisplayName() {
  const account = useAccount();
  const [fallback, setFallback] = useState("");

  useEffect(() => {
    if (account) return; // already have it from context
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!alive || !user) return;
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        setFallback(firstNameOf(String(meta.full_name || meta.name || meta.given_name || ""), user.email || ""));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account]);

  if (account) return firstNameOf(account.name, account.email);
  return fallback;
}
