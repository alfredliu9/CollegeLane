export const meta = {
  name: 'coach-misses-finish',
  description: 'Subagents find real coach emails for the schools the deterministic pass missed',
  phases: [{ title: 'Finish misses', detail: 'one agent per batch of ~10 missed schools' }],
};

// 136 missed schools, batched. Each agent reads its own slice of the misses file
// and writes real coach rows to its own batch file (no fabrication).
const COUNT = args?.count ?? 136;
const SIZE = args?.size ?? 10;
const batches = [];
for (let start = 0; start < COUNT; start += SIZE) batches.push([start, Math.min(start + SIZE, COUNT)]);

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['processed', 'coachesFound', 'schoolsCovered'],
  properties: {
    processed: { type: 'integer' },
    coachesFound: { type: 'integer' },
    schoolsCovered: { type: 'integer' },
    notes: { type: 'string' },
  },
};

function prompt(start, end) {
  return `You are finishing a verified track & field coach database. Work ONLY from real web pages. NEVER invent, guess, or construct an email — only record an email that appears VERBATIM (character-for-character) in a mailto: link or as plain text on a page you actually fetched. If a school genuinely doesn't publish coach emails (common for big programs), record NOTHING for it. Fabrication would break the app.

WORKING DIR: /Users/matin/Projects/CollegeLane (all paths relative to it).

YOUR SCHOOLS: Read \`data/_coach_misses.json\` (a JSON array). Process ONLY indices ${start} to ${end - 1} inclusive. Each entry is {id, name, region, domain (may be null), reason}.

PER SCHOOL (cap your effort — at most ~2 web searches + a few fetches, then move on):
1. If \`domain\` is set, first try: \`python3 scripts/coach_probe.py <domain> <id>\` — it returns a JSON array of coaches with exact emails. If non-empty, use it and you're done with that school.
2. If that's empty or domain is null: use WebSearch like \`<name> track and field coaches\` or \`<name> athletics staff directory\` to find the OFFICIAL athletics site and its track & field coaches/staff page. Ignore wikipedia, ncaa.org, tfrrs, hudl, news, social media.
   - Once you have the real athletics domain, try the probe again with it: \`python3 scripts/coach_probe.py <domain> <id>\`.
   - If the probe is still empty (JS-rendered listing or non-Sidearm CMS), fetch the actual coaches/staff-directory page RAW HTML: \`curl -skL --max-time 25 -A "Mozilla/5.0" '<url>'\`. Some Sidearm sites have a JS listing but static per-coach bio pages — if you can find bio page URLs (in search results or page links), fetch those; they carry mailto: emails.
3. From the fetched HTML, extract each TRACK/CROSS-COUNTRY coach: name, title, and email (verbatim). Skip non-track sports. Map the title to an eventGroup by keyword: pole vault/vault→"vault"; hurdle→"hurdles"; jump/horizontal/vertical→"jumps"; throw/shot/discus/hammer/javelin/weight→"throws"; sprint/speed/relay→"sprints"; distance/cross country/xc/steeple/mid→"distance"; combined/multi/decathlon/heptathlon→"combined"; a head coach or director with no listed specialty→"general".

Build rows shaped EXACTLY like:
{"schoolId":"<id>","gender":"Men"|"Women"|"Both","name":"...","title":"...","eventGroup":"...","email":"...","sourceUrl":"<exact page url you extracted from>","reviewedAt":"2026-08-28"}

OUTPUT: write ALL rows you collect (across your whole slice) as one compact JSON array to \`data/_coach_batches/miss_${start}.json\`. REWRITE this file after each school so nothing is lost. If you found nothing for the whole slice, write \`[]\`.

Return a JSON object: {processed, coachesFound, schoolsCovered, notes}. In notes, briefly say which schools genuinely publish no coach email (so we know they're real dead-ends, not skipped).`;
}

phase('Finish misses');
const results = await parallel(
  batches.map(([start, end]) => () =>
    agent(prompt(start, end), {
      label: `misses ${start}-${end - 1}`,
      phase: 'Finish misses',
      agentType: 'general-purpose',
      schema: RESULT_SCHEMA,
    }),
  ),
);

const ok = results.filter(Boolean);
return {
  batches: batches.length,
  agentsReturned: ok.length,
  processed: ok.reduce((s, r) => s + (r.processed || 0), 0),
  coachesFound: ok.reduce((s, r) => s + (r.coachesFound || 0), 0),
  schoolsCovered: ok.reduce((s, r) => s + (r.schoolsCovered || 0), 0),
};
