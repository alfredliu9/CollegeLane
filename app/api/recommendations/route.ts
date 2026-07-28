import { currentUser } from "@/lib/auth";
import { readStateEntry } from "@/lib/state";
import { recommendSchools } from "@/lib/recommendations";
import type { AthleteProfile } from "@/lib/recruiting";

const headers = { "Cache-Control": "private, no-store", "Content-Type": "application/json" };

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401, headers });
  const rawLimit = Number(new URL(request.url).searchParams.get("limit") || 12);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(24, Math.floor(rawLimit))) : 12;
  const entry = await readStateEntry<AthleteProfile>(user.id, "cl-athlete");
  if (!entry)
    return Response.json(
      { error: "Complete your athlete profile before requesting recommendations." },
      { status: 422, headers },
    );
  const response = await recommendSchools(entry.value, limit);
  return new Response(
    JSON.stringify({ ...response, profileUpdatedAt: new Date(entry.updatedAt * 1000).toISOString() }),
    { headers },
  );
}
