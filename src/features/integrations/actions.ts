"use server";

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isAdminRoleAuthorized } from "@/shared/lib/auth/requireAdmin";
import { ALLOWED_ENV_KEYS } from "./integrations";

const ENV_PATH = resolve(process.cwd(), ".env.local");

function parseEnv(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return map;
}

/**
 * Écrit les variables d'intégration dans .env.local (admin uniquement).
 * Les clés non whitelistées et les valeurs vides sont ignorées.
 * Un redémarrage du serveur est nécessaire pour prise en compte.
 */
export async function saveIntegrationEnv(
  values: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdminRoleAuthorized())) {
    return { ok: false, error: "Réservé aux administrateurs." };
  }

  let existing: Record<string, string> = {};
  try {
    existing = parseEnv(readFileSync(ENV_PATH, "utf8"));
  } catch {
    existing = {};
  }

  let changed = 0;
  for (const [key, value] of Object.entries(values)) {
    if (!ALLOWED_ENV_KEYS.has(key) || typeof value !== "string") continue;
    const next = value.trim();
    if (next.length === 0) continue; // ne pas écraser avec une valeur vide
    existing[key] = next;
    changed += 1;
  }

  if (changed === 0) {
    return { ok: false, error: "Aucune valeur à enregistrer." };
  }

  const output = `${Object.entries(existing)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;

  try {
    writeFileSync(ENV_PATH, output, "utf8");
  } catch {
    return { ok: false, error: "Écriture du fichier .env.local impossible." };
  }

  return { ok: true };
}
