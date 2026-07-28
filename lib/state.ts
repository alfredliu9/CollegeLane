import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Account-scoped key/value store in Supabase Postgres (table `user_state`).
// Values are JSON strings keyed by (user_id, state_key) — e.g. `cl-athlete`,
// `cl-schools`, `cl-tasks`, `cl-outreach`, `cl-chat`. Reached only through the
// service-role client, so the caller MUST pass an authenticated user id.

const now = () => Math.floor(Date.now() / 1000);

export async function readState<T>(userId: string, key: string): Promise<T | undefined> {
  const { data } = await createAdminClient()
    .from("user_state")
    .select("value_json")
    .eq("user_id", userId)
    .eq("state_key", key)
    .maybeSingle();
  if (!data?.value_json) return undefined;
  try {
    return JSON.parse(data.value_json) as T;
  } catch {
    return undefined;
  }
}

export async function readStateEntry<T>(
  userId: string,
  key: string,
): Promise<{ value: T; updatedAt: number } | undefined> {
  const { data } = await createAdminClient()
    .from("user_state")
    .select("value_json,updated_at")
    .eq("user_id", userId)
    .eq("state_key", key)
    .maybeSingle();
  if (!data?.value_json) return undefined;
  try {
    return { value: JSON.parse(data.value_json) as T, updatedAt: Number(data.updated_at) };
  } catch {
    return undefined;
  }
}

export async function writeState(userId: string, key: string, value: unknown): Promise<{ updatedAt: number }> {
  const updated_at = now();
  const { error } = await createAdminClient()
    .from("user_state")
    .upsert(
      { user_id: userId, state_key: key, value_json: JSON.stringify(value), updated_at },
      { onConflict: "user_id,state_key" },
    );
  if (error) throw new Error(error.message);
  return { updatedAt: updated_at };
}
