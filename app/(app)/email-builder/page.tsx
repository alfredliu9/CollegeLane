"use client";
import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Field, Input, Notice, PageHead, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { emptyAthlete, formatPerformance, type AthleteProfile, type EventName } from "@/lib/recruiting";

type SchoolChoice = { id: string; name: string; city: string; region: string; division: string; pathway: string };
// A coach the athlete adds by hand. Name is required; email and role optional.
type Recipient = { id: string; name: string; role: string; email: string };

// Mirrors the record shape read/written by app/(app)/outreach/page.tsx under the
// same "cl-outreach" account key. Kept in sync by hand (the two pages do not
// share a module) so a row added here is indistinguishable from one added there.
type OutreachStatus = "Researching" | "Contacted" | "Coach responded" | "Follow-up required" | "Committed";
type OutreachRecord = {
  id: number;
  school: string;
  coach: string;
  contacted: string;
  status: OutreachStatus;
  followUp: string;
};

// Which coaching specialty the athlete's primary event falls under. Sprint
// distances (100/200/400) group together; the horizontal jumps group together.
type EventGroup = "sprints" | "jumps";
function eventGroupFor(event: EventName): EventGroup {
  return event === "Long jump" || event === "Triple jump" ? "jumps" : "sprints";
}

// A role naming the head coach or a director is general staff, not an event
// specialist, so on its own it never satisfies the event-specific check.
function isGeneralRole(role: string) {
  const r = role.toLowerCase();
  return r.includes("head") || r.includes("director");
}

// Whether a coach's role covers the athlete's specific event. Sprint roles match
// on a sprint/speed specialty or the athlete's exact distance; jumps roles match
// on a jumps/horizontal specialty.
function roleCoversEvent(role: string, event: EventName): boolean {
  const r = role.trim().toLowerCase();
  if (!r || isGeneralRole(r)) return false;
  if (eventGroupFor(event) === "jumps") return r.includes("jump") || r.includes("horizontal");
  const distance = event.replace(" metres", ""); // "100" | "200" | "400"
  return r.includes("sprint") || r.includes("speed") || r.includes(distance);
}

export default function EmailBuilderPage() {
  const { data: athlete } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  // Same account key the outreach tracker reads, so a row added here shows up there.
  const { data: outreach, save: saveOutreach } = useAccountState<OutreachRecord[]>("cl-outreach", []);

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolChoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [school, setSchool] = useState<SchoolChoice | null>(null);

  // Manually added recipients. There is no automatic lookup by design, so these
  // are the only recipients. The draft stays usable even with none added.
  const [manualRecipients, setManualRecipients] = useState<Recipient[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualRole, setManualRole] = useState("");

  const [copied, setCopied] = useState(false);
  // School+coach combinations added to the tracker this session, so the same
  // draft cannot be logged twice.
  const [addedOutreachKeys, setAddedOutreachKeys] = useState<string[]>([]);

  // Debounced school search (skips once a school is chosen).
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (school || schoolQuery.trim().length < 2) {
        setSchoolResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/schools?q=${encodeURIComponent(schoolQuery.trim())}`)
        .then((r) => (r.ok ? r.json() : { schools: [] }))
        .then((data: { schools?: SchoolChoice[] }) => {
          if (active) setSchoolResults((data.schools || []).slice(0, 8));
        })
        .catch(() => active && setSchoolResults([]))
        .finally(() => active && setSearching(false));
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [schoolQuery, school]);

  function chooseSchool(next: SchoolChoice) {
    setSchool(next);
    setSchoolQuery(next.name);
    setSchoolResults([]);
    setManualRecipients([]);
    setManualName("");
    setManualEmail("");
    setManualRole("");
    setCopied(false);
  }

  function resetSchool() {
    setSchool(null);
    setSchoolQuery("");
    setSchoolResults([]);
    setManualRecipients([]);
    setManualName("");
    setManualEmail("");
    setManualRole("");
    setCopied(false);
  }

  function addManualRecipient() {
    const name = manualName.trim();
    if (!name) return;
    const recipient: Recipient = {
      id: `manual-${crypto.randomUUID()}`,
      name,
      role: manualRole.trim(),
      email: manualEmail.trim(),
    };
    setManualRecipients((prev) => [...prev, recipient]);
    setManualName("");
    setManualEmail("");
    setManualRole("");
    setCopied(false);
  }

  function removeManualRecipient(id: string) {
    setManualRecipients((prev) => prev.filter((r) => r.id !== id));
    setCopied(false);
  }

  // A scoped Google search for the selected program's official staff directory.
  const coachSearchUrl = school
    ? `https://www.google.com/search?q=${encodeURIComponent(`${school.name} track and field coaches staff directory`)}`
    : "";

  // Whether any manually added recipient is listed specifically for the
  // athlete's event. Used to nudge toward the head coach or recruiting
  // coordinator when the added coaches do not cover it.
  const hasEventCoach = useMemo(
    () => manualRecipients.some((c) => roleCoversEvent(c.role, athlete.event)),
    [manualRecipients, athlete.event],
  );
  // Only surface the gap once at least one coach has been added; the empty case
  // is already covered by the find-them-yourself messaging.
  const showEventGapNote = manualRecipients.length > 0 && !hasEventCoach;

  // Everyone the draft should be addressed to: the coaches added by hand.
  const recipients = manualRecipients;

  const fullName = `${athlete.name || "[Athlete name]"} ${athlete.lastName || ""}`.trim();
  // One coach: address them by surname ("Dear Coach Carter,"). Several: a single
  // polite plural ("Dear Coaches,"). None added yet: a neutral "Dear Coach,".
  const greeting =
    recipients.length === 0
      ? "Coach"
      : recipients.length === 1
        ? `Coach ${recipients[0].name.split(" ").pop()}`
        : "Coaches";

  const subject = `${athlete.gradYear} ${athlete.event} recruit: ${fullName} (${formatPerformance(athlete)})`;
  const toLine = recipients.map((c) => c.email || c.name).join(", ");

  // How the coaches read in the outreach tracker's "coach" column.
  const coachLabel = recipients.length ? recipients.map((c) => c.name).join(", ") : "Coaching staff";
  const outreachKey = school ? `${school.name}||${coachLabel}` : "";
  const alreadyTracked = Boolean(
    school &&
      (addedOutreachKeys.includes(outreachKey) ||
        outreach.some((r) => r.school === school.name && r.coach === coachLabel)),
  );
  const body =
    `Dear ${greeting},\n\n` +
    `My name is ${fullName}, a ${athlete.gradYear} student-athlete at ${athlete.school || "[High school]"}. ` +
    `I compete in the ${athlete.event}, with a personal best of ${formatPerformance(athlete)}. ` +
    `I currently hold a ${athlete.average}% academic average and intend to study ${athlete.major || "[intended major]"}.\n\n` +
    `I am reaching out to learn more about the track and field program at ${school?.name || "[selected school]"} ` +
    `and how my athletic and academic profile might align with your recruiting plans for the ${athlete.event.toLowerCase()}.\n\n` +
    `Thank you for your time and consideration,\n${fullName}\nClass of ${athlete.gradYear}`;

  const wordCount = body.trim().split(/\s+/).length;
  // The draft always generates from the profile plus a chosen school. Recipients
  // are optional: with none, it politely addresses "Coach".
  const canCopy = Boolean(school);

  async function copyDraft() {
    try {
      await navigator.clipboard?.writeText(`To: ${toLine}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function addToOutreach() {
    if (!school || alreadyTracked) return;
    const record: OutreachRecord = {
      id: Date.now(),
      school: school.name,
      coach: coachLabel,
      // Matches the outreach page's own date + placeholder conventions exactly.
      contacted: new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      status: "Contacted",
      followUp: "—",
    };
    saveOutreach([...outreach, record]);
    setAddedOutreachKeys((prev) => (prev.includes(outreachKey) ? prev : [...prev, outreachKey]));
  }

  return (
    <div className="page">
      <PageHead eyebrow="Coach outreach" title="Email builder">
        <p>
          Pick a program, add the coaches to address, and CollegeLane assembles a ready-to-send draft from your saved profile. The
          draft is read-only, so copy it into your own email to send.
        </p>
      </PageHead>

      <div className="grid-2">
        {/* Left column: program and recipients */}
        <Card>
          <div className="stack">
            <div>
              <h2 className="h2">Program and recipients</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Search for a school, then add the coaches you want to address by hand from the program&apos;s official staff page.
              </p>
            </div>

            <Field label="School search">
              <div style={{ position: "relative" }}>
                <Input
                  value={schoolQuery}
                  onChange={(e) => {
                    setSchoolQuery(e.target.value);
                    if (school) setSchool(null);
                  }}
                  placeholder="Start typing a school name"
                  aria-label="Search for a school"
                />
                {!school && (schoolResults.length > 0 || searching) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      boxShadow: "var(--shadow)",
                      overflow: "hidden",
                    }}
                  >
                    {searching && schoolResults.length === 0 ? (
                      <p className="hint" style={{ padding: "10px 12px" }}>
                        Searching the directory…
                      </p>
                    ) : (
                      schoolResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => chooseSchool(s)}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            background: "transparent",
                            border: 0,
                            borderBottom: "1px solid var(--line)",
                            cursor: "pointer",
                          }}
                        >
                          <b style={{ fontSize: 14 }}>{s.name}</b>
                          <div className="hint">
                            {[s.city, s.region].filter(Boolean).join(", ")} · {s.pathway} {s.pathway === "NCAA" ? s.division : ""}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </Field>

            {school && (
              <div className="between" style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
                <div>
                  <b style={{ fontSize: 14 }}>{school.name}</b>
                  <div className="hint">
                    {[school.city, school.region].filter(Boolean).join(", ")} · {school.pathway}{" "}
                    {school.pathway === "NCAA" ? school.division : ""}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetSchool}>
                  Change
                </Button>
              </div>
            )}

            {school && (
              <>
                {/* Find-them-yourself helper: a scoped Google search plus a note. */}
                <div className="stack" style={{ gap: 8 }}>
                  <a className="link" href={coachSearchUrl} target="_blank" rel="noopener noreferrer">
                    Find this program&apos;s coaches
                  </a>
                  <p className="hint">
                    Automatic lookup is off by design. Open the official staff page, then add the coaches you want to contact below.
                  </p>
                </div>

                {/* None of the added coaches specialise in the athlete's event. */}
                {showEventGapNote && (
                  <Notice tone="warn">
                    None of the coaches you added is listed specifically for your event ({athlete.event}). Consider addressing the head
                    coach or the program&apos;s recruiting coordinator.
                  </Notice>
                )}

                {/* Manual recipients: the only way to add coaches. */}
                <div className="stack" style={{ gap: 10 }}>
                  <div>
                    <h3 className="h3">Add a coach manually</h3>
                    <p className="hint" style={{ marginTop: 4 }}>
                      Add each coach from the official staff page. Name is required, email and role are optional.
                    </p>
                  </div>

                  <Field label="Coach name">
                    <Input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Alex Carter"
                      aria-label="Coach name"
                    />
                  </Field>
                  <div className="grid-2">
                    <Field label="Email (optional)">
                      <Input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="coach@school.edu"
                        aria-label="Coach email"
                      />
                    </Field>
                    <Field label="Role (optional)">
                      <Input
                        value={manualRole}
                        onChange={(e) => setManualRole(e.target.value)}
                        placeholder="e.g. Jumps coach"
                        aria-label="Coach role"
                      />
                    </Field>
                  </div>
                  <div>
                    <Button variant="secondary" size="sm" onClick={addManualRecipient} disabled={!manualName.trim()}>
                      Add coach
                    </Button>
                  </div>

                  {manualRecipients.length > 0 && (
                    <div className="stack" style={{ gap: 8 }}>
                      {manualRecipients.map((r) => (
                        <div
                          key={r.id}
                          className="between"
                          style={{ border: "1px solid var(--brand)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}
                        >
                          <span style={{ flex: 1 }}>
                            <b style={{ fontSize: 14 }}>{r.name}</b>
                            <div className="hint">{[r.role || "Added manually", r.email].filter(Boolean).join(" · ")}</div>
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => removeManualRecipient(r.id)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Right column: read-only draft preview */}
        <Card>
          <div className="stack">
            <div className="between">
              <h2 className="h2">Draft preview</h2>
              <Badge tone="muted">Read-only · {wordCount} words</Badge>
            </div>

            <Field label="To" hint="Add a coach to address it by name. Leave blank and it opens with “Coach”.">
              <Input value={toLine} placeholder="No recipients yet" readOnly />
            </Field>
            <Field label="Subject">
              <Input value={subject} readOnly />
            </Field>
            <Field label="Message" hint="Built automatically from your saved athlete profile. It cannot be edited here.">
              <Textarea value={body} readOnly rows={16} />
            </Field>

            <p className="hint">
              Attach your transcript and a competition video to the email yourself before sending.
            </p>

            <div className="row wrap">
              <Button onClick={copyDraft} disabled={!canCopy}>
                {copied ? "Copied" : "Copy draft"}
              </Button>
              <Button variant="secondary" onClick={resetSchool} disabled={!school}>
                Reset
              </Button>
            </div>

            {/* Once the draft is copied, offer to log the contact in the tracker. */}
            {copied && school &&
              (alreadyTracked ? (
                <Notice>
                  Added to outreach.{" "}
                  <Link className="link" href="/outreach">
                    View your outreach tracker
                  </Link>
                </Notice>
              ) : (
                <div>
                  <Button variant="secondary" onClick={addToOutreach}>
                    Add {school.name} to your outreach tracker
                  </Button>
                </div>
              ))}

            <Notice>
              CollegeLane does not send email. Copy this draft into your own email client, review the coach addresses against the
              official source, and send it yourself.
            </Notice>
          </div>
        </Card>
      </div>
    </div>
  );
}
