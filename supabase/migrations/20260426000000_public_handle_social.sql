-- Public handle (User ID) for search + friend requests. Replaces invite-link-only discovery of other users.
-- - Unique, stored lowercase; display uses same string.
-- - Backfill: user_NNNNN (5 random digits) with collision retries.
-- - Profile visibility: users linked by pending or accepted can see each other's profile row (for friend request UI).

alter table public.profiles
  add column if not exists public_handle text;

create unique index if not exists idx_profiles_public_handle
  on public.profiles (public_handle)
  where public_handle is not null;

create index if not exists idx_profiles_public_handle_lower
  on public.profiles (lower(public_handle))
  where public_handle is not null;

-- Backfill any rows missing a handle (idempotent; skips rows that already have one)
do $$
declare
  r record;
  h text;
  attempts int;
  suffix text;
begin
  for r in
    select id
    from public.profiles
    where public_handle is null
  loop
    h := null;
    attempts := 0;
    while h is null and attempts < 80 loop
      suffix := lpad(floor(10000 + random() * 90000)::int::text, 5, '0');
      h := 'user_' || suffix;
      begin
        update public.profiles
        set public_handle = h
        where id = r.id
          and public_handle is null;
        if not found then
          h := (select public_handle from public.profiles where id = r.id);
          exit;
        end if;
      exception
        when unique_violation then
          h := null;
      end;
      attempts := attempts + 1;
    end loop;
    if h is null then
      raise exception 'Could not assign public_handle for %', r.id;
    end if;
  end loop;
end
$$;

alter table public.profiles
  alter column public_handle set not null;

-- New signups: optional public_handle from user metadata (app sends chosen handle).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text;
  normalized text;
begin
  chosen := nullif(trim(coalesce(new.raw_user_meta_data ->> 'public_handle', '')), '');
  if chosen is not null then
    normalized := lower(chosen);
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    public_handle,
    avatar_text,
    bio,
    city
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(
      normalized,
      'user_' || lpad((abs(hashtext(new.id::text)) % 90000 + 10000)::text, 5, '0')
    ),
    upper(left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)), 2)),
    'New to CineMatch and building the perfect watchlist.',
    ''
  )
  on conflict (id) do nothing;

  insert into public.settings (
    user_id,
    dark_mode,
    notifications,
    autoplay_trailers,
    hide_spoilers,
    cellular_sync
  )
  values (
    new.id,
    false,
    true,
    false,
    true,
    true
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Legacy profiles: trigger may not re-run; keep previous columns-only insert compatible via separate migration
-- of handle_new_user in this file. Existing deployments: run full function replace above.
-- Fix: the standard schema inserted without public_handle; we already backfilled and set not null.

drop policy if exists "profiles_select_own_or_linked" on public.profiles;
create policy "profiles_select_own_or_linked"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.linked_users l
    where l.status in ('pending', 'accepted')
      and (
        (l.requester_id = auth.uid() and l.target_id = profiles.id)
        or (l.target_id = auth.uid() and l.requester_id = profiles.id)
      )
  )
);

comment on column public.profiles.public_handle is 'Public unique handle (Cine user ID) for search and friend requests. Lowercase, immutable in app.';
