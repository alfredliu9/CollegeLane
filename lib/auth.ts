import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AppUser = { id: string; email: string };

// The signed-in user, straight from the Supabase session. `id` is the Supabase
// Auth user id (a uuid) — this is the key all application data is scoped by.
export async function currentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return { id: user.id, email: user.email };
}
