"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { isRunningEvent, unitFor, type EventName } from "@/lib/recruiting";

export interface PerformanceToastDetails {
  event: EventName;
  oldMark: number;
  newMark: number;
  oldRating: number;
  oldStars: number;
  newRating: number;
  newStars: number;
  // collegeRating().pathway for the old and new marks, used to detect when a
  // personal best crosses the athlete into a genuinely higher opportunity tier.
  oldPathway: string;
  newPathway: string;
}

function formatMark(event: EventName, mark: number) {
  // Mirror formatPerformance()'s "<value> <unit>" shape without needing a full
  // AthleteProfile, so a bare mark can be rendered on its own.
  return `${mark.toFixed(2)} ${unitFor(event)}`;
}

// Render a 0–5 star meter. Filled stars are highlighted; the rest stay faint so
// the athlete can see both what they earned and what remains.
function Stars({ count, label }: { count: number; label: string }) {
  return (
    <span className="cl-perf-stars" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={n <= count ? "on" : "off"}>
          ★
        </span>
      ))}
    </span>
  );
}

// Fetch up to 3 freshly-recommended school names for the just-saved profile.
// Non-blocking: the hook returns null until (and unless) names arrive, so the
// rest of the toast renders immediately. A 422 (profile not ready) or any other
// error simply leaves the list empty and the section is omitted.
function useNewMatches() {
  const [schools, setSchools] = useState<string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/recommendations?limit=3", { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { recommendations?: Array<{ name?: string }> };
        const names = (data.recommendations ?? [])
          .map((r) => r?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 3);
        if (names.length > 0) setSchools(names);
      } catch {
        // Aborted on unmount, or the fetch failed — omit the school list.
      }
    })();
    return () => controller.abort();
  }, []);

  return schools;
}

export function PerformanceToast({
  event,
  oldMark,
  newMark,
  oldRating,
  oldStars,
  newRating,
  newStars,
  oldPathway,
  newPathway,
  onClose,
}: PerformanceToastDetails & { onClose: () => void }) {
  const ratingUp = newRating > oldRating;
  const starsUp = newStars > oldStars;
  const showUpgrade = ratingUp || starsUp;
  const faster = isRunningEvent(event); // faster time / farther distance — the improvement is already baked into the marks.
  // The toast only ever fires on a genuine improvement, so the rating can only
  // rise; a changed pathway string is therefore always an upgrade to show.
  const pathwayUnlocked = newPathway !== oldPathway;
  const schools = useNewMatches();

  return (
    <>
      <style>{`
        .cl-perf-toast {
          position: fixed;
          top: 16px;
          left: 16px;
          right: 16px;
          margin: 0 auto;
          max-width: 440px;
          z-index: 60;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: var(--surface);
          box-shadow: var(--shadow);
          padding: 18px;
          animation: cl-perf-toast-in 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .cl-perf-toast .cl-perf-mark {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .cl-perf-toast .cl-perf-arrow { color: var(--faint); margin: 0 6px; }
        .cl-perf-toast .cl-perf-new { color: var(--brand); }
        .cl-perf-rating {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding: 12px 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--brand-soft);
        }
        .cl-perf-stars { font-size: 16px; letter-spacing: 1px; line-height: 1; }
        .cl-perf-stars .on { color: var(--brand); }
        .cl-perf-stars .off { color: var(--faint); opacity: 0.5; }
        .cl-perf-rating-nums { font-size: 13px; font-weight: 700; color: var(--muted); }
        .cl-perf-rating-nums .cl-perf-rating-new { color: var(--brand-ink); }
        .cl-perf-unlock {
          margin-top: 12px;
          padding: 12px 14px;
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          background: var(--brand-soft);
        }
        .cl-perf-unlock p { font-size: 13px; color: var(--brand-ink); margin-top: 6px; }
        .cl-perf-schools { margin-top: 14px; display: grid; gap: 6px; }
        .cl-perf-school {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink);
          padding: 8px 12px;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          background: var(--surface);
          animation: cl-perf-fade-in 0.28s ease both;
        }
        @keyframes cl-perf-toast-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cl-perf-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-perf-toast, .cl-perf-school { animation: none; }
        }
      `}</style>
      <div className="cl-perf-toast" role="status" aria-live="polite">
        <div className="between" style={{ marginBottom: 12, alignItems: "flex-start" }}>
          <span className="badge badge-accent">New personal best</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Dismiss notification"
            style={{ margin: -6, padding: 6, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <p className="cl-perf-mark">
          <span>{formatMark(event, oldMark)}</span>
          <span className="cl-perf-arrow" aria-hidden="true">→</span>
          <span className="cl-perf-new">{formatMark(event, newMark)}</span>
        </p>
        <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          {faster ? "New best time" : "New best distance"} in the {event.toLowerCase()}.
        </p>

        {showUpgrade && (
          <div className="cl-perf-rating">
            <Stars count={newStars} label={`${newStars} of 5 college rating stars`} />
            <div className="cl-perf-rating-nums">
              <span>{oldRating}</span>
              <span className="cl-perf-arrow" aria-hidden="true">→</span>
              <span className="cl-perf-rating-new">{newRating}</span>
              {starsUp && (
                <span className="badge badge-accent" style={{ marginLeft: 8 }}>
                  ▲{newStars - oldStars} star{newStars - oldStars > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {pathwayUnlocked && (
          <div className="cl-perf-unlock">
            <span className="badge badge-accent">New opportunity unlocked</span>
            <p>You are now in range for {newPathway}.</p>
          </div>
        )}

        {schools && schools.length > 0 && (
          <div className="cl-perf-schools">
            <span className="eyebrow" style={{ marginBottom: 2 }}>New matches</span>
            {schools.map((name) => (
              <div className="cl-perf-school" key={name}>{name}</div>
            ))}
          </div>
        )}

        <div className="divider" />

        <div className="between" style={{ gap: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>Your school matches were updated.</span>
          <Link href="/recommended" onClick={onClose}>
            <Button type="button" size="sm">View all matches</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
