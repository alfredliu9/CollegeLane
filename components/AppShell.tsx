"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearAccountCache, prefetchAccountState } from "@/lib/account-state";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assessment", label: "Assessment" },
  { href: "/schools", label: "Schools" },
  { href: "/recommended", label: "Recommended" },
  { href: "/plan", label: "Plan" },
  { href: "/outreach", label: "Outreach" },
  { href: "/email-builder", label: "Email builder" },
  { href: "/assistant", label: "Assistant" },
  { href: "/profile", label: "Profile" },
];
const MOBILE_TABS = ["/dashboard", "/schools", "/recommended", "/plan", "/profile"];

export function AppShell({ children, email }: { children: React.ReactNode; email?: string }) {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  // Warm the cache for the data most pages need, so the first navigation to a
  // page shows data instantly instead of a spinner.
  useEffect(() => {
    prefetchAccountState(["cl-athlete", "cl-schools", "cl-tasks", "cl-outreach"]);
  }, []);

  async function logout() {
    clearAccountCache();
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/collegelane-logo.png" alt="CollegeLane" />
        </Link>
        <nav className="stack" style={{ gap: 2 }}>
          {NAV.map((i) => (
            <Link key={i.href} href={i.href} className={`navlink ${active(i.href) ? "active" : ""}`}>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="foot">
          {email ? (
            <p className="hint" style={{ marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email}
            </p>
          ) : null}
          <button className="btn btn-secondary btn-block btn-sm" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Link href="/dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/collegelane-logo.png" alt="CollegeLane" />
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Log out
          </button>
        </header>

        {children}

        <nav className="tabbar">
          {NAV.filter((i) => MOBILE_TABS.includes(i.href)).map((i) => (
            <Link key={i.href} href={i.href} className={active(i.href) ? "active" : ""}>
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
