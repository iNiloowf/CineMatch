-- In-app “Less motion” preference (Settings). Run against your Supabase project before shipping the client change that selects this column.
alter table public.settings
  add column if not exists reduce_motion boolean not null default false;
