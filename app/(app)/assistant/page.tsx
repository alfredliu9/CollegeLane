"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Notice, PageHead } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { emptyAthlete, type AthleteProfile } from "@/lib/recruiting";

type Message = { who: "you" | "bot"; text: string };

const STARTERS = [
  "Am I good enough to compete in college?",
  "When should I start contacting coaches?",
  "What should I include in my first email?",
  "What is the difference between NCAA and U SPORTS?",
  "How do I build a balanced school list?",
];

export default function AssistantPage() {
  const { data: athlete } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const greeting: Message = {
    who: "bot",
    text: `Hi ${athlete.name || "there"} — I can use your saved ${athlete.event.toLowerCase()} profile to help with school lists, coach outreach, recruiting timelines, and NCAA vs. U SPORTS pathways. What would you like to work on?`,
  };
  const { data: messages, save: saveMessages } = useAccountState<Message[]>("cl-chat", [greeting]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(raw?: string) {
    const question = (raw ?? text).trim();
    if (!question) {
      setError("Enter a recruiting question first.");
      return;
    }
    if (loading) return;

    const next: Message[] = [...messages, { who: "you", text: question }];
    saveMessages(next);
    setText("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        if (res.status === 503) setNotConfigured(true);
        throw new Error(data.error || "The assistant could not answer right now. Please try again.");
      }
      setNotConfigured(false);
      saveMessages([...next, { who: "bot", text: data.reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "The assistant is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    saveMessages([greeting]);
    setError("");
    setNotConfigured(false);
  }

  return (
    <div className="page">
      <PageHead eyebrow="Recruiting assistant" title="Assistant">
        <p>
          Ask about NCAA and U SPORTS recruiting. The assistant draws on your saved athlete profile and checks official sources for
          time-sensitive rules.
        </p>
      </PageHead>

      <div className="grid-2">
        <Card>
          <div className="stack">
            {notConfigured && (
              <Notice tone="warn">
                The AI assistant is not configured yet. You can keep exploring the app, and answers will appear here once it is
                available.
              </Notice>
            )}

            <div
              ref={scrollRef}
              aria-live="polite"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: 460,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.who === "you" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      background: m.who === "you" ? "var(--brand)" : "var(--surface-2)",
                      color: m.who === "you" ? "#fff" : "var(--ink)",
                      borderBottomRightRadius: m.who === "you" ? "var(--radius-sm)" : "var(--radius)",
                      borderBottomLeftRadius: m.who === "bot" ? "var(--radius-sm)" : "var(--radius)",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      background: "var(--surface-2)",
                      color: "var(--muted)",
                    }}
                  >
                    Thinking about your {athlete.event.toLowerCase()} profile…
                  </div>
                </div>
              )}
            </div>

            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask anything about NCAA or U SPORTS recruiting…"
                aria-label="Message"
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Working…" : "Send"}
              </Button>
            </form>

            {error && <Notice tone="warn">{error}</Notice>}

            <div className="between">
              <p className="hint">
                Optional AI tool. Verify time-sensitive eligibility, contact-period, and scholarship rules with official NCAA, U
                SPORTS, conference, and university sources.
              </p>
              {messages.length > 1 && (
                <Button variant="ghost" size="sm" onClick={clearConversation}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="stack">
            <h3 className="h3">Try asking</h3>
            <div className="stack" style={{ gap: 8 }}>
              {STARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={loading}
                  className="between"
                  style={{
                    textAlign: "left",
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <span>{q}</span>
                  <span className="faint">›</span>
                </button>
              ))}
            </div>
            <Notice>
              CollegeLane does not guarantee recruitment, admission, roster placement, or scholarships. This assistant offers
              educational guidance only.
            </Notice>
          </div>
        </Card>
      </div>
    </div>
  );
}
