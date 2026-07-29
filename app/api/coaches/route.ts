import { currentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolCatalog } from "@/data/schoolCatalog";

type Coach = { id: string; name: string; role: string; email: string; sourceUrl: string };
const DAY = 86400;

function outputText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  return (
    data.output_text ||
    data.output
      ?.flatMap((x) => x.content || [])
      .map((x) => x.text || "")
      .join("")
      .trim() ||
    ""
  );
}
function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match)
      try {
        return JSON.parse(match[0]);
      } catch {}
    return null;
  }
}

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const schoolId = new URL(request.url).searchParams.get("schoolId") || "";
  if (!schoolId) return Response.json({ coaches: [] });
  const school = schoolCatalog.find((s) => s.id === schoolId);
  if (!school) return Response.json({ error: "School not found." }, { status: 404 });

  const db = createAdminClient();
  const now = Math.floor(Date.now() / 1000);
  const { data: cached } = await db
    .from("coaches")
    .select("id,name,role,email,source_url")
    .eq("school_id", schoolId)
    .gt("verified_at", now - 30 * DAY);
  if (cached && cached.length)
    return Response.json({
      coaches: cached.map((c) => ({ id: c.id, name: c.name, role: c.role, email: c.email, sourceUrl: c.source_url })),
      school,
      source: "cache",
    });

  if (!process.env.OPENAI_API_KEY)
    return Response.json({ coaches: [], school, error: "Coach lookup is temporarily unavailable." }, { status: 503 });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o",
      reasoning: { effort: "medium" },
      tools: [{ type: "web_search" }],
      max_output_tokens: 1800,
      instructions:
        "Research current track and field/cross country coaching staff. Use only the institution's official athletics website or official staff directory. Return strict JSON only. Never guess names, roles, or emails. Include head coaches and event-group coaches (sprints, jumps, throws, distance, combined events) when officially listed. Omit volunteers/administrators unless they coach an event.",
      input: `School: ${school.name}, ${school.city}, ${school.region}, ${school.country}. Pathway: ${school.pathway} ${school.division}. Find its current track and field coaches. Return {"coaches":[{"name":"","role":"","email":"","sourceUrl":"https://official..."}]}. Every sourceUrl must be an official school athletics page.`,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  if (!response.ok) return Response.json({ coaches: [], school, error: "Coach lookup could not be completed." }, { status: 502 });
  const parsed = safeJson(outputText(data));
  const found = Array.isArray(parsed?.coaches) ? parsed.coaches : [];
  const coaches: Coach[] = found
    .filter(
      (c: Record<string, unknown>) =>
        typeof c.name === "string" && typeof c.role === "string" && typeof c.sourceUrl === "string" && /^https:\/\//.test(c.sourceUrl),
    )
    .slice(0, 20)
    .map((c: Record<string, string>) => ({
      id: crypto.randomUUID(),
      name: c.name.trim(),
      role: c.role.trim(),
      email: (c.email || "").trim(),
      sourceUrl: c.sourceUrl,
    }));

  await db.from("coaches").delete().eq("school_id", schoolId);
  if (coaches.length)
    await db.from("coaches").insert(
      coaches.map((c) => ({
        id: c.id,
        school_id: schoolId,
        name: c.name,
        role: c.role,
        email: c.email,
        source_url: c.sourceUrl,
        verified_at: now,
      })),
    );
  return Response.json({ coaches, school, source: "official-web" });
}
