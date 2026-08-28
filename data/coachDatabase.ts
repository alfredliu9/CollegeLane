import coaches from "./coaches.json";
import type { CoachGroup } from "@/lib/recruiting";

// One verified coach row, scraped from a school's official athletics staff pages
// (scripts/import-coaches.py + coach_probe.py). Emails are always taken verbatim
// from the real page, never constructed, so an absent coach is simply omitted.
export interface CoachRecord {
  schoolId: string;
  gender: "Men" | "Women" | "Both";
  name: string;
  title: string;
  eventGroup: CoachGroup;
  email: string;
  sourceUrl: string;
  reviewedAt: string;
}

export const coachDatabase = coaches as CoachRecord[];

// Coaches for one school, ordered so the most useful contact for the athlete's
// event sits first: the event-group specialist, then the head/general staff,
// then everyone else. `gender` narrows to the athlete's squad but still keeps
// "Both" rows (many coaches run both programs).
export function coachesForSchool(
  schoolId: string,
  opts: { group?: CoachGroup; gender?: "Men" | "Women" } = {},
): CoachRecord[] {
  const rows = coachDatabase.filter((c) => c.schoolId === schoolId);
  const forGender = opts.gender
    ? rows.filter((c) => c.gender === opts.gender || c.gender === "Both")
    : rows;
  const pool = forGender.length ? forGender : rows;
  // dedupe on email+name so a coach listed on both squad pages appears once.
  const seen = new Set<string>();
  const unique = pool.filter((c) => {
    const key = `${c.email.toLowerCase()}|${c.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const rank = (c: CoachRecord) => {
    if (opts.group && c.eventGroup === opts.group) return 0; // exact event specialist
    if (c.eventGroup === "general") return 1; // head coach / director
    return 2;
  };
  return unique.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
