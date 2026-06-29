update pricing_matrices
set is_active = false
where version <> 'v1';

insert into pricing_matrices (version, is_active, rules)
values (
  'v1',
  true,
  '{
    "forfait_distance_grid": [
      { "distance_km": 10, "price_eur": 250 },
      { "distance_km": 20, "price_eur": 250 },
      { "distance_km": 30, "price_eur": 250 },
      { "distance_km": 40, "price_eur": 320 },
      { "distance_km": 50, "price_eur": 350 },
      { "distance_km": 60, "price_eur": 390 },
      { "distance_km": 70, "price_eur": 430 },
      { "distance_km": 80, "price_eur": 500 },
      { "distance_km": 90, "price_eur": 540 },
      { "distance_km": 100, "price_eur": 580 },
      { "distance_km": 110, "price_eur": 620 },
      { "distance_km": 120, "price_eur": 660 },
      { "distance_km": 130, "price_eur": 700 },
      { "distance_km": 140, "price_eur": 740 },
      { "distance_km": 150, "price_eur": 780 },
      { "distance_km": 160, "price_eur": 820 },
      { "distance_km": 170, "price_eur": 860 },
      { "distance_km": 180, "price_eur": 900 }
    ],
    "long_distance": {
      "multiplier": 2,
      "price_per_km": 2.5
    },
    "seasonality": {
      "low": { "months": [11, 1, 2, 8], "coefficient": -0.07 },
      "medium": { "months": [12, 10, 9], "coefficient": 0 },
      "high": { "months": [3, 4, 7], "coefficient": 0.10 },
      "very_high": { "months": [5, 6], "coefficient": 0.15 }
    },
    "departure_delay": {
      "priority": { "max_days_inclusive": 14, "coefficient": 0.10 },
      "urgent": { "min_days_exclusive": 14, "max_days_inclusive": 30, "coefficient": 0.05 },
      "normal": { "min_days_exclusive": 30, "max_days_inclusive": 90, "coefficient": -0.05 },
      "three_months_plus": { "min_days_exclusive": 90, "coefficient": -0.10 }
    },
    "capacity": [
      { "max_passengers_inclusive": 19, "coefficient": -0.05 },
      { "min_passengers_exclusive": 19, "max_passengers_inclusive": 53, "coefficient": 0 },
      { "min_passengers_exclusive": 53, "max_passengers_inclusive": 63, "coefficient": 0.15 },
      { "min_passengers_exclusive": 63, "max_passengers_inclusive": 67, "coefficient": 0.20 },
      { "min_passengers_exclusive": 67, "max_passengers_inclusive": 85, "coefficient": 0.40 }
    ],
    "margin_rate": 0.15,
    "vat_rate": 0.10
  }'::jsonb
)
on conflict (version) do update
set is_active = excluded.is_active,
    rules = excluded.rules;

insert into route_pricing (route_key, departure_city, arrival_city, distance_km, distance_source, distance_status)
values
  ('paris__lyon', 'Paris', 'Lyon', 465, 'seed', 'resolved'),
  ('lyon__paris', 'Lyon', 'Paris', 465, 'seed', 'resolved'),
  ('paris__lille', 'Paris', 'Lille', 225, 'seed', 'resolved'),
  ('lille__paris', 'Lille', 'Paris', 225, 'seed', 'resolved'),
  ('paris__rouen', 'Paris', 'Rouen', 135, 'seed', 'resolved'),
  ('rouen__paris', 'Rouen', 'Paris', 135, 'seed', 'resolved')
on conflict (route_key) do update
set departure_city = excluded.departure_city,
    arrival_city = excluded.arrival_city,
    distance_km = excluded.distance_km,
    distance_source = excluded.distance_source,
    distance_status = excluded.distance_status;

insert into clients (id, name, organization, email)
values (
  '00000000-0000-4000-8000-000000000001',
  'Camille Martin',
  'Lycée Démo NeoTravel',
  'camille.martin@example.com'
)
on conflict (id) do update
set name = excluded.name,
    organization = excluded.organization,
    email = excluded.email;

insert into leads (
  id,
  client_id,
  departure_city,
  arrival_city,
  departure_date,
  return_date,
  passenger_count,
  trip_type,
  options,
  free_message,
  status,
  missing_fields
)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'Paris',
  'Rouen',
  '2026-09-15',
  null,
  42,
  'one_way',
  '{}'::jsonb,
  'Sortie scolaire de démonstration.',
  'QUALIFIED',
  '{}'::text[]
)
on conflict (id) do update
set client_id = excluded.client_id,
    departure_city = excluded.departure_city,
    arrival_city = excluded.arrival_city,
    departure_date = excluded.departure_date,
    return_date = excluded.return_date,
    passenger_count = excluded.passenger_count,
    trip_type = excluded.trip_type,
    options = excluded.options,
    free_message = excluded.free_message,
    status = excluded.status,
    missing_fields = excluded.missing_fields;
