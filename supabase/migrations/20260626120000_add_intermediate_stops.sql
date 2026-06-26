alter table leads
  add column if not exists has_intermediate_stop boolean not null default false,
  add column if not exists intermediate_stops jsonb not null default '[]'::jsonb;
