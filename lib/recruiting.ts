export type EventName =
  | "100 metres" | "200 metres" | "400 metres" | "800 metres" | "1500 metres" | "5000 metres" | "10,000 metres"
  | "100 metres hurdles" | "110 metres hurdles" | "400 metres hurdles" | "3000 metres steeplechase"
  | "High jump" | "Pole vault" | "Long jump" | "Triple jump"
  | "Shot put" | "Discus" | "Hammer throw" | "Javelin"
  | "Decathlon" | "Heptathlon";
export type AssessmentLabel = "Exploring" | "Developing" | "Potential fit" | "Competitive" | "Highly competitive";

export interface AthleteResult {
  event: EventName;
  performance: number;
  season: "Indoor" | "Outdoor";
  timing: "Fully automatic" | "Hand timed";
  wind: number | null;
  meet: string;
  resultDate: string;
}

export interface AthleteProfile {
  name: string;
  lastName: string;
  gender: "" | "Men" | "Women";
  gradYear: number;
  province: string;
  school: string;
  category: string;
  event: EventName;
  performance: number;
  season: "Indoor" | "Outdoor";
  timing: "Fully automatic" | "Hand timed";
  wind: number | null;
  meet: string;
  resultDate: string;
  secondaryResults: AthleteResult[];
  verificationUrl: string;
  average: number;
  major: string;
  schoolSize: string;
  region: string;
  pathways: string[];
  goals: string[];
  goalNotes: string;
  upcomingMeet: string;
}

export const defaultAthlete: AthleteProfile = {
  name: "Jordan", lastName: "", gender: "", gradYear: 2027, province: "Ontario", school: "Lakeshore Collegiate", category: "Senior",
  event: "Long jump", performance: 6.62, season: "Outdoor", timing: "Fully automatic", wind: 1.1,
  meet: "Ontario Summer Classic", resultDate: "2026-06-14", verificationUrl: "", average: 89,
  secondaryResults: [
    { event: "100 metres", performance: 0, season: "Outdoor", timing: "Fully automatic", wind: null, meet: "", resultDate: "" },
    { event: "200 metres", performance: 0, season: "Outdoor", timing: "Fully automatic", wind: null, meet: "", resultDate: "" },
  ],
  major: "Economics", schoolSize: "No preference", region: "Ontario and nearby U.S.",
  pathways: ["U Sports", "NCAA Division II", "NCAA Division III"],
  goals: ["Compete at the strongest possible level", "Balance strong academics and athletics"], goalNotes: "", upcomingMeet: ""
};

// Blank starting profile for a brand-new account. Use this (NOT defaultAthlete)
// as the fallback for `cl-athlete` so a new athlete never sees demo data. The
// event is a valid placeholder so assess()/collegeRating() never crash; the
// empty gender + zero performance make the dashboard prompt onboarding.
export const emptyAthlete: AthleteProfile = {
  name: "", lastName: "", gender: "", gradYear: 2027, province: "", school: "", category: "",
  event: "100 metres", performance: 0, season: "Outdoor", timing: "Fully automatic", wind: null,
  meet: "", resultDate: "", verificationUrl: "", average: 0,
  secondaryResults: [],
  major: "", schoolSize: "No preference", region: "",
  pathways: [], goals: [], goalNotes: "", upcomingMeet: ""
};

export function isRunningEvent(event: EventName) { return event.includes("metres"); }
export function isCombinedEvent(event: EventName) { return event === "Decathlon" || event === "Heptathlon"; }

// the coaching specialty an event falls under, matching how the coach database
// (scripts/coach_probe.py) tags each coach's eventGroup. used to suggest the
// right coach for an athlete's event in the email builder.
export type CoachGroup = "sprints" | "hurdles" | "jumps" | "vault" | "throws" | "distance" | "combined" | "general";
const EVENT_GROUP: Record<EventName, CoachGroup> = {
  "100 metres": "sprints", "200 metres": "sprints", "400 metres": "sprints",
  "800 metres": "distance", "1500 metres": "distance", "5000 metres": "distance", "10,000 metres": "distance",
  "100 metres hurdles": "hurdles", "110 metres hurdles": "hurdles", "400 metres hurdles": "hurdles",
  "3000 metres steeplechase": "distance",
  "High jump": "jumps", "Long jump": "jumps", "Triple jump": "jumps", "Pole vault": "vault",
  "Shot put": "throws", "Discus": "throws", "Hammer throw": "throws", "Javelin": "throws",
  "Decathlon": "combined", "Heptathlon": "combined",
};
export function eventGroup(event: EventName): CoachGroup { return EVENT_GROUP[event] ?? "general"; }
// Running = seconds (lower is better), combined events = points, everything else
// (jumps, vaults, throws) = metres. isRunningEvent already reads any "... metres"
// name (sprints, distance, hurdles, steeplechase) as a timed event.
export function unitFor(event: EventName) { return isCombinedEvent(event) ? "pts" : isRunningEvent(event) ? "s" : "m"; }
export function formatPerformance(profile: AthleteProfile) {
  const unit = unitFor(profile.event);
  const value = unit === "pts" ? Math.round(profile.performance).toString() : profile.performance.toFixed(2);
  return `${value} ${unit}`;
}

export function assess(profile: AthleteProfile) {
  // Derived from the same gender- and event-specific model as collegeRating so
  // the label is calibrated by gender (no unisex benchmarks).
  const index = collegeRating(profile).stars - 1;
  const labels: AssessmentLabel[] = ["Exploring", "Developing", "Potential fit", "Competitive", "Highly competitive"];
  const label = labels[index];
  const pathways = index >= 4 ? "highly competitive programs across several pathways" : index === 3 ? "select U Sports and NCAA programs" : index === 2 ? "developing U Sports, NCAA Division II, and Division III opportunities" : "development-focused programs and continued performance growth";
  return {
    label,
    headline: label === "Potential fit" ? "Potential fit at select programs" : `${label} collegiate profile`,
    explanation: `${profile.name}'s ${formatPerformance(profile)} ${profile.season.toLowerCase()} ${profile.event.toLowerCase()} result suggests it is worth researching ${pathways}. This estimate uses gender and event specific collegiate reference marks. Roster needs, academics, verified results, and recruiting year still matter.`,
    index,
    pathways,
    nextSteps: ["Keep your performance details current", "Build a balanced list of 8 to 12 programs", `Prepare outreach using your ${formatPerformance(profile)} result`],
  };
}

export function profileCompletion(p: AthleteProfile) {
  const values = [p.name,p.lastName,p.gender,p.gradYear,p.province,p.school,p.event,p.performance,p.meet,p.resultDate,p.average,p.major,p.region];
  return Math.round(values.filter(Boolean).length / values.length * 100);
}

// Gender- and event-specific reference marks (outdoor, FAT) for the six rating
// tiers Emerging -> Elite, mapping to the scores [40,55,70,82,92,100] below.
// Tiers 5-6 are pinned to NCAA Division I provisional/automatic outdoor
// standards; tiers 2-4 to NCSA division recruiting standards (D3/D2/D1),
// cross-checked against TNS/TFRRS; tier 1 is set just below the lowest listed
// collegiate mark. U SPORTS (its nationals are indoor-only) is folded onto the
// same scale by level equivalence. Current-cycle approximations, reviewed
// 2026-07; sources: NCAA D1/D2 qualifying standards, ncsasports.org standards.
// Each entry: six reference marks for tiers Emerging -> Elite, mapping to
// [40,55,70,82,92,100]. Running (incl. hurdles/steeplechase) in seconds, jumps/
// vaults/throws in metres, combined events in points. Anchored to NCAA D1/D2
// qualifying standards, NCSA division recruiting ranges, TFRRS, and U SPORTS
// (folded on by level). Gender-specific events (110mH/decathlon are men's,
// 100mH/heptathlon are women's) appear only under the relevant gender.
const ratingBands:Record<"Men"|"Women",Partial<Record<EventName,number[]>>>={
  Men:{
    "100 metres":[11.60,11.30,10.95,10.60,10.25,10.05],"200 metres":[23.80,22.90,21.80,21.20,20.75,20.40],"400 metres":[52.50,51.00,48.50,47.20,46.50,45.50],
    "800 metres":[125.0,119.0,114.0,110.8,109.5,107.0],"1500 metres":[260.0,247.0,236.0,227.1,224.0,220.0],"5000 metres":[1000.0,940.0,885.0,852.9,835.0,815.0],"10,000 metres":[2160.0,2010.0,1860.0,1792.0,1755.0,1725.0],
    "110 metres hurdles":[16.50,15.80,15.00,14.30,13.80,13.40],"400 metres hurdles":[60.00,57.00,54.00,51.50,50.00,49.00],"3000 metres steeplechase":[640.0,600.0,560.0,535.0,520.0,508.0],
    "High jump":[1.85,1.95,2.03,2.10,2.15,2.20],"Pole vault":[4.10,4.40,4.70,5.05,5.35,5.60],"Long jump":[6.30,6.70,7.10,7.40,7.60,7.85],"Triple jump":[12.50,13.30,14.20,15.10,15.75,16.20],
    "Shot put":[11.50,13.50,15.50,17.00,18.50,20.00],"Discus":[35.00,41.00,46.00,51.00,55.00,60.00],"Hammer throw":[38.00,45.00,52.00,58.00,63.00,68.00],"Javelin":[40.00,48.00,55.00,62.00,67.00,73.00],
    "Decathlon":[4500,5300,6100,6900,7700,8100],
  },
  Women:{
    "100 metres":[13.10,12.60,12.20,11.80,11.40,11.15],"200 metres":[26.80,25.60,24.60,23.90,23.50,23.00],"400 metres":[62.50,60.00,56.50,54.50,53.50,52.00],
    "800 metres":[154.0,144.0,136.0,131.3,125.5,122.5],"1500 metres":[315.0,295.0,280.0,269.0,256.0,251.0],"5000 metres":[1200.0,1125.0,1065.0,1014.0,965.0,940.0],"10,000 metres":[2580.0,2400.0,2250.0,2160.4,2020.0,1980.0],
    "100 metres hurdles":[16.50,15.30,14.40,13.70,13.20,12.80],"400 metres hurdles":[70.00,66.00,62.50,59.50,57.50,56.00],"3000 metres steeplechase":[730.0,680.0,640.0,610.0,595.0,582.0],
    "High jump":[1.55,1.63,1.68,1.74,1.80,1.85],"Pole vault":[3.10,3.40,3.70,3.95,4.10,4.35],"Long jump":[4.90,5.30,5.70,6.00,6.20,6.50],"Triple jump":[10.20,11.00,11.70,12.30,13.25,13.75],
    "Shot put":[9.50,11.00,12.50,14.00,15.50,17.00],"Discus":[30.00,36.00,41.00,46.00,50.00,55.00],"Hammer throw":[35.00,42.00,48.00,54.00,58.00,63.00],"Javelin":[28.00,34.00,40.00,45.00,50.00,55.00],
    "Heptathlon":[3200,3800,4400,4950,5600,6000],
  },
};

// Rate any single mark (an athlete's PB, or a program's roster average) on the
// gender/event bands, returning a 35-100 rating + 1-5 stars. Higher = stronger.
export function rateMark(event:EventName,gender:"Men"|"Women",performance:number){
  // Fall back to the other gender's band for cross-gender edge cases, and to a
  // neutral rating if an event genuinely has no band (should not happen in the UI).
  const anchors=ratingBands[gender][event]??ratingBands[gender==="Men"?"Women":"Men"][event];
  if(!anchors)return {rating:50,stars:3,entry:0,elite:0};
  const running=isRunningEvent(event),scores=[40,55,70,82,92,100];
  let rating=running?(performance>=anchors[0]?scores[0]:scores.at(-1)!):(performance<=anchors[0]?scores[0]:scores.at(-1)!);
  for(let i=0;i<anchors.length-1;i++){
    const within=running?performance<=anchors[i]&&performance>=anchors[i+1]:performance>=anchors[i]&&performance<=anchors[i+1];
    if(within){const progress=(performance-anchors[i])/(anchors[i+1]-anchors[i]);rating=Math.round(scores[i]+progress*(scores[i+1]-scores[i]));break;}
  }
  rating=Math.max(35,Math.min(100,rating));
  const stars=rating>=92?5:rating>=82?4:rating>=70?3:rating>=55?2:1;
  return {rating,stars,entry:anchors[0],elite:anchors.at(-1)!};
}

export function collegeRating(profile:AthleteProfile){
  const gender=profile.gender||"Men";
  const {rating,stars,entry,elite}=rateMark(profile.event,gender,profile.performance);
  const labels=["Emerging","Developing","Collegiate range","Competitive","National-level"];
  const index=stars-1;
  const pathway=rating>=92?"NCAA Division I and top U SPORTS programs":rating>=82?"NCAA Division II, selective Division I, and strong U SPORTS programs":rating>=70?"NCAA Division III, developing Division II, and U SPORTS programs":rating>=55?"development-focused NCAA Division III or U SPORTS programs":"continued development before targeted collegiate outreach";
  return {rating,stars,index,label:`${labels[index]} · ${pathway}`,pathway,percentile:Math.max(1,Math.min(99,rating)),entry,elite};
}

export function localAssistantReply(question: string, p: AthleteProfile) {
  const q = question.toLowerCase(); const a = assess(p); const mark = formatPerformance(p);
  if (/good enough|level|potential|compete/.test(q)) return `Your ${mark} ${p.event.toLowerCase()} result currently maps to “${a.label}” in CollegeLane's broad educational model. That is a research signal, not a recruiting verdict. Verify the mark, compare current rosters, and contact a balanced mix of programs.`;
  if (/email|contact|coach/.test(q)) return `Include your ${p.gradYear} graduation year, ${p.event} best of ${mark}, ${p.average}% average, intended ${p.major} major, a verified result link, and one specific reason you fit the program. Keep the first message under 180 words and follow up after 7–10 days.`;
  if (/ncaa|u sports|eligib/.test(q)) return "NCAA and U Sports have different eligibility, recruiting, and financial-aid frameworks. Use CollegeLane to organize your questions, then confirm current requirements with official NCAA, U Sports, conference, admissions, and program sources.";
  if (/school|list|program/.test(q)) return `Build 8–12 programs across reach, target, and strong-fit categories. Filter first by ${p.major}, region, and school size, then compare current ${p.event.toLowerCase()} rosters and recruiting contacts.`;
  if (/when|timeline|follow/.test(q)) return "Begin thoughtful outreach once your key result is verified and your profile is complete. Track every contact, then send a concise follow-up after 7–10 days if the coach has not replied.";
  return `For your ${p.event.toLowerCase()} profile (${mark}), the most useful next move is: ${a.nextSteps[0].toLowerCase()}. I can also help with school lists, coach emails, recruiting timelines, or NCAA versus U Sports.`;
}
