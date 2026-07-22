export type EventName = "100 metres" | "200 metres" | "400 metres" | "Long jump" | "Triple jump";
export type AssessmentLabel = "Exploring" | "Developing" | "Potential fit" | "Competitive" | "Highly competitive";

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

export function localAssistantReply(question: string, p: AthleteProfile) {
  const q = question.toLowerCase(); const a = assess(p); const mark = formatPerformance(p);
  if (/good enough|level|potential|compete/.test(q)) return `Your ${mark} ${p.event.toLowerCase()} result currently maps to “${a.label}” in CollegeLane's broad educational model. That is a research signal, not a recruiting verdict. Verify the mark, compare current rosters, and contact a balanced mix of programs.`;
  if (/email|contact|coach/.test(q)) return `Include your ${p.gradYear} graduation year, ${p.event} best of ${mark}, ${p.average}% average, intended ${p.major} major, a verified result link, and one specific reason you fit the program. Keep the first message under 180 words and follow up after 7–10 days.`;
  if (/ncaa|u sports|eligib/.test(q)) return "NCAA and U Sports have different eligibility, recruiting, and financial-aid frameworks. Use CollegeLane to organize your questions, then confirm current requirements with official NCAA, U Sports, conference, admissions, and program sources.";
  if (/school|list|program/.test(q)) return `Build 8–12 programs across reach, target, and strong-fit categories. Filter first by ${p.major}, region, and school size, then compare current ${p.event.toLowerCase()} rosters and recruiting contacts.`;
  if (/when|timeline|follow/.test(q)) return "Begin thoughtful outreach once your key result is verified and your profile is complete. Track every contact, then send a concise follow-up after 7–10 days if the coach has not replied.";
  return `For your ${p.event.toLowerCase()} profile (${mark}), the most useful next move is: ${a.nextSteps[0].toLowerCase()}. I can also help with school lists, coach emails, recruiting timelines, or NCAA versus U Sports.`;
}
