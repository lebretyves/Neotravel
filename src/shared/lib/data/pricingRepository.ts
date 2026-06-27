import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";

type PricingRuleRow = {
 key: string;
 ruleType: string;
 label: string;
 value: unknown;
 unit: string;
 active: boolean;
 version: number;
 metadata?: Record<string, unknown>;
};

type RoutePricingRow = {
 routeKey: string;
 departureCity: string;
 arrivalCity: string;
 distanceKm: number | null;
 basePriceEur: number;
 active: boolean;
 version: number;
};

type PricingMatrixRow = {
 version: string;
 is_active: boolean;
 rules: Record<string, unknown>;
};

function pricingMatrixToRules(matrix: PricingMatrixRow): PricingRuleRow[] {
 return Object.entries(matrix.rules ?? {}).map(([key, value]) => ({
  key,
  ruleType: "matrix",
  label: key,
  value,
  unit: typeof value === "number" && key.toLowerCase().includes("rate") ? "rate" : "eur",
  active: matrix.is_active,
  version: Number.parseInt(matrix.version.replace(/\D/g, ""), 10) || 1,
  metadata: { source: "pricing_matrices", matrixVersion: matrix.version }
 }));
}

export async function listPricingRules(): Promise<PricingRuleRow[]> {
 if (shouldUseDemoData()) return demoStore.listPricingRules();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("pricing_matrices")
  .select("version, is_active, rules")
  .order("is_active", { ascending: false })
  .order("created_at", { ascending: false })
  .limit(1);

 if (error) throw error;
 return ((data ?? []) as PricingMatrixRow[]).flatMap(pricingMatrixToRules);
}

export async function listRoutePricing(): Promise<RoutePricingRow[]> {
 if (shouldUseDemoData()) return demoStore.listRoutePricing();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("route_pricing")
  .select("departure_city, arrival_city, distance_km, base_price_eur, active, version")
  .order("departure_city", { ascending: true })
  .order("version", { ascending: false });

 if (error) throw error;
 return data.map((route) => ({
  routeKey: `${route.departure_city.toLowerCase()}__${route.arrival_city.toLowerCase()}`,
  departureCity: route.departure_city,
  arrivalCity: route.arrival_city,
  distanceKm: route.distance_km,
  basePriceEur: route.base_price_eur ?? 0,
  active: route.active ?? true,
  version: route.version ?? 1
 }));
}
