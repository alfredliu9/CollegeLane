export type EventName = "100 metres" | "200 metres" | "400 metres" | "Long jump" | "Triple jump";
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

const levels: Record<EventName, number[]> = {
  "100 metres": [13.2, 12.4, 11.8, 11.3],
  "200 metres": [27.2, 25.5, 24.1, 22.8],
  "400 metres": [61.5, 57.5, 53.5, 50.5],
  "Long jump": [5.0, 5.7, 6.25, 6.8],
  "Triple jump": [10.6, 11.8, 12.8, 13.8],
};

export function isRunningEvent(event: EventName) { return event.includes("metres"); }
export function unitFor(event: EventName) { return isRunningEvent(event) ? "s" : "m"; }
export function formatPerformance(profile: AthleteProfile) { return `${profile.performance.toFixed(2)} ${unitFor(profile.event)}`; }

export function assess(profile: AthleteProfile) {
  const marks = levels[profile.event];
  const running = isRunningEvent(profile.event);
  const score = marks.reduce((total, mark) => total + ((running ? profile.performance <= mark : profile.performance >= mark) ? 1 : 0), 0);
  const index = running
    ? profile.performance <= marks[3] ? 4 : profile.performance <= marks[2] ? 3 : profile.performance <= marks[1] ? 2 : profile.performance <= marks[0] ? 1 : 0
    : score;
  const labels: AssessmentLabel[] = ["Exploring", "Developing", "Potential fit", "Competitive", "Highly competitive"];
  const label = labels[index];
  const pathways = index >= 4 ? "highly competitive programs across several pathways" : index === 3 ? "select U Sports and NCAA programs" : index === 2 ? "developing U Sports, NCAA Division II, and Division III opportunities" : "development-focused programs and continued performance growth";
  return {
    label,
    headline: label === "Potential fit" ? "Potential fit at select programs" : `${label} collegiate profile`,
    explanation: `${profile.name}'s ${formatPerformance(profile)} ${profile.season.toLowerCase()} ${profile.event.toLowerCase()} result suggests it is worth researching ${pathways}. This estimate uses broad prototype benchmarks; roster needs, academics, verified results, and recruiting year still matter.`,
    index,
    pathways,
    nextSteps: ["Keep your performance details current", "Build a balanced list of 8–12 programs", `Prepare outreach using your ${formatPerformance(profile)} result`],
  };
}

export function profileCompletion(p: AthleteProfile) {
  const values = [p.name,p.lastName,p.gender,p.gradYear,p.province,p.school,p.event,p.performance,p.meet,p.resultDate,p.average,p.major,p.region];
  return Math.round(values.filter(Boolean).length / values.length * 100);
}

const ratingBands:Record<"Men"|"Women",Record<EventName,number[]>>={
  Men:{"100 metres":[12.8,12,11.4,10.9,10.5,10.1],"200 metres":[26,24,22.8,21.8,21,20.2],"400 metres":[59,55,51.5,49,47,44.5],"Long jump":[5.5,6,6.5,7,7.5,8.1],"Triple jump":[11,12,13,14,15,16.5]},
  Women:{"100 metres":[14.5,13.3,12.5,11.9,11.5,10.9],"200 metres":[29.5,27,25.2,24,23.2,22.2],"400 metres":[68,62,58,55,52.5,49.5],"Long jump":[4.5,5,5.5,5.9,6.3,6.8],"Triple jump":[9.5,10.5,11.5,12.3,13.1,14.2]}
};

export function collegeRating(profile:AthleteProfile){
  const gender=profile.gender||"Men",anchors=ratingBands[gender][profile.event],running=isRunningEvent(profile.event),scores=[40,55,70,82,92,100];
  const performance=profile.performance;
  let rating=running?(performance>=anchors[0]?scores[0]:scores.at(-1)!):(performance<=anchors[0]?scores[0]:scores.at(-1)!);
  for(let i=0;i<anchors.length-1;i++){
    const within=running?performance<=anchors[i]&&performance>=anchors[i+1]:performance>=anchors[i]&&performance<=anchors[i+1];
    if(within){const progress=(performance-anchors[i])/(anchors[i+1]-anchors[i]);rating=Math.round(scores[i]+progress*(scores[i+1]-scores[i]));break;}
  }
  rating=Math.max(35,Math.min(100,rating));
  const stars=rating>=92?5:rating>=82?4:rating>=70?3:rating>=55?2:1;
  const labels=["Emerging","Developing","Collegiate range","Competitive","National-level"];
  const index=stars-1;
  const pathway=rating>=92?"NCAA Division I and top U SPORTS programs":rating>=82?"NCAA Division II, selective Division I, and strong U SPORTS programs":rating>=70?"NCAA Division III, developing Division II, and U SPORTS programs":rating>=55?"development-focused NCAA Division III or U SPORTS programs":"continued development before targeted collegiate outreach";
  return {rating,stars,index,label:`${labels[index]} · ${pathway}`,pathway,percentile:Math.max(1,Math.min(99,rating)),entry:anchors[0],elite:anchors.at(-1)!};
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
