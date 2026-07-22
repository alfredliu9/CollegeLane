import { localAssistantReply, type AthleteProfile } from "@/lib/recruiting";

export async function POST(request: Request) {
  try {
    const { message, athlete, history = [] } = await request.json() as { message?: string; athlete?: AthleteProfile; history?: Array<{who:string;text:string}> };
    if (!message?.trim() || !athlete) return Response.json({ error: "Enter a recruiting question first." }, { status: 400 });
    const fallback = localAssistantReply(message, athlete);
    if (!process.env.OPENAI_API_KEY) return Response.json({ reply: fallback, source: "guided" });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-5.6-sol",
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        max_output_tokens: 450,
        instructions: "You are CollegeLane, an educational recruiting assistant for Canadian high-school track-and-field athletes. Be practical, supportive, concise, and careful. Use the supplied athlete profile. Never guarantee recruitment, admission, roster placement, or scholarships. Do not invent school standards. Tell users to verify eligibility and policies through official sources. Do not request sensitive personal data.",
        input: [
          { role: "user", content: `Athlete profile: ${JSON.stringify(athlete)}\nRecent conversation: ${JSON.stringify(history.slice(-6))}\nQuestion: ${message}` }
        ],
        safety_identifier: `collegelane-${athlete.gradYear}-${athlete.event.replace(/\W/g, "").toLowerCase()}`,
      }),
    });
    if (!response.ok) return Response.json({ reply: fallback, source: "guided" });
    const data = await response.json() as { output_text?: string; output?: Array<{content?: Array<{text?: string}>}> };
    const reply = data.output_text || data.output?.flatMap(x => x.content || []).map(x => x.text || "").join("") || fallback;
    return Response.json({ reply, source: "ai" });
  } catch {
    return Response.json({ error: "The assistant could not process that question. Please try again." }, { status: 500 });
  }
}
