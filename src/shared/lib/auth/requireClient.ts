import { redirect } from "next/navigation";
import { getClientAccount, getClientSessionEmail } from "@/shared/lib/auth/clientAuth";
import { getClientByEmail, getClientById } from "@/shared/lib/data/clientRepository";
import type { Client } from "@/shared/types/client";
import { AppError } from "@/shared/lib/utils/errors";

export const CLIENT_LOGIN_PATH = "/connexion";

export type ClientSession = {
  email: string;
  clientId: string;
  name: string;
  client: Client;
};

export async function getClientSession(): Promise<ClientSession | null> {
  const email = await getClientSessionEmail();
  if (!email) return null;

  const account = getClientAccount(email);
  let client = account?.clientId ? await getClientById(account.clientId) : null;
  if (!client) client = await getClientByEmail(email);
  if (!client) return null;

  const name =
    account?.name?.trim() ||
    client.contactName?.trim() ||
    client.organization?.trim() ||
    client.email.split("@")[0] ||
    "Client";

  return {
    email: client.email,
    clientId: client.id,
    name,
    client
  };
}

export async function requireClient(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) redirect(CLIENT_LOGIN_PATH);
  return session;
}

export async function requireClientForApi(): Promise<ClientSession> {
  const session = await getClientSession();
  if (!session) throw new AppError("Connexion requise.", "UNAUTHORIZED");
  return session;
}
