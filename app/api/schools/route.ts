import { env } from "cloudflare:workers";
import { schoolCatalog } from "@/data/schoolCatalog";

async function ensureDatabase(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, region TEXT NOT NULL, country TEXT NOT NULL, pathway TEXT NOT NULL, division TEXT NOT NULL, conference TEXT NOT NULL, size TEXT NOT NULL, majors_json TEXT NOT NULL, team_category TEXT NOT NULL, source_url TEXT NOT NULL, source_label TEXT NOT NULL, reviewed_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS program_metrics (school_id TEXT NOT NULL, event TEXT NOT NULL, roster_average REAL NOT NULL, recruiting_benchmark REAL NOT NULL, sample_size INTEGER NOT NULL, season TEXT NOT NULL, standard_type TEXT NOT NULL, PRIMARY KEY (school_id,event))"),
    db.prepare("CREATE INDEX IF NOT EXISTS school_pathway_division_idx ON schools(pathway,division)")
  ]);
  const count=await db.prepare("SELECT COUNT(*) AS count FROM schools").first<{count:number}>();
  if((count?.count||0)>0)return;
  for(const school of schoolCatalog){
    await db.prepare("INSERT INTO schools VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(school.id,school.name,school.city,school.region,school.country,school.pathway,school.division,school.conference,school.size,JSON.stringify(school.majors),school.teamCategory,school.sourceUrl,school.sourceLabel,school.reviewedAt).run();
    for(const m of school.metrics)await db.prepare("INSERT INTO program_metrics VALUES (?,?,?,?,?,?,?)").bind(school.id,m.event,m.rosterAverage,m.recruitingBenchmark,m.sampleSize,m.season,m.standardType).run();
  }
}

export async function GET(request:Request){
  const url=new URL(request.url); const event=url.searchParams.get("event")||"Long jump"; const pathway=url.searchParams.get("pathway"); const division=url.searchParams.get("division");
  try{
    if(!env.DB)throw new Error("No database binding"); await ensureDatabase(env.DB);
    let sql="SELECT s.*,m.event,m.roster_average,m.recruiting_benchmark,m.sample_size,m.season,m.standard_type FROM schools s JOIN program_metrics m ON m.school_id=s.id WHERE m.event=?"; const args:unknown[]=[event];
    if(pathway&&pathway!=="All"){sql+=" AND s.pathway=?";args.push(pathway)} if(division&&division!=="All divisions"){sql+=" AND s.division=?";args.push(division)} sql+=" ORDER BY s.pathway,s.division,s.name";
    const result=await env.DB.prepare(sql).bind(...args).all(); return Response.json({schools:result.results,source:"database"});
  }catch{
    const schools=schoolCatalog.filter(s=>s.metrics.some(m=>m.event===event)).filter(s=>!pathway||pathway==="All"||s.pathway===pathway).filter(s=>!division||division==="All divisions"||s.division===division).map(s=>{const m=s.metrics.find(x=>x.event===event)!;return {id:s.id,name:s.name,city:s.city,region:s.region,country:s.country,pathway:s.pathway,division:s.division,conference:s.conference,size:s.size,majors_json:JSON.stringify(s.majors),team_category:s.teamCategory,source_url:s.sourceUrl,source_label:s.sourceLabel,reviewed_at:s.reviewedAt,event:m.event,roster_average:m.rosterAverage,recruiting_benchmark:m.recruitingBenchmark,sample_size:m.sampleSize,season:m.season,standard_type:m.standardType}});
    return Response.json({schools,source:"bundled"});
  }
}
