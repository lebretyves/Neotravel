import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import type { PricingRules } from "../domain/types";
import { getMissingSupabaseServerEnv } from "../supabase/server";
import { createServerSupabaseClient } from "../supabase/server";
import {
  defaultPricingRules,
  pricingRulesToRaw,
  rawToPricingRules,
  type RawPricingMatrix
} from "./pricing-matrix-serializer";

const MATRIX_FILE = resolve(process.cwd(), "pricing-matrix.json");

export type PricingStorageMode = "supabase" | "file" | "defaults";

type StoredMatrixFile = {
  version: string;
  rules: RawPricingMatrix;
  updatedAt?: string;
};

function canUseSupabase(): boolean {
  if (shouldUseDemoData()) return false;
  return getMissingSupabaseServerEnv().length === 0;
}

export function getPricingStorageMode(): PricingStorageMode {
  if (canUseSupabase()) return "supabase";
  if (existsSync(MATRIX_FILE)) return "file";
  return "defaults";
}

function readFileMatrix(): PricingRules | null {
  if (!existsSync(MATRIX_FILE)) return null;

  try {
    const parsed = JSON.parse(readFileSync(MATRIX_FILE, "utf8")) as StoredMatrixFile;
    if (!parsed?.rules) return null;
    return rawToPricingRules(parsed.version, parsed.rules);
  } catch {
    return null;
  }
}

function writeFileMatrix(rules: PricingRules) {
  const payload: StoredMatrixFile = {
    version: rules.version,
    rules: pricingRulesToRaw(rules),
    updatedAt: new Date().toISOString()
  };
  writeFileSync(MATRIX_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function loadActivePricingRules(): Promise<PricingRules> {
  if (canUseSupabase()) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("pricing_matrices")
        .select("version, rules")
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data?.rules) {
        return rawToPricingRules(data.version, data.rules as RawPricingMatrix);
      }
    } catch {
      // Fallback fichier ou défauts ci-dessous.
    }
  }

  return readFileMatrix() ?? defaultPricingRules();
}

export async function saveActivePricingRules(rules: PricingRules): Promise<{ mode: PricingStorageMode }> {
  const raw = pricingRulesToRaw(rules);

  if (canUseSupabase()) {
    const supabase = createServerSupabaseClient();
    const { data, error: loadError } = await supabase
      .from("pricing_matrices")
      .select("id, version")
      .eq("is_active", true)
      .maybeSingle();

    if (!loadError && data?.id) {
      const { error } = await supabase.from("pricing_matrices").update({ rules: raw }).eq("id", data.id);
      if (!error) return { mode: "supabase" };
    }

    const version = rules.version || `dashboard-${new Date().toISOString().slice(0, 10)}`;
    await supabase.from("pricing_matrices").update({ is_active: false }).eq("is_active", true);
    const { error: insertError } = await supabase
      .from("pricing_matrices")
      .insert({ version, is_active: true, rules: raw });

    if (!insertError) return { mode: "supabase" };
  }

  writeFileMatrix(rules);
  return { mode: "file" };
}
