import { env } from "cloudflare:workers";
import { schoolCatalog, verifiedMetrics } from "@/data/schoolCatalog";

const CATALOG_VERSION="2026-07-22-ncaa3139-usports84-v3";

async function ensureDatabase(db:D1Database){
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, region TEXT NOT NULL, country TEXT NOT NULL, pathway TEXT NOT NULL, division TEXT NOT NULL, conference TEXT NOT NULL, size TEXT NOT NULL, majors_json TEXT NOT NULL, team_category TEXT NOT NULL, source_url TEXT NOT NULL, source_label TEXT NOT NULL, reviewed_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS program_metrics (school_id TEXT NOT NULL, event TEXT NOT NULL, roster_average REAL NOT NULL, recruiting_benchmark REAL NOT NULL DEFAULT 0, sample_size INTEGER NOT NULL DEFAULT 0, season TEXT NOT NULL DEFAULT '', standard_type TEXT NOT NULL DEFAULT 'Verified roster average', PRIMARY KEY (school_id,event))"),
    db.prepare("CREATE TABLE IF NOT EXISTS catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS school_pathway_division_idx ON schools(pathway,division)"),
    db.prepare("CREATE INDEX IF NOT EXISTS school_name_idx ON schools(name)")
  ]);
  const version=await db.prepare("SELECT value FROM catalog_meta WHERE key='version'").first<{value:string}>();
  if(version?.value===CATALOG_VERSION)return;
  await db.batch([db.prepare("DELETE FROM program_metrics"),db.prepare("DELETE FROM schools")]);
  for(let i=0;i<schoolCatalog.length;i+=75){
    await db.batch(schoolCatalog.slice(i,i+75).map(s=>db.prepare("INSERT INTO schools VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(s.id,s.name,s.city,s.region,s.country,s.pathway,s.division,s.conference,s.size,JSON.stringify(s.majors),s.teamCategory,s.sourceUrl,s.sourceLabel,s.reviewedAt)));
  }
  for(let i=0;i<verifiedMetrics.length;i+=75)await db.batch(verifiedMetrics.slice(i,i+75).map(m=>db.prepare("INSERT INTO program_metrics (school_id,event,roster_average,recruiting_benchmark,sample_size,season,standard_type) VALUES (?,?,?,0,?,'2026 outdoor','Verified roster average')").bind(m.schoolId,m.event,m.rosterAverage,m.sampleSize)));
  await db.prepare("INSERT OR REPLACE INTO catalog_meta VALUES ('version',?)").bind(CATALOG_VERSION).run();
}

const fallback=(event:string,pathway:string|null,division:string|null,q:string,id:string|null)=>schoolCatalog
  .filter(s=>!id||s.id===id)
  .filter(s=>!pathway||pathway==="All"||s.pathway===pathway)
  .filter(s=>!division||division==="All divisions"||s.division===division)
  .filter(s=>!q||(s.name+" "+s.city+" "+s.region+" "+s.conference).toLowerCase().includes(q))
  .slice(0,id?1:50).map(s=>{const m=verifiedMetrics.find(x=>x.schoolId===s.id&&x.event===event);return {id:s.id,name:s.name,city:s.city,region:s.region,country:s.country,pathway:s.pathway,division:s.division,conference:s.conference,size:s.size,majors_json:JSON.stringify(s.majors),team_category:s.teamCategory,source_url:m?.sourceUrl||s.sourceUrl,source_label:m?.sourceLabel||s.sourceLabel,reviewed_at:m?.reviewedAt||s.reviewedAt,event,roster_average:m?.rosterAverage??null}});

export async function GET(request:Request){
  const url=new URL(request.url); const event=url.searchParams.get("event")||"Long jump"; const pathway=url.searchParams.get("pathway"); const division=url.searchParams.get("division"); const q=(url.searchParams.get("q")||"").trim().toLowerCase(); const id=url.searchParams.get("id");
  try{
    if(!env.DB)throw new Error("No database binding"); await ensureDatabase(env.DB);
    let where=" WHERE 1=1"; const args:unknown[]=[];
    if(id){where+=" AND s.id=?";args.push(id)}
    if(pathway&&pathway!=="All"){where+=" AND s.pathway=?";args.push(pathway)}
    if(division&&division!=="All divisions"){where+=" AND s.division=?";args.push(division)}
    if(q){where+=" AND (LOWER(s.name) LIKE ? OR LOWER(s.city) LIKE ? OR LOWER(s.region) LIKE ? OR LOWER(s.conference) LIKE ?)";const like=`%${q}%`;args.push(like,like,like,like)}
    const total=await env.DB.prepare(`SELECT COUNT(*) AS count FROM schools s${where}`).bind(...args).first<{count:number}>();
    const sql=`SELECT s.*,? AS event,m.roster_average FROM schools s LEFT JOIN program_metrics m ON m.school_id=s.id AND m.event=?${where} ORDER BY CASE WHEN m.roster_average IS NULL THEN 1 ELSE 0 END,s.name LIMIT ?`;
    const result=await env.DB.prepare(sql).bind(event,event,...args,id?1:50).all();
    const schools=result.results.map(row=>{const metric=verifiedMetrics.find(m=>m.schoolId===row.id&&m.event===event);return metric?{...row,source_url:metric.sourceUrl,source_label:metric.sourceLabel,reviewed_at:metric.reviewedAt}:row});
    return Response.json({schools,total:total?.count||0,source:"database"});
  }catch{
    const schools=fallback(event,pathway,division,q,id); const total=schoolCatalog.filter(s=>(!pathway||pathway==="All"||s.pathway===pathway)&&(!division||division==="All divisions"||s.division===division)&&(!q||(s.name+" "+s.city+" "+s.region+" "+s.conference).toLowerCase().includes(q))).length;
    return Response.json({schools,total,source:"bundled"});
  }
}
