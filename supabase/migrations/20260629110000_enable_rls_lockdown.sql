-- Security lockdown: the anon role (public key, shipped to the browser) currently has full
-- read/write access to every public table because RLS is disabled. All legitimate access in
-- this app goes through the service_role key server-side, which BYPASSES RLS — so enabling RLS
-- with NO policies denies anon/authenticated entirely while keeping the app fully functional.
--
-- 1) Enable RLS on every table (no policy defined => deny-all for anon/authenticated).
-- 2) Revoke direct table privileges from the API roles (defense in depth).
-- 3) Stop future tables in `public` from auto-granting to the API roles.

alter table clients          enable row level security;
alter table leads            enable row level security;
alter table pricing_matrices enable row level security;
alter table route_pricing    enable row level security;
alter table quotes           enable row level security;
alter table followups        enable row level security;
alter table audit_logs       enable row level security;

revoke all on table
  clients,
  leads,
  pricing_matrices,
  route_pricing,
  quotes,
  followups,
  audit_logs
from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
