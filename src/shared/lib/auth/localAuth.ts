import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cookies } from "next/headers";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_COMMERCIAL_PERMISSIONS,
  sanitizePermissions,
  type PermissionKey
} from "./permissions";

/**
 * Auth admin LOCALE temporaire, basée sur un fichier `admin-credentials.json`
 * (gitignored). Permet de tester le login réel sans Supabase ni Docker.
 * À remplacer par Supabase une fois le stack disponible.
 *
 * Activée via `LOCAL_AUTH=true` (et `NEXT_PUBLIC_LOCAL_AUTH=true` côté formulaire).
 */
const CREDENTIALS_PATH = resolve(process.cwd(), "admin-credentials.json");
export const LOCAL_SESSION_COOKIE = "nt_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 heures

export function isLocalAuthEnabled() {
  return process.env.LOCAL_AUTH === "true";
}

function getSecret() {
  return process.env.LOCAL_AUTH_SECRET ?? "neotravel-local-dev-secret-change-me";
}

export type StaffRole = "admin" | "commercial";

type AdminRecord = {
  email: string;
  name?: string;
  role: StaffRole;
  salt: string;
  hash: string;
  permissions?: string[];
};

function readAdmins(): AdminRecord[] {
  try {
    const parsed = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    if (!Array.isArray(parsed)) return [];
    // Compatibilité : un compte sans rôle est considéré admin.
    return (parsed as AdminRecord[]).map((record) => ({ ...record, role: record.role ?? "admin" }));
  } catch {
    return [];
  }
}

/** Permissions effectives d'un compte : admin = toutes ; commercial = stockées (ou défaut). */
function resolvePermissions(record: AdminRecord): PermissionKey[] {
  if (record.role === "admin") return [...ALL_PERMISSION_KEYS];
  return record.permissions ? sanitizePermissions(record.permissions) : [...DEFAULT_COMMERCIAL_PERMISSIONS];
}

export function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("hex");
}

export function buildAdminRecord(
  email: string,
  password: string,
  options: { name?: string; role?: StaffRole; permissions?: PermissionKey[] } = {}
): AdminRecord {
  const salt = randomBytes(16).toString("hex");
  const role = options.role ?? "admin";
  return {
    email: email.toLowerCase(),
    name: options.name,
    role,
    salt,
    hash: hashPassword(password, salt),
    // L'admin a tout : on ne stocke des permissions que pour un commercial.
    permissions:
      role === "admin" ? undefined : options.permissions ?? [...DEFAULT_COMMERCIAL_PERMISSIONS]
  };
}

export function getLocalAccount(
  email: string
): { email: string; name?: string; role: StaffRole; permissions: PermissionKey[] } | null {
  const record = readAdmins().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!record) return null;
  return { email: record.email, name: record.name, role: record.role, permissions: resolvePermissions(record) };
}

// --- Gestion des comptes (gouvernance, admin uniquement) ---

export type StaffAccount = { email: string; name?: string; role: StaffRole; permissions: PermissionKey[] };

function writeAdmins(records: AdminRecord[]) {
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

/** Liste des comptes sans données sensibles (ni hash ni sel), permissions résolues. */
export function listStaffAccounts(): StaffAccount[] {
  return readAdmins().map((record) => ({
    email: record.email,
    name: record.name,
    role: record.role,
    permissions: resolvePermissions(record)
  }));
}

/** Crée un compte salarié. Lève une erreur si l'email existe déjà. */
export function createStaffAccountRecord(
  email: string,
  password: string,
  options: { name?: string; role?: StaffRole; permissions?: PermissionKey[] } = {}
) {
  const records = readAdmins();
  if (records.some((record) => record.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Un compte avec cet email existe déjà.");
  }
  records.push(buildAdminRecord(email, password, options));
  writeAdmins(records);
}

/** Change le rôle d'un compte. Garantit qu'il reste au moins un administrateur. */
export function updateStaffRoleRecord(email: string, role: StaffRole) {
  const records = readAdmins();
  const target = records.find((record) => record.email.toLowerCase() === email.toLowerCase());
  if (!target) throw new Error("Compte introuvable.");
  const adminCount = records.filter((record) => record.role === "admin").length;
  if (target.role === "admin" && role !== "admin" && adminCount <= 1) {
    throw new Error("Il doit rester au moins un administrateur.");
  }
  target.role = role;
  if (role === "admin") {
    target.permissions = undefined; // admin = toutes les permissions
  } else if (!target.permissions) {
    target.permissions = [...DEFAULT_COMMERCIAL_PERMISSIONS];
  }
  writeAdmins(records);
}

/** Met à jour les permissions d'un commercial (sans effet sur un admin). */
export function updateStaffPermissionsRecord(email: string, permissions: PermissionKey[]) {
  const records = readAdmins();
  const target = records.find((record) => record.email.toLowerCase() === email.toLowerCase());
  if (!target) throw new Error("Compte introuvable.");
  if (target.role === "admin") {
    throw new Error("Un administrateur possède déjà toutes les permissions.");
  }
  target.permissions = sanitizePermissions(permissions);
  writeAdmins(records);
}

/** Réinitialise le mot de passe d'un compte. */
export function resetStaffPasswordRecord(email: string, password: string) {
  const records = readAdmins();
  const target = records.find((record) => record.email.toLowerCase() === email.toLowerCase());
  if (!target) throw new Error("Compte introuvable.");
  target.salt = randomBytes(16).toString("hex");
  target.hash = hashPassword(password, target.salt);
  writeAdmins(records);
}

/** Supprime un compte. Empêche la suppression du dernier administrateur. */
export function removeStaffAccountRecord(email: string) {
  const records = readAdmins();
  const target = records.find((record) => record.email.toLowerCase() === email.toLowerCase());
  if (!target) throw new Error("Compte introuvable.");
  const adminCount = records.filter((record) => record.role === "admin").length;
  if (target.role === "admin" && adminCount <= 1) {
    throw new Error("Impossible de supprimer le dernier administrateur.");
  }
  writeAdmins(records.filter((record) => record.email.toLowerCase() !== email.toLowerCase()));
}

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyCredentials(email: string, password: string) {
  const record = readAdmins().find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!record) return false;
  return safeEqualHex(hashPassword(password, record.salt), record.hash);
}

export function createSessionToken(email: string) {
  const payload = `${email}|${Date.now() + SESSION_TTL_MS}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined): string | null {
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

/** Email du salarié connecté (via cookie de session), ou null. */
export async function getLocalAdminEmail(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(LOCAL_SESSION_COOKIE)?.value);
}

/** Salarié connecté avec son rôle et ses permissions, ou null. */
export async function getLocalStaff(): Promise<{
  email: string;
  name?: string;
  role: StaffRole;
  permissions: PermissionKey[];
} | null> {
  const email = await getLocalAdminEmail();
  if (!email) return null;
  return getLocalAccount(email);
}
