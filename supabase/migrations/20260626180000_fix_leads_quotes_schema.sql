-- leads: add missing columns
alter table leads
  add column if not exists confidence numeric,
  add column if not exists ai_summary text,
  add column if not exists has_intermediate_stop boolean not null default false,
  add column if not exists intermediate_stops text[] not null default '{}';

-- leads: progressive qualification inserts nulls before fields are collected
alter table leads
  alter column departure_city drop not null,
  alter column arrival_city drop not null,
  alter column departure_date drop not null,
  alter column passenger_count drop not null,
  alter column trip_type drop not null;

-- leads: drop pax > 0 check — pax can be null during qualification
alter table leads drop constraint if exists leads_passenger_count_check;

-- quotes: add missing columns
alter table quotes
  add column if not exists calculation jsonb,
  add column if not exists vat_amount numeric,
  add column if not exists currency text;

-- quotes: quoteRepository only inserts price_ht/vat_amount/price_ttc/breakdown/calculation/deterministic_hash
alter table quotes
  alter column distance_km drop not null,
  alter column distance_source drop not null,
  alter column tva_10pct drop not null,
  alter column matrices_version drop not null,
  alter column breakdown drop not null;
