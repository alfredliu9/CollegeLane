"""Merge subagent miss-batch files into data/coaches.json and recompute misses.

Also validates agent output defensively:
  * required fields present, email well-formed
  * schoolId must be a real school we asked about
  * emails must look real (no obvious placeholder)
The same coach appearing on multiple pages is collapsed (gender -> "Both", most
specific eventGroup kept), matching import-coaches.py.

Then run with --verify to re-fetch a random sample of the agent-supplied source
pages and confirm each email literally appears there (anti-fabrication check).
"""
import glob, json, os, random, re, ssl, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COACHES = os.path.join(ROOT, "data", "coaches.json")
TARGETS = os.path.join(ROOT, "data", "_coach_targets.json")
MISSES = os.path.join(ROOT, "data", "_coach_misses.json")
BATCHES = os.path.join(ROOT, "data", "_coach_batches")
GROUPS = {"sprints", "hurdles", "jumps", "vault", "throws", "distance", "combined", "general"}
EMAIL_RE = re.compile(r"^[\w.+\-]+@[\w.\-]+\.[a-z]{2,}$", re.I)
ORDER = ["general", "distance", "sprints", "hurdles", "jumps", "vault", "throws", "combined"]


def valid(row, target_ids):
    try:
        return (
            row.get("schoolId") in target_ids
            and isinstance(row.get("email"), str)
            and EMAIL_RE.match(row["email"].strip())
            and row.get("name")
            and row.get("eventGroup") in GROUPS
            and row.get("gender") in ("Men", "Women", "Both")
            and "example.com" not in row["email"].lower()
        )
    except Exception:
        return False


def collapse(rows):
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


def merge():
    targets = json.load(open(TARGETS, encoding="utf-8"))
    target_ids = {t["id"] for t in targets}
    existing = json.load(open(COACHES, encoding="utf-8"))
    added, kept, dropped = [], 0, 0
    for path in sorted(glob.glob(os.path.join(BATCHES, "miss_*.json"))):
        try:
            rows = json.load(open(path, encoding="utf-8"))
        except Exception:
            continue
        for r in rows:
            if valid(r, target_ids):
                # normalise the fields we store
                added.append({k: r[k] for k in ("schoolId", "gender", "name", "title", "eventGroup", "email", "sourceUrl", "reviewedAt") if k in r})
                kept += 1
            else:
                dropped += 1
    combined = collapse(existing + added)
    json.dump(combined, open(COACHES, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    covered = {r["schoolId"] for r in combined}
    remaining = [t for t in targets if t["id"] not in covered]
    json.dump(remaining, open(MISSES, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"agent rows kept={kept} dropped(invalid)={dropped}")
    print(f"coaches.json now {len(combined)} rows across {len(covered)}/{len(targets)} schools; {len(remaining)} misses remain")


def verify(n=20):
    ctx = ssl._create_unverified_context()
    ua = {"User-Agent": "Mozilla/5.0"}
    rows = json.load(open(COACHES, encoding="utf-8"))
    # only check rows that came from an agent run (reviewedAt 2026-08-28 + a real url)
    sample = [r for r in rows if r.get("sourceUrl", "").startswith("http")]
    random.shuffle(sample)
    ok = bad = err = 0
    checked = []
    for r in sample[:n]:
        try:
            html = urllib.request.urlopen(urllib.request.Request(r["sourceUrl"], headers=ua), timeout=15, context=ctx).read().decode("utf-8", "replace")
        except Exception as e:
            err += 1
            checked.append((r["email"], "FETCH-ERR", type(e).__name__))
            continue
        present = r["email"].lower() in html.lower()
        ok += present
        bad += not present
        checked.append((r["email"], "OK" if present else "NOT-ON-PAGE", r["sourceUrl"][:50]))
    print(f"\nverify sample n={min(n,len(sample))}: on-page={ok} NOT-on-page={bad} fetch-errors={err}")
    for e, status, src in checked:
        print(f"  {status:12} {e:38} {src}")


if __name__ == "__main__":
    merge()
    if "--verify" in sys.argv:
        verify()
