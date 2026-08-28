import { currentUser } from "@/lib/auth";
import { coachesForSchool } from "@/data/coachDatabase";
import type { CoachGroup } from "@/lib/recruiting";

const headers = { "Cache-Control": "private, no-store", "Content-Type": "application/json" };
const GROUPS = new Set<CoachGroup>(["sprints", "hurdles", "jumps", "vault", "throws", "distance", "combined", "general"]);

// Coach lookup for the email builder. Reads the bundled, verified coach database
// (no OpenAI, no live scraping) and returns the school's coaches ordered so the
// athlete's event specialist and head coach come first.
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  const schoolId = (params.get("schoolId") || "").trim();
  if (!schoolId) return Response.json({ error: "schoolId is required." }, { status: 400, headers });
  const groupParam = params.get("group") as CoachGroup | null;
  const group = groupParam && GROUPS.has(groupParam) ? groupParam : undefined;
  const genderParam = params.get("gender");
  const gender = genderParam === "Men" || genderParam === "Women" ? genderParam : undefined;
  const coaches = coachesForSchool(schoolId, { group, gender });
  return new Response(JSON.stringify({ schoolId, coaches, source: "bundled-verified" }), { headers });
}
