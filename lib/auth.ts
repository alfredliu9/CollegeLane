import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AppUser = { id: string; email: string; name: string };

// The signed-in user, straight from the Supabase session. `id` is the Supabase
// Auth user id (a uuid), the key all application data is scoped by. `name` is
// the display first-source name from the identity (Google full_name / name /
// given_name), falling back to the email local-part.
export async function currentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const name = String(meta.full_name || meta.name || meta.given_name || "").trim() || user.email.split("@")[0];
  return { id: user.id, email: user.email, name };
}
