import { createServerSupabaseClient, getMissingSupabaseServerEnv } from "@/lib/supabase/server";
import { loadActivePricingRules } from "@/lib/pricing/pricing-matrix-store";
import { pricingRulesToRaw } from "@/lib/pricing/pricing-matrix-serializer";

type PricingMatrixRules = {
  forfait_distance_grid?: unknown[];
  long_distance?: { price_per_km?: number };
  seasonality?: { very_high?: { coefficient?: number } };
  margin_rate?: number;
  vat_rate?: number;
};

export async function getPricingAdminData() {
  const rules = await loadActivePricingRules();
  const raw = pricingRulesToRaw(rules);
  const version = rules.version;

  let routePricing: Array<{
    routeKey: string;
    departureCity: string;
    arrivalCity: string;
    distanceKm: number;
    basePriceEur: number;
    active: boolean;
    version: string;
  }> = [];

  if (getMissingSupabaseServerEnv().length === 0) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("route_pricing")
        .select("route_key, departure_city, arrival_city, distance_km, base_price_eur, distance_status")
        .order("route_key", { ascending: true });

      if (!error && data) {
        routePricing = data.map((route) => ({
          routeKey: route.route_key,
          departureCity: route.departure_city,
          arrivalCity: route.arrival_city,
          distanceKm: Number(route.distance_km),
          basePriceEur: (route as { base_price_eur?: number }).base_price_eur ?? 0,
          active: route.distance_status === "resolved",
          version
        }));
      }
    } catch {
      // Routes optionnelles hors Supabase.
    }
  }

  const matrixRules = raw as PricingMatrixRules;

  return {
    pricingVersion: version,
    pricingRules: [
      {
        key: "forfait_distance_grid",
        ruleType: "grille",
        label: "Grille forfaitaire distance",
        value: matrixRules.forfait_distance_grid?.length ?? rules.forfaitDistanceGrid.length,
        unit: "paliers",
        active: true,
        version,
        metadata: { source: "pricing_matrices" }
      },
      {
        key: "long_distance_rate",
        ruleType: "tarif",
        label: "Longue distance",
        value: rules.longDistanceRatePerKmPerLeg,
        unit: "eur/km",
        active: true,
        version,
        metadata: { source: "pricing_matrices" }
      },
      {
        key: "season_very_high",
        ruleType: "coefficient",
        label: "Très haute saison",
        value: rules.seasonality.veryHigh.coefficient,
        unit: "rate",
        active: true,
        version,
        metadata: { source: "pricing_matrices" }
      },
      {
        key: "margin_rate",
        ruleType: "marge",
        label: "Marge",
        value: rules.marginRate,
        unit: "rate",
        active: true,
        version,
        metadata: { source: "pricing_matrices" }
      },
      {
        key: "vat_rate",
        ruleType: "TVA",
        label: "TVA",
        value: rules.vatRate,
        unit: "rate",
        active: true,
        version,
        metadata: { source: "pricing_matrices" }
      }
    ],
    routePricing
  };
}
