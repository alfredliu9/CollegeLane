import directory from "./schoolDirectory.json";

export interface SchoolProgram {
  id:string; name:string; city:string; region:string; country:string; pathway:"NCAA"|"U Sports";
  division:string; conference:string; size:string; majors:string[]; teamCategory:string;
  sourceUrl:string; sourceLabel:string; reviewedAt:string;
}

export interface VerifiedMetric {
  schoolId:string; event:string; rosterAverage:number; sourceUrl:string; sourceLabel:string; reviewedAt:string;
}

export const schoolCatalog = directory as SchoolProgram[];

// A metric is published only after its underlying marks have been individually checked.
// Missing metrics intentionally remain null in the UI instead of being estimated.
export const verifiedMetrics:VerifiedMetric[] = [
  {
    schoolId:"ncaa-86",
    event:"Long jump",
    rosterAverage:6.56,
    sourceUrl:"https://www.tfrrs.org/teams/1334",
    sourceLabel:"TFRRS University at Buffalo performance list",
    reviewedAt:"2026-07-22"
  }
];
