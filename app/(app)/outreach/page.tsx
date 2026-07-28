"use client";

import { useMemo, useState } from "react";
import { useAccountState } from "@/lib/account-state";
import { Badge, Button, Card, Empty, Input, PageHead, Select } from "@/components/ui";

// Coach-contact tracker. Records are stored under "cl-outreach". Mirrors the
// legacy prototype's Outreach view: add and delete records, filter by status,
// and review everything in a clean responsive table.

type Status = "Researching" | "Contacted" | "Coach responded" | "Follow-up required" | "Committed";

type Outreach = {
  id: number;
  school: string;
  coach: string;
  contacted: string;
  status: Status;
  followUp: string;
};

const STATUSES: Status[] = ["Researching", "Contacted", "Coach responded", "Follow-up required", "Committed"];

function toneFor(status: Status): "brand" | "muted" | "accent" | "danger" {
  switch (status) {
    case "Coach responded":
      return "accent";
    case "Committed":
      return "brand";
    case "Follow-up required":
      return "danger";
    default:
      return "muted";
  }
}

export default function OutreachPage() {
  const { data: rows, save } = useAccountState<Outreach[]>("cl-outreach", []);
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [showAdd, setShowAdd] = useState(false);

  const [school, setSchool] = useState("");
  const [coach, setCoach] = useState("");
  const [status, setStatus] = useState<Status>("Researching");
  const [followUp, setFollowUp] = useState("");

  const visible = useMemo(
    () => rows.filter((r) => statusFilter === "All" || r.status === statusFilter),
    [rows, statusFilter],
  );

  const resetForm = () => {
    setSchool("");
    setCoach("");
    setStatus("Researching");
    setFollowUp("");
  };

  const addRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school.trim() || !coach.trim()) return;
    const record: Outreach = {
      id: Date.now(),
      school: school.trim(),
      coach: coach.trim(),
      contacted: new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      status,
      followUp: followUp.trim() || "—",
    };
    save([...rows, record]);
    resetForm();
    setShowAdd(false);
  };

  const remove = (id: number) => save(rows.filter((r) => r.id !== id));

  return (
    <div className="page">
      <PageHead eyebrow="Coach contacts" title="Outreach tracker">
        <p>
          Keep a simple record of every program you contact — who you reached, when, where the conversation stands, and
          when to follow up. Staying organized is one of the most useful things you can do in recruiting.
        </p>
      </PageHead>

      <div className="between" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <label className="field" style={{ margin: 0, minWidth: 200 }}>
          <span className="label">Filter by status</span>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | Status)}>
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Close" : "+ Add record"}</Button>
      </div>

      {showAdd ? (
        <Card style={{ marginBottom: 16 }}>
          <form onSubmit={addRecord} className="stack">
            <div className="grid-2">
              <label className="field" style={{ margin: 0 }}>
                <span className="label">School</span>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="North Ridge University" required />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span className="label">Coach</span>
                <Input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="Coach Morgan" required />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span className="label">Status</span>
                <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span className="label">Follow-up</span>
                <Input value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. Jul 29 (optional)" />
              </label>
            </div>
            <div className="row wrap">
              <Button type="submit">Save record</Button>
              <Button type="button" variant="ghost" onClick={() => { resetForm(); setShowAdd(false); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {visible.length === 0 ? (
        <Card>
          <Empty title={rows.length === 0 ? "No outreach recorded yet" : "No records match this filter"}>
            {rows.length === 0 ? (
              <p>Add your first program above to start tracking coach conversations and follow-up dates.</p>
            ) : (
              <p>Try selecting “All statuses” to see every program you are tracking.</p>
            )}
          </Empty>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>School / coach</th>
                <th>Contacted</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.school}</b>
                    <div className="faint">{r.coach}</div>
                  </td>
                  <td>{r.contacted}</td>
                  <td>
                    <Badge tone={toneFor(r.status)}>{r.status}</Badge>
                  </td>
                  <td>{r.followUp}</td>
                  <td style={{ textAlign: "right" }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(r.id)}
                      aria-label={`Delete outreach record for ${r.school}`}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
