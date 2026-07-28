"use client";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, Notice, PageHead, Textarea } from "@/components/ui";
import { useAccountState } from "@/lib/account-state";
import { emptyAthlete, formatPerformance, type AthleteProfile } from "@/lib/recruiting";

type SchoolChoice = { id: string; name: string; city: string; region: string; division: string; pathway: string };
type CoachChoice = { id: string; name: string; role: string; email: string; sourceUrl: string };
type Upload = { id: string; kind: "video" | "transcript"; filename: string; size: number; url: string };

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default function EmailBuilderPage() {
  const { data: athlete } = useAccountState<AthleteProfile>("cl-athlete", emptyAthlete);
  const { data: uploads, save: saveUploads } = useAccountState<Upload[]>("cl-email-uploads", []);

  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolResults, setSchoolResults] = useState<SchoolChoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [school, setSchool] = useState<SchoolChoice | null>(null);

  const [coaches, setCoaches] = useState<CoachChoice[]>([]);
  const [coachError, setCoachError] = useState("");
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [coachFilter, setCoachFilter] = useState("");
  const [selected, setSelected] = useState<CoachChoice[]>([]);

  const [uploading, setUploading] = useState<"" | "video" | "transcript">("");
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);

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
    setCoachFilter("");
    setCoachError("");
    setCopied(false);
    setLoadingCoaches(true);
    fetch(`/api/coaches?schoolId=${encodeURIComponent(next.id)}`)
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { coaches?: CoachChoice[]; error?: string };
        if (!r.ok) throw new Error(data.error || "Coach lookup is temporarily unavailable.");
        const list = data.coaches || [];
        setCoaches(list);
        if (!list.length) setCoachError("No coaches were listed on this program's official staff pages yet.");
      })
      .catch((e: unknown) => setCoachError(e instanceof Error ? e.message : "Coach lookup could not be completed."))
      .finally(() => setLoadingCoaches(false));
  }

  function resetSchool() {
    setSchool(null);
    setSchoolQuery("");
    setSchoolResults([]);
    setCoaches([]);
    setSelected([]);
    setCoachFilter("");
    setCoachError("");
    setCopied(false);
  }

  function toggleCoach(coach: CoachChoice) {
    setCopied(false);
    setSelected((prev) => (prev.some((c) => c.id === coach.id) ? prev.filter((c) => c.id !== coach.id) : [...prev, coach]));
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

  const fullName = `${athlete.name || "[Athlete name]"} ${athlete.lastName || ""}`.trim();
  const greeting = selected.length
    ? selected.map((c) => `Coach ${c.name.split(" ").pop()}`).join(" and ")
    : "Coach";
  const attachmentLine = (() => {
    const parts: string[] = [];
    if (uploads.some((u) => u.kind === "video")) parts.push("a competition video");
    if (uploads.some((u) => u.kind === "transcript")) parts.push("my academic transcript");
    return parts.length ? `\n\nI have attached ${parts.join(" and ")} for your review.` : "";
  })();

  const subject = `${athlete.gradYear} ${athlete.event} recruit: ${fullName} (${formatPerformance(athlete)})`;
  const toLine = selected.map((c) => c.email || c.name).join(", ");
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
  const canCopy = Boolean(school) && selected.length > 0;

  async function copyDraft() {
    try {
      await navigator.clipboard?.writeText(`To: ${toLine}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
                Search for a school, then select one or more coaches verified from its official athletics staff pages.
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
                <Field label="Filter coaches">
                  <Input
                    value={coachFilter}
                    onChange={(e) => setCoachFilter(e.target.value)}
                    placeholder="Filter by name or event group"
                    disabled={loadingCoaches || coaches.length === 0}
                  />
                </Field>

                {loadingCoaches && <Notice>Checking the official athletics staff directory…</Notice>}
                {!loadingCoaches && coachError && <Notice tone="warn">{coachError}</Notice>}

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

            <Field label="To">
              <Input value={toLine} placeholder="Select at least one coach" readOnly />
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
