-- So Supabase Realtime (postgres_changes) can broadcast friend link inserts/updates to both users
-- under RLS. Safe to re-run: skip if table is already in the publication.

do $$
begin
  if not exists (select 1 from pg_publication p where p.pubname = 'supabase_realtime') then
    return;
  end if;
  if exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'linked_users'
  ) then
    return;
  end if;
  execute 'alter publication supabase_realtime add table public.linked_users';
end;
$$;

-- Improve change payloads for updates (e.g. pending -> accepted) with RLS
alter table public.linked_users replica identity full;
