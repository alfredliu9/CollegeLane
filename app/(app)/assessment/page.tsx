"use client";

import Link from "next/link";
import { Badge, Button, Card, Notice, PageHead } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { assess, collegeRating, defaultAthlete, formatPerformance, unitFor } from "@/lib/recruiting";

/* Full educational assessment. Reads the saved athlete profile and renders
   CollegeLane's own broad rating model: a headline rating with stars, a
   spectrum from the entry (lower-edge) mark to the national-level mark with the
   athlete positioned along it, and the narrative explanation plus next steps.
   The rating is calibrated so strong marks are not treated as elite. */

const BAND_LABELS = ["Emerging", "Developing", "Collegiate range", "Competitive", "National-level"];

function Stars({ count }: { count: number }) {
  return (
    <span aria-label={`${count} out of 5 stars`} style={{ color: "var(--brand)", letterSpacing: 3, fontSize: 22 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ opacity: i <= count ? 1 : 0.22 }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function AssessmentPage() {
  const { data: profile, loading } = useAccountState("cl-athlete", defaultAthlete);

  if (loading) {
    return (
      <div className="page">
        <PageHead eyebrow="Collegiate rating" title="Loading your assessment…" />
        <Card>
          <p className="muted">Reading your saved performance details.</p>
        </Card>
      </div>
    );
  }

  const rating = collegeRating(profile);
  const shortLabel = rating.label.split(" · ")[0];
  const assessment = assess(profile);
  const unit = unitFor(profile.event);
  // Marker sits at the calibrated rating (35–100) so a strong-but-not-national
  // mark rests below the elite end rather than at it.
  const position = Math.max(4, Math.min(96, rating.rating));

  return (
    <div className="page">
      <PageHead eyebrow="Collegiate rating" title="Your educational assessment">
        <p>
          A broad research signal built from your saved {profile.event.toLowerCase()} result. It helps you ask better questions —
          it is not an offer, a threshold, or a recruiting decision.
        </p>
      </PageHead>

      <Notice>
        This is CollegeLane&apos;s own broad educational model. It compares your mark with an event- and gender-specific spectrum
        and does not represent any program&apos;s recruiting threshold or offer.
      </Notice>

      <div className="stack" style={{ marginTop: 18 }}>
        <Card lg>
          <div className="between" style={{ alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <span className="eyebrow">CollegeLane rating</span>
              <div className="row wrap" style={{ alignItems: "flex-end", gap: 18, marginTop: 8 }}>
                <div className="big-number">{rating.rating}</div>
                <div className="stack" style={{ gap: 8, paddingBottom: 6 }}>
                  <Stars count={rating.stars} />
                  <Badge>{shortLabel}</Badge>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="muted" style={{ fontSize: 12 }}>
                Your {profile.event.toLowerCase()} best
              </p>
              <p className="h2">{formatPerformance(profile)}</p>
            </div>
          </div>

          <p className="muted" style={{ marginBottom: 22 }}>
            {rating.pathway.charAt(0).toUpperCase() + rating.pathway.slice(1)}.
          </p>

          {/* Spectrum: entry (lower edge) → national-level, athlete positioned. */}
          <div style={{ position: "relative", padding: "26px 0 4px" }}>
            <div style={{ position: "absolute", top: 0, left: `${position}%`, transform: "translateX(-50%)" }}>
              <span
                style={{
                  display: "inline-block",
                  background: "var(--brand)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                }}
              >
                You · {rating.rating}
              </span>
            </div>
            <div className="bar" style={{ height: 10, position: "relative", overflow: "visible" }}>
              <i style={{ width: `${position}%` }} />
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${position}%`,
                  transform: "translate(-50%, -50%)",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "3px solid var(--brand)",
                  boxShadow: "var(--shadow-sm)",
                }}
              />
            </div>
            <div className="between" style={{ marginTop: 8 }}>
              <div>
                <p className="h3" style={{ fontSize: 14 }}>
                  {rating.entry.toFixed(2)} {unit}
                </p>
                <p className="faint" style={{ fontSize: 11 }}>
                  Entry · lower edge
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="h3" style={{ fontSize: 14 }}>
                  {rating.elite.toFixed(2)} {unit}
                </p>
                <p className="faint" style={{ fontSize: 11 }}>
                  National-level
                </p>
              </div>
            </div>
          </div>

          <div className="row wrap" style={{ gap: 8, marginTop: 20 }}>
            {BAND_LABELS.map((band, i) => (
              <span key={band}>
                {i === rating.index ? <Badge tone="accent">{band}</Badge> : <Badge tone="muted">{band}</Badge>}
              </span>
            ))}
          </div>
        </Card>

        <div className="grid-sidebar">
          <Card>
            <span className="eyebrow">What your result suggests</span>
            <p style={{ marginTop: 12 }}>{assessment.explanation}</p>
            <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
              Roster needs, academics, verified results, and your recruiting year all shape real outcomes. Treat this rating as a
              starting point for research, never a guarantee.
            </p>
          </Card>

          <Card>
            <span className="eyebrow">Suggested next steps</span>
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              {assessment.nextSteps.map((step, i) => (
                <div key={step} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--brand-soft)",
                      color: "var(--brand-ink)",
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p style={{ fontSize: 14 }}>{step}</p>
                </div>
              ))}
            </div>
            <hr className="divider" />
            <div className="row wrap" style={{ gap: 10 }}>
              <Link href="/profile">
                <Button variant="secondary" size="sm">
                  Update profile
                </Button>
              </Link>
              <Link href="/schools">
                <Button variant="secondary" size="sm">
                  Compare schools
                </Button>
              </Link>
              <Link href="/email-builder">
                <Button variant="secondary" size="sm">
                  Draft coach email
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
