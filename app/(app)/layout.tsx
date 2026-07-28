import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { AccountProvider } from "@/components/account-context";

// Layout for all signed-in product pages. Middleware already gates these routes;
// this is a defense-in-depth check plus the shared nav shell. The user (incl.
// display name) is fetched once here and shared via context so pages render the
// name instantly instead of doing their own client-side lookup.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <AccountProvider account={user}>
      <AppShell email={user.email}>{children}</AppShell>
    </AccountProvider>
  );
}
