create extension if not exists pgcrypto;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text,
  organization text,
  email text not null,
  contact_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  client_type text,
  departure_city text,
  arrival_city text,
  departure_date date,
  return_date date,
  passenger_count integer,
  trip_type text,
  has_intermediate_stop boolean not null default false,
  intermediate_stops jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  free_message text,
  status text not null default 'NEW',
  missing_fields text[] not null default '{}'::text[],
  human_review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_trip_type_check check (trip_type in ('one_way', 'round_trip')),
  constraint leads_passenger_count_check check (passenger_count > 0),
  constraint leads_status_check check (
    status in (
      'NEW',
      'INCOMPLETE',
      'QUALIFIED',
      'HIGH_VALUE',
      'HUMAN_REVIEW',
      'QUOTE_READY',
      'QUOTE_SENT',
      'FOLLOWUP_SCHEDULED',
      'FOLLOWUP_1',
      'FOLLOWUP_2',
      'WON',
      'LOST',
      'CLOSED'
    )
  ),
  constraint leads_required_fields_for_qualified_status check (
    status not in ('QUALIFIED', 'QUOTE_READY', 'QUOTE_SENT', 'WON', 'LOST', 'CLOSED')
    or (
      departure_city is not null
      and arrival_city is not null
      and departure_date is not null
      and passenger_count is not null
      and trip_type is not null
    )
  )
);

create table if not exists pricing_matrices (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  is_active boolean not null default false,
  rules jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists pricing_matrices_one_active_idx
  on pricing_matrices (is_active)
  where is_active = true;

create table if not exists route_pricing (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique,
  departure_city text not null,
  arrival_city text not null,
  distance_km numeric not null,
  distance_source text not null default 'seed',
  distance_status text not null default 'resolved',
  created_at timestamptz not null default now(),
  constraint route_pricing_distance_km_check check (distance_km > 0),
  constraint route_pricing_distance_source_check check (distance_source in ('seed', 'api', 'manual')),
  constraint route_pricing_distance_status_check check (distance_status in ('resolved', 'failed', 'needs_review'))
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  quote_number text not null,
  distance_km numeric not null,
  distance_source text not null,
  price_ht numeric not null,
  vat_rate numeric not null default 0.10,
  tva_10pct numeric not null,
  price_ttc numeric not null,
  breakdown jsonb not null,
  deterministic_hash text not null unique,
  matrices_version text not null,
  status text not null default 'QUOTE_READY',
  pdf_url text,
  created_at timestamptz not null default now(),
  constraint quotes_distance_km_check check (distance_km > 0),
  constraint quotes_distance_source_check check (distance_source in ('seed', 'api', 'manual')),
  constraint quotes_amounts_check check (price_ht >= 0 and tva_10pct >= 0 and price_ttc >= 0),
  constraint quotes_status_check check (status in ('QUOTE_READY', 'QUOTE_SENT', 'CLOSED'))
);

create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  quote_id uuid references quotes(id) on delete set null,
  scheduled_at timestamptz not null,
  channel text not null default 'email',
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint followups_channel_check check (channel in ('email', 'phone', 'manual')),
  constraint followups_status_check check (status in ('scheduled', 'sent', 'cancelled'))
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on leads(status);
create index if not exists quotes_lead_id_idx on quotes(lead_id);
create index if not exists followups_scheduled_at_idx on followups(scheduled_at);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
before update on leads
for each row
execute function set_updated_at();

grant usage on schema public to service_role;
grant all on table clients to service_role;
grant all on table leads to service_role;
grant all on table pricing_matrices to service_role;
grant all on table route_pricing to service_role;
grant all on table quotes to service_role;
grant all on table followups to service_role;
grant all on table audit_logs to service_role;
