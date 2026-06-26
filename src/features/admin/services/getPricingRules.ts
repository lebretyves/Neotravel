import { createServerSupabaseClient } from "@/lib/supabase/server";

type PricingMatrixRules = {
  forfait_distance_grid?: unknown[];
  long_distance?: { price_per_km?: number };
  seasonality?: { very_high?: { coefficient?: number } };
  margin_rate?: number;
  vat_rate?: number;
};

export async function getPricingAdminData() {
  const supabase = createServerSupabaseClient();
  const [matrixResult, routesResult] = await Promise.all([
    supabase
      .from("pricing_matrices")
      .select("version, rules")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("route_pricing")
      .select("route_key, departure_city, arrival_city, distance_km, base_price_eur, distance_status")
      .order("route_key", { ascending: true }),
  ]);

  if (matrixResult.error) throw new Error(`Unable to load pricing matrix: ${matrixResult.error.message}`);
  if (routesResult.error) throw new Error(`Unable to load routes: ${routesResult.error.message}`);

  const rules = (matrixResult.data?.rules ?? {}) as PricingMatrixRules;
  const version = matrixResult.data?.version ?? "non disponible";

  return {
    pricingVersion: version,
    pricingRules: [
      {
        key: "forfait_distance_grid",
        ruleType: "grille",
        label: "Grille forfaitaire distance",
        value: rules.forfait_distance_grid?.length ?? 0,
        unit: "paliers",
        active: Boolean(matrixResult.data),
        version,
        metadata: { source: "pricing_matrices" },
      },
      {
        key: "long_distance_rate",
        ruleType: "tarif",
        label: "Longue distance",
        value: rules.long_distance?.price_per_km ?? 0,
        unit: "eur/km",
        active: Boolean(matrixResult.data),
        version,
        metadata: { source: "pricing_matrices" },
      },
      {
        key: "season_very_high",
        ruleType: "coefficient",
        label: "Très haute saison",
        value: rules.seasonality?.very_high?.coefficient ?? 0,
        unit: "rate",
        active: Boolean(matrixResult.data),
        version,
        metadata: { source: "pricing_matrices" },
      },
      {
        key: "margin_rate",
        ruleType: "marge",
        label: "Marge",
        value: rules.margin_rate ?? 0,
        unit: "rate",
        active: Boolean(matrixResult.data),
        version,
        metadata: { source: "pricing_matrices" },
      },
      {
        key: "vat_rate",
        ruleType: "TVA",
        label: "TVA",
        value: rules.vat_rate ?? 0,
        unit: "rate",
        active: Boolean(matrixResult.data),
        version,
        metadata: { source: "pricing_matrices" },
      },
    ],
    routePricing: (routesResult.data ?? []).map((route) => ({
      routeKey: route.route_key,
      departureCity: route.departure_city,
      arrivalCity: route.arrival_city,
      distanceKm: Number(route.distance_km),
      basePriceEur: (route as { base_price_eur?: number }).base_price_eur ?? 0,
      active: route.distance_status === "resolved",
      version,
    })),
  };
}
