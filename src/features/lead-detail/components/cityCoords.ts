// Coordonnées [lng, lat] (format GeoJSON / OSRM) des principales villes.
//
// SCAFFOLD : lookup statique pour la démo. Pour couvrir TOUTES les villes,
// brancher ici un géocodage réel (OpenRouteService / Nominatim) — l'infra
// distance du projet (src/shared/lib/distance) peut servir de point d'entrée.
const CITY_COORDS: Record<string, [number, number]> = {
 paris: [2.3522, 48.8566],
 lyon: [4.8357, 45.764],
 marseille: [5.3698, 43.2965],
 bordeaux: [-0.5792, 44.8378],
 lille: [3.0573, 50.6292],
 nantes: [-1.5536, 47.2184],
 toulouse: [1.4442, 43.6047],
 montpellier: [3.8767, 43.6108],
 nice: [7.262, 43.7102],
 strasbourg: [7.7521, 48.5734],
 rennes: [-1.6778, 48.1173],
 grenoble: [5.7245, 45.1885],
 "marne-la-vallee": [2.7833, 48.85],
 disney: [2.7833, 48.85],
 disneyland: [2.7833, 48.85]
};

function normalize(city: string) {
 return city
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "");
}

/** Renvoie [lng, lat] pour une ville connue, sinon null (à géocoder). */
export function resolveCityCoords(city: string | null | undefined): [number, number] | null {
 if (!city) return null;
 return CITY_COORDS[normalize(city)] ?? null;
}
