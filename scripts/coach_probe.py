"""Extract track & field coaches (name, title, exact email, event group) from ONE
athletics domain. Used by the subagent coach-database job: an agent resolves a
school's official athletics domain, then calls this to pull real coaches off the
real staff pages. Emails are only ever taken verbatim from fetched HTML, never
constructed, so nothing is fabricated. Schools/sites that don't yield a real
email on a real page just return [].

Usage:  python3 scripts/coach_probe.py <domain> <schoolId>
        -> prints a JSON array of coach rows (may be empty) to stdout.

Handles the common layouts:
  * Sidearm Sports  /sports/<slug>/coaches  + per-coach bio pages (mailto:)
  * Sidearm staff-directory / generic pages with inline mailto: + nearby title
Only track & field / cross country staff are kept.
"""
import html, json, re, ssl, sys, urllib.error, urllib.parse, urllib.request

_CTX = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (CollegeLane coach research)"}

# slug variants seen across Sidearm sites for the T&F coaches/staff listing
SLUGS = {
    "Men": ["mens-track-and-field", "mens-track-field", "mens-outdoor-track-field",
            "mens-track-and-field-", "mtrack", "mens-cross-country", "mens-track",
            "mens-xctrack", "mens-cross-country-and-track-and-field"],
    "Women": ["womens-track-and-field", "womens-track-field", "womens-outdoor-track-field",
              "wtrack", "womens-cross-country", "womens-track", "womens-xctrack",
              "womens-cross-country-and-track-and-field"],
    "Both": ["track-and-field", "track-field", "xctrack", "track", "cross-country", "xc",
             "mens-and-womens-track-and-field", "track-and-field-cross-country",
             "cross-country-and-track-and-field", "cross-country-track"],
}
# the two Sidearm coach-bio URL shapes: old = /roster/coaches/<name>/<id>, and
# newer = /roster/season/<year>/staff/<name>. auburntigers.com uses the newer one,
# which is why the old-only probe wrongly wrote Auburn off as a miss.
BIO_PATTERNS = [
    r"/sports/{slug}/roster/coaches/[a-z0-9.\-]+/\d+",
    r"/sports/{slug}/roster/season/[0-9\-]+/staff/[a-z0-9.\-]+",
]
# title text -> event group used to match an athlete's event
GROUPS = [
    ("vault", ["pole vault", "vault"]),
    ("hurdles", ["hurdle"]),
    ("jumps", ["jump", "horizontal", "vertical"]),
    ("throws", ["throw", "shot put", "discus", "hammer", "javelin", "weight"]),
    ("combined", ["combined event", "multi", "decathlon", "heptathlon", "pentathlon"]),
    ("sprints", ["sprint", "short", "speed", "relay"]),
    ("distance", ["distance", "mid-distance", "middle distance", "cross country", "xc", "endurance", "steeple"]),
]
HEAD_WORDS = ["director of track", "head coach", "head track", "head cross country",
              "associate head coach", "assistant coach", "volunteer assistant", "graduate assistant"]


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=_CTX) as r:
        return r.read().decode("utf-8", "replace")


def strip_tags(markup):
    markup = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", markup)
    return html.unescape(re.sub(r"<[^>]+>", " ", markup))


def group_for(title):
    low = title.lower()
    for g, keys in GROUPS:
        if any(k in low for k in keys):
            return g
    return "general"


def clean_title(raw):
    # collapse whitespace, keep it to a sane length, drop trailing junk
    t = re.sub(r"\s+", " ", raw).strip(" -|·,")
    return t[:80]


def _name_from_bio_url(bl):
    # old url ends /<name>/<id>; new url ends /staff/<name>. take the last segment
    # that isnt purely digits.
    segs = bl.rstrip("/").split("/")
    slug = segs[-2] if segs[-1].isdigit() else segs[-1]
    return " ".join(w.capitalize() for w in slug.split("-"))


def _title_from_bio(bio):
    # Sidearm serves a clean structured title. read it from whichever layout the
    # site uses, in order, before falling back to the (generic) <title> tag:
    #   old:  <dt>Title</dt><dd>Assistant Coach (Throws)</dd>
    #   new:  ...field-label">Position</span>...field-value">Head Coach</strong>
    dm = re.search(r"(?is)<dt>\s*(?:Title|Position)\s*</dt>\s*<dd>(.*?)</dd>", bio)
    if dm:
        return clean_title(strip_tags(dm.group(1)))
    hm = re.search(r"(?is)profile-field-label[^>]*>\s*(?:Position|Title)\s*</span>.*?"
                   r"profile-field-value[^>]*>(.*?)</", bio)
    if hm:
        return clean_title(strip_tags(hm.group(1)))
    tm = re.search(r"(?is)<title>\s*([^<]+?)\s*</title>", bio)
    if tm:
        parts = [p.strip() for p in html.unescape(tm.group(1)).split(" - ")]
        return next((p for p in parts if re.search(r"(?i)coach|director|throw|jump|sprint|distance|hurdl|vault", p)), "")
    return ""


def sidearm_bios(domain, page, slug, gender):
    """Follow Sidearm per-coach bio pages; each bio serves a mailto: + a title.
    Handles both the old (/roster/coaches/<name>/<id>) and newer
    (/roster/season/<year>/staff/<name>) bio URL shapes."""
    rows = []
    links = set()
    for pat in BIO_PATTERNS:
        links |= set(re.findall(pat.format(slug=re.escape(slug)), page))
    for bl in sorted(links)[:15]:
        try:
            bio = fetch("https://" + domain + bl)
        except Exception:
            continue
        email = next((e for e in re.findall(r"mailto:([\w.+\-]+@[\w.\-]+\.[a-z]{2,})", bio, re.I)), None)
        if not email:
            continue
        title = _title_from_bio(bio)
        rows.append({"gender": gender, "name": _name_from_bio_url(bl), "title": title or "Coach",
                     "eventGroup": group_for(title), "email": email,
                     "sourceUrl": "https://" + domain + bl})
    return rows


def inline_mailtos(domain, url, page, gender):
    """Fallback: staff-directory style pages with inline mailto: links. Pair each
    email with the nearest preceding name + title text."""
    rows = []
    text = strip_tags(page)
    for m in re.finditer(r"mailto:([\w.+\-]+@[\w.\-]+\.[a-z]{2,})", page, re.I):
        email = m.group(1)
        # look at the ~400 chars of visible text before this email for a name/title
        before = strip_tags(page[max(0, m.start() - 1200):m.start()])
        low = before.lower()
        if not any(w in low for w in ("track", "cross country", "field")) and \
           not any(w in low for w in HEAD_WORDS):
            continue
        nm = re.findall(r"\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b", before[-300:])
        title_m = re.search(r"(?i)(head coach|assistant coach|associate head coach|"
                            r"director of track[^\n.]{0,40}|volunteer assistant|graduate assistant)([^\n.]{0,50})",
                            before[-400:])
        rows.append({"gender": gender,
                     "name": nm[-1] if nm else "",
                     "title": clean_title(title_m.group(0)) if title_m else "Coach",
                     "eventGroup": group_for(title_m.group(0) if title_m else ""),
                     "email": email, "sourceUrl": url})
    return rows


def probe(domain, school_id):
    domain = re.sub(r"^https?://(www\.)?", "", domain.strip()).split("/")[0].lower()
    seen = set()
    out = []
    for gender, slugs in SLUGS.items():
        for slug in slugs:
            rows = []
            # bio links live on the /coaches listing (old) OR the /roster page
            # (newer sites like Auburn). try both before giving up on a slug.
            for suffix in ("coaches", "roster"):
                url = f"https://{domain}/sports/{slug}/{suffix}"
                try:
                    page = fetch(url)
                except Exception:
                    continue
                rows = sidearm_bios(domain, page, slug, gender)
                if not rows and suffix == "coaches":
                    rows = inline_mailtos(domain, url, page, gender)
                if rows:
                    break
            if not rows:
                continue  # this slug had nothing usable, try the next
            for r in rows:
                key = (r["email"].lower(), r["gender"])
                if r["email"] and key not in seen:
                    seen.add(key)
                    out.append({"schoolId": school_id, **r, "reviewedAt": "2026-08-28"})
            break  # got this gender bucket, don't try the remaining slugs
    return out


def main():
    if len(sys.argv) < 3:
        print("[]"); return
    domain, school_id = sys.argv[1], sys.argv[2]
    try:
        rows = probe(domain, school_id)
    except Exception:
        rows = []
    print(json.dumps(rows, ensure_ascii=False))


if __name__ == "__main__":
    main()
