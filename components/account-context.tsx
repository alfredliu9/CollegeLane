"use client";
import { createContext, useContext } from "react";

// Signed-in account info, provided by the (app) server layout so client pages
// have the user's name/email on first paint (no client-side round-trip).
export type Account = { id: string; email: string; name: string };

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ account, children }: { account: Account; children: React.ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
