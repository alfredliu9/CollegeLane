import concurrent.futures, json, os, re, sys, unicodedata, urllib.request
from difflib import SequenceMatcher
from lxml import html

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRECTORY=os.path.join(ROOT,"data","schoolDirectory.json")
OUTPUT=os.path.join(ROOT,"data","verifiedMetrics.json")
TEAM_JS="https://www.tfrrs.org/js/navbar_autocomplete.js"
LIST_IDS={"Division I":"5602","Division II":"5603","Division III":"5604"}
EVENTS={"100 Meters":"100 metres","200 Meters":"200 metres","400 Meters":"400 metres","Long Jump":"Long jump","Triple Jump":"Triple jump"}
RANGES={"100 metres":(9,20),"200 metres":(19,40),"400 metres":(38,90),"Long jump":(3,9),"Triple jump":(7,20)}
ALIASES={
  "california":"university of california berkeley","ucla":"university of california los angeles","usc":"university of southern california",
  "uc davis":"university of california davis","uc irvine":"university of california irvine","uc riverside":"university of california riverside",
  "uc san diego":"university of california san diego","uc santa barbara":"university of california santa barbara",
  "byu":"brigham young university","lsu":"louisiana state university","ole miss":"university of mississippi","penn":"university of pennsylvania",
  "pittsburg st":"pittsburg state university","penn state":"pennsylvania state university","uconn":"university of connecticut",
  "umass amherst":"university of massachusetts amherst","miami fla":"university of miami","miami ohio":"miami university oxford",
  "unc charlotte":"university of north carolina at charlotte","north carolina":"university of north carolina at chapel hill",
  "ut arlington":"university of texas at arlington","utep":"university of texas at el paso","utsa":"university of texas at san antonio",
  "ucf":"university of central florida","usf":"university of south florida","vcu":"virginia commonwealth university",
  "smu":"southern methodist university","tcu":"texas christian university","liu":"long island university"
}

def norm(value):
  value=unicodedata.normalize("NFKD",value).encode("ascii","ignore").decode().lower().replace("&"," and ")
  value=re.sub(r"\([^)]*\)"," ",value); value=re.sub(r"\b(the|campus|main campus)\b"," ",value)
  value=re.sub(r"[^a-z0-9]+"," ",value); return " ".join(value.split())

def compact(value):
  return " ".join(x for x in norm(value).split() if x not in {"university","college","of","at","the"})

def score(team,official):
  a=ALIASES.get(norm(team),norm(team)); b=norm(official)
  ac,bc=compact(a),compact(b)
  if ac==bc:return 1.0
  if ac in bc or bc in ac:return min(len(ac),len(bc))/max(len(ac),len(bc))+.18
  return max(SequenceMatcher(None,a,b).ratio(),SequenceMatcher(None,ac,bc).ratio())

def fetch(url):
  req=urllib.request.Request(url,headers={"User-Agent":"CollegeLane research importer/1.0"})
  with urllib.request.urlopen(req,timeout=25) as r:return r.read().decode("utf-8","replace")

def parse_metric_rows(page,school,url):
  root=html.fromstring(page); metrics=[]
  for block in root.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," gender_m ")]'):
    title=" ".join(block.xpath('.//h3[1]//text()')).strip()
    if title not in EVENTS:continue
    values=[]
    for row in block.xpath('.//div[contains(concat(" ",normalize-space(@class)," ")," performance-list-row ")]'):
      raw=" ".join(row.xpath('.//div[@data-label="Time" or @data-label="Mark"]//text()')).strip()
      cleaned=raw.replace(",","")
      clock=re.search(r"(\d+):(\d+(?:\.\d+)?)",cleaned)
      match=re.search(r"\d+(?:\.\d+)?",cleaned)
      value=float(clock.group(1))*60+float(clock.group(2)) if clock else (float(match.group()) if match else None)
      event=EVENTS[title]
      if value is not None and RANGES[event][0]<=value<=RANGES[event][1]:values.append(value)
    if values:
      metrics.append({"schoolId":school["id"],"event":EVENTS[title],"rosterAverage":round(sum(values)/len(values),3),"sampleSize":len(values),"sourceUrl":url,"sourceLabel":"TFRRS 2026 men's outdoor team performance list","reviewedAt":"2026-07-22"})
  return metrics

def main():
  schools=json.load(open(DIRECTORY,encoding="utf-8")); ncaa=[s for s in schools if s["pathway"]=="NCAA" and s["division"] in LIST_IDS]
  by_state={}
  for s in ncaa:by_state.setdefault(s["region"],[]).append(s)
  js=fetch(TEAM_JS)
  entry_map={}
  for name,url in re.findall(r'\{text:"([^"]+) \(M\)",\s*url:\s*"(/teams/(?:xc|tf)/[^"]+)"\}',js):
    url=url.replace("/teams/xc/","/teams/tf/")
    m=re.search(r'/([A-Z]{2})_college_m_',url)
    if m:entry_map[(name,m.group(1))]=(name,url,m.group(1))
  entries=list(entry_map.values())
  print(f"Found {len(entries)} men's college track teams in TFRRS.",flush=True)
  matched=[]; used=set()
  for name,path,state in entries:
    candidates=by_state.get(state,[])
    ranked=sorted(((score(name,s["name"]),s) for s in candidates),key=lambda x:x[0],reverse=True)
    if ranked and ranked[0][0]>=.78 and (len(ranked)==1 or ranked[0][0]-ranked[1][0]>=.06) and ranked[0][1]["id"] not in used:
      s=ranked[0][1]; used.add(s["id"]); matched.append((s,name,path))
  print(f"Matched {len(matched)} NCAA schools to TFRRS teams.",flush=True)
  def work(item):
    school,name,path=item; list_id=LIST_IDS[school["division"]]
    pop=path.replace("/teams/tf/","/top_qualifiers/")
    url=f"https://www.tfrrs.org{pop}?list_hnd={list_id}&season_hnd=717"
    try:return parse_metric_rows(fetch(url),school,url)
    except Exception as e:return []
  all_metrics=[]
  with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    for i,result in enumerate(pool.map(work,matched),1):
      all_metrics.extend(result)
      if i%100==0:print(f"Processed {i}/{len(matched)} teams",flush=True)
  all_metrics.sort(key=lambda x:(x["schoolId"],x["event"]))
  json.dump(all_metrics,open(OUTPUT,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
  covered=len(set(x["schoolId"] for x in all_metrics))
  print(f"Wrote {len(all_metrics)} verified event averages across {covered} schools.")

if __name__=="__main__":main()
