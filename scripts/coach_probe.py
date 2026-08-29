"""Extract track & field coaches (name, title, exact email, event group) from ONE
athletics domain. Used by the subagent coach-database job: an agent resolves a
school's official athletics domain, then calls this to pull real coaches off the
real staff pages. Emails are only ever taken verbatim from fetched HTML, never
constructed, so nothing is fabricated. Schools/sites that don't yield a real
email on a real page just return [].

Usage:  python3 scripts/coach_probe.py <domain> <schoolId>
        -> prints a JSON array of coach rows (may be empty) to stdout.

Extraction is bio-page only: we follow each per-coach bio (which serves a clean
structured name + title + mailto:) and never scrape a listing page's loose
mailto: links, because that pairs emails with section headers ("Cross Country",
"Field Coach") or even cross-sport staff. A miss just returns [].
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
# Sidearm serves coach bios under a LOT of different URL shapes depending on the
# site's vintage/config. cover all the ones seen in the wild; the coach's real
# name is read from the bio page itself, not these slugs.
#   old:      /roster/coaches/<name>/<id>
#   newer:    /roster/season/<year>/staff|coach|coaches/<name>   (auburn, miami)
#   year-dir: /<year>/coaches/<name>                             (anderson)
#   direct:   /coaches/<Name>[/id]                               (blackburn)
BIO_PATTERNS = [
    r"/sports/{slug}/roster/coaches/[A-Za-z0-9._\-]+/\d+",
    r"/sports/{slug}/roster/season/[0-9\-]+/(?:staff|coach|coaches)/[A-Za-z0-9._\-]+",
    r"/sports/{slug}/[0-9]{4}-[0-9]{2}/coaches/[A-Za-z0-9._\-]+",
    r"/sports/{slug}/coaches/[A-Za-z0-9._\-]+(?:/\d+)?",
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


# words that mean a "name" is really a role/section/sport label, not a person.
# guards against bio-slug junk like "track-and-field-staff" -> "Track And Field Staff".
_NOT_NAME = {"coach", "coaching", "track", "field", "cross", "country", "rowing", "sprints",
             "sprint", "jumps", "jump", "throws", "throw", "distance", "hurdles", "hurdle",
             "vault", "program", "outdoor", "indoor", "heavyweight", "lightweight", "director",
             "assistant", "associate", "head", "volunteer", "graduate", "staff", "team",
             "roster", "athletics", "recruiting", "operations", "strength", "conditioning",
             "sports", "medicine", "trainer", "manager", "coordinator", "and", "the"}


def looks_like_name(name):
    # a real coach name is 2+ capitalised word-tokens, none of which is a role/sport word.
    toks = [t for t in re.split(r"\s+", name.strip()) if t]
    if len(toks) < 2:
        return False
    if any(t.lower().strip(".,-") in _NOT_NAME for t in toks):
        return False
    return all(re.match(r"^[A-Z][A-Za-z.'\-]*$", t) for t in toks)


def _name_from_bio_url(bl):
    # old url ends /<name>/<id>; new url ends /staff/<name>. take the last segment
    # that isnt purely digits (split on - and _ so "Noah_Daum" -> "Noah Daum").
    segs = bl.rstrip("/").split("/")
    slug = segs[-2] if segs[-1].isdigit() else segs[-1]
    return " ".join(w.capitalize() for w in re.split(r"[-_]", slug))


def _name_from_bio(bio, bl):
    # prefer the coach's REAL name from the bio page's <title> ("Nathan Huffman -
    # Anderson ..."), since many URLs carry only a surname or an abbreviation.
    # fall back to the URL slug. return "" if neither looks like a real name.
    tm = re.search(r"(?is)<title>\s*([^<|]+?)\s*(?:[-|]|</title>)", bio)
    if tm:
        cand = html.unescape(tm.group(1)).strip()
        if looks_like_name(cand):
            return cand
    url_name = _name_from_bio_url(bl)
    return url_name if looks_like_name(url_name) else ""


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
        # .replace, NOT .format — the patterns contain regex quantifiers like {4}
        # that str.format would try (and fail) to interpolate.
        links |= set(re.findall(pat.replace("{slug}", re.escape(slug)), page))
    for bl in sorted(links)[:15]:
        try:
            bio = fetch("https://" + domain + bl)
        except Exception:
            continue
        email = next((e for e in re.findall(r"mailto:([\w.+\-]+@[\w.\-]+\.[a-z]{2,})", bio, re.I)), None)
        if not email:
            continue
        name = _name_from_bio(bio, bl)
        if not name:  # skip section/program pages, not real coaches
            continue
        title = _title_from_bio(bio)
        rows.append({"gender": gender, "name": name, "title": title or "Coach",
                     "eventGroup": group_for(title), "email": email,
                     "sourceUrl": "https://" + domain + bl})
    return rows


def discover_slugs(domain):
    """Discover a site's REAL track/XC sport slug(s) from its sitemap, instead of
    guessing from a hardcoded list. Sidearm sites use non-obvious abbreviations
    (okstate = "mxct" for men's XC+track) that no fixed list will ever cover, but
    every one publishes them in /sitemap.xml (or its coach/roster sub-sitemaps).
    Returns [(gender, slug), ...] ordered, empty if the sitemap isn't reachable."""
    slugs = set()
    try:
        idx = fetch(f"https://{domain}/sitemap.xml")
    except Exception:
        return []
    subs = re.findall(r"(https?://[^<\s]+\.xml)", idx)
    # if it's a sitemap index, follow the sub-sitemaps that carry sport pages
    pages = [idx]
    for su in subs:
        if any(k in su.lower() for k in ("coach", "roster", "schedule", "page")):
            try:
                pages.append(fetch(su))
            except Exception:
                pass
        if len(pages) >= 5:
            break
    for page in pages:
        slugs |= set(re.findall(r"/sports/([a-z0-9\-]+)/", page))
    # keep only track / cross-country slugs, incl. Sidearm abbreviations (mxct,
    # wxc, mtf...). match "cross-country" NOT bare "cross" (that catches laCROSSe).
    tf = [s for s in slugs if re.search(r"track|cross-?country|xct|[mw]xc|[mw]tf$", s)]

    def gender_of(s):
        if s.startswith("wom") or re.match(r"^w[a-z]{0,3}$", s):
            return "Women"
        if s.startswith("men") or re.match(r"^m[a-z]{0,3}$", s):
            return "Men"
        return "Both"
    # men/women specific first, combined last, so per-squad pages win
    return sorted(((gender_of(s), s) for s in tf), key=lambda x: (x[0] == "Both", x[1]))


def _probe_buckets(domain, school_id, buckets, seen, out):
    for gender, slugs in buckets:
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


def probe(domain, school_id):
    domain = re.sub(r"^https?://(www\.)?", "", domain.strip()).split("/")[0].lower()
    seen, out = set(), []
    # try the site's OWN advertised slugs first (discovered from its sitemap)...
    _probe_buckets(domain, school_id, [(g, [s]) for g, s in discover_slugs(domain)], seen, out)
    # ...and only fall back to the common hardcoded slugs if that found nothing
    # (sites whose sitemap we couldn't read).
    if not out:
        _probe_buckets(domain, school_id, list(SLUGS.items()), seen, out)
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
