"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The athlete's display first-name from their Supabase identity — Google's
// full_name / name / given_name, falling back to the email local-part. Empty
// string until the user loads. Use for greetings and to pre-fill the name field.
export function useDisplayName() {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!alive || !user) return;
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const full = String(meta.full_name || meta.name || meta.given_name || "").trim();
        const first = full ? full.split(/\s+/)[0] : (user.email || "").split("@")[0];
        setName(first);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return name;
}
