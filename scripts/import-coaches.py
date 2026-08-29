"""Build a track & field coach database from schools' official athletics sites.

Two stages, both free (no search engines, which just 429/block scripted lookups
from here; no API keys):
  1. Resolve each school's athletics domain from the NCAA membership directory
     page (web3.ncaa.org/directory/orgDetail?id=N), which lists the official
     athletics site under an "Athletics Links" section, e.g. -> acusports.com.
  2. Extract coaches (name, title, EXACT email, event group) off that domain via
     coach_probe.probe(). Emails are only ever taken verbatim from a fetched
     page, never constructed, so a miss just yields no rows (never fabricated).

Schools with no coach email found are written to data/_coach_misses.json for a
subagent pass to finish (find the staff page + extract) on the harder,
non-standard sites — see scripts/coach_misses_workflow.js and merge_coach_batches.py.
Output: data/coaches.json.

Env: CL_LIMIT=N (only N schools, for validation), CL_OUTPUT=path,
     CL_ONLY_MISSES=1 (reprocess just data/_coach_misses.json and merge).
"""
import concurrent.futures, json, os, re, ssl, urllib.error, urllib.request
import coach_probe  # single-domain exact-email extractor (same dir)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRECTORY = os.path.join(ROOT, "data", "schoolDirectory.json")
OUTPUT = os.environ.get("CL_OUTPUT", os.path.join(ROOT, "data", "coaches.json"))
MISSES = os.path.join(ROOT, "data", "_coach_misses.json")
LIMIT = int(os.environ.get("CL_LIMIT", "0"))
_CTX = ssl._create_unverified_context()
UA = {"User-Agent": "CollegeLane coach importer/1.0 (research)"}
# hosts that are never a school's athletics site (socials, analytics, CDNs, refs).
_NONATH = ("facebook", "twitter", "instagram", "youtube", "tiktok", "linkedin", "x.com", "flickr",
           "snapchat", "threads", "googletagmanager", "go-mpulse", "mpulse", "gstatic", "google.",
           "schema.org", "w3.org", "amazonaws", "cloudfront", "akamai", "doubleclick", "onetrust",
           "cookielaw", "boomerang", "adobe", "ncaa.org", "hudl.com")
# rank event groups by specificity so the collapse keeps the most useful label.
ORDER = ["general", "distance", "sprints", "hurdles", "jumps", "vault", "throws", "combined"]


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=20, context=_CTX) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.URLError as e:
        if isinstance(getattr(e, "reason", None), ssl.SSLError):  # sandbox CA fallback
            with urllib.request.urlopen(req, timeout=20, context=_CTX) as r:
                return r.read().decode("utf-8", "replace")
        raise


def resolve_domain(ncaa_id):
    # the NCAA directory page lists each school's official athletics site under an
    # "Athletics Links" section (e.g. www.acusports.com). free + authoritative +
    # bulk, unlike search engines which just block scripted lookups from here.
    try:
        h = fetch(f"https://web3.ncaa.org/directory/orgDetail?id={ncaa_id}")
    except Exception:
        return None
    i = h.find("Athletics Links")
    region = h[i:i + 2000] if i >= 0 else h
    for real in re.findall(r'href="(https?://[^"]+)"', region):
        # take the host after the LAST "://" so malformed doubled-protocol links
        # like "http://https://gocrimson.com/" (a real NCAA data-entry quirk that
        # was silently killing Harvard etc.) resolve to gocrimson.com, not "https:".
        d = re.sub(r"^www\.", "", real.split("://")[-1]).split("/")[0].lower()
        if not d or "." not in d or any(s in d for s in _NONATH):
            continue
        # within the Athletics Links section the link IS the athletics site, so
        # accept athletics.<school>.edu subdomains (lots of Sidearm sites live
        # there); only skip a bare institutional root like "school.edu".
        if d.endswith(".edu") and d.count(".") < 2:
            continue
        return d
    return None


def collapse(rows):
    # one coach can appear on the mens + womens + combined pages; fold them into a
    # single row (gender -> "Both" across squads, keep the most specific event group).
    merged = {}
    for r in rows:
        key = (r["schoolId"], r["email"].lower())
        cur = merged.get(key)
        if not cur:
            merged[key] = dict(r)
            continue
        genders = {cur["gender"], r["gender"]}
        cur["gender"] = "Both" if ("Both" in genders or {"Men", "Women"} <= genders) else cur["gender"]
        if ORDER.index(r["eventGroup"]) > ORDER.index(cur["eventGroup"]):
            cur["eventGroup"], cur["title"], cur["sourceUrl"] = r["eventGroup"], r["title"], r["sourceUrl"]
    return sorted(merged.values(), key=lambda x: (x["schoolId"], x["eventGroup"], x["name"]))


def main():
    # only the schools that appear in-app (have verified roster metrics) — those
    # are the ones an athlete gets matched to and would email a coach at.
    metric_ids = set(x["schoolId"] for x in json.load(open(os.path.join(ROOT, "data", "verifiedMetrics.json"), encoding="utf-8")))
    schools = [s for s in json.load(open(DIRECTORY, encoding="utf-8")) if s["pathway"] == "NCAA" and s["id"] in metric_ids]
    # CL_ONLY_MISSES=1 reprocesses just data/_coach_misses.json, keeping the coaches
    # already found for everyone else (fast retry after a resolver/probe fix).
    keep_rows = []
    if os.environ.get("CL_ONLY_MISSES"):
        miss_ids = set(x["id"] for x in json.load(open(MISSES, encoding="utf-8")))
        keep_rows = [r for r in json.load(open(OUTPUT, encoding="utf-8")) if r["schoolId"] not in miss_ids]
        schools = [s for s in schools if s["id"] in miss_ids]
    if LIMIT:
        schools = schools[:LIMIT]
    print(f"Resolving domains + probing coaches for {len(schools)} schools...", flush=True)

    def work(s):
        nid = re.search(r"id=(\d+)", s.get("sourceUrl", ""))
        dom = resolve_domain(nid.group(1)) if nid else None
        if not dom:
            return (s, None, [])
        try:
            return (s, dom, coach_probe.probe(dom, s["id"]))
        except Exception:
            return (s, dom, [])

    all_rows, resolved, misses = [], 0, []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for i, (s, dom, rows) in enumerate(pool.map(work, schools), 1):
            if dom:
                resolved += 1
            all_rows.extend(rows)
            if not rows:  # no coach email found yet -> a subagent should finish it
                misses.append({"id": s["id"], "name": s["name"], "region": s["region"],
                               "domain": dom, "reason": "no-domain" if not dom else "no-email-found"})
            if i % 25 == 0:
                print(f"  {i}/{len(schools)} ({resolved} domains, {len(all_rows)} coaches, {len(misses)} misses)", flush=True)

    combined = collapse(keep_rows + all_rows)
    json.dump(combined, open(OUTPUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(misses, open(MISSES, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    covered = len(set(x["schoolId"] for x in combined))
    print(f"Resolved {resolved}/{len(schools)} domains. Wrote {len(combined)} coaches across {covered} schools. "
          f"{len(misses)} misses -> data/_coach_misses.json")


if __name__ == "__main__":
    main()
