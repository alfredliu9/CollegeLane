"use client";

import { useState } from "react";
import Link from "next/link";
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

const NEXT_PATH = "/onboarding";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  function emailRedirectTo() {
    return `${location.origin}/auth/callback?next=${encodeURIComponent(NEXT_PATH)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: emailRedirectTo() },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setAwaitingConfirm(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setResent(false);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: emailRedirectTo() },
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setResent(true);
    } catch {
      setError("The confirmation email could not be sent. Please try again in a moment.");
    } finally {
      setResending(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: emailRedirectTo() },
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
          {awaitingConfirm ? (
            <Card lg>
              <span className="eyebrow">Almost there</span>
              <h1 className="h2" style={{ margin: "8px 0 8px" }}>
                Check your email
              </h1>
              <p className="muted" style={{ fontSize: 14 }}>
                We sent a confirmation link to <b style={{ color: "var(--ink)" }}>{email}</b>. Open it to finish
                creating your account. Be sure to check your spam folder if it does not arrive.
              </p>

              {resent ? (
                <div style={{ marginTop: 16 }}>
                  <Notice>Your confirmation email was sent again. Check your inbox and spam folder.</Notice>
                </div>
              ) : null}
              {error ? (
                <div style={{ marginTop: 16 }}>
                  <Notice tone="warn">{error}</Notice>
                </div>
              ) : null}

              <div className="stack" style={{ marginTop: 20 }}>
                <Button type="button" variant="secondary" block onClick={handleResend} disabled={resending}>
                  {resending ? "Sending…" : "Resend confirmation email"}
                </Button>
                <Link href="/login" className="btn btn-ghost btn-block">
                  Return to login
                </Link>
              </div>
              <p className="hint" style={{ marginTop: 12, textAlign: "center" }}>
                For security, a new email can only be sent every 50–60 seconds.
              </p>
            </Card>
          ) : (
            <Card lg>
              <div style={{ marginBottom: 20 }}>
                <span className="eyebrow">Your next best start</span>
                <h1 className="h2" style={{ marginTop: 8 }}>
                  Build your recruiting path.
                </h1>
                <p className="muted" style={{ marginTop: 4, fontSize: 14 }}>
                  Understand your potential. Research programs. Move with purpose.
                </p>
              </div>

              {error ? (
                <div style={{ marginBottom: 16 }}>
                  <Notice tone="warn">{error}</Notice>
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
                <Field label="Password" hint="At least 8 characters.">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="Confirm password">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <label className="check" style={{ marginBottom: 16, fontSize: 13 }}>
                  <input type="checkbox" required />
                  <span>
                    I acknowledge the{" "}
                    <Link href="/disclaimer" className="link">
                      educational disclaimer
                    </Link>
                    .
                  </span>
                </label>
                <Button type="submit" block disabled={loading || googleLoading}>
                  {loading ? "Please wait…" : "Create account →"}
                </Button>
              </form>

              <p className="muted" style={{ marginTop: 18, fontSize: 14, textAlign: "center" }}>
                Already registered?{" "}
                <Link href="/login" className="link">
                  Log in
                </Link>
              </p>
            </Card>
          )}
        </div>

        <Link href="/" className="faint" style={{ fontSize: 13 }}>
          ← Back home
        </Link>
      </div>
    </main>
  );
}
