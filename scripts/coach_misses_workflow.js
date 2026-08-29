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

These are the HARD leftovers: their coach LISTING pages are usually JavaScript-rendered (so raw HTML of the listing looks empty), but the individual coach BIO pages are static and DO carry the email. Your job is to find the bio-page URLs and read the emails off them.

PER SCHOOL (cap effort ~3 searches + a handful of fetches, then move on):
1. Try the probe first: \`python3 scripts/coach_probe.py <domain> <id>\` (domain from the entry). If non-empty, use it, done.
2. If empty: find the individual coach BIO page URLs (NOT just the listing). Best sources:
   - WebSearch \`<name> track and field coach\` / \`<name> cross country coach\` — search results often ARE the individual bio pages.
   - The site's coach sitemap: fetch \`https://<domain>/sitemap.xml\` and any sub-sitemap whose URL contains "coach"/"roster"/"staff"; grep it for bio URLs.
   Bio URLs take MANY shapes — accept all of these:
     /sports/<slug>/roster/coaches/<name>/<id>
     /sports/<slug>/roster/season/<year>/(coach|staff)/<name>
     /sports/<slug>/<year>/coaches/<name>
     /sports/<slug>/coaches/<Name>
     /staff-directory/<name>/<id>
3. Fetch each bio page's RAW HTML: \`curl -skL --max-time 25 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" '<bio-url>'\`. Take the email EXACTLY as it appears (a mailto: link or plain text). The coach's real NAME is usually in the page <title> or an <h1> ("Nathan Huffman - ...") — use that, not the URL slug. Confirm the person is TRACK or CROSS COUNTRY staff (title/page mentions track, cross country, or a T&F event) — skip other sports.
4. BOT-PROTECTED SITES: if curl returns a tiny body, an HTTP 202/403, or a "checking your browser" challenge instead of the real page, that site blocks scripts — you CANNOT get its email. Note it and skip. Do NOT guess.
5. Map title to eventGroup: pole vault/vault→"vault"; hurdle→"hurdles"; jump/horizontal/vertical→"jumps"; throw/shot/discus/hammer/javelin/weight→"throws"; sprint/speed/relay→"sprints"; distance/cross country/xc/steeple/mid→"distance"; combined/multi/decathlon/heptathlon→"combined"; head coach/director with no specialty→"general".

ABSOLUTE RULE: only ever record an email that appears VERBATIM on a bio page you actually fetched. NEVER build an email from a name + the school's domain, even if the pattern seems obvious — those get thrown out and waste the work.

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
