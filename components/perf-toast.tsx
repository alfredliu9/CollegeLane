"use client";

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
}

function formatMark(event: EventName, mark: number) {
  // Mirror formatPerformance()'s "<value> <unit>" shape without needing a full
  // AthleteProfile, so a bare mark can be rendered on its own.
  return `${mark.toFixed(2)} ${unitFor(event)}`;
}

export function PerformanceToast({
  event,
  oldMark,
  newMark,
  oldRating,
  oldStars,
  newRating,
  newStars,
  onClose,
}: PerformanceToastDetails & { onClose: () => void }) {
  const ratingUp = newRating > oldRating;
  const starsUp = newStars > oldStars;
  const showUpgrade = ratingUp || starsUp;
  const faster = isRunningEvent(event); // faster time / farther distance — the improvement is already baked into the marks.

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
        @keyframes cl-perf-toast-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-perf-toast { animation: none; }
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
          <div className="row wrap" style={{ marginTop: 12, gap: 8 }}>
            {ratingUp && (
              <span className="badge">
                Rating {oldRating} → {newRating}
              </span>
            )}
            {starsUp && (
              <span className="badge badge-accent">
                ▲{newStars - oldStars} star{newStars - oldStars > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="divider" />

        <div className="between" style={{ gap: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>Your school matches were updated.</span>
          <Link href="/recommended" onClick={onClose}>
            <Button type="button" size="sm">View matches</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
