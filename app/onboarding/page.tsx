"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import {
  defaultAthlete,
  isRunningEvent,
  unitFor,
  type AthleteProfile,
  type AthleteResult,
  type EventName,
} from "@/lib/recruiting";

const EVENTS: EventName[] = ["100 metres", "200 metres", "400 metres", "Long jump", "Triple jump"];
const PROVINCES = [
  "Ontario", "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Prince Edward Island", "Quebec", "Saskatchewan",
];
const PATHWAYS = ["U Sports", "NCAA Division I", "NCAA Division II", "NCAA Division III"];
const GOALS = [
  "Earn an athletic scholarship",
  "Compete at the strongest possible level",
  "Balance strong academics and athletics",
  "Continue competing after high school",
  "Explore available options",
];
const WIND_EVENTS: EventName[] = ["100 metres", "Long jump", "Triple jump"];
const MAJORS = [
  "Accounting", "Actuarial Science", "Aerospace Engineering", "Anthropology", "Architecture",
  "Art History", "Biochemistry", "Biology", "Biomedical Engineering", "Business Administration",
  "Chemical Engineering", "Chemistry", "Civil Engineering", "Communications", "Computer Engineering",
  "Computer Science", "Criminology", "Data Science", "Economics", "Education", "Electrical Engineering",
  "English", "Environmental Science", "Finance", "Fine Arts", "Geography", "Geology", "Graphic Design",
  "Health Sciences", "History", "Hospitality Management", "Human Resources", "Industrial Engineering",
  "Information Technology", "International Relations", "Journalism", "Kinesiology", "Liberal Arts",
  "Linguistics", "Marketing", "Mathematics", "Mechanical Engineering", "Music", "Neuroscience",
  "Nursing", "Nutrition", "Philosophy", "Physics", "Political Science", "Psychology", "Public Health",
  "Public Policy", "Social Work", "Sociology", "Software Engineering", "Sport Management", "Statistics",
  "Theatre", "Urban Planning", "Other / Undecided",
];
const REGIONS = [
  "Anywhere in Canada", "Atlantic Canada", "Western Canada", "Northern Canada",
  "Canada and the United States", "Ontario", "Quebec", "British Columbia", "Alberta", "Saskatchewan",
  "Manitoba", "New Brunswick", "Nova Scotia", "Prince Edward Island", "Newfoundland and Labrador",
  "Yukon", "Northwest Territories", "Nunavut", "Anywhere in the United States", "U.S. Northeast",
  "U.S. Midwest", "U.S. South", "U.S. West", "New England", "Mid-Atlantic", "Pacific Northwest",
  "California", "Florida", "Texas", "New York",
];

const STEP_TITLES = [
  "Tell us about yourself",
  "Add your best result",
  "Any additional results?",
  "Shape your school search",
  "What are you working toward?",
];
const TOTAL_STEPS = STEP_TITLES.length;

function emptyResult(event: EventName): AthleteResult {
  return { event, performance: 0, season: "Outdoor", timing: "Fully automatic", wind: null, meet: "", resultDate: "" };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data, save, loading, saving } = useAccountState<AthleteProfile>("cl-athlete", defaultAthlete);
  const [form, setForm] = useState<AthleteProfile>(defaultAthlete);
  const [step, setStep] = useState(1);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!loading && !hydrated.current) {
      setForm(data);
      hydrated.current = true;
    }
  }, [loading, data]);

  const set = <K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "pathways" | "goals", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((x) => x !== value) : [...prev[key], value],
    }));

  const secondary = [
    ...(form.secondaryResults || []),
    emptyResult("100 metres"),
    emptyResult("200 metres"),
  ].slice(0, 2);

  const updateSecondary = (index: number, patch: Partial<AthleteResult>) =>
    set("secondaryResults", secondary.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  async function next(e: React.FormEvent) {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    await save({ ...form, secondaryResults: secondary });
    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: "1px solid var(--line)", background: "var(--surface)",
          position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <Link href="/" aria-label="CollegeLane home" style={{ display: "inline-flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 118, height: "auto" }} />
        </Link>
        <span className="eyebrow">Step {step} of {TOTAL_STEPS}</span>
      </header>

      <div className="bar" style={{ borderRadius: 0 }}>
        <i style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>

      <main style={{ width: "100%", maxWidth: 640, margin: "0 auto", padding: "28px 18px 96px", flex: 1 }}>
        <span className="eyebrow">Athlete setup</span>
        <h1 className="h1" style={{ margin: "6px 0 20px" }}>{STEP_TITLES[step - 1]}</h1>

        <form onSubmit={next}>
          <Card lg>
            {step === 1 && (
              <>
                <div className="grid-2">
                  <Field label="First name">
                    <Input required autoComplete="given-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <Input required autoComplete="family-name" value={form.lastName || ""} onChange={(e) => set("lastName", e.target.value)} />
                  </Field>
                </div>
                <Field label="Competition gender" hint="Used to match your result with the correct roster averages.">
                  <Select required value={form.gender || ""} onChange={(e) => set("gender", e.target.value as AthleteProfile["gender"])}>
                    <option value="">Select gender</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                  </Select>
                </Field>
                <div className="grid-2">
                  <Field label="Graduation year">
                    <Select value={form.gradYear} onChange={(e) => set("gradYear", Number(e.target.value))}>
                      {[2026, 2027, 2028, 2029, 2030].map((y) => <option key={y} value={y}>{y}</option>)}
                    </Select>
                  </Field>
                  <Field label="Province">
                    <Select value={form.province} onChange={(e) => set("province", e.target.value)}>
                      {PROVINCES.map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid-2">
                  <Field label="High school">
                    <Input required value={form.school} onChange={(e) => set("school", e.target.value)} />
                  </Field>
                  <Field label="Competition category">
                    <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                      <option>Senior</option>
                      <option>Junior</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Primary event">
                  <Select value={form.event} onChange={(e) => set("event", e.target.value as EventName)}>
                    {EVENTS.map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
                <div className="grid-2">
                  <Field label={`Personal best (${unitFor(form.event)})`} hint={isRunningEvent(form.event) ? "Enter your time in seconds." : "Enter your mark in metres."}>
                    <Input type="number" min="0.01" step="0.01" required value={form.performance} onChange={(e) => set("performance", Number(e.target.value))} />
                  </Field>
                  <Field label="Season">
                    <Select value={form.season} onChange={(e) => set("season", e.target.value as AthleteProfile["season"])}>
                      <option>Outdoor</option>
                      <option>Indoor</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid-2">
                  {isRunningEvent(form.event) && (
                    <Field label="Timing method">
                      <Select value={form.timing} onChange={(e) => set("timing", e.target.value as AthleteProfile["timing"])}>
                        <option>Fully automatic</option>
                        <option>Hand timed</option>
                      </Select>
                    </Field>
                  )}
                  {WIND_EVENTS.includes(form.event) && (
                    <Field label="Wind reading (m/s)" hint="Leave blank if not recorded.">
                      <Input type="number" step="0.1" value={form.wind ?? ""} onChange={(e) => set("wind", e.target.value === "" ? null : Number(e.target.value))} />
                    </Field>
                  )}
                </div>
                <div className="grid-2">
                  <Field label="Meet name">
                    <Input required value={form.meet} onChange={(e) => set("meet", e.target.value)} />
                  </Field>
                  <Field label="Result date">
                    <Input type="date" required value={form.resultDate} onChange={(e) => set("resultDate", e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Notice>Additional results are optional. Add up to two more marks to strengthen your profile.</Notice>
                {secondary.map((result, index) => (
                  <div key={`secondary-${index}`} style={{ marginTop: 18 }}>
                    <p className="h3" style={{ marginBottom: 12 }}>Additional result {index + 1}</p>
                    <Field label="Event">
                      <Select value={result.event} onChange={(e) => updateSecondary(index, { event: e.target.value as EventName, wind: null })}>
                        {EVENTS.map((x) => <option key={x}>{x}</option>)}
                      </Select>
                    </Field>
                    <div className="grid-2">
                      <Field label={`Personal best (${unitFor(result.event)})`}>
                        <Input type="number" min="0.01" step="0.01" placeholder="Enter result" value={result.performance || ""} onChange={(e) => updateSecondary(index, { performance: e.target.value === "" ? 0 : Number(e.target.value) })} />
                      </Field>
                      <Field label="Season">
                        <Select value={result.season} onChange={(e) => updateSecondary(index, { season: e.target.value as AthleteResult["season"] })}>
                          <option>Outdoor</option>
                          <option>Indoor</option>
                        </Select>
                      </Field>
                    </div>
                    <div className="grid-2">
                      {isRunningEvent(result.event) && (
                        <Field label="Timing method">
                          <Select value={result.timing} onChange={(e) => updateSecondary(index, { timing: e.target.value as AthleteResult["timing"] })}>
                            <option>Fully automatic</option>
                            <option>Hand timed</option>
                          </Select>
                        </Field>
                      )}
                      {WIND_EVENTS.includes(result.event) && (
                        <Field label="Wind reading (m/s)">
                          <Input type="number" step="0.1" value={result.wind ?? ""} onChange={(e) => updateSecondary(index, { wind: e.target.value === "" ? null : Number(e.target.value) })} />
                        </Field>
                      )}
                    </div>
                    <div className="grid-2">
                      <Field label="Meet name">
                        <Input value={result.meet} onChange={(e) => updateSecondary(index, { meet: e.target.value })} />
                      </Field>
                      <Field label="Result date">
                        <Input type="date" value={result.resultDate} onChange={(e) => updateSecondary(index, { resultDate: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid-2">
                  <Field label="Academic average (%)">
                    <Input type="number" min="0" max="100" value={form.average} onChange={(e) => set("average", Number(e.target.value))} />
                  </Field>
                  <Field label="Intended major">
                    <Select value={form.major} onChange={(e) => set("major", e.target.value)}>
                      <option value="">Select a major</option>
                      {MAJORS.map((x) => <option key={x}>{x}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="grid-2">
                  <Field label="Preferred region" hint="Type to search suggestions.">
                    <Input list="onboarding-regions" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Type to search regions" />
                    <datalist id="onboarding-regions">
                      {REGIONS.map((x) => <option key={x} value={x} />)}
                    </datalist>
                  </Field>
                  <Field label="School size">
                    <Select value={form.schoolSize} onChange={(e) => set("schoolSize", e.target.value)}>
                      <option>No preference</option>
                      <option>Small</option>
                      <option>Medium</option>
                      <option>Large</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Pathways to explore">
                  <div className="stack" style={{ gap: 10, marginTop: 2 }}>
                    {PATHWAYS.map((x) => (
                      <label className="check" key={x}>
                        <input type="checkbox" checked={form.pathways.includes(x)} onChange={() => toggle("pathways", x)} />
                        {x}
                      </label>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {step === 5 && (
              <>
                <Field label="Recruiting goals">
                  <div className="stack" style={{ gap: 10, marginTop: 2 }}>
                    {GOALS.map((x) => (
                      <label className="check" key={x}>
                        <input type="checkbox" checked={form.goals.includes(x)} onChange={() => toggle("goals", x)} />
                        {x}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Goal notes" hint="Anything else you want coaches or your plan to reflect.">
                  <Textarea value={form.goalNotes} onChange={(e) => set("goalNotes", e.target.value)} placeholder="Optional — share context about your goals." />
                </Field>
              </>
            )}
          </Card>

          <div className="row" style={{ marginTop: 20, justifyContent: "space-between" }}>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving}>
              {step === TOTAL_STEPS ? (saving ? "Saving…" : "Save and go to dashboard") : "Continue"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
