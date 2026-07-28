"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Empty, Field, Input, Notice, PageHead, Select } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import {
  emptyAthlete,
  formatPerformance,
  isRunningEvent,
  unitFor,
  type AthleteProfile,
} from "@/lib/recruiting";

// Shape returned by GET /api/schools (see app/api/schools/route.ts).
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

// Educational comparison of the athlete's mark to a verified roster average.
// This is NOT a recruiting standard — just where the athlete's result currently
// sits relative to that roster's average. Returns null when unverified.
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

const PATHWAYS = ["All", "NCAA", "U Sports"] as const;
const DIVISIONS = ["All divisions", "Division I", "Division II", "Division III"] as const;

export default function SchoolsPage() {
  const { data: athlete } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const { data: saved, save: saveSaved, loading: savedLoading } = useAccountState<string[]>("cl-schools", []);

  const [query, setQuery] = useState("");
  const [pathway, setPathway] = useState<string>("All");
  const [division, setDivision] = useState<string>("All divisions");

  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SchoolMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce the search box (~250ms) so we query as the athlete types.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      event: athlete.event,
      gender: athlete.gender || "",
      pathway,
      division,
      q: debouncedQuery,
    });
    fetch(`/api/schools?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((payload: { schools: SchoolMatch[]; total: number }) => {
        if (!active) return;
        setTotal(payload.total ?? 0);
        // Rank verified comparisons ahead of unverified, best fit first.
        setResults(
          [...payload.schools].sort((a, b) => {
            const sa = compareToAverage(athlete, a.roster_average).score;
            const sb = compareToAverage(athlete, b.roster_average).score;
            return sb - sa || a.name.localeCompare(b.name);
          }),
        );
      })
      .catch(() => {
        if (active) setError("School data could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [athlete.event, athlete.gender, athlete.performance, pathway, division, debouncedQuery, athlete]);

  const savedSet = useMemo(() => new Set(saved), [saved]);
  const toggleSave = (id: string) => {
    if (savedLoading) return;
    saveSaved(savedSet.has(id) ? saved.filter((x) => x !== id) : [...saved, id]);
  };

  const unit = unitFor(athlete.event);
  const rosterLabel = athlete.gender ? `${athlete.gender} roster average` : "Roster average";

  return (
    <div className="page">
      <PageHead eyebrow="Schools" title="Find your college lane">
        <p>Search every current NCAA and U Sports member program, then compare your result with verified roster averages.</p>
      </PageHead>

      <div className="stack">
        <Notice>
          {athlete.gender ? (
            <span>
              Comparisons use your {formatPerformance(athlete)} result and verified {athlete.gender.toLowerCase()} roster averages
              for {athlete.event.toLowerCase()}. A roster average shows where a team currently sits — it is not a recruiting
              standard or offer threshold.
            </span>
          ) : (
            <span>
              Add your competition gender in your <Link className="link" href="/profile">profile</Link> so matching roster
              averages can be shown.
            </span>
          )}
        </Notice>

        <Card>
          <div className="grid-2">
            <Field label="Search schools" hint="Search by school, city, region, or conference.">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing a school, state, or conference"
                autoComplete="off"
              />
            </Field>
            <div className="grid-2">
              <Field label="Pathway">
                <Select
                  value={pathway}
                  onChange={(e) => {
                    setPathway(e.target.value);
                    setDivision("All divisions");
                  }}
                >
                  {PATHWAYS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="NCAA division">
                <Select value={division} onChange={(e) => setDivision(e.target.value)} disabled={pathway === "U Sports"}>
                  {DIVISIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        {error ? <Notice tone="warn">{error}</Notice> : null}

        {loading ? (
          <Card>
            <p className="muted">Searching the school directory…</p>
          </Card>
        ) : results.length === 0 ? (
          <Empty title="No schools match those filters">
            <p>Try a broader search term or reset the pathway and division filters.</p>
          </Empty>
        ) : (
          <>
            <p className="eyebrow">
              {total} school{total === 1 ? "" : "s"} found{total > results.length ? ` · showing first ${results.length}` : ""}
            </p>
            <div className="grid-2">
              {results.map((s) => {
                const { fit } = compareToAverage(athlete, s.roster_average);
                const isSaved = savedSet.has(s.id);
                return (
                  <Card key={s.id}>
                    <div className="stack" style={{ gap: 12 }}>
                      <div className="between">
                        <h2 className="h3">{s.name}</h2>
                        {fit ? <Badge tone={fitTone(fit)}>{fit}</Badge> : <Badge tone="muted">Not verified</Badge>}
                      </div>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <span className="muted" style={{ fontSize: 13 }}>{locationLine(s)}</span>
                        <Badge tone="muted">{s.pathway}</Badge>
                        {s.pathway === "NCAA" ? <Badge tone="muted">{s.division}</Badge> : null}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <small className="faint">Your result</small>
                          <div className="h3">{formatPerformance(athlete)}</div>
                        </div>
                        <div>
                          <small className="faint">{rosterLabel}</small>
                          <div className="h3">
                            {s.roster_average === null ? "Not verified" : `${s.roster_average.toFixed(2)} ${unit}`}
                          </div>
                        </div>
                      </div>

                      {s.conference ? <span className="faint" style={{ fontSize: 12 }}>{s.conference}</span> : null}

                      {s.roster_average !== null ? (
                        <p className="faint" style={{ fontSize: 12 }}>
                          Reviewed {s.reviewed_at} ·{" "}
                          <a className="link" href={s.source_url} target="_blank" rel="noreferrer">
                            {s.source_label}
                          </a>
                        </p>
                      ) : null}

                      <div className="row" style={{ gap: 8 }}>
                        <Button
                          variant={isSaved ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => toggleSave(s.id)}
                          disabled={savedLoading}
                          aria-pressed={isSaved}
                        >
                          {isSaved ? "Saved" : "Save"}
                        </Button>
                        <Link className="btn btn-ghost btn-sm" href={`/school/${s.id}`}>
                          View details
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
