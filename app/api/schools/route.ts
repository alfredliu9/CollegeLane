import {schoolCatalog,verifiedMetrics} from "@/data/schoolCatalog";

const CATALOG_VERSION="2026-07-22-gender-explicit-v1";

export async function GET(request:Request){
  const url=new URL(request.url);
  const event=url.searchParams.get("event")||"Long jump";
  const gender=url.searchParams.get("gender")||"";
  const pathway=url.searchParams.get("pathway");
  const division=url.searchParams.get("division");
  const q=(url.searchParams.get("q")||"").trim().toLowerCase();
  const id=url.searchParams.get("id");
  const matches=schoolCatalog
    .filter(school=>!id||school.id===id)
    .filter(school=>!pathway||pathway==="All"||school.pathway===pathway)
    .filter(school=>!division||division==="All divisions"||school.division===division)
    .filter(school=>!q||`${school.name} ${school.city} ${school.region} ${school.conference}`.toLowerCase().includes(q));
  const schools=matches
    .map(school=>{
      const metric=verifiedMetrics.find(item=>item.schoolId===school.id&&item.event===event&&item.gender===gender);
      return {
        id:school.id,name:school.name,city:school.city,region:school.region,country:school.country,pathway:school.pathway,
        division:school.division,conference:school.conference,size:school.size,majors_json:JSON.stringify(school.majors),
        team_category:school.teamCategory,source_url:metric?.sourceUrl||school.sourceUrl,
        source_label:metric?.sourceLabel||school.sourceLabel,reviewed_at:metric?.reviewedAt||school.reviewedAt,
        event,gender,roster_average:metric?.rosterAverage??null,
      };
    })
    .sort((a,b)=>(a.roster_average===null?1:0)-(b.roster_average===null?1:0)||a.name.localeCompare(b.name))
    .slice(0,id?1:50);
  return Response.json({schools,total:matches.length,source:"bundled",catalogVersion:CATALOG_VERSION},{headers:{"Cache-Control":"public, max-age=300"}});
}
