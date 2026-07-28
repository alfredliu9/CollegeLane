"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Empty, Notice, PageHead, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import {
  emptyAthlete,
  formatPerformance,
  isRunningEvent,
  unitFor,
  type AthleteProfile,
} from "@/lib/recruiting";

// Shape returned by GET /api/schools?id=<id> (see app/api/schools/route.ts).
interface SchoolMatch {
  id: string;
  name: string;
  city: string;
  region: string;
  country: string;
  pathway: string;
  division: string;
  conference: string;
  size: string;
  majors_json: string;
  team_category: string;
  source_url: string;
  source_label: string;
  reviewed_at: string;
  event: string;
  gender: string;
  roster_average: number | null;
}

type Fit = "Above average" | "Near average" | "Below average" | null;

function compareToAverage(athlete: AthleteProfile, average: number | null): { score: number; fit: Fit } {
  if (average === null) return { score: -Infinity, fit: null };
  const score = (isRunningEvent(athlete.event) ? average - athlete.performance : athlete.performance - average) / average;
  return { score, fit: score >= 0.03 ? "Above average" : score >= -0.03 ? "Near average" : "Below average" };
}

function fitTone(fit: Fit): "accent" | "brand" | "muted" {
  return fit === "Above average" ? "accent" : fit === "Near average" ? "brand" : "muted";
}

function locationLine(s: SchoolMatch): string {
  return [s.city, s.region].filter(Boolean).join(", ") || s.country;
}

type Status = "loading" | "ready" | "notfound";

export default function SchoolDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: athlete } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const { data: saved, save: saveSaved, loading: savedLoading } = useAccountState<string[]>("cl-schools", []);
  const { data: note, save: saveNote } = useAccountState<string>(`cl-note-${id}`, "");

  const [school, setSchool] = useState<SchoolMatch | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!id) return;
    let active = true;
    setStatus("loading");
    const params2 = new URLSearchParams({
      id,
      event: athlete.event,
      gender: athlete.gender || "",
    });
    fetch(`/api/schools?${params2.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((payload: { schools: SchoolMatch[] }) => {
        if (!active) return;
        const found = payload.schools?.[0] ?? null;
        setSchool(found);
        setStatus(found ? "ready" : "notfound");
      })
      .catch(() => {
        if (active) setStatus("notfound");
      });
    return () => {
      active = false;
    };
  }, [id, athlete.event, athlete.gender, athlete.performance]);

  const isSaved = useMemo(() => saved.includes(id), [saved, id]);
  const toggleSave = () => {
    if (savedLoading) return;
    saveSaved(isSaved ? saved.filter((x) => x !== id) : [...saved, id]);
  };

  if (status === "loading") {
    return (
      <div className="page">
        <PageHead eyebrow="School profile" title="Program profile" />
        <Card>
          <p className="muted">Loading program comparison…</p>
        </Card>
      </div>
    );
  }

  if (status === "notfound" || !school) {
    return (
      <div className="page">
        <PageHead eyebrow="School profile" title="School not found" />
        <Empty title="We couldn't find that program">
          <p>The school may no longer be listed. Head back to the directory to keep exploring.</p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" href="/schools">
              Back to schools
            </Link>
          </div>
        </Empty>
      </div>
    );
  }

  const { fit } = compareToAverage(athlete, school.roster_average);
  const unit = unitFor(athlete.event);
  const rosterLabel = athlete.gender ? `${athlete.gender} roster average` : "Roster average";

  return (
    <div className="page">
      <PageHead eyebrow="School profile" title={school.name}>
        <p>{locationLine(school)}{school.conference ? ` · ${school.conference}` : ""}</p>
      </PageHead>

      <div className="stack">
        <div className="between wrap">
          <div className="row wrap" style={{ gap: 8 }}>
            <Badge tone="muted">{school.pathway}</Badge>
            {school.pathway === "NCAA" ? <Badge tone="muted">{school.division}</Badge> : null}
            {fit ? <Badge tone={fitTone(fit)}>{fit}</Badge> : <Badge tone="muted">Not verified</Badge>}
          </div>
          <Button
            variant={isSaved ? "primary" : "secondary"}
            onClick={toggleSave}
            disabled={savedLoading}
            aria-pressed={isSaved}
          >
            {isSaved ? "Saved" : "Save school"}
          </Button>
        </div>

        <Notice>
          A roster average is published only after the underlying marks are checked. It shows where a team currently sits. It
          is not a recruiting standard or offer threshold. Confirm current event sponsorship and roster needs with
          the school.
        </Notice>

        <div className="grid-2">
          <Card>
            <h2 className="h3" style={{ marginBottom: 14 }}>Performance comparison</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <small className="faint">Your result</small>
                <div className="h2">{formatPerformance(athlete)}</div>
              </div>
              <div>
                <small className="faint">{rosterLabel}</small>
                <div className="h2">
                  {school.roster_average === null ? "Not verified" : `${school.roster_average.toFixed(2)} ${unit}`}
                </div>
              </div>
            </div>
            <hr className="divider" />
            {school.roster_average === null ? (
              <p className="muted">
                This school is in the complete directory, but CollegeLane has not yet verified a matching{" "}
                {athlete.gender ? `${athlete.gender.toLowerCase()} ` : ""}
                {athlete.event.toLowerCase()} roster average.
                {!athlete.gender ? (
                  <>
                    {" "}
                    Add your competition gender in your <Link className="link" href="/profile">profile</Link> to see matching
                    averages.
                  </>
                ) : null}
              </p>
            ) : (
              <>
                <p className="muted">
                  Your result is {fit?.toLowerCase()} for this verified roster snapshot. Use it as a research signal, not a
                  recruiting verdict.
                </p>
                <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>
                  Reviewed {school.reviewed_at} ·{" "}
                  <a className="link" href={school.source_url} target="_blank" rel="noreferrer">
                    {school.source_label}
                  </a>
                </p>
              </>
            )}
          </Card>

          <Card>
            <h2 className="h3" style={{ marginBottom: 14 }}>Program information</h2>
            <div className="stack" style={{ gap: 10 }}>
              <div className="between">
                <span className="muted">Pathway</span>
                <b>{school.pathway}</b>
              </div>
              <div className="between">
                <span className="muted">Division</span>
                <b>{school.division}</b>
              </div>
              <div className="between">
                <span className="muted">Conference</span>
                <b>{school.conference || "Not listed"}</b>
              </div>
              <div className="between">
                <span className="muted">Location</span>
                <b>{locationLine(school)}</b>
              </div>
              <div className="between">
                <span className="muted">Your intended major</span>
                <b>{athlete.major || "Not yet specified"}</b>
              </div>
            </div>
            <hr className="divider" />
            <a className="link" href={school.source_url} target="_blank" rel="noreferrer">
              Open official directory source
            </a>
          </Card>
        </div>

        <Card>
          <h2 className="h3" style={{ marginBottom: 6 }}>Your notes</h2>
          <p className="hint" style={{ marginBottom: 12 }}>Private to your account and saved automatically.</p>
          <Textarea
            value={note}
            onChange={(e) => saveNote(e.target.value)}
            placeholder="Add questions, roster observations, or research notes…"
          />
        </Card>

        <Card>
          <div className="between wrap">
            <div>
              <h2 className="h3">Ready to reach out?</h2>
              <p className="muted">Draft a coach email using your saved profile and this program.</p>
            </div>
            <Link className="btn btn-primary" href="/email-builder">
              Open email builder
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
