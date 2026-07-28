import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = {
  title: "Disclaimer | CollegeLane",
  description:
    "CollegeLane is an educational tool. Assessments are estimates and do not guarantee recruitment, admission, roster placement, or scholarships.",
};

const POINTS = [
  {
    title: "Assessments are estimates",
    body: "Every rating and comparison is an educational estimate. It may not reflect a program's current roster needs, recruiting priorities, or decisions in any given year.",
  },
  {
    title: "Many factors shape outcomes",
    body: "Recruiting results vary widely by school, conference, admissions standards, roster needs, coaching changes, and the year you apply. No single number can capture all of them.",
  },
  {
    title: "No outcomes are guaranteed",
    body: "CollegeLane does not guarantee recruitment, admission, roster placement, or scholarships. It is designed to help you ask better questions and take informed next steps.",
  },
  {
    title: "Confirm official rules",
    body: "Always verify eligibility, timelines, and policies through official NCAA, U SPORTS, conference, and individual university sources before making decisions.",
  },
  {
    title: "Verify data before you rely on it",
    body: "Performance benchmarks and program details are research signals, not verified records. Confirm current event sponsorship and requirements directly with each school.",
  },
];

export default function DisclaimerPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 132, height: "auto" }} />
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <div className="page" style={{ maxWidth: 760, padding: "56px 20px 80px" }}>
          <header style={{ marginBottom: 36 }}>
            <span className="eyebrow">Important guidance</span>
            <h1 className="h1" style={{ margin: "12px 0 12px" }}>
              Educational, not a recruiting guarantee.
            </h1>
            <p className="muted" style={{ fontSize: 18, maxWidth: 620 }}>
              CollegeLane helps student-athletes understand their options and take informed next steps. It is a research
              and learning tool — not a promise about any recruiting outcome.
            </p>
          </header>

          <div className="stack" style={{ gap: 14 }}>
            {POINTS.map((p, i) => (
              <Card key={p.title}>
                <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
                  <span
                    className="eyebrow"
                    style={{ fontSize: 15, minWidth: 32, lineHeight: 1.6 }}
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="h3" style={{ marginBottom: 6 }}>
                      {p.title}
                    </h2>
                    <p className="muted">{p.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ marginTop: 36 }}>
            <Link href="/" className="btn btn-secondary">
              ← Return home
            </Link>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div
          className="page"
          style={{ padding: "28px 20px", display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 116, height: "auto" }} />
          <span className="faint" style={{ fontSize: 13 }}>
            Confirm all rules through official NCAA and U SPORTS sources.
          </span>
        </div>
      </footer>
    </div>
  );
}
