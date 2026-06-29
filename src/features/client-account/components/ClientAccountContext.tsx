"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientAccountData } from "@/features/client-account/services/getClientAccountData";

const ClientAccountContext = createContext<ClientAccountData | null>(null);

export function ClientAccountProvider({ data, children }: { data: ClientAccountData; children: ReactNode }) {
  return <ClientAccountContext.Provider value={data}>{children}</ClientAccountContext.Provider>;
}

export function useClientAccount() {
  const data = useContext(ClientAccountContext);
  if (!data) throw new Error("useClientAccount must be used within ClientAccountProvider");
  return data;
}
