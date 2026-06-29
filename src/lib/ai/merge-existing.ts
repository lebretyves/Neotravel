import type { LeadQualification } from "../domain/schemas";
import type { LeadRecord } from "../leads/lead-service";

/** Rebuild a LeadQualification from the nullable persisted lead fields. */
export function buildExistingQualification(existing: LeadRecord): LeadQualification {
  return {
    name: existing.name ?? existing.contact_name ?? undefined,
    contact_name: existing.contact_name ?? existing.name ?? undefined,
    client_type: existing.client_type ?? undefined,
    organization: existing.organization ?? undefined,
    email: existing.email ?? undefined,
    phone: existing.phone ?? undefined,
    departure_city: existing.departure_city ?? undefined,
    arrival_city: existing.arrival_city ?? undefined,
    departure_date: existing.departure_date ?? undefined,
    return_date: existing.return_date ?? undefined,
    passenger_count: existing.passenger_count ?? undefined,
    trip_type: existing.trip_type ?? undefined,
    has_intermediate_stop: existing.has_intermediate_stop || undefined,
    intermediate_stops:
      existing.intermediate_stops?.length ? existing.intermediate_stops : undefined,
    options: existing.options ?? undefined,
    free_message: existing.free_message ?? undefined,
  };
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

/**
 * Merge an incoming partial qualification over an existing one WITHOUT ever
 * letting an empty incoming value (null/undefined/blank) erase a known value.
 * An incoming field only wins when it carries a real value.
 */
export function mergeLead(
  existing: LeadQualification,
  incoming: Partial<LeadQualification>,
): LeadQualification {
  const merged: LeadQualification = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "has_intermediate_stop") {
      if (value === true) {
        merged.has_intermediate_stop = true;
      }
      continue;
    }

    if (key === "intermediate_stops" && Array.isArray(value)) {
      const knownStops = Array.isArray(merged.intermediate_stops)
        ? merged.intermediate_stops
        : [];
      const combinedStops = uniqueStops([...knownStops, ...value]);

      if (combinedStops.length > 0) {
        merged.intermediate_stops = combinedStops;
        merged.has_intermediate_stop = true;
      }
      continue;
    }

    if (!isEmptyValue(value)) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

function uniqueStops(stops: string[]): string[] {
  const seen = new Set<string>();

  return stops.filter((stop) => {
    const normalized = stop.trim().toLocaleLowerCase("fr-FR");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
