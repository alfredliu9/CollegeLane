"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Input, Notice, PageHead, Select, Textarea } from "@/components/ui";
import { PerformanceToast, type PerformanceToastDetails } from "@/components/perf-toast";
import { useAccountState } from "@/lib/account-state";
import { useDisplayName } from "@/lib/use-display-name";
import {
  assess,
  collegeRating,
  emptyAthlete,
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

function emptyResult(event: EventName): AthleteResult {
  return { event, performance: 0, season: "Outdoor", timing: "Fully automatic", wind: null, meet: "", resultDate: "" };
}

export default function ProfilePage() {
  const { data, save, loading, saving } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const displayName = useDisplayName();
  const [form, setForm] = useState<AthleteProfile>(emptyAthlete);
  const [touched, setTouched] = useState(false);
  const [perfToast, setPerfToast] = useState<PerformanceToastDetails | null>(null);
  const hydrated = useRef(false);
  const namePrefilled = useRef(false);
  // Last "settled" primary result, used to decide whether an edit is a genuine
  // personal best. Seeded from the loaded profile so simply opening the page
  // (or loading existing data) can never fire the celebration.
  const primaryBaseline = useRef<{ event: EventName; performance: number } | null>(null);

  useEffect(() => {
    if (!loading && !hydrated.current) {
      setForm(data);
      primaryBaseline.current = { event: data.event, performance: data.performance };
      hydrated.current = true;
    }
  }, [loading, data]);

  // Detect a real personal best on the PRIMARY result. Auto-save fires on every
  // keystroke, so we debounce and only compare the *settled* value against the
  // baseline — this avoids celebrating half-typed marks (e.g. "1" for "10.55").
  // Running events improve when the time drops; jumps improve when distance
  // grows. Zero / first-entry marks and event switches update the baseline
  // silently without ever showing the toast.
  useEffect(() => {
    if (!hydrated.current) return;
    const event = form.event;
    const performance = form.performance;
    const timer = setTimeout(() => {
      const baseline = primaryBaseline.current;
      primaryBaseline.current = { event, performance };
      if (!baseline || baseline.event !== event) return;
      if (baseline.performance <= 0 || performance <= 0) return;
      const improved = isRunningEvent(event)
        ? performance < baseline.performance
        : performance > baseline.performance;
      if (!improved) return;
      const oldRating = collegeRating({ ...form, performance: baseline.performance });
      const newRating = collegeRating({ ...form, performance });
      setPerfToast({
        event,
        oldMark: baseline.performance,
        newMark: performance,
        oldRating: oldRating.rating,
        oldStars: oldRating.stars,
        newRating: newRating.rating,
        newStars: newRating.stars,
      });
    }, 700);
    return () => clearTimeout(timer);
    // Only the primary mark/event should re-arm the detector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.event, form.performance]);

  // After the saved profile loads, seed the first-name field from the signed-in
  // identity when it is still blank. Runs once and only touches an empty name,
  // so a saved name (or one the athlete edits) is never overwritten. We update
  // form state only — no auto-save — so this never trips the "saved" status.
  useEffect(() => {
    if (loading || !hydrated.current || namePrefilled.current || !displayName) return;
    namePrefilled.current = true;
    setForm((prev) => (prev.name ? prev : { ...prev, name: displayName }));
  }, [loading, displayName]);

  const commit = (next: AthleteProfile) => {
    setForm(next);
    setTouched(true);
    void save(next);
  };

  const set = <K extends keyof AthleteProfile>(key: K, value: AthleteProfile[K]) =>
    commit({ ...form, [key]: value });

  const toggle = (key: "pathways" | "goals", value: string) =>
    set(key, form[key].includes(value) ? form[key].filter((x) => x !== value) : [...form[key], value]);

  const secondary = [
    ...(form.secondaryResults || []),
    emptyResult("100 metres"),
    emptyResult("200 metres"),
  ].slice(0, 2);

  const updateSecondary = (index: number, patch: Partial<AthleteResult>) =>
    set("secondaryResults", secondary.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const status = saving ? "Saving…" : touched ? "Changes saved" : "Auto-saves as you edit";
  // Only preview a computed assessment once the athlete has entered the inputs
  // it depends on, so a brand-new profile never shows a fabricated label.
  const formReady = Boolean(form.gender) && Boolean(form.event) && form.performance > 0;

  return (
    <div className="page">
      {perfToast && <PerformanceToast {...perfToast} onClose={() => setPerfToast(null)} />}
      <PageHead eyebrow="Live recruiting data" title="Athlete profile">
        <p>Every change saves automatically and recalculates your dashboard, assessment, and recommendations.</p>
      </PageHead>

      <div className="between" style={{ marginBottom: 18 }}>
        <span className="badge badge-muted" role="status" aria-live="polite">{status}</span>
      </div>

      <div className="grid-sidebar">
        <form className="stack" onSubmit={(e) => e.preventDefault()}>
          <Card>
            <p className="h2" style={{ marginBottom: 16 }}>Basic information</p>
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
                <Input type="number" min="2026" max="2035" value={form.gradYear} onChange={(e) => set("gradYear", Number(e.target.value))} />
              </Field>
              <Field label="Province">
                <Select value={form.province} onChange={(e) => set("province", e.target.value)}>
                  <option value="">Select province</option>
                  {PROVINCES.map((x) => <option key={x}>{x}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid-2">
              <Field label="High school">
                <Input value={form.school} onChange={(e) => set("school", e.target.value)} />
              </Field>
              <Field label="Competition category">
                <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                  <option value="">Select category</option>
                  <option>Senior</option>
                  <option>Junior</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <p className="h2" style={{ marginBottom: 16 }}>Primary result</p>
            <Field label="Event">
              <Select value={form.event} onChange={(e) => set("event", e.target.value as EventName)}>
                {EVENTS.map((x) => <option key={x}>{x}</option>)}
              </Select>
            </Field>
            <div className="grid-2">
              <Field label={`Personal best (${unitFor(form.event)})`} hint={isRunningEvent(form.event) ? "Seconds" : "Metres"}>
                <Input type="number" min="0.01" step="0.01" required placeholder="Enter result" value={form.performance || ""} onChange={(e) => set("performance", e.target.value === "" ? 0 : Number(e.target.value))} />
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
                <Field label="Wind reading (m/s)">
                  <Input type="number" step="0.1" value={form.wind ?? ""} onChange={(e) => set("wind", e.target.value === "" ? null : Number(e.target.value))} />
                </Field>
              )}
            </div>
            <div className="grid-2">
              <Field label="Meet name">
                <Input value={form.meet} onChange={(e) => set("meet", e.target.value)} />
              </Field>
              <Field label="Result date">
                <Input type="date" value={form.resultDate} onChange={(e) => set("resultDate", e.target.value)} />
              </Field>
            </div>
          </Card>

          {secondary.map((result, index) => (
            <Card key={`secondary-${index}`}>
              <p className="h2" style={{ marginBottom: 4 }}>Additional result {index + 1}</p>
              <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Add another event or personal best to your saved athlete profile.</p>
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
            </Card>
          ))}

          <Card>
            <p className="h2" style={{ marginBottom: 16 }}>Academic information</p>
            <div className="grid-2">
              <Field label="Academic average (%)">
                <Input type="number" min="0" max="100" placeholder="e.g. 88" value={form.average || ""} onChange={(e) => set("average", e.target.value === "" ? 0 : Number(e.target.value))} />
              </Field>
              <Field label="Intended major">
                <Select value={form.major} onChange={(e) => set("major", e.target.value)}>
                  <option value="">Select a major</option>
                  {MAJORS.map((x) => <option key={x}>{x}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <p className="h2" style={{ marginBottom: 16 }}>Goals</p>
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
              <Textarea value={form.goalNotes} onChange={(e) => set("goalNotes", e.target.value)} placeholder="Optional. Share context about your goals." />
            </Field>
          </Card>
        </form>

        <div className="stack">
          <Card>
            <p className="h2" style={{ marginBottom: 16 }}>Recruiting preferences</p>
            <Field label="Preferred region" hint="Type to search suggestions.">
              <Input list="profile-regions" value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="Type to search regions" />
              <datalist id="profile-regions">
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
          </Card>

          <Card>
            <p className="h2" style={{ marginBottom: 10 }}>Live impact</p>
            <Notice>Saving recalculates your dashboard, assessment label, school fits, and recommendations.</Notice>
            <p className="muted" style={{ margin: "14px 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Current assessment</p>
            <p className="h3">{formReady ? assess(form).headline : "Add your event and best result to preview your assessment."}</p>
            <div className="divider" />
            <Button type="button" variant="secondary" block disabled>{status}</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
