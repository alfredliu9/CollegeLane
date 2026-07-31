"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Notice, PageHead } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { unitFor, type EventName } from "@/lib/recruiting";
import type { EventComparison, Recommendation, RecommendationResponse } from "@/lib/recommendations";

/* Deterministic, educational school matching. This page renders the response of
   GET /api/recommendations and never fabricates results: when the API declines to
   recommend (e.g. missing verified women's data) we say so and point to the
   directory instead. Roster averages are research context, not offer thresholds. */

type Payload = RecommendationResponse & { profileUpdatedAt: string };

type Status =
  | { kind: "loading" }
  | { kind: "ready"; data: Payload }
  | { kind: "unauthorized" }
  | { kind: "no-profile"; message: string }
  | { kind: "error"; message: string };

// order matters: this is the top-to-bottom display order, most likely to get
// interest first (Strong Fit) down to the least likely stretch picks (Reach)
const CATEGORIES = ["Strong Fit", "Reach"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_BLURB: Record<Category, string> = {
  "Strong Fit": "These roster averages are the same as, or a bit below, your verified marks.",
  Reach: "These roster averages are faster or stronger than your verified marks.",
};

// short human caption for what each group means in offer-likelihood terms.
// framed as an estimate, never a promise of an offer.
const CATEGORY_SUBLABEL: Record<Category, string> = {
  "Strong Fit": "Strongest estimated chance of interest",
  Reach: "Stretch programs, least likely",
};

const LIMITS = [12, 24] as const;

// How many cards each compatibility group shows before "Show all" is offered.
const GROUP_PREVIEW_COUNT = 3;

function mark(event: EventName, value: number) {
  return `${value.toFixed(2)} ${unitFor(event)}`;
}

function locationLine(item: Recommendation) {
  const place = [item.city, item.region].filter(Boolean).join(", ");
  const program = item.pathway === "NCAA" ? `${item.pathway} ${item.division}` : item.pathway;
  return [place, program].filter(Boolean).join(" · ");
}

function confidenceBadge(confidence: Recommendation["dataConfidence"]) {
  const tone = confidence === "High" ? "brand" : confidence === "Low" ? "danger" : "muted";
  return <Badge tone={tone}>{confidence} data confidence</Badge>;
}

function EventRow({ comparison }: { comparison: EventComparison }) {
  const gap = comparison.gapPercent;
  // For running events a lower mark is faster, so a positive gap already means "ahead".
  const ahead = gap >= 0;
  return (
    <div className="between" style={{ alignItems: "flex-start", gap: 12, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <div>
        <div className="h3" style={{ fontSize: 14 }}>{comparison.event}</div>
        <small className="faint">
          Your mark {mark(comparison.event, comparison.athleteMark)} vs roster average{" "}
          {mark(comparison.event, comparison.rosterAverage)}
        </small>
      </div>
      <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <Badge tone={ahead ? "brand" : "muted"}>
          {gap >= 0 ? "+" : ""}
          {gap.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

function RecommendationCard({
  item,
  saved,
  onToggleSave,
}: {
  item: Recommendation;
  saved: boolean;
  onToggleSave: (id: string) => void;
}) {
  return (
    <Card className="stack" style={{ gap: 14 }}>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div>
          <Badge tone="accent">{item.category}</Badge>
          <h2 className="h3" style={{ marginTop: 8 }}>{item.name}</h2>
          <p className="muted" style={{ fontSize: 13 }}>{locationLine(item)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="big-number" style={{ fontSize: 34 }}>{item.overallScore}</div>
          <small className="faint">match score</small>
        </div>
      </div>

      <div>{confidenceBadge(item.dataConfidence)}</div>

      {item.eventComparisons.length > 0 ? (
        <div>
          <small className="eyebrow" style={{ display: "block", marginBottom: 2 }}>Verified event comparisons</small>
          {item.eventComparisons.map((comparison) => (
            <EventRow key={comparison.event} comparison={comparison} />
          ))}
          <small className="faint" style={{ display: "block", marginTop: 8 }}>
            Roster averages describe current team performance, not recruiting standards or offer probability.
          </small>
        </div>
      ) : null}

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Why this match &amp; what to keep in mind</summary>
        <div className="stack" style={{ gap: 10, marginTop: 10 }}>
          <div>
            <small className="eyebrow">Reasons</small>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {item.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div>
            <small className="eyebrow">Limitations</small>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {item.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <div className="row wrap" style={{ gap: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => onToggleSave(item.schoolId)}>
          {saved ? "Saved" : "Save school"}
        </Button>
        <Link className="btn btn-ghost btn-sm" href={`/school/${item.schoolId}`}>View school</Link>
        {item.sourceUrl ? (
          <a className="link" style={{ fontSize: 13, marginLeft: "auto" }} href={item.sourceUrl} target="_blank" rel="noreferrer">
            Verified source ↗
          </a>
        ) : null}
      </div>
    </Card>
  );
}

export default function RecommendedPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [limit, setLimit] = useState<number>(12);
  const { data: savedSchools, save: saveSchools } = useAccountState<string[]>("cl-schools", []);

  const load = useCallback(async (nextLimit: number) => {
    setStatus({ kind: "loading" });
    try {
      const response = await fetch(`/api/recommendations?limit=${nextLimit}`);
      if (response.status === 401) {
        setStatus({ kind: "unauthorized" });
        return;
      }
      const payload = (await response.json()) as Partial<Payload> & { error?: string };
      if (response.status === 422) {
        setStatus({ kind: "no-profile", message: payload.error ?? "Complete your athlete profile to receive recommendations." });
        return;
      }
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Recommendations could not be loaded." });
        return;
      }
      setStatus({ kind: "ready", data: payload as Payload });
    } catch {
      setStatus({ kind: "error", message: "Recommendations could not be loaded. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    void load(limit);
  }, [load, limit]);

  const toggleSave = useCallback(
    (id: string) => {
      const next = savedSchools.includes(id) ? savedSchools.filter((x) => x !== id) : [...savedSchools, id];
      void saveSchools(next);
    },
    [savedSchools, saveSchools],
  );

  return (
    <div className="page">
      <PageHead eyebrow="Deterministic matches" title="Recommended">
        <p>
          These matches come straight from your saved profile and verified roster data, with no AI and no predictions.
          The same profile and data always produce the same list. Nothing here guarantees admission, recruitment, roster
          placement, or scholarships.
        </p>
        <p>
          The list is ordered by how likely a program is to be interested, highest at the top. This is an educational
          estimate, not a guarantee, and program quality is ranked within every group.
        </p>
      </PageHead>

      <div className="between wrap" style={{ marginBottom: 18 }}>
        <Notice>Roster averages are research context describing current teams, not recruiting or offer thresholds.</Notice>
        <label className="row" style={{ gap: 8, fontSize: 13, fontWeight: 700 }}>
          Show
          <select
            className="select"
            style={{ width: "auto" }}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      {status.kind === "loading" ? (
        <Card>
          <p className="muted">Comparing your profile with every eligible program…</p>
        </Card>
      ) : null}

      {status.kind === "unauthorized" ? (
        <Empty title="Please log in to see your recommendations">
          <p>Your recommendations are tied to your account.</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
            <Link className="btn btn-primary" href="/login">Log in</Link>
          </div>
        </Empty>
      ) : null}

      {status.kind === "no-profile" ? (
        <Empty title="Complete your athlete profile first">
          <p>{status.message}</p>
          <div className="row wrap" style={{ justifyContent: "center", marginTop: 14 }}>
            <Link className="btn btn-primary" href="/onboarding">Start onboarding</Link>
            <Link className="btn btn-secondary" href="/profile">Edit profile</Link>
          </div>
        </Empty>
      ) : null}

      {status.kind === "error" ? (
        <Card className="stack">
          <p style={{ color: "var(--danger)", fontWeight: 600 }}>{status.message}</p>
          <div className="row wrap">
            <Button onClick={() => void load(limit)}>Try again</Button>
            <Link className="btn btn-secondary" href="/profile">Review profile</Link>
          </div>
        </Card>
      ) : null}

      {status.kind === "ready" ? <Results data={status.data} savedSchools={savedSchools} onToggleSave={toggleSave} /> : null}
    </div>
  );
}

function Results({
  data,
  savedSchools,
  onToggleSave,
}: {
  data: Payload;
  savedSchools: string[];
  onToggleSave: (id: string) => void;
}) {
  const hasRecommendations = data.recommendations.length > 0;
  const grouped = CATEGORIES.map((category) => ({
    category,
    // the api already ranks by match score, but sort here too so the quality
    // ranking is guaranteed in every group regardless of incoming order.
    // slice() first so we dont mutate the response array.
    items: data.recommendations
      .filter((item) => item.category === category)
      .slice()
      .sort((a, b) => b.overallScore - a.overallScore),
  })).filter((group) => group.items.length > 0);

  const [expandedGroups, setExpandedGroups] = useState<Set<Category>>(new Set());
  const toggleGroup = (category: Category) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="stack" style={{ gap: 22 }}>
      {data.warnings.length > 0 ? (
        <div className="stack" style={{ gap: 10 }}>
          {data.warnings.map((warning) => (
            <Notice key={warning} tone="warn">{warning}</Notice>
          ))}
        </div>
      ) : null}

      <Card className="between wrap" style={{ gap: 12 }}>
        <p className="muted" style={{ fontSize: 14 }}>
          <b style={{ color: "var(--ink)" }}>{data.coverage.schoolsWithVerifiedComparison}</b> verified comparisons across{" "}
          <b style={{ color: "var(--ink)" }}>{data.coverage.schoolsEvaluated}</b> eligible schools.
        </p>
        <Link className="btn btn-secondary btn-sm" href="/schools">Search full directory</Link>
      </Card>

      {!hasRecommendations ? (
        <Empty title="No verified matches for this profile yet">
          <p>
            We are not fabricating results where verified data is missing. You can still explore every NCAA and U Sports
            program in the complete directory.
          </p>
          <div className="row wrap" style={{ justifyContent: "center", marginTop: 14 }}>
            <Link className="btn btn-primary" href="/schools">Browse the directory</Link>
            <Link className="btn btn-secondary" href="/profile">Review profile</Link>
          </div>
        </Empty>
      ) : null}

      {grouped.map((group) => {
        const isExpanded = expandedGroups.has(group.category);
        const visibleItems = isExpanded ? group.items : group.items.slice(0, GROUP_PREVIEW_COUNT);
        const hiddenCount = group.items.length - GROUP_PREVIEW_COUNT;
        return (
          <section key={group.category} className="stack" style={{ gap: 12 }}>
            <div>
              <div className="row wrap" style={{ gap: 8, alignItems: "baseline" }}>
                <h2 className="h2">{group.category}</h2>
                <Badge tone="muted">{CATEGORY_SUBLABEL[group.category]}</Badge>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>{CATEGORY_BLURB[group.category]}</p>
            </div>
            <div className="grid-2">
              {visibleItems.map((item) => (
                <RecommendationCard
                  key={item.schoolId}
                  item={item}
                  saved={savedSchools.includes(item.schoolId)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
            {hiddenCount > 0 ? (
              <div className="row">
                <Button variant="secondary" size="sm" onClick={() => toggleGroup(group.category)}>
                  {isExpanded ? "Show less" : `Show all (${group.items.length})`}
                </Button>
              </div>
            ) : null}
          </section>
        );
      })}

      {data.researchOnly.length > 0 ? (
        <section className="stack" style={{ gap: 12 }}>
          <div>
            <h2 className="h2">Research only</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              These match your pathway, but we do not yet have enough verified event data to score them.
            </p>
          </div>
          <div className="grid-2">
            {data.researchOnly.map((school) => (
              <Link key={school.id} href={`/school/${school.id}`} className="card" style={{ display: "block" }}>
                <div className="h3">{school.name}</div>
                <p className="muted" style={{ fontSize: 13 }}>
                  {[school.city, school.region].filter(Boolean).join(", ")} ·{" "}
                  {school.pathway === "NCAA" ? `${school.pathway} ${school.division}` : school.pathway}
                </p>
                <span className="link" style={{ fontSize: 13 }}>View school ↗</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="faint" style={{ fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        Method {data.methodologyVersion} · Catalog {data.catalogVersion} · Profile {data.profileVersion}
        <br />
        Generated {new Date(data.generatedAt).toLocaleString()} · Profile last updated{" "}
        {new Date(data.profileUpdatedAt).toLocaleString()}
      </footer>
    </div>
  );
}
