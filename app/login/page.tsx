"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const redirectTo = `${location.origin}/auth/callback${
        next ? `?next=${encodeURIComponent(safeNext)}` : ""
      }`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
      setGoogleLoading(false);
    }
  }

  const banner = error || urlError;

  return (
    <Card lg>
      <div style={{ marginBottom: 20 }}>
        <span className="eyebrow">Your next best start</span>
        <h1 className="h2" style={{ marginTop: 8 }}>
          Welcome back to your lane.
        </h1>
        <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
          See where you stand, research programs, and plan your next move.
        </p>
      </div>

      {banner ? (
        <div style={{ marginBottom: 16 }}>
          <Notice tone="warn">{banner}</Notice>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        block
        onClick={handleGoogle}
        disabled={googleLoading || loading}
      >
        <GoogleIcon />
        {googleLoading ? "Connecting…" : "Continue with Google"}
      </Button>

      <div className="row" style={{ margin: "18px 0", gap: 12 }}>
        <hr className="divider" style={{ flex: 1, margin: 0 }} />
        <span className="faint" style={{ fontSize: 12 }}>
          or use email
        </span>
        <hr className="divider" style={{ flex: 1, margin: 0 }} />
      </div>

      <form onSubmit={handleSubmit}>
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@example.ca"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" block disabled={loading || googleLoading}>
          {loading ? "Please wait…" : "Log in →"}
        </Button>
      </form>

      <p className="muted" style={{ marginTop: 18, fontSize: 14, textAlign: "center" }}>
        New here?{" "}
        <Link href="/signup" className="link">
          Create an account
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "40px 20px",
        background: "linear-gradient(180deg, var(--brand-soft) 0%, var(--bg) 40%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 20, justifyItems: "center" }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collegelane-logo.png" alt="CollegeLane" style={{ width: 140, height: "auto" }} />
        </Link>
        <div style={{ width: "100%" }}>
          <Suspense fallback={<Card lg>Loading…</Card>}>
            <LoginForm />
          </Suspense>
        </div>
        <Link href="/" className="faint" style={{ fontSize: 13 }}>
          ← Back home
        </Link>
      </div>
    </main>
  );
}
