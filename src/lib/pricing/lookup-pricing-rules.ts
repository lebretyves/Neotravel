import type { PricingRules } from "../domain/types";
import { loadActivePricingRules } from "./pricing-matrix-store";

export async function lookupActivePricingRules(): Promise<PricingRules> {
  return loadActivePricingRules();
}
