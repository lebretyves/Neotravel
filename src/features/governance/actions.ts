"use server";

import { revalidatePath } from "next/cache";
import {
  createStaffAccountRecord,
  isLocalAuthEnabled,
  removeStaffAccountRecord,
  resetStaffPasswordRecord,
  updateStaffPermissionsRecord,
  updateStaffRoleRecord,
  type StaffRole
} from "@/shared/lib/auth/localAuth";
import { sanitizePermissions } from "@/shared/lib/auth/permissions";
import { getStaffSession, isAdminRoleAuthorized } from "@/shared/lib/auth/requireAdmin";

export type GovernanceResult = { ok: boolean; error?: string; message?: string };

const GOVERNANCE_PATH = "/dashboard/equipe-roles";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalizeRole(role: string): StaffRole {
  return role === "admin" ? "admin" : "commercial";
}

/** Garde commune : admin connecté + mode auth locale (où les comptes sont gérables). */
async function guard(): Promise<string | null> {
  if (!(await isAdminRoleAuthorized())) return "Réservé aux administrateurs.";
  if (!isLocalAuthEnabled()) return "La gestion des comptes est disponible en authentification locale.";
  return null;
}

export async function createStaffAccountAction(input: {
  name?: string;
  email: string;
  password: string;
  role: string;
}): Promise<GovernanceResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Adresse email invalide." };
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  try {
    createStaffAccountRecord(email, input.password, {
      name: input.name?.trim() || undefined,
      role: normalizeRole(input.role)
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Création impossible." };
  }

  revalidatePath(GOVERNANCE_PATH);
  return { ok: true, message: `Compte « ${email} » créé.` };
}

export async function updateStaffRoleAction(email: string, role: string): Promise<GovernanceResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    updateStaffRoleRecord(email, normalizeRole(role));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Modification impossible." };
  }

  revalidatePath(GOVERNANCE_PATH);
  return { ok: true, message: "Rôle mis à jour." };
}

export async function updateStaffPermissionsAction(
  email: string,
  permissions: string[]
): Promise<GovernanceResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    updateStaffPermissionsRecord(email, sanitizePermissions(permissions));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mise à jour impossible." };
  }

  revalidatePath(GOVERNANCE_PATH);
  return { ok: true, message: "Permissions mises à jour." };
}

export async function resetStaffPasswordAction(email: string, password: string): Promise<GovernanceResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!password || password.length < 8) {
    return { ok: false, error: "Le mot de passe doit faire au moins 8 caractères." };
  }

  try {
    resetStaffPasswordRecord(email, password);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Réinitialisation impossible." };
  }

  revalidatePath(GOVERNANCE_PATH);
  return { ok: true, message: "Mot de passe réinitialisé." };
}

export async function deleteStaffAccountAction(email: string): Promise<GovernanceResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  // Empêche un admin de supprimer son propre compte (risque de verrouillage).
  const session = await getStaffSession();
  if (session?.email?.toLowerCase() === email.toLowerCase()) {
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  try {
    removeStaffAccountRecord(email);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Suppression impossible." };
  }

  revalidatePath(GOVERNANCE_PATH);
  return { ok: true, message: `Compte « ${email} » supprimé.` };
}
