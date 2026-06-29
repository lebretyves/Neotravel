"use server";

import { revalidatePath } from "next/cache";
import type { PricingRules } from "@/lib/domain/types";
import { saveActivePricingRules } from "@/lib/pricing/pricing-matrix-store";
import { defaultPricingRules } from "@/lib/pricing/pricing-matrix-serializer";
import { getStaffSession, sessionHasPermission } from "@/shared/lib/auth/requireAdmin";

export type PricingActionResult = { ok: boolean; error?: string; message?: string };

const PRICING_PATH = "/dashboard/pricing";

function parsePricingRules(input: unknown): PricingRules | null {
  if (!input || typeof input !== "object") return null;
  const rules = input as PricingRules;

  if (
    !Array.isArray(rules.forfaitDistanceGrid) ||
    !Number.isFinite(rules.longDistanceRatePerKmPerLeg) ||
    !Number.isFinite(rules.marginRate) ||
    !Number.isFinite(rules.vatRate)
  ) {
    return null;
  }

  return rules;
}

async function guard(): Promise<string | null> {
  const session = await getStaffSession();
  if (!session) return "Session expirée.";
  if (!sessionHasPermission(session, "pricing")) return "Permission tarification requise.";
  return null;
}

export async function savePricingMatrixAction(input: unknown): Promise<PricingActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  const rules = parsePricingRules(input);
  if (!rules) return { ok: false, error: "Format tarifaire invalide." };

  if (rules.marginRate < 0 || rules.marginRate > 1 || rules.vatRate < 0 || rules.vatRate > 1) {
    return { ok: false, error: "Marge et TVA doivent être comprises entre 0 et 100 %." };
  }

  try {
    const { mode } = await saveActivePricingRules(rules);
    revalidatePath(PRICING_PATH);
    revalidatePath("/admin/pricing");

    const storageLabel =
      mode === "supabase" ? "base Supabase" : mode === "file" ? "fichier local pricing-matrix.json" : "valeurs par défaut";

    return {
      ok: true,
      message: `Tarifs enregistrés (${storageLabel}). Les prochains devis utiliseront ces valeurs.`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, error: `Impossible d'enregistrer les tarifs : ${message}` };
  }
}

export async function resetPricingMatrixAction(): Promise<PricingActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };

  try {
    const defaults = defaultPricingRules();
    const { mode } = await saveActivePricingRules(defaults);
    revalidatePath(PRICING_PATH);
    revalidatePath("/admin/pricing");

    return {
      ok: true,
      message:
        mode === "supabase"
          ? "Tarifs réinitialisés aux valeurs par défaut (Supabase)."
          : "Tarifs réinitialisés aux valeurs par défaut."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { ok: false, error: `Réinitialisation impossible : ${message}` };
  }
}
