"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Field, Notice, PageHead, Select, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import type { EventName } from "@/lib/recruiting";

// A saved request to talk with a peer mentor. Persisted per account under
// "cl-call-requests" so the "Your requests" list survives a page reload.
interface CallRequest {
  id: string;
  mentorName: string;
  mentorSchool: string;
  topic: string;
  message: string;
  requestedAt: string;
}

// An illustrative peer mentor. Every profile below is a fictional sample, not a
// real athlete, so nothing here should read as a bookable real person.
interface Mentor {
  id: string;
  name: string;
  school: string;
  event: EventName;
  classYear: "Freshman" | "Sophomore" | "Junior" | "Senior" | "Fifth year";
  blurb: string;
  focus: string[];
}

// Shared focus/topic vocabulary. Kept in one place so the filter, the request
// form, and every mentor's tags all speak the same language.
const FOCUS_OPTIONS = [
  "Recruiting emails",
  "Balancing academics",
  "Choosing a program",
  "Race day nerves",
  "Training load",
  "Walk-on path",
  "Transfer decisions",
  "NCAA eligibility",
] as const;

const EVENT_OPTIONS: EventName[] = ["100 metres", "200 metres", "400 metres", "Long jump", "Triple jump"];

const MENTORS: Mentor[] = [
  {
    id: "m1",
    name: "Maya R.",
    school: "University of Oregon",
    event: "100 metres",
    classYear: "Junior",
    blurb: "Walked on as a freshman and earned a scholarship by year two. Happy to talk through the early doubts.",
    focus: ["Walk-on path", "Recruiting emails", "Race day nerves"],
  },
  {
    id: "m2",
    name: "Devon T.",
    school: "University of Florida",
    event: "400 metres",
    classYear: "Senior",
    blurb: "Engineering major juggling a heavy lab schedule and a full training week. Ask me how I plan it.",
    focus: ["Balancing academics", "Training load"],
  },
  {
    id: "m3",
    name: "Priya S.",
    school: "University of Southern California",
    event: "Long jump",
    classYear: "Sophomore",
    blurb: "Sent a lot of cold emails before one landed. I can share what actually got coaches to reply.",
    focus: ["Recruiting emails", "Choosing a program"],
  },
  {
    id: "m4",
    name: "Marcus L.",
    school: "Louisiana State University",
    event: "200 metres",
    classYear: "Fifth year",
    blurb: "Transferred once and learned a ton about fit. Glad to help you think through the big questions.",
    focus: ["Transfer decisions", "Choosing a program", "NCAA eligibility"],
  },
  {
    id: "m5",
    name: "Ava N.",
    school: "University of Texas",
    event: "Triple jump",
    classYear: "Junior",
    blurb: "Came in as a raw jumper and grew into the lineup. Let's talk about patience and small gains.",
    focus: ["Training load", "Race day nerves"],
  },
  {
    id: "m6",
    name: "Jaylen B.",
    school: "University of Georgia",
    event: "100 metres",
    classYear: "Sophomore",
    blurb: "Managed a tough first semester GPA and bounced back. Ask me about study habits on the road.",
    focus: ["Balancing academics", "NCAA eligibility"],
  },
  {
    id: "m7",
    name: "Sofia G.",
    school: "Stanford University",
    event: "400 metres",
    classYear: "Senior",
    blurb: "Turned down bigger offers for the right academic fit. I can help you weigh what matters to you.",
    focus: ["Choosing a program", "Balancing academics"],
  },
  {
    id: "m8",
    name: "Kofi A.",
    school: "University of Arkansas",
    event: "Long jump",
    classYear: "Junior",
    blurb: "Started as a walk-on and figured out the recruiting timeline the hard way. Save yourself the stress.",
    focus: ["Walk-on path", "Recruiting emails"],
  },
  {
    id: "m9",
    name: "Elena M.",
    school: "University of Washington",
    event: "200 metres",
    classYear: "Freshman",
    blurb: "Just went through the whole recruiting year, so it is all fresh. Happy to compare notes.",
    focus: ["Recruiting emails", "Race day nerves", "Choosing a program"],
  },
  {
    id: "m10",
    name: "Tariq H.",
    school: "Texas A&M University",
    event: "Triple jump",
    classYear: "Senior",
    blurb: "Balanced a business degree with a national schedule. Ask me how I protect my recovery time.",
    focus: ["Training load", "Balancing academics"],
  },
];

const TIME_OPTIONS = [
  "Weekday evenings",
  "Weekday afternoons",
  "Weekend mornings",
  "Weekend afternoons",
  "Flexible, any time",
];

export default function MentorsPage() {
  const { data: requests, save: saveRequests, loading: requestsLoading } = useAccountState<CallRequest[]>(
    "cl-call-requests",
    [],
  );

  const [eventFilter, setEventFilter] = useState<string>("All events");
  const [focusFilter, setFocusFilter] = useState<string>("All topics");

  // Which mentor's request panel is open, plus the in-progress form fields.
  const [openId, setOpenId] = useState<string | null>(null);
  const [formTopic, setFormTopic] = useState<string>(FOCUS_OPTIONS[0]);
  const [formMessage, setFormMessage] = useState<string>("");
  const [formTime, setFormTime] = useState<string>(TIME_OPTIONS[0]);
  const [justSentId, setJustSentId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      MENTORS.filter(
        (m) =>
          (eventFilter === "All events" || m.event === eventFilter) &&
          (focusFilter === "All topics" || m.focus.includes(focusFilter)),
      ),
    [eventFilter, focusFilter],
  );

  function openRequest(mentor: Mentor) {
    setOpenId(mentor.id);
    setFormTopic(mentor.focus[0] ?? FOCUS_OPTIONS[0]);
    setFormMessage("");
    setFormTime(TIME_OPTIONS[0]);
    setJustSentId(null);
  }

  function submitRequest(mentor: Mentor) {
    if (requestsLoading) return;
    const next: CallRequest = {
      id: `${Date.now()}-${mentor.id}`,
      mentorName: mentor.name,
      mentorSchool: mentor.school,
      topic: formTopic + (formTime ? ` · ${formTime}` : ""),
      message: formMessage.trim(),
      requestedAt: new Date().toISOString(),
    };
    void saveRequests([next, ...requests]);
    setOpenId(null);
    setJustSentId(mentor.id);
  }

  function formatWhen(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="page">
      <PageHead eyebrow="Learn from athletes who did it" title="D1 mentor calls">
        <p>
          Short, informal 1:1 video calls with current NCAA Division I track and field athletes. These are peer advice
          chats about the journey, not official recruiting contact and not a guarantee of anything.
        </p>
      </PageHead>

      <div className="stack">
        <Notice>
          Sample mentors shown for now. Real athlete mentors are coming soon, and any requests you send are saved to your
          account so they are here when the program opens.
        </Notice>

        <Card>
          <div className="grid-2">
            <Field label="Event" hint="Filter mentors by the event they compete in.">
              <Select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option>All events</option>
                {EVENT_OPTIONS.map((ev) => (
                  <option key={ev}>{ev}</option>
                ))}
              </Select>
            </Field>
            <Field label="Topic" hint="Filter by what you most want to talk through.">
              <Select value={focusFilter} onChange={(e) => setFocusFilter(e.target.value)}>
                <option>All topics</option>
                {FOCUS_OPTIONS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Empty title="No mentors match those filters">
            <p>Try a different event or topic, or reset both filters to see everyone.</p>
          </Empty>
        ) : (
          <>
            <p className="eyebrow">
              {filtered.length} mentor{filtered.length === 1 ? "" : "s"} shown
            </p>
            <div className="grid-2">
              {filtered.map((m) => {
                const isOpen = openId === m.id;
                const wasSent = justSentId === m.id;
                return (
                  <Card key={m.id} className="lift">
                    <div className="stack" style={{ gap: 12 }}>
                      <div className="between">
                        <h2 className="h3">{m.name}</h2>
                        <Badge tone="muted">{m.classYear}</Badge>
                      </div>

                      <div className="row wrap" style={{ gap: 8 }}>
                        <span className="muted" style={{ fontSize: 13 }}>{m.school}</span>
                        <Badge tone="brand">{m.event}</Badge>
                      </div>

                      <p className="muted" style={{ fontSize: 14 }}>{m.blurb}</p>

                      <div className="row wrap" style={{ gap: 6 }}>
                        {m.focus.map((f) => (
                          <Badge key={f} tone="accent">{f}</Badge>
                        ))}
                      </div>

                      {wasSent ? (
                        <Notice>
                          Request sent. You can find it under Your requests below.
                        </Notice>
                      ) : null}

                      {isOpen ? (
                        <div
                          className="stack"
                          style={{
                            gap: 12,
                            paddingTop: 14,
                            borderTop: "1px solid var(--line)",
                          }}
                        >
                          <Field label="Preferred topic">
                            <Select value={formTopic} onChange={(e) => setFormTopic(e.target.value)}>
                              {FOCUS_OPTIONS.map((f) => (
                                <option key={f}>{f}</option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Preferred time" hint="A rough window works. No calendar needed yet.">
                            <Select value={formTime} onChange={(e) => setFormTime(e.target.value)}>
                              {TIME_OPTIONS.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Short message" hint="One or two sentences on what you want to ask.">
                            <Textarea
                              rows={3}
                              value={formMessage}
                              onChange={(e) => setFormMessage(e.target.value)}
                              placeholder={`Hi ${m.name.split(" ")[0]}, I would love to hear how you...`}
                            />
                          </Field>
                          <div className="row" style={{ gap: 8 }}>
                            <Button size="sm" onClick={() => submitRequest(m)} disabled={requestsLoading}>
                              Send request
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="row" style={{ gap: 8 }}>
                          <Button variant="secondary" size="sm" onClick={() => openRequest(m)}>
                            Request a call
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Card>
          <div className="stack" style={{ gap: 12 }}>
            <h2 className="h3">Your requests</h2>
            {requestsLoading ? (
              <p className="muted">Loading your saved requests…</p>
            ) : requests.length === 0 ? (
              <p className="muted">
                No requests yet. Pick a mentor above and send a note about what you want to talk through.
              </p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {requests.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: 14,
                    }}
                  >
                    <div className="between">
                      <span className="h3" style={{ fontSize: 15 }}>{r.mentorName}</span>
                      <span className="faint" style={{ fontSize: 12 }}>{formatWhen(r.requestedAt)}</span>
                    </div>
                    <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
                      <span className="muted" style={{ fontSize: 13 }}>{r.mentorSchool}</span>
                      <Badge tone="accent">{r.topic}</Badge>
                    </div>
                    {r.message ? (
                      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{r.message}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
