"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Field, Input, Notice, PageHead, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { emptyAthlete, formatPerformance, type AthleteProfile, type EventName } from "@/lib/recruiting";

type SchoolChoice = { id: string; name: string; city: string; region: string; division: string; pathway: string };
type CoachChoice = { id: string; name: string; role: string; email: string; sourceUrl: string };
type Upload = { id: string; kind: "video" | "transcript"; filename: string; size: number; url: string };

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

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

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
  const { data: uploads, save: saveUploads } = useAccountState<Upload[]>("cl-email-uploads", []);
  // Same account key the outreach tracker reads, so a row added here shows up there.
  const { data: outreach, save: saveOutreach } = useAccountState<OutreachRecord[]>("cl-outreach", []);

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolChoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [school, setSchool] = useState<SchoolChoice | null>(null);

  const [coaches, setCoaches] = useState<CoachChoice[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [coachFilter, setCoachFilter] = useState("");
  const [selected, setSelected] = useState<CoachChoice[]>([]);

  // Manually added recipients. These always count as recipients so the draft is
  // usable even when the automatic coach lookup is off or finds nobody.
  const [manualRecipients, setManualRecipients] = useState<CoachChoice[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualRole, setManualRole] = useState("");

  const [uploading, setUploading] = useState<"" | "video" | "transcript">("");
  const [uploadError, setUploadError] = useState("");
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
    setCoaches([]);
    setSelected([]);
    setManualRecipients([]);
    setManualName("");
    setManualEmail("");
    setManualRole("");
    setCoachFilter("");
    setCopied(false);
    setLoadingCoaches(true);
    fetch(`/api/coaches?schoolId=${encodeURIComponent(next.id)}`)
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { coaches?: CoachChoice[] };
        // A 503/502 (no OPENAI_API_KEY, or a lookup failure) is not a dead end:
        // we simply fall back to an empty list and let the athlete add coaches
        // by hand. Only a genuine list of coaches populates the picker.
        setCoaches(r.ok ? data.coaches || [] : []);
      })
      .catch(() => setCoaches([]))
      .finally(() => setLoadingCoaches(false));
  }

  function resetSchool() {
    setSchool(null);
    setSchoolQuery("");
    setSchoolResults([]);
    setCoaches([]);
    setSelected([]);
    setManualRecipients([]);
    setManualName("");
    setManualEmail("");
    setManualRole("");
    setCoachFilter("");
    setCopied(false);
  }

  function toggleCoach(coach: CoachChoice) {
    setCopied(false);
    setSelected((prev) => (prev.some((c) => c.id === coach.id) ? prev.filter((c) => c.id !== coach.id) : [...prev, coach]));
  }

  function addManualRecipient() {
    const name = manualName.trim();
    if (!name) return;
    const recipient: CoachChoice = {
      id: `manual-${crypto.randomUUID()}`,
      name,
      role: manualRole.trim(),
      email: manualEmail.trim(),
      sourceUrl: "",
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

  async function upload(kind: "video" | "transcript", file?: File) {
    if (!file) return;
    setUploading(kind);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Upload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Upload failed. Please try again.");
      saveUploads([...uploads.filter((u) => u.kind !== kind), { id: data.id, kind: data.kind, filename: data.filename, size: data.size, url: data.url }]);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading("");
    }
  }

  function removeUpload(id: string) {
    saveUploads(uploads.filter((u) => u.id !== id));
  }

  const visibleCoaches = useMemo(() => {
    const q = coachFilter.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter((c) => `${c.name} ${c.role}`.toLowerCase().includes(q));
  }, [coaches, coachFilter]);

  // Whether any loaded coach (or a manually added recipient with a role) is
  // listed specifically for the athlete's event. Used to nudge the athlete
  // toward the head coach or recruiting coordinator when nobody covers it.
  const hasEventCoach = useMemo(
    () => [...coaches, ...manualRecipients].some((c) => roleCoversEvent(c.role, athlete.event)),
    [coaches, manualRecipients, athlete.event],
  );
  // Only surface the gap once a real coach list has loaded; the empty-list case
  // is already covered by the manual-add messaging.
  const showEventGapNote = !loadingCoaches && coaches.length > 0 && !hasEventCoach;

  // Everyone the draft should be addressed to: checked coaches plus anyone the
  // athlete added by hand.
  const recipients = useMemo(() => [...selected, ...manualRecipients], [selected, manualRecipients]);

  const fullName = `${athlete.name || "[Athlete name]"} ${athlete.lastName || ""}`.trim();
  // One coach: address them by surname ("Dear Coach Carter,"). Several: a single
  // polite plural ("Dear Coaches,"). None chosen yet: a neutral "Dear Coach,".
  const greeting =
    recipients.length === 0
      ? "Coach"
      : recipients.length === 1
        ? `Coach ${recipients[0].name.split(" ").pop()}`
        : "Coaches";
  const attachmentLine = (() => {
    const parts: string[] = [];
    if (uploads.some((u) => u.kind === "video")) parts.push("a competition video");
    if (uploads.some((u) => u.kind === "transcript")) parts.push("my academic transcript");
    return parts.length ? `\n\nI have attached ${parts.join(" and ")} for your review.` : "";
  })();

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
    `and how my athletic and academic profile might align with your recruiting plans for the ${athlete.event.toLowerCase()}.` +
    `${attachmentLine}\n\n` +
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
          Pick a program, choose the coaches to address, and CollegeLane assembles a ready-to-send draft from your saved profile. The
          draft is read-only, so copy it into your own email to send.
        </p>
      </PageHead>

      <div className="grid-2">
        {/* Left column: program, recipients, attachments */}
        <Card>
          <div className="stack">
            <div>
              <h2 className="h2">Program and recipients</h2>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                Search for a school, then pick the coaches to address. You can also add a coach by hand if the lookup does not find them.
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
                {coaches.length > 0 && (
                  <Field label="Filter coaches">
                    <Input
                      value={coachFilter}
                      onChange={(e) => setCoachFilter(e.target.value)}
                      placeholder="Filter by name or event group"
                      disabled={loadingCoaches}
                    />
                  </Field>
                )}

                {loadingCoaches && <Notice>Checking the official athletics staff directory…</Notice>}

                {!loadingCoaches && coaches.length === 0 && (
                  <Notice>
                    Automatic coach lookup is off. Add a coach manually, or find them on the school&apos;s athletics staff page.
                  </Notice>
                )}

                {!loadingCoaches && visibleCoaches.length > 0 && (
                  <div className="stack" style={{ gap: 8 }}>
                    {visibleCoaches.map((c) => {
                      const checked = selected.some((x) => x.id === c.id);
                      return (
                        <label
                          key={c.id}
                          className="check"
                          style={{
                            alignItems: "flex-start",
                            border: `1px solid ${checked ? "var(--brand)" : "var(--line)"}`,
                            borderRadius: "var(--radius-sm)",
                            padding: "10px 12px",
                          }}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleCoach(c)} style={{ marginTop: 3 }} />
                          <span style={{ flex: 1 }}>
                            <b style={{ fontSize: 14 }}>{c.name}</b>
                            <div className="hint">
                              {c.role}
                              {c.email ? ` · ${c.email}` : ""}
                            </div>
                            <a className="link" href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                              Official source
                            </a>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {!loadingCoaches && coaches.length > 0 && visibleCoaches.length === 0 && (
                  <p className="hint">No coaches match “{coachFilter}”.</p>
                )}

                {/* None of the loaded coaches specialise in the athlete's event. */}
                {showEventGapNote && (
                  <Notice tone="warn">
                    No coach is listed specifically for your event ({athlete.event}) at this program. Consider addressing the head coach
                    or the program&apos;s recruiting coordinator.
                  </Notice>
                )}

                {/* Manual recipients: available whether or not the lookup found anyone. */}
                {!loadingCoaches && (
                  <div className="stack" style={{ gap: 10 }}>
                    <div>
                      <h3 className="h3">Add a coach manually</h3>
                      <p className="hint" style={{ marginTop: 4 }}>
                        Add anyone the lookup missed. Name is required, email and role are optional.
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
                )}
              </>
            )}

            <hr className="divider" />

            <div>
              <h3 className="h3">Attachments</h3>
              <p className="hint" style={{ marginTop: 4 }}>
                Optional. Uploaded files are listed on the draft so you can attach them in your own email client.
              </p>
            </div>

            <div className="grid-2">
              {(
                [
                  { kind: "video" as const, label: "Competition video", hint: "MP4 only · up to 100 MB", accept: "video/mp4,.mp4" },
                  { kind: "transcript" as const, label: "Academic transcript", hint: "PDF only · up to 10 MB", accept: "application/pdf,.pdf" },
                ]
              ).map((slot) => {
                const existing = uploads.find((u) => u.kind === slot.kind);
                return (
                  <label
                    key={slot.kind}
                    style={{
                      display: "block",
                      border: "1px dashed var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      background: "var(--surface-2)",
                    }}
                  >
                    <b style={{ fontSize: 13 }}>
                      {uploading === slot.kind ? "Uploading…" : existing ? existing.filename : slot.label}
                    </b>
                    <div className="hint">{existing ? formatBytes(existing.size) : slot.hint}</div>
                    <input
                      type="file"
                      accept={slot.accept}
                      disabled={Boolean(uploading)}
                      onChange={(e) => upload(slot.kind, e.target.files?.[0])}
                      style={{ marginTop: 8, fontSize: 12, maxWidth: "100%" }}
                    />
                  </label>
                );
              })}
            </div>

            {uploadError && <Notice tone="warn">{uploadError}</Notice>}

            {uploads.length > 0 && (
              <div className="stack" style={{ gap: 8 }}>
                {uploads.map((u) => (
                  <div key={u.id} className="between" style={{ fontSize: 13 }}>
                    <span>
                      <Badge tone="muted">{u.kind === "video" ? "Video" : "Transcript"}</Badge>{" "}
                      <a className="link" href={u.url} target="_blank" rel="noreferrer">
                        {u.filename}
                      </a>{" "}
                      <span className="faint">({formatBytes(u.size)})</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeUpload(u.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
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

            <Field label="To" hint="Add or select a coach to address it by name. Leave blank and it opens with “Coach”.">
              <Input value={toLine} placeholder="No recipients yet" readOnly />
            </Field>
            <Field label="Subject">
              <Input value={subject} readOnly />
            </Field>
            <Field label="Message" hint="Built automatically from your saved athlete profile. It cannot be edited here.">
              <Textarea value={body} readOnly rows={16} />
            </Field>

            {uploads.length > 0 && (
              <div>
                <span className="label">Attachments</span>
                <div className="row wrap" style={{ marginTop: 6 }}>
                  {uploads.map((u) => (
                    <Badge key={u.id} tone="muted">
                      {u.filename}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
