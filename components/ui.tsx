import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* Shared, presentational UI primitives for the CollegeLane design system.
   Import these everywhere instead of re-styling. Safe in server or client
   components (no hooks). Styling lives in app/globals.css. */

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary",
  block,
  size,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; size?: "sm" }) {
  const cls = ["btn", `btn-${variant}`, block ? "btn-block" : "", size === "sm" ? "btn-sm" : "", className]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...props} />;
}

export function Card({ children, lg, className = "", ...rest }: { children: ReactNode; lg?: boolean; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${lg ? "card-lg" : ""} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      {label ? <span className="label">{label}</span> : null}
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`.trim()} {...props} />;
}
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`select ${className}`.trim()} {...props} />;
}
export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className}`.trim()} {...props} />;
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "muted" | "accent" | "danger" }) {
  const map = { brand: "badge", muted: "badge badge-muted", accent: "badge badge-accent", danger: "badge badge-danger" };
  return <span className={map[tone]}>{children}</span>;
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return <div className={tone === "warn" ? "notice notice-warn" : "notice"}>{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="h3" style={{ marginBottom: 6 }}>{title}</p>
      {children}
    </div>
  );
}
