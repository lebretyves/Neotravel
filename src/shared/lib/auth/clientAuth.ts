import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cookies } from "next/headers";
import { hashPassword } from "./localAuth";

const CREDENTIALS_PATH = resolve(process.cwd(), "client-credentials.json");
export const CLIENT_SESSION_COOKIE = "nt_client_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

type ClientRecord = {
  email: string;
  name?: string;
  clientId: string;
  salt: string;
  hash: string;
};

function getSecret() {
  return process.env.CLIENT_AUTH_SECRET ?? process.env.LOCAL_AUTH_SECRET ?? "neotravel-client-dev-secret-change-me";
}

function readClients(): ClientRecord[] {
  try {
    const parsed = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    return Array.isArray(parsed) ? (parsed as ClientRecord[]) : [];
  } catch {
    return [];
  }
}

function writeClients(records: ClientRecord[]) {
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function getClientAccount(email: string) {
  const record = readClients().find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!record) return null;
  return { email: record.email, name: record.name, clientId: record.clientId };
}

export function createClientAccountRecord(
  email: string,
  password: string,
  options: { name?: string; clientId: string }
) {
  const normalizedEmail = email.trim().toLowerCase();
  const records = readClients();
  if (records.some((item) => item.email.toLowerCase() === normalizedEmail)) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  const salt = randomBytes(16).toString("hex");
  records.push({
    email: normalizedEmail,
    name: options.name?.trim() || undefined,
    clientId: options.clientId,
    salt,
    hash: hashPassword(password, salt)
  });
  writeClients(records);
}

export function verifyClientCredentials(email: string, password: string) {
  const record = readClients().find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!record) return false;
  return safeEqualHex(hashPassword(password, record.salt), record.hash);
}

export function updateClientPassword(email: string, currentPassword: string, newPassword: string) {
  if (!verifyClientCredentials(email, currentPassword)) {
    throw new Error("Mot de passe actuel incorrect.");
  }

  const records = readClients();
  const index = records.findIndex((item) => item.email.toLowerCase() === email.toLowerCase());
  if (index === -1) throw new Error("Compte introuvable.");

  const salt = randomBytes(16).toString("hex");
  records[index] = {
    ...records[index],
    salt,
    hash: hashPassword(newPassword, salt),
  };
  writeClients(records);
}

export function updateClientAccountName(email: string, name: string | undefined) {
  const records = readClients();
  const index = records.findIndex((item) => item.email.toLowerCase() === email.toLowerCase());
  if (index === -1) return;

  const trimmed = name?.trim();
  records[index] = {
    ...records[index],
    name: trimmed || undefined,
  };
  writeClients(records);
}

export function deleteClientAccountRecord(email: string, password: string) {
  if (!verifyClientCredentials(email, password)) {
    throw new Error("Mot de passe incorrect.");
  }

  writeClients(readClients().filter((item) => item.email.toLowerCase() !== email.toLowerCase()));
}

export function createClientSessionToken(email: string) {
  const payload = `${email}|${Date.now() + SESSION_TTL_MS}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyClientSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const splitAt = decoded.lastIndexOf("|");
    if (splitAt === -1) return null;
    const payload = decoded.slice(0, splitAt);
    const sig = decoded.slice(splitAt + 1);
    const expected = createHmac("sha256", getSecret()).update(payload).digest("hex");
    if (!safeEqualHex(sig, expected)) return null;
    const [email, expStr] = payload.split("|");
    if (!email || Number(expStr) < Date.now()) return null;
    return email;
  } catch {
    return null;
  }
}

export async function getClientSessionEmail(): Promise<string | null> {
  const store = await cookies();
  return verifyClientSessionToken(store.get(CLIENT_SESSION_COOKIE)?.value);
}
