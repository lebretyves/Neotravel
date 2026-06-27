import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { DistanceCacheEntry } from "@/shared/lib/distance/distanceSchemas";
import { normalizeLocationLabel } from "@/shared/lib/distance/distanceProvider";

function toCamel(row: Record<string, unknown>): DistanceCacheEntry {
 return {
  id: String(row.id),
  departureLabel: String(row.departure_label),
  arrivalLabel: String(row.arrival_label),
  departureNormalized: String(row.departure_normalized),
  arrivalNormalized: String(row.arrival_normalized),
  distanceKm: Number(row.distance_km),
  durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
  provider: row.provider as DistanceCacheEntry["provider"],
  source: row.source as DistanceCacheEntry["source"],
  providerStatus: String(row.provider_status),
  confidence: Number(row.confidence),
  calculatedAt: String(row.calculated_at),
  expiresAt: String(row.expires_at)
 };
}

export async function findDistanceCache(departureLabel: string, arrivalLabel: string) {
 const departure = normalizeLocationLabel(departureLabel);
 const arrival = normalizeLocationLabel(arrivalLabel);

 if (shouldUseDemoData()) return demoStore.findDistanceCache(departure, arrival);

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("route_pricing")
  .select("id, departure_city, arrival_city, distance_km, distance_source, distance_status, created_at")
  .or(`and(departure_city.ilike.${departureLabel},arrival_city.ilike.${arrivalLabel}),and(departure_city.ilike.${arrivalLabel},arrival_city.ilike.${departureLabel})`)
  .limit(1)
  .maybeSingle();

 if (error) throw error;
 if (!data) return null;

 const now = new Date().toISOString();
 return toCamel({
  id: data.id,
  departure_label: data.departure_city,
  arrival_label: data.arrival_city,
  departure_normalized: departure,
  arrival_normalized: arrival,
  distance_km: data.distance_km,
  duration_minutes: null,
  provider: "manual",
  source: data.distance_source ?? "seed",
  provider_status: data.distance_status ?? "resolved",
  confidence: 1,
  calculated_at: data.created_at ?? now,
  expires_at: now
 });
}

export async function createDistanceCache(input: DistanceCacheEntry) {
 if (shouldUseDemoData()) return demoStore.createDistanceCache(input);
 return input;
}
