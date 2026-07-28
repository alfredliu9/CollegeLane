import Link from "next/link";

// Placeholder landing — replaced during the UI redesign pass.
export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", textAlign: "center" }}>
      <div style={{ display: "grid", gap: "18px", justifyItems: "center", maxWidth: "560px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: "140px", height: "auto" }} />
        <h1 style={{ fontSize: "40px", letterSpacing: "-1.5px", margin: 0 }}>CollegeLane</h1>
        <p style={{ margin: 0 }}>
          Educational recruiting guidance for Canadian high-school track-and-field athletes exploring NCAA and U SPORTS
          programs.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/signup" style={{ padding: "12px 20px", background: "#163d31", color: "#fff", borderRadius: "6px", fontWeight: 700 }}>
            Get started
          </Link>
          <Link href="/login" style={{ padding: "12px 20px", border: "1px solid #163d31", color: "#163d31", borderRadius: "6px", fontWeight: 700 }}>
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
