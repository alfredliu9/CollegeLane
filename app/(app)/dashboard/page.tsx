"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, PageHead, Progress, Stat } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { assess, collegeRating, emptyAthlete, formatPerformance, profileCompletion } from "@/lib/recruiting";
import { useDisplayName } from "@/lib/use-display-name";

/* Signed-in home. Reads the saved athlete profile and surfaces an educational
   snapshot: assessment summary, profile completion, suggested next actions, and
   saved schools. All persistence is read-only here and flows through
   useAccountState. */

type SavedSchool = {
  id: string;
  name: string;
  city: string;
  region: string;
  pathway: string;
  division: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Stars({ count }: { count: number }) {
  return (
    <span aria-label={`${count} out of 5 stars`} style={{ color: "var(--brand)", letterSpacing: 2, fontSize: 18 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ opacity: i <= count ? 1 : 0.22 }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function DashboardPage() {
  const { data: profile, loading } = useAccountState("cl-athlete", emptyAthlete);
  const { data: savedIds } = useAccountState<string[]>("cl-schools", []);
  const displayName = useDisplayName();

  const [schools, setSchools] = useState<SavedSchool[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  const key = savedIds.join(",");
  useEffect(() => {
    let alive = true;
    if (!savedIds.length) {
      setSchools([]);
      setSchoolsLoading(false);
      return () => {
        alive = false;
      };
    }
    setSchoolsLoading(true);
    Promise.all(
      savedIds.map((id) =>
        fetch(`/api/schools?id=${encodeURIComponent(id)}`)
          .then((res) => (res.ok ? res.json() : { schools: [] }))
          .catch(() => ({ schools: [] })),
      ),
    )
      .then((results) => {
        if (alive) setSchools(results.flatMap((result) => (result.schools?.slice(0, 1) ?? []) as SavedSchool[]));
      })
      .finally(() => {
        if (alive) setSchoolsLoading(false);
      });
    return () => {
      alive = false;
    };
    // key captures the saved-id list; effect re-runs when saved schools change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (loading) {
    return (
      <div className="page">
        <PageHead eyebrow="Athlete hub" title="Loading your dashboard…" />
        <Card>
          <p className="muted">Fetching your saved profile and recruiting progress.</p>
        </Card>
      </div>
    );
  }

  const rating = collegeRating(profile);
  const shortLabel = rating.label.split(" · ")[0];
  const assessment = assess(profile);
  const completion = profileCompletion(profile);
  // A profile is only "ready" once the athlete has actually set it up. Until
  // then we never greet with "Welcome back" or surface computed marks/ratings,
  // which would otherwise render as fake data for a brand-new account.
  const profileReady = Boolean(profile.gender) && Boolean(profile.event) && profile.performance > 0;

  const actions = [
    completion < 100
      ? { title: "Finish your athlete profile", copy: "Add the results and academics coaches look for.", href: "/profile", cta: "Edit profile" }
      : { title: "Review recommended programs", copy: "See schools matched to your profile and preferences.", href: "/recommended", cta: "View matches" },
    { title: "Build a balanced school list", copy: "Compare rosters and save reach, target, and fit programs.", href: "/schools", cta: "Explore schools" },
    { title: "Prepare coach outreach", copy: "Draft a tailored first email using your saved results.", href: "/email-builder", cta: "Open email builder" },
  ];

  return (
    <div className="page">
      <PageHead eyebrow="Athlete hub" title={`Welcome${profileReady ? " back" : ""}${displayName ? `, ${displayName}` : ""}.`}>
        <p>
          A snapshot of where your track-and-field profile stands today. Everything here is educational research context, not a
          recruiting guarantee.
        </p>
      </PageHead>

      {!profileReady ? (
        <div style={{ marginBottom: 18 }}>
          <Card>
            <div className="between">
              <div>
                <p className="h3">Finish setting up your profile</p>
                <p className="muted" style={{ marginTop: 4 }}>
                  Add your competition gender and primary event so your assessment and school comparisons are accurate.
                </p>
              </div>
              <Link href="/onboarding">
                <Button>Complete setup</Button>
              </Link>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="grid-sidebar">
        <div className="stack">
          <Card lg>
            <div className="between" style={{ marginBottom: 14 }}>
              <span className="eyebrow">Current assessment</span>
              <Link href="/assessment" className="link">
                View full assessment
              </Link>
            </div>
            <div className="row wrap" style={{ alignItems: "flex-end", gap: 18 }}>
              <div className="big-number">{profileReady ? rating.rating : "—"}</div>
              <div className="stack" style={{ gap: 6, paddingBottom: 6 }}>
                <Stars count={profileReady ? rating.stars : 0} />
                <Badge>{profileReady ? shortLabel : "Not assessed yet"}</Badge>
              </div>
            </div>
            <p className="h3" style={{ marginTop: 16 }}>
              {profileReady ? assessment.headline : "Complete your profile to see your assessment"}
            </p>
            <p className="muted" style={{ marginTop: 6 }}>
              {profileReady
                ? `${rating.pathway.charAt(0).toUpperCase()}${rating.pathway.slice(1)}.`
                : "Add your competition gender, primary event, and best result to generate an educational assessment."}
            </p>
            <div className="stats" style={{ marginTop: 18 }}>
              <Stat value={profileReady ? profile.event : "Not set"} label="Primary event" />
              <Stat value={profile.performance > 0 ? formatPerformance(profile) : "—"} label="Personal best" />
              <Stat value={profile.gender || "Not set"} label="Competition gender" />
            </div>
          </Card>

          <Card>
            <div style={{ marginBottom: 14 }}>
              <span className="eyebrow">Suggested next actions</span>
            </div>
            <div className="stack">
              {actions.map((action, i) => (
                <Link key={action.href + i} href={action.href}>
                  <div className="between" style={{ gap: 12 }}>
                    <div>
                      <p className="h3">
                        {i + 1}. {action.title}
                      </p>
                      <p className="muted" style={{ marginTop: 2 }}>
                        {action.copy}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm">
                      {action.cta}
                    </Button>
                  </div>
                  {i < actions.length - 1 ? <hr className="divider" /> : null}
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card>
            <div className="between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Profile completion</span>
              <b>{completion}%</b>
            </div>
            <Progress value={completion} />
            <p className="h3" style={{ marginTop: 14 }}>
              {completion === 100 ? "Ready for focused outreach" : "Complete the details coaches need"}
            </p>
            <p className="muted" style={{ marginTop: 4, marginBottom: 14 }}>
              Your saved profile stays available across sessions.
            </p>
            <Link href="/profile">
              <Button variant="secondary" block>
                Edit profile
              </Button>
            </Link>
          </Card>

          <Card>
            <div className="between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Saved schools</span>
              <Link href="/schools" className="link">
                Explore all
              </Link>
            </div>
            {schoolsLoading ? (
              <p className="muted">Loading your saved schools…</p>
            ) : schools.length ? (
              <div className="stack" style={{ gap: 10 }}>
                {schools.map((school) => (
                  <Link key={school.id} href={`/school/${school.id}`}>
                    <div className="row" style={{ gap: 12 }}>
                      <span
                        aria-hidden
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 40,
                          height: 40,
                          borderRadius: "var(--radius-sm)",
                          background: "var(--brand-soft)",
                          color: "var(--brand-ink)",
                          fontWeight: 800,
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {initials(school.name)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <p className="h3" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {school.name}
                        </p>
                        <p className="muted" style={{ fontSize: 12 }}>
                          {[school.city, school.region].filter(Boolean).join(", ")}
                          {school.pathway ? ` · ${school.pathway}` : ""}
                          {school.pathway === "NCAA" && school.division ? ` ${school.division}` : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty title="No schools saved yet">
                <p style={{ marginBottom: 14 }}>Save programs while researching and they will appear here automatically.</p>
                <Link href="/schools">
                  <Button variant="secondary" size="sm">
                    Browse schools
                  </Button>
                </Link>
              </Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
