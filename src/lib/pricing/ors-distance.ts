const ORS_BASE = "https://api.openrouteservice.org";

type GeoPoint = [number, number];

type GeocodeResponse = {
  features?: Array<{ geometry: { coordinates: GeoPoint } }>;
};

type DirectionsResponse = {
  routes?: Array<{ summary: { distance: number } }>;
};

async function geocodeCity(city: string, apiKey: string): Promise<GeoPoint | null> {
  const url = `${ORS_BASE}/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(city)}&size=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) {
    console.error(`[ORS geocode] HTTP ${res.status} for "${city}"`);
    return null;
  }
  const data = (await res.json()) as GeocodeResponse;
  const coords = data.features?.[0]?.geometry?.coordinates ?? null;
  if (!coords) console.error(`[ORS geocode] no features for "${city}"`);
  return coords;
}

async function getDrivingDistanceKm(
  from: GeoPoint,
  to: GeoPoint,
  apiKey: string,
): Promise<number | null> {
  const res = await fetch(`${ORS_BASE}/v2/directions/driving-car`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [from, to] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ORS directions] HTTP ${res.status}: ${body.slice(0, 200)}`);
    return null;
  }
  const data = (await res.json()) as DirectionsResponse;
  const meters = data.routes?.[0]?.summary?.distance;
  if (meters == null) console.error("[ORS directions] response has no routes[0].summary.distance", JSON.stringify(data).slice(0, 200));
  return meters != null ? Math.round(meters / 1000) : null;
}

export async function resolveDistanceViaOrs(
  departureCity: string,
  arrivalCity: string,
): Promise<number | null> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) return null;

  try {
    const [from, to] = await Promise.all([
      geocodeCity(departureCity, apiKey),
      geocodeCity(arrivalCity, apiKey),
    ]);
    if (!from || !to) return null;
    return getDrivingDistanceKm(from, to, apiKey);
  } catch {
    return null;
  }
}
