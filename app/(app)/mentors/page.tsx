"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Empty, Field, Notice, PageHead, Select } from "@/components/ui";
import type { EventName } from "@/lib/recruiting";

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

// Shared focus/topic vocabulary. Kept in one place so the filter and every
// mentor's tags all speak the same language.
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

export default function MentorsPage() {
  const [eventFilter, setEventFilter] = useState<string>("All events");
  const [focusFilter, setFocusFilter] = useState<string>("All topics");

  const filtered = useMemo(
    () =>
      MENTORS.filter(
        (m) =>
          (eventFilter === "All events" || m.event === eventFilter) &&
          (focusFilter === "All topics" || m.focus.includes(focusFilter)),
      ),
    [eventFilter, focusFilter],
  );

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
          Mentor call booking is coming soon. For now you can browse the sample mentors we are lining up. These are
          illustrative examples, and real athlete mentors are on the way.
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
              {filtered.map((m) => (
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

                    <div className="row" style={{ gap: 8 }}>
                      <Button variant="secondary" size="sm" disabled aria-disabled="true">
                        Coming soon
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
