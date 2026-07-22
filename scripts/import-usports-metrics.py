import json, os, re, unicodedata, urllib.request
from collections import defaultdict
from difflib import SequenceMatcher
from lxml import html

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRECTORY=os.path.join(ROOT,"data","schoolDirectory.json")
METRICS=os.path.join(ROOT,"data","verifiedMetrics.json")
EVENTS={
  "200 metres":"https://www.trackie.com/usports/tnf/rankings/event/men-s-200-meter-non-ranking/41/",
  "400 metres":"https://www.trackie.com/usports/tnf/rankings/event/men-s-400-meter-non-ranking/43/",
  "Long jump":"https://www.trackie.com/usports/tnf/rankings/event/men-s-long-jump/24/",
  "Triple jump":"https://www.trackie.com/usports/tnf/rankings/event/men-s-triple-jump/26/"
}
RANGES={"200 metres":(19,40),"400 metres":(38,90),"Long jump":(3,9),"Triple jump":(7,20)}

def norm(value):
  value=unicodedata.normalize("NFKD",value).encode("ascii","ignore").decode().lower().replace("&"," and ")
  return " ".join(re.sub(r"[^a-z0-9]+"," ",value).split())

def fetch(url):
  req=urllib.request.Request(url,headers={"User-Agent":"CollegeLane research importer/1.0"})
  with urllib.request.urlopen(req,timeout=30) as response:return response.read()

def parse_value(raw):
  raw=" ".join(raw.split()); clock=re.search(r"(\d+):(\d+(?:\.\d+)?)",raw)
  if clock:return float(clock.group(1))*60+float(clock.group(2))
  match=re.search(r"\d+(?:\.\d+)?",raw); return float(match.group()) if match else None

def main():
  schools=[s for s in json.load(open(DIRECTORY,encoding="utf-8")) if s["pathway"]=="U Sports"]
  by_name={norm(s["name"]):s for s in schools}
  existing=[m for m in json.load(open(METRICS,encoding="utf-8")) if not m["schoolId"].startswith("usports-")]
  imported=[]
  for event,url in EVENTS.items():
    root=html.fromstring(fetch(url)); grouped=defaultdict(list)
    for row in root.xpath('//table//tr[td]'):
      cells=row.xpath('./td');
      if len(cells)<4:continue
      school_name=" ".join(cells[2].xpath('.//*[@title][1]/@title')).strip()
      value=parse_value(" ".join(cells[3].xpath('.//text()')))
      if not school_name or value is None or not RANGES[event][0]<=value<=RANGES[event][1]:continue
      grouped[school_name].append(value)
    for school_name,values in grouped.items():
      key=norm(school_name); school=by_name.get(key)
      if not school:
        ranked=sorted(((SequenceMatcher(None,key,k).ratio(),s) for k,s in by_name.items()),key=lambda x:x[0],reverse=True)
        school=ranked[0][1] if ranked and ranked[0][0]>=.9 else None
      if school:imported.append({"schoolId":school["id"],"event":event,"rosterAverage":round(sum(values)/len(values),3),"sampleSize":len(values),"sourceUrl":url,"sourceLabel":"Trackie 2026 U SPORTS men's performance rankings","reviewedAt":"2026-07-22"})
  output=sorted(existing+imported,key=lambda x:(x["schoolId"],x["event"]))
  json.dump(output,open(METRICS,"w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
  print(f"Added {len(imported)} verified U SPORTS event averages across {len(set(m['schoolId'] for m in imported))} schools.")
  for event in EVENTS:print(event,sum(1 for m in imported if m["event"]==event))

if __name__=="__main__":main()
