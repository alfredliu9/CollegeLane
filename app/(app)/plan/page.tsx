"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccountState } from "@/lib/account-state";
import { Badge, Button, Card, Empty, PageHead, Progress, Select } from "@/components/ui";

// Interactive recruiting checklist. The nine steps, their descriptions, and
// their per-step action links are copied from the legacy prototype's Plan view.
// Completion is stored as an array of completed step ids under "cl-tasks".

type Step = {
  id: number;
  title: string;
  description: string;
  href: string;
  action: string;
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Confirm your best result",
    description: "Confirm that your primary event, mark, timing, wind, meet, and date are current.",
    href: "/profile",
    action: "Review performance",
  },
  {
    id: 2,
    title: "Complete your athlete profile",
    description:
      "Complete your athlete profile so coaches have your results, academics, graduation year, and preferences.",
    href: "/profile",
    action: "Build athlete profile",
  },
  {
    id: 3,
    title: "Build a balanced school list",
    description: "Review deterministic matches, save a balanced group, and continue researching the full directory.",
    href: "/recommended",
    action: "View recommendations",
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
  },
  {
    id: 8,
    title: "Schedule follow-ups",
    description: "Add follow-up dates and update the status of every conversation.",
    href: "/outreach",
    action: "Schedule follow-ups",
  },
  {
    id: 9,
    title: "Update results and re-engage",
    description: "Add your new result, then revisit recommendations and notify the coaches you contacted.",
    href: "/profile",
    action: "Update performances",
  },
];

type Filter = "All" | "Complete" | "Incomplete";
const FILTERS: Filter[] = ["All", "Complete", "Incomplete"];

export default function PlanPage() {
  const { data: done, save } = useAccountState<number[]>("cl-tasks", []);
  const [filter, setFilter] = useState<Filter>("All");

  const total = STEPS.length;
  const completeCount = done.length;
  const percent = Math.round((completeCount / total) * 100);

  const toggle = (id: number) => {
    save(done.includes(id) ? done.filter((x) => x !== id) : [...done, id]);
  };

  const list = useMemo(
    () =>
      STEPS.filter((step) => {
        if (filter === "All") return true;
        const complete = done.includes(step.id);
        return filter === "Complete" ? complete : !complete;
      }),
    [filter, done],
  );

  return (
    <div className="page">
      <PageHead eyebrow="Interactive recruiting checklist" title="Your recruiting plan">
        <p>
          Work through each step in order, or jump to the task that matters now. Every step links to the CollegeLane
          tool that helps you finish it, and your progress saves automatically to your account.
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
      </Card>

      <div className="stack">
        {list.map((step) => {
          const complete = done.includes(step.id);
          return (
            <Card key={step.id}>
              <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
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

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="between" style={{ gap: 10, alignItems: "flex-start" }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
                      <span className="faint" style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {String(step.id).padStart(2, "0")}
                      </span>
                      <h3 className="h3">{step.title}</h3>
                    </div>
                    {complete ? <Badge>Complete</Badge> : <Badge tone="muted">To do</Badge>}
                  </div>

                  <p className="muted" style={{ margin: "8px 0 14px" }}>
                    {step.description}
                  </p>

                  <div className="row wrap">
                    <Link href={step.href} className="link">
                      {step.action} →
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => toggle(step.id)}>
                      {complete ? "Mark incomplete" : "Mark complete"}
                    </Button>
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
