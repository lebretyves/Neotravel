alter table clients add column if not exists contact_name text;
alter table clients add column if not exists phone text;
alter table leads add column if not exists client_type text;
