"""Build a track & field coach database by scraping schools' official athletics
sites (Sidearm Sports, which serves coach name/role/email in static HTML).

Two stages:
  1. Resolve each school's athletics domain from Wikipedia's athletics-program
     infobox (keyless API), e.g. "NJIT" -> njithighlanders.com.
  2. Scrape /sports/<mens|womens>-track-and-field/coaches on that domain, follow
     each coach bio page, and pull name + role + email. Map the role to an event
     group so the email builder can suggest the right coach for an athlete's event.

Coverage is partial by nature: only schools on a Sidearm-style site with a
resolvable Wikipedia athletics page are captured. Missing schools simply have no
rows (never fabricated). Output: data/coaches.json.

Env: CL_LIMIT=N (process only N schools, for validation), CL_OUTPUT=path.
"""
import concurrent.futures, json, os, re, ssl, threading, time, urllib.error, urllib.parse, urllib.request

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRECTORY=os.path.join(ROOT,"data","schoolDirectory.json")
OUTPUT=os.environ.get("CL_OUTPUT",os.path.join(ROOT,"data","coaches.json"))
LIMIT=int(os.environ.get("CL_LIMIT","0"))
_CTX=ssl._create_unverified_context()
UA={"User-Agent":"CollegeLane coach importer/1.0 (research)"}
SLUGS=[("Men","mens-track-and-field"),("Women","womens-track-and-field")]
SOCIAL=("wikipedia.","wikimedia.","facebook.","instagram.","twitter.","x.com","youtube.","tiktok.","google.","archive.org","doi.org",".gov","linkedin.","flickr.")
# role text -> event group used to match an athlete's event
GROUPS=[("sprints",["sprint","speed","100","200","400 "]),("hurdles",["hurdle"]),("jumps",["jump","horizontal"]),
        ("vault",["vault"]),("throws",["throw","shot","discus","hammer","javelin"]),
        ("distance",["distance","cross country","xc","mid-distance","middle distance","5000","800","1500"]),
        ("combined",["combined","multi","decathlon","heptathlon"])]
ROLE_WORDS=["Director of Track","Head Coach","Associate Head Coach","Assistant Coach","Volunteer Assistant",
            "Sprints","Hurdles","Jumps","Horizontal Jumps","Vertical Jumps","Pole Vault","Throws","Distance","Mid-Distance","Combined Events","Cross Country"]

def fetch(url):
  req=urllib.request.Request(url,headers=UA)
  try:
    with urllib.request.urlopen(req,timeout=20,context=_CTX) as r:return r.read().decode("utf-8","replace")
  except urllib.error.URLError as e:
    if isinstance(getattr(e,"reason",None),ssl.SSLError):
      with urllib.request.urlopen(req,timeout=20,context=_CTX) as r:return r.read().decode("utf-8","replace")
    raise

def host(u):
  return re.sub(r"^https?://(www\.)?","",u.strip()).split("/")[0].lower()

_wiki_lock=threading.Semaphore(2)  # keep Wikipedia API access gentle to avoid 429s
def wiki_api(params):
  url="https://en.wikipedia.org/w/api.php?"+urllib.parse.urlencode({**params,"format":"json"})
  with _wiki_lock:
    for attempt in range(5):
      try:return json.loads(fetch(url))
      except urllib.error.HTTPError as e:
        if e.code==429:time.sleep(1.5*(attempt+1));continue
        raise
    return {}

def _domain_from_value(val):
  # infobox website value can be {{URL|goduke.com}}, [https://... text], or bare.
  dm=(re.search(r"\{\{\s*(?:URL|Official website|official website)\s*\|\s*(?:1\s*=\s*)?([^\s|}]+)",val,re.I) or
      re.search(r"https?://([^\s\]|<}>]+)",val) or
      re.search(r"\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b",val,re.I))
  if not dm:return None
  h=host(dm.group(1))
  return h if (h and "." in h and not any(s in h for s in SOCIAL) and "ncaa.org" not in h and not h.endswith(".edu")) else None

def resolve_domain(name):
  for q in (name+" athletics",name+" track and field"):
    try:
      hits=wiki_api({"action":"query","list":"search","srsearch":q,"srlimit":3}).get("query",{}).get("search",[])
    except Exception:hits=[]
    for hit in hits:
      try:
        wt=next(iter(wiki_api({"action":"query","prop":"revisions","rvprop":"content","rvslots":"main","titles":hit["title"]})
          .get("query",{}).get("pages",{}).values()))["revisions"][0]["slots"]["main"]["*"]
      except Exception:continue
      for m in re.finditer(r"\|\s*(?:website|url)\s*=\s*([^\n|]+)",wt,re.I):
        d=_domain_from_value(m.group(1))
        if d:return d
  return None

def role_for(text):
  found=[w for w in ROLE_WORDS if w.lower() in text.lower()]
  # keep it short: the lead title + any event specialty
  lead=next((w for w in ("Director of Track","Head Coach","Associate Head Coach","Assistant Coach","Volunteer Assistant") if w in found),"Coach")
  specialties=[w for w in found if w in ("Sprints","Hurdles","Jumps","Horizontal Jumps","Vertical Jumps","Pole Vault","Throws","Distance","Mid-Distance","Combined Events","Cross Country")]
  return (lead+(" · "+", ".join(dict.fromkeys(specialties)) if specialties else "")).strip()

def group_for(role):
  low=role.lower()
  for g,keys in GROUPS:
    if any(k in low for k in keys):return g
  return "general"

def scrape_school(school,domain):
  out=[]
  for gender,slug in SLUGS:
    listing=f"https://{domain}/sports/{slug}/coaches"
    try:page=fetch(listing)
    except Exception:continue
    links=sorted(set(re.findall(r"/sports/"+re.escape(slug)+r"/roster/coaches/[a-z0-9.-]+/\d+",page)))
    for bl in links[:12]:
      try:bio=fetch("https://"+domain+bl)
      except Exception:continue
      email=next((e for e in re.findall(r"mailto:([\w.+-]+@[\w.-]+\.[a-z]{2,})",bio,re.I)),None)
      if not email:continue
      name=" ".join(w.capitalize() for w in bl.split("/coaches/")[1].rsplit("/",1)[0].split("-"))
      role=role_for(bio[:8000])
      out.append({"schoolId":school["id"],"gender":gender,"name":name,"role":role,"eventGroup":group_for(role),
        "email":email,"sourceUrl":"https://"+domain+bl,"reviewedAt":"2026-07-22"})
  return out

def main():
  schools=[s for s in json.load(open(DIRECTORY,encoding="utf-8")) if s["pathway"]=="NCAA"]
  if LIMIT:schools=schools[:LIMIT]
  print(f"Resolving domains + scraping coaches for {len(schools)} schools...",flush=True)
  def work(s):
    dom=resolve_domain(s["name"])
    if not dom:return (s["name"],None,[])
    return (s["name"],dom,scrape_school(s,dom))
  all_rows=[]; resolved=0
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for i,(name,dom,rows) in enumerate(pool.map(work,schools),1):
      if dom:resolved+=1
      all_rows.extend(rows)
      if i%25==0:print(f"  {i}/{len(schools)} schools ({resolved} domains, {len(all_rows)} coaches)",flush=True)
  all_rows.sort(key=lambda x:(x["schoolId"],x["gender"],x["name"]))
  json.dump(all_rows,open(OUTPUT,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
  covered=len(set(x["schoolId"] for x in all_rows))
  print(f"Resolved {resolved}/{len(schools)} athletics domains. Wrote {len(all_rows)} coaches across {covered} schools.")

if __name__=="__main__":main()
