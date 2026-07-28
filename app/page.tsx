import Link from "next/link";
import { Badge, Card, Notice } from "@/components/ui";

// Public marketing landing page. No personal / signed-in data here.
export const metadata = {
  title: "CollegeLane | Your path to collegiate athletics",
  description:
    "Educational recruiting guidance for Canadian high-school track-and-field athletes exploring NCAA and U SPORTS programs.",
};

const STEPS = [
  {
    n: "01",
    title: "Enter your results",
    body: "Add your event, personal best, and the details behind it, like season, wind, and meet.",
  },
  {
    n: "02",
    title: "Understand your potential",
    body: "See how your mark may align with collegiate performance levels through an educational assessment.",
  },
  {
    n: "03",
    title: "Take action",
    body: "Build a school list based on real research and get ready to reach out to coaches.",
  },
];

const PATHWAYS = [
  {
    tag: "United States",
    name: "NCAA",
    body: "Three divisions, each with distinct athletics and financial-aid models, eligibility timelines, and admissions expectations.",
  },
  {
    tag: "Canada",
    name: "U SPORTS",
    body: "Canadian university competition shaped by conference and institution policies, with its own scholarship and eligibility rules.",
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Scoped styles: responsive header + a few landing-only touches.
          Kept here so globals.css / shared primitives stay untouched. */}
      <style>{`
        .cl-header {
          position: sticky; top: 0; z-index: 30;
          background: color-mix(in srgb, var(--surface) 86%, transparent);
          -webkit-backdrop-filter: saturate(180%) blur(10px);
          backdrop-filter: saturate(180%) blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .cl-header-inner {
          max-width: 1120px; margin: 0 auto; width: 100%;
          padding: 14px 20px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .cl-brand { display: inline-flex; align-items: center; }
        .cl-brand img { width: 130px; height: auto; }
        .cl-nav { display: flex; align-items: center; gap: 6px; }
        .cl-nav-sep {
          width: 1px; height: 22px; background: var(--line); margin: 0 6px;
        }
        .cl-hero-band {
          background: linear-gradient(180deg, var(--brand-soft) 0%, var(--bg) 100%);
          border-bottom: 1px solid var(--line);
        }
        .cl-hero-inner {
          max-width: 1120px; margin: 0 auto; width: 100%;
          padding: 84px 20px 92px; text-align: center;
        }
        .cl-hero-stack {
          max-width: 720px; margin: 0 auto;
          display: grid; gap: 22px; justify-items: center;
        }
        .cl-hero-trust {
          display: flex; flex-wrap: wrap; gap: 8px 22px;
          justify-content: center; margin-top: 6px;
        }
        .cl-hero-trust span {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; color: var(--muted); font-weight: 600;
        }
        .cl-hero-trust span::before {
          content: ""; width: 6px; height: 6px; border-radius: 999px;
          background: var(--brand); display: inline-block;
        }
        .cl-step-n {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 999px;
          background: var(--brand-soft); color: var(--brand-ink);
          font-weight: 800; font-size: 14px; letter-spacing: 0.02em;
          margin-bottom: 14px;
        }
        /* Tablet: drop the lower-priority text links, keep the CTAs. */
        @media (max-width: 720px) {
          .cl-nav-collapse { display: none; }
          .cl-nav-sep { display: none; }
        }
        /* Phone: keep only the primary CTA so the bar never overflows. */
        @media (max-width: 460px) {
          .cl-nav-login { display: none; }
          .cl-header-inner { padding: 12px 16px; }
          .cl-brand img { width: 116px; }
          .cl-hero-inner { padding: 60px 16px 68px; }
        }
      `}</style>

      {/* Header */}
      <header className="cl-header">
        <div className="cl-header-inner">
          <Link href="/" className="cl-brand" aria-label="CollegeLane home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/collegelane-logo.png" alt="CollegeLane" />
          </Link>
          <nav className="cl-nav">
            <Link href="#how" className="btn btn-ghost btn-sm cl-nav-collapse">
              How it works
            </Link>
            <Link href="/disclaimer" className="btn btn-ghost btn-sm cl-nav-collapse">
              Guidance
            </Link>
            <span className="cl-nav-sep" aria-hidden="true" />
            <Link href="/login" className="btn btn-secondary btn-sm cl-nav-login">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section className="cl-hero-band">
          <div className="cl-hero-inner">
            <div className="cl-hero-stack">
              <Badge tone="accent">Built for Canadian track &amp; field athletes</Badge>
              <h1 className="h1" style={{ maxWidth: 640 }}>
                Your performance deserves to be seen.
              </h1>
              <p className="muted" style={{ fontSize: 18, maxWidth: 600 }}>
                CollegeLane helps Canadian high-school track-and-field athletes see where they stand, explore realistic
                recruiting pathways, and reach out to college coaches.
              </p>
              <div className="row wrap" style={{ justifyContent: "center", marginTop: 4 }}>
                <Link href="/signup" className="btn btn-primary">
                  Assess my recruiting level →
                </Link>
                <Link href="#how" className="btn btn-secondary">
                  How it works
                </Link>
              </div>
              <div className="cl-hero-trust">
                <span>NCAA &amp; U SPORTS pathways</span>
                <span>Educational, not a guarantee</span>
                <span>No pressure, no spam</span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="page" style={{ padding: "80px 20px" }}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
            <span className="eyebrow">Your recruiting lane</span>
            <h2 className="h1" style={{ fontSize: "clamp(24px, 3.2vw, 34px)", margin: "10px 0 8px" }}>
              Three steps. One clear direction.
            </h2>
            <p className="muted">
              Recruiting can feel like a maze. CollegeLane turns it into a clear plan you can act on.
            </p>
          </div>
          <div className="grid-3">
            {STEPS.map((s) => (
              <Card key={s.n} lg>
                <span className="cl-step-n">{s.n}</span>
                <h3 className="h2" style={{ margin: "0 0 8px" }}>
                  {s.title}
                </h3>
                <p className="muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* NCAA vs U SPORTS */}
        <section style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="page" style={{ padding: "80px 20px" }}>
            <div className="grid-sidebar" style={{ alignItems: "center", gap: 40 }}>
              <div style={{ display: "grid", gap: 16 }}>
                <span className="eyebrow">Two systems, one starting point</span>
                <h2 className="h1" style={{ fontSize: "clamp(24px, 3.2vw, 34px)" }}>
                  Explore NCAA and U SPORTS pathways.
                </h2>
                <p className="muted" style={{ maxWidth: 520 }}>
                  Learn how divisions, eligibility, scholarships, admissions, and timelines differ across the two
                  systems, then confirm the details through official sources before you decide.
                </p>
                <div style={{ marginTop: 4 }}>
                  <Link href="/signup" className="btn btn-primary">
                    Start your assessment →
                  </Link>
                </div>
              </div>
              <div className="stack">
                {PATHWAYS.map((p) => (
                  <Card key={p.name}>
                    <div className="between" style={{ marginBottom: 6 }}>
                      <span className="h2">{p.name}</span>
                      <Badge tone="muted">{p.tag}</Badge>
                    </div>
                    <p className="muted">{p.body}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Educational reminder */}
        <section className="page" style={{ padding: "56px 20px 8px" }}>
          <Notice>
            CollegeLane is an educational tool. Assessments are estimates and do not guarantee recruitment, admission,
            roster placement, or scholarships.
          </Notice>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", marginTop: 56 }}>
        <div
          className="page"
          style={{ padding: "36px 20px", display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div className="row" style={{ gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 116, height: "auto" }} />
            <span className="faint" style={{ fontSize: 13 }}>
              Built for the next step, not the final verdict.
            </span>
          </div>
          <Link href="/disclaimer" className="link">
            Disclaimer
          </Link>
        </div>
      </footer>
    </div>
  );
}
