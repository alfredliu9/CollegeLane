import directory from "./schoolDirectory.json";
import metrics from "./verifiedMetrics.json";

export interface SchoolProgram {
  id:string; name:string; city:string; region:string; country:string; pathway:"NCAA"|"U Sports";
  division:string; conference:string; size:string; majors:string[]; teamCategory:string;
  sourceUrl:string; sourceLabel:string; reviewedAt:string;
}

export interface VerifiedMetric {
  schoolId:string; event:string; rosterAverage:number; sampleSize:number; sourceUrl:string; sourceLabel:string; reviewedAt:string;
}

export const schoolCatalog = directory as SchoolProgram[];

// Generated from athlete-level season bests; missing metrics remain null instead of being estimated.
export const verifiedMetrics = metrics as VerifiedMetric[];
