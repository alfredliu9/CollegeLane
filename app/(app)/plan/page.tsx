"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccountState } from "@/lib/account-state";
import { emptyAthlete, profileCompletion, type AthleteProfile } from "@/lib/recruiting";
import { Badge, Button, Card, Empty, Notice, PageHead, Progress, Select } from "@/components/ui";

// Adaptive recruiting checklist. The nine steps and their per-step action links
// come from the legacy prototype's Plan view, but completion is no longer purely
// manual: each step that maps to a real app signal (a complete profile, saved
// schools, logged outreach, scheduled follow-ups) is detected automatically from
// account state (cl-athlete, cl-schools, cl-outreach). Steps with no signal keep
// a manual toggle stored under "cl-tasks", and any step without an auto-signal
// can still be marked complete by hand as an override.

// Everything a step needs to auto-detect its own completion, derived once from
// the athlete profile plus the saved-school and outreach collections.
type Signals = {
  profilePercent: number;
  hasPrimaryResult: boolean;
  recommendationsReady: boolean;
  savedSchools: number;
  outreachCount: number;
  followUpCount: number;
};

type Step = {
  id: number;
  title: string;
  description: string;
  href: string;
  action: string;
  // When present, this step can complete on its own from real progress. Returns
  // true once the underlying work is detected. autoHint explains why.
  auto?: (s: Signals) => boolean;
  autoHint?: (s: Signals) => string;
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Confirm your best result",
    description: "Confirm that your primary event, mark, timing, wind, meet, and date are current.",
    href: "/profile",
    action: "Review performance",
    auto: (s) => s.hasPrimaryResult,
    autoHint: () => "Pulled from the best result saved on your profile.",
  },
  {
    id: 2,
    title: "Complete your athlete profile",
    description:
      "Complete your athlete profile so coaches have your results, academics, graduation year, and preferences.",
    href: "/profile",
    action: "Build athlete profile",
    auto: (s) => s.profilePercent >= 80,
    autoHint: (s) => `Your profile is ${s.profilePercent}% complete.`,
  },
  {
    id: 3,
    title: "Build a balanced school list",
    description: "Review deterministic matches, save a balanced group, and continue researching the full directory.",
    href: "/recommended",
    action: "View recommendations",
    auto: (s) => s.savedSchools >= 3,
    autoHint: (s) => `You have saved ${s.savedSchools} programs.`,
  },
  {
    id: 4,
    title: "Learn the recruiting pathways",
    description: "Understand the pathways before contacting programs, then confirm current rules with official sources.",
    href: "/disclaimer",
    action: "Review recruiting guidance",
  },
  {
    id: 5,
    title: "Complete recruiting questionnaires",
    description:
      "Open saved program profiles and use each official source to find and complete its recruiting questionnaire.",
    href: "/schools",
    action: "Find program questionnaires",
  },
  {
    id: 6,
    title: "Build your first coach email",
    description: "Choose a school and coaches, attach your materials, and generate a tailored first message.",
    href: "/email-builder",
    action: "Build coach email",
  },
  {
    id: 7,
    title: "Track your outreach",
    description: "Record each program you contact so your outreach history stays organized.",
    href: "/outreach",
    action: "Open outreach tracker",
    auto: (s) => s.outreachCount >= 1,
    autoHint: (s) => `You have logged ${s.outreachCount} ${s.outreachCount === 1 ? "contact" : "contacts"}.`,
  },
  {
    id: 8,
    title: "Schedule follow-ups",
    description: "Add follow-up dates and update the status of every conversation.",
    href: "/outreach",
    action: "Schedule follow-ups",
    auto: (s) => s.followUpCount >= 1,
    autoHint: (s) => `${s.followUpCount} ${s.followUpCount === 1 ? "conversation has" : "conversations have"} a follow-up set.`,
  },
  {
    id: 9,
    title: "Update results and re-engage",
    description: "Add your new result, then revisit recommendations and notify the coaches you contacted.",
    href: "/profile",
    action: "Update performances",
  },
];

// Minimal shape of an outreach record; only the follow-up date is read here.
type OutreachRecord = { followUp?: string };

type Filter = "All" | "Complete" | "Incomplete";
const FILTERS: Filter[] = ["All", "Complete", "Incomplete"];

export default function PlanPage() {
  const { data: done, save } = useAccountState<number[]>("cl-tasks", []);
  const { data: profile } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const { data: savedSchools } = useAccountState<string[]>("cl-schools", []);
  const { data: outreach } = useAccountState<OutreachRecord[]>("cl-outreach", []);
  const [filter, setFilter] = useState<Filter>("All");

  const signals = useMemo<Signals>(() => {
    const hasPrimaryResult = profile.performance > 0 && Boolean(profile.meet);
    return {
      profilePercent: profileCompletion(profile),
      hasPrimaryResult,
      recommendationsReady: profile.gender !== "" && profile.performance > 0,
      savedSchools: savedSchools.length,
      outreachCount: outreach.length,
      followUpCount: outreach.filter((row) => Boolean(row.followUp)).length,
    };
  }, [profile, savedSchools, outreach]);

  // Per-step completion: an auto-signal firing wins, otherwise fall back to the
  // manual cl-tasks toggle. `auto` tracks whether the signal is what completed it
  // (so we can show the "Done automatically" hint and hide the manual toggle).
  const status = useMemo(() => {
    const map = new Map<number, { auto: boolean; manual: boolean; complete: boolean }>();
    for (const step of STEPS) {
      const auto = step.auto ? step.auto(signals) : false;
      const manual = done.includes(step.id);
      map.set(step.id, { auto, manual, complete: auto || manual });
    }
    return map;
  }, [signals, done]);

  const total = STEPS.length;
  const completeCount = STEPS.filter((step) => status.get(step.id)!.complete).length;
  const percent = Math.round((completeCount / total) * 100);
  const allComplete = completeCount === total;
  const nextStep = STEPS.find((step) => !status.get(step.id)!.complete) ?? null;

  const toggle = (id: number) => {
    save(done.includes(id) ? done.filter((x) => x !== id) : [...done, id]);
  };

  const list = useMemo(
    () =>
      STEPS.filter((step) => {
        if (filter === "All") return true;
        const complete = status.get(step.id)!.complete;
        return filter === "Complete" ? complete : !complete;
      }),
    [filter, status],
  );

  return (
    <div className="page">
      <PageHead eyebrow="Adaptive recruiting checklist" title="Your recruiting plan">
        <p>
          Your plan keeps pace with your real progress. Steps tied to a CollegeLane tool tick off on their own as you
          finish the work, and the rest stay a quick manual toggle. Everything saves to your account.
        </p>
      </PageHead>

      <Card lg style={{ marginBottom: 20 }}>
        <div className="between" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <span className="eyebrow">{percent}% complete</span>
            <p className="h2" style={{ margin: "6px 0 14px" }}>
              {completeCount} of {total} steps finished
            </p>
            <Progress value={percent} />
          </div>
          <label className="field" style={{ margin: 0, minWidth: 160 }}>
            <span className="label">Show</span>
            <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {allComplete ? (
          <Notice>
            You have completed the core plan. Nice work. Keep the momentum by logging a fresh result and re-engaging the
            coaches you have already contacted.{" "}
            <Link href="/outreach" className="link">
              Open outreach tracker →
            </Link>
          </Notice>
        ) : nextStep ? (
          <Notice>
            Focus next on <b>{nextStep.title}</b>.{" "}
            <Link href={nextStep.href} className="link">
              {nextStep.action} →
            </Link>
          </Notice>
        ) : null}
      </Card>

      <div className="stack">
        {list.map((step) => {
          const state = status.get(step.id)!;
          const complete = state.complete;
          const isAuto = state.auto;
          const isNext = nextStep?.id === step.id;
          return (
            <Card key={step.id}>
              <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
                {isAuto ? (
                  <span
                    aria-label={`"${step.title}" completed automatically`}
                    title="Done automatically"
                    style={{
                      flex: "0 0 auto",
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 15,
                      fontWeight: 800,
                      lineHeight: 1,
                      border: "1px solid var(--brand)",
                      background: "var(--brand)",
                      color: "#fff",
                    }}
                  >
                    ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(step.id)}
                    aria-pressed={complete}
                    aria-label={complete ? `Mark "${step.title}" incomplete` : `Mark "${step.title}" complete`}
                    style={{
                      flex: "0 0 auto",
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 800,
                      lineHeight: 1,
                      border: complete ? "1px solid var(--brand)" : "1px solid var(--line)",
                      background: complete ? "var(--brand)" : "var(--surface)",
                      color: complete ? "#fff" : "var(--faint)",
                    }}
                  >
                    {complete ? "✓" : ""}
                  </button>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="between" style={{ gap: 10, alignItems: "flex-start" }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <span className="faint" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {String(step.id).padStart(2, "0")}
                      </span>
                      <h3 className="h3">{step.title}</h3>
                    </div>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {isNext && !complete ? <Badge tone="accent">Focus next</Badge> : null}
                      {isAuto ? (
                        <Badge>Done automatically</Badge>
                      ) : complete ? (
                        <Badge>Complete</Badge>
                      ) : (
                        <Badge tone="muted">To do</Badge>
                      )}
                    </div>
                  </div>

                  <p className="muted" style={{ margin: "8px 0 14px" }}>
                    {step.description}
                  </p>

                  <div className="row wrap" style={{ alignItems: "center" }}>
                    <Link href={step.href} className="link">
                      {step.action} →
                    </Link>
                    {isAuto ? (
                      <span className="faint" style={{ fontSize: 13 }}>
                        {step.autoHint ? step.autoHint(signals) : "Completed automatically from your progress."}
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => toggle(step.id)}>
                        {complete ? "Mark incomplete" : "Mark complete"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {list.length === 0 ? (
          <Card>
            <Empty title="No steps match this filter">
              <p>Switch the filter back to “All” to see every step in your recruiting plan.</p>
            </Empty>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
