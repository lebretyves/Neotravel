"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { resolveCityCoords } from "./cityCoords";
import styles from "./leadMap.module.css";

type Props = {
 departureCity: string | null;
 arrivalCity: string | null;
};

function pinHtml(color: string, label: string) {
 return `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:900">${label}</span></span>`;
}

export function LeadRouteMap({ departureCity, arrivalCity }: Props) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [routed, setRouted] = useState<boolean | null>(null);

 const from = resolveCityCoords(departureCity);
 const to = resolveCityCoords(arrivalCity);

 useEffect(() => {
  if (!containerRef.current || !from || !to) return;

  let map: LeafletMap | undefined;
  let cancelled = false;

  (async () => {
   const L = (await import("leaflet")).default;
   if (cancelled || !containerRef.current) return;

   map = L.map(containerRef.current, { scrollWheelZoom: false });
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap"
   }).addTo(map);

   const a: [number, number] = [from[1], from[0]];
   const b: [number, number] = [to[1], to[0]];

   L.marker(a, { icon: L.divIcon({ className: "", html: pinHtml("#123885", "D"), iconSize: [26, 26], iconAnchor: [13, 26] }) })
    .addTo(map)
    .bindPopup(`Départ · ${departureCity ?? ""}`);
   L.marker(b, { icon: L.divIcon({ className: "", html: pinHtml("#d51b29", "A"), iconSize: [26, 26], iconAnchor: [13, 26] }) })
    .addTo(map)
    .bindPopup(`Arrivée · ${arrivalCity ?? ""}`);

   // Vrai tracé routier via OSRM public (sans clé API).
   // TODO prod : basculer sur un serveur OSRM / OpenRouteService dédié.
   let routeLatLngs: [number, number][] = [a, b];
   let realRoute = false;
   try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    const coords: number[][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) {
     routeLatLngs = coords.map((c) => [c[1], c[0]] as [number, number]);
     realRoute = true;
    }
   } catch {
    // Réseau indisponible : on garde la ligne directe.
   }
   if (cancelled || !map) return;

   const line = L.polyline(routeLatLngs, {
    color: "#123885",
    weight: 4,
    opacity: 0.85,
    dashArray: realRoute ? undefined : "8 8"
   }).addTo(map);

   map.fitBounds(line.getBounds(), { padding: [30, 30] });
   setRouted(realRoute);
  })();

  return () => {
   cancelled = true;
   if (map) map.remove();
  };
 }, [from, to, departureCity, arrivalCity]);

 if (!from || !to) {
  const missing = !from ? departureCity : arrivalCity;
  return (
   <div className={styles.fallback}>
    <strong>Aperçu cartographique indisponible</strong>
    <span>
     {missing
      ? `La ville « ${missing} » n’est pas encore localisée dans la carte interne.`
      : "Ville de départ ou d’arrivée à confirmer."}
    </span>
   </div>
  );
 }

 return (
  <div className={styles.wrap}>
   <div ref={containerRef} className={styles.map} aria-label={`Trajet ${departureCity} vers ${arrivalCity}`} />
   <p className={styles.caption}>
    {routed === false
     ? "Tracé direct (routing indisponible) — départ et arrivée géolocalisés."
     : "Tracé routier réel (OpenStreetMap / OSRM)."}
   </p>
  </div>
 );
}
