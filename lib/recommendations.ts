import {isRunningEvent,rateMark,type AthleteProfile,type AthleteResult,type EventName} from "@/lib/recruiting";
import {schoolCatalog,verifiedMetrics,type SchoolProgram,type VerifiedMetric} from "@/data/schoolCatalog";

export const RECOMMENDATION_VERSION="1.0.0";
export const SCHOOL_CATALOG_VERSION="2026-07-22-gender-explicit-v1";

type Category="Reach"|"Strong Fit";
type Confidence="High"|"Standard"|"Low";

export interface EventComparison {
  event:EventName;
  athleteMark:number;
  rosterAverage:number;
  gapPercent:number;
  sampleSize:number;
  season:string;
  reviewedAt:string;
  sourceUrl:string;
}

export interface Recommendation {
  schoolId:string;
  name:string;
  city:string;
  region:string;
  pathway:string;
  division:string;
  conference:string;
  category:Category;
  overallScore:number;
  dataConfidence:Confidence;
  eventComparisons:EventComparison[];
  reasons:string[];
  limitations:string[];
  sourceUrl:string;
}

export interface RecommendationResponse {
  generatedAt:string;
  methodologyVersion:string;
  catalogVersion:string;
  profileVersion:string;
  coverage:{schoolsEvaluated:number;schoolsWithVerifiedComparison:number};
  recommendations:Recommendation[];
  researchOnly:Array<Pick<SchoolProgram,"id"|"name"|"city"|"region"|"pathway"|"division"|"conference">>;
  warnings:string[];
}

const eventWeights=[.6,.2,.2];
const supportedEvents:EventName[]=[
  "100 metres","200 metres","400 metres","800 metres","1500 metres","5000 metres","10,000 metres",
  "100 metres hurdles","110 metres hurdles","400 metres hurdles","3000 metres steeplechase",
  "High jump","Pole vault","Long jump","Triple jump",
  "Shot put","Discus","Hammer throw","Javelin","Decathlon","Heptathlon",
];

function validResult(result:AthleteResult){
  if(!supportedEvents.includes(result.event)||!Number.isFinite(result.performance)||result.performance<=0)return false;
  if(result.season!=="Outdoor")return false;
  if(isRunningEvent(result.event)&&result.timing!=="Fully automatic")return false;
  if(["100 metres","200 metres","100 metres hurdles","110 metres hurdles","Long jump","Triple jump"].includes(result.event)&&result.wind!==null&&Math.abs(result.wind)>2)return false;
  return true;
}

function athleteResults(profile:AthleteProfile){
  const primary:AthleteResult={event:profile.event,performance:profile.performance,season:profile.season,timing:profile.timing,wind:profile.wind,meet:profile.meet,resultDate:profile.resultDate};
  return [primary,...(profile.secondaryResults||[]).slice(0,2)].map((result,index)=>({result,weight:eventWeights[index]})).filter(x=>validResult(x.result));
}

function selectedProgram(profile:AthleteProfile,school:SchoolProgram){
  const choices=profile.pathways.filter(x=>x!=="Still exploring");
  if(!choices.length)return true;
  return choices.some(choice=>{
    if(choice==="U Sports")return school.pathway==="U Sports";
    if(choice==="NCAA")return school.pathway==="NCAA";
    const division=choice.replace("NCAA ","");
    return school.pathway==="NCAA"&&school.division===division;
  });
}

const regions:Record<string,string[]>={
  "ontario":["ontario","on","new york","ny","michigan","mi","ohio","oh","pennsylvania","pa"],
  "quebec":["quebec","qc","new york","ny","vermont","vt","maine","me"],
  "british columbia":["british columbia","bc","washington","wa","oregon","or"],
  "alberta":["alberta","ab","montana","mt"],
  "atlantic canada":["new brunswick","nova scotia","prince edward island","newfoundland and labrador","nb","ns","pe","nl"],
  "western canada":["british columbia","alberta","saskatchewan","manitoba","bc","ab","sk","mb"],
  "u.s. northeast":["new york","pennsylvania","massachusetts","connecticut","new jersey","maryland","maine","vermont","new hampshire","rhode island"],
  "u.s. midwest":["ohio","michigan","illinois","indiana","wisconsin","minnesota","iowa","missouri"],
  "u.s. south":["florida","texas","virginia","north carolina","south carolina","georgia","tennessee","kentucky"],
  "u.s. west":["california","oregon","washington","colorado","arizona","utah","nevada"],
};

function regionMatch(preference:string,school:SchoolProgram){
  const pref=preference.trim().toLowerCase();
  if(!pref||pref.includes("anywhere")||pref.includes("canada and the united states"))return true;
  const location=`${school.region} ${school.city} ${school.country}`.toLowerCase();
  const terms=Object.entries(regions).find(([key])=>pref.includes(key))?.[1]||[pref];
  return terms.some(term=>location===term||location.includes(term));
}

function gap(result:AthleteResult,average:number){
  return isRunningEvent(result.event)?(average-result.performance)/average:(result.performance-average)/average;
}

// How realistically the athlete fits a program, from its verified roster
// average. gap > 0 means the athlete is stronger than the roster (a safer,
// possibly over-qualified pick); gap < 0 means the program is stronger (a
// reach). Fit stays near 1 while the athlete is competitive and tapers as they
// get far above (program too weak for them) or far below (unrealistic reach).
// It gates program quality so we surface the strongest programs the athlete can
// still compete at, and sink weak programs where they'd be over-qualified.
function fit(gap:number){
  const f=gap>=0?1-Math.max(0,gap-0.03)*4:1+gap*3.5;
  return Math.max(0,Math.min(1,f));
}

// value = the athlete's advantage over the roster average (positive = the
// athlete is faster/better than the roster). Strong Fit = the roster is the
// same as or a bit worse than the athlete, so they meet or slightly exceed the
// level. Reach = the roster is faster/better than the athlete. Programs the
// athlete is far above are dropped in scoreSchool.
function category(value:number):Category{
  return value<0?"Reach":"Strong Fit";
}

function confidence(metrics:VerifiedMetric[]):Confidence{
  const minimum=Math.min(...metrics.map(metric=>metric.sampleSize));
  return minimum>=8?"High":minimum>=5?"Standard":"Low";
}

function rounded(value:number){return Math.round(value*10)/10;}

function scoreSchool(profile:AthleteProfile,school:SchoolProgram,results:ReturnType<typeof athleteResults>){
  const matches=results.flatMap(({result,weight})=>{
    const metric=verifiedMetrics.find(item=>item.schoolId===school.id&&item.gender===profile.gender&&item.event===result.event);
    return metric?[{result,weight,metric,gap:gap(result,metric.rosterAverage)}]:[];
  });
  if(!matches.length)return null;
  const weightTotal=matches.reduce((sum,item)=>sum+item.weight,0);
  const weightedGap=matches.reduce((sum,item)=>sum+item.gap*item.weight,0)/weightTotal;
  // Drop programs the athlete is far above (roster more than ~10% weaker than
  // their mark). Those are not useful targets and shouldn't clutter Strong Fit.
  if(weightedGap>0.1)return null;
  const gender=profile.gender==="Women"?"Women":"Men";
  // Rank by program quality (how strong its roster is) gated by fit, so the
  // strongest programs the athlete can realistically compete at rank highest
  // and weak programs where they'd be over-qualified sink to the bottom.
  const weightedOverall=matches.reduce((sum,item)=>sum+rateMark(item.result.event,gender,item.metric.rosterAverage).rating*fit(item.gap)*item.weight,0)/weightTotal;
  const pathway=selectedProgram(profile,school);
  const region=regionMatch(profile.region,school);
  const overall=Math.min(100,Math.round(Math.max(0,Math.min(100,weightedOverall)))+(region?3:0));
  const comparisons:EventComparison[]=matches.map(({result,metric,gap:value})=>({
    event:result.event,athleteMark:result.performance,rosterAverage:metric.rosterAverage,gapPercent:rounded(value*100),
    sampleSize:metric.sampleSize,season:metric.season,reviewedAt:metric.reviewedAt,sourceUrl:metric.sourceUrl,
  }));
  const primary=comparisons[0];
  const difference=Math.abs(primary.gapPercent).toFixed(1);
  const reasons=[
    `${primary.event}: your mark is ${difference}% ${primary.gapPercent>=0?"above":"below"} this verified roster average.`,
    pathway?`Matches your selected ${school.pathway==="NCAA"?school.division:"U Sports"} pathway.`:"Outside your selected pathway.",
    region?"Located in or near your preferred region.":"Outside your preferred region.",
  ];
  const metrics=matches.map(item=>item.metric);
  const dataConfidence=confidence(metrics);
  const limitations=["Roster averages describe current team performance, not recruiting standards or offer probability.","Major, school-size and admissions alignment are not yet scored."];
  if(dataConfidence==="Low")limitations.unshift("At least one comparison has fewer than five verified athlete marks.");
  return {
    schoolId:school.id,name:school.name,city:school.city,region:school.region,pathway:school.pathway,division:school.division,
    conference:school.conference,category:category(weightedGap),overallScore:Math.max(0,Math.min(100,overall)),
    dataConfidence,eventComparisons:comparisons,reasons,limitations,sourceUrl:primary.sourceUrl,
  } satisfies Recommendation;
}

function stableSort(items:Recommendation[]){
  return items.sort((a,b)=>b.overallScore-a.overallScore||a.name.localeCompare(b.name));
}

function compose(items:Recommendation[],limit:number){
  const quotas:Record<Category,number>={"Strong Fit":8,"Reach":6};
  const selected:Recommendation[]=[];
  for(const group of ["Strong Fit","Reach"] as Category[])selected.push(...stableSort(items.filter(x=>x.category===group&&x.dataConfidence!=="Low")).slice(0,quotas[group]));
  const remaining=stableSort(items.filter(item=>item.dataConfidence!=="Low"&&!selected.some(x=>x.schoolId===item.schoolId)));
  selected.push(...remaining.slice(0,Math.max(0,limit-selected.length)));
  return stableSort(selected).slice(0,limit);
}

export async function profileHash(profile:AthleteProfile){
  const input=JSON.stringify({gender:profile.gender,event:profile.event,performance:profile.performance,season:profile.season,timing:profile.timing,wind:profile.wind,secondaryResults:profile.secondaryResults,pathways:profile.pathways,region:profile.region});
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input)));
  return [...bytes].map(value=>value.toString(16).padStart(2,"0")).join("").slice(0,16);
}

export async function recommendSchools(profile:AthleteProfile,limit=12):Promise<RecommendationResponse>{
  const warnings:string[]=[];
  const eligible=schoolCatalog.filter(school=>selectedProgram(profile,school));
  const results=athleteResults(profile);
  const hasGender=profile.gender==="Men"||profile.gender==="Women";
  if(!hasGender)warnings.push("Select your competition gender before requesting recommendations.");
  if(!results.length)warnings.push("Add at least one legal-wind, fully automatic outdoor result to receive recommendations.");
  const scored:Recommendation[]=hasGender&&results.length?(eligible.map(school=>scoreSchool(profile,school,results)).filter(item=>item!==null) as Recommendation[]):[];
  const ranked=compose(scored,Math.max(1,Math.min(24,limit)));
  if(scored.length&&scored.filter(item=>item.dataConfidence!=="Low").length<limit)warnings.push("Verified sample coverage is limited for this profile; some categories may contain fewer recommendations.");
  if(!scored.length&&!warnings.length)warnings.push("We do not yet have enough verified data to recommend schools for this profile. You can still search the complete directory.");
  const scoredIds=new Set(scored.map(item=>item.schoolId));
  const researchOnly=eligible.filter(school=>!scoredIds.has(school.id)).slice(0,8).map(({id,name,city,region,pathway,division,conference})=>({id,name,city,region,pathway,division,conference}));
  return {
    generatedAt:new Date().toISOString(),methodologyVersion:RECOMMENDATION_VERSION,catalogVersion:SCHOOL_CATALOG_VERSION,
    profileVersion:await profileHash(profile),coverage:{schoolsEvaluated:eligible.length,schoolsWithVerifiedComparison:scored.length},
    recommendations:ranked,researchOnly,warnings,
  };
}
