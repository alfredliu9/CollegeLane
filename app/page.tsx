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
    body: "Add your event, personal best, and the context around it — season, wind, and meet.",
  },
  {
    n: "02",
    title: "Understand your potential",
    body: "See how your mark may align with collegiate performance levels through an educational assessment.",
  },
  {
    n: "03",
    title: "Take action",
    body: "Build a researched school list and prepare confident, well-informed outreach to coaches.",
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
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          className="page"
          style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <Link href="/" className="row" style={{ gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 132, height: "auto" }} />
          </Link>
          <nav className="row" style={{ gap: 6 }}>
            <Link href="#how" className="btn btn-ghost btn-sm">
              How it works
            </Link>
            <Link href="/disclaimer" className="btn btn-ghost btn-sm">
              Guidance &amp; safety
            </Link>
            <Link href="/login" className="btn btn-secondary btn-sm">
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
        <section
          style={{
            background: "linear-gradient(180deg, var(--brand-soft) 0%, var(--bg) 100%)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="page" style={{ padding: "72px 20px 80px", textAlign: "center" }}>
            <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 22, justifyItems: "center" }}>
              <Badge tone="accent">Built for Canadian track &amp; field athletes</Badge>
              <h1 className="h1" style={{ maxWidth: 640 }}>
                Your performance deserves to be seen.
              </h1>
              <p className="muted" style={{ fontSize: 18, maxWidth: 600 }}>
                CollegeLane helps Canadian high-school track-and-field athletes understand their collegiate potential,
                explore realistic recruiting pathways, and confidently reach out to college coaches.
              </p>
              <div className="row wrap" style={{ justifyContent: "center", marginTop: 4 }}>
                <Link href="/signup" className="btn btn-primary">
                  Assess my recruiting level →
                </Link>
                <Link href="#how" className="btn btn-secondary">
                  Learn how recruiting works
                </Link>
              </div>
              <small className="faint">No promises. No pressure. Just a clearer path forward.</small>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="page" style={{ padding: "72px 20px" }}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 40px" }}>
            <span className="eyebrow">Your recruiting lane</span>
            <h2 className="h1" style={{ fontSize: "clamp(24px, 3.2vw, 34px)", margin: "10px 0 8px" }}>
              Three steps. One clear direction.
            </h2>
            <p className="muted">
              Recruiting can feel like a maze. CollegeLane turns it into a practical, informed plan you can act on.
            </p>
          </div>
          <div className="grid-3">
            {STEPS.map((s) => (
              <Card key={s.n} lg>
                <span className="eyebrow">{s.n}</span>
                <h3 className="h2" style={{ margin: "12px 0 8px" }}>
                  {s.title}
                </h3>
                <p className="muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* NCAA vs U SPORTS */}
        <section style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="page" style={{ padding: "72px 20px" }}>
            <div className="grid-sidebar" style={{ alignItems: "center" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <span className="eyebrow">Two systems, one starting point</span>
                <h2 className="h1" style={{ fontSize: "clamp(24px, 3.2vw, 34px)" }}>
                  Explore NCAA and U SPORTS pathways.
                </h2>
                <p className="muted" style={{ maxWidth: 520 }}>
                  Learn how divisions, eligibility, scholarships, admissions, and timelines differ across the two
                  systems — then confirm the details through official sources before you decide.
                </p>
                <div>
                  <Link href="/signup" className="btn btn-primary">
                    Start your assessment
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
        <section className="page" style={{ padding: "48px 20px 8px" }}>
          <Notice>
            CollegeLane is an educational tool. Assessments are estimates and do not guarantee recruitment, admission,
            roster placement, or scholarships.
          </Notice>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--line)", marginTop: 48 }}>
        <div
          className="page"
          style={{ padding: "32px 20px", display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
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
