"""Combine the fresh deterministic probe output with the agent-found rows.

Deterministic rows (data/_coaches_det.json) are exact-by-construction and take
precedence. For schools the probe still can't reach, we keep the earlier
agent-found rows already living in data/coaches.json (those were verified to
appear verbatim on their source pages). Result overwrites data/coaches.json and
recomputes data/_coach_misses.json.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DET = os.path.join(ROOT, "data", "_coaches_det.json")
CUR = os.path.join(ROOT, "data", "coaches.json")
TARGETS = os.path.join(ROOT, "data", "_coach_targets.json")
MISSES = os.path.join(ROOT, "data", "_coach_misses.json")
ORDER = ["general", "distance", "sprints", "hurdles", "jumps", "vault", "throws", "combined"]


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


def main():
    det = json.load(open(DET, encoding="utf-8"))
    cur = json.load(open(CUR, encoding="utf-8"))
    det_ids = {r["schoolId"] for r in det}
    # keep agent-found coaches only for schools the deterministic probe still misses
    supplement = [r for r in cur if r["schoolId"] not in det_ids]
    supp_ids = {r["schoolId"] for r in supplement}
    combined = collapse(det + supplement)
    json.dump(combined, open(CUR, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    targets = json.load(open(TARGETS, encoding="utf-8"))
    covered = {r["schoolId"] for r in combined}
    misses = [t for t in targets if t["id"] not in covered]
    json.dump(misses, open(MISSES, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"deterministic schools: {len(det_ids)} | agent-supplement schools: {len(supp_ids)}")
    print(f"coaches.json now {len(combined)} rows across {len(covered)}/{len(targets)} schools; {len(misses)} misses")


if __name__ == "__main__":
    main()
