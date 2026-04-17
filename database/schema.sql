-- CineMatch schema for Supabase Postgres
-- Paste this whole file into the Supabase SQL Editor and run it.
--
-- What this covers:
-- - Supabase Auth users sign in and sign up through auth.users
-- - Public profile data for the Profile page
-- - Settings data for the Settings page
-- - Movie catalog data for Discover / Picks / Shared pages
-- - Swipe decisions for accept / reject
-- - Linked people connections
-- - Invite links used to connect accounts
-- - Shared watch status for movies both people accepted
-- - Profile photo uploads via Supabase Storage
--
-- Notes:
-- - Login and signup are handled by Supabase Auth, not by a custom passwords table
-- - The profiles table mirrors each authenticated user
-- - shared_matches is a view that finds movies accepted by both linked users

create extension if not exists pgcrypto;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_text,
    bio,
    city
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  avatar_text text not null,
  avatar_image_url text,
  bio text not null default '',
  city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_image_url text;

create table if not exists public.settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dark_mode boolean not null default false,
  notifications boolean not null default true,
  autoplay_trailers boolean not null default false,
  hide_spoilers boolean not null default true,
  cellular_sync boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.movies (
  id text primary key,
  title text not null,
  release_year integer not null,
  runtime text not null,
  rating numeric(3, 1) not null,
  genres text[] not null default '{}',
  description text not null,
  poster_eyebrow text not null default '',
  poster_image_url text,
  accent_from text not null default '#7c3aed',
  accent_to text not null default '#c4b5fd',
  trailer_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  movie_id text not null references public.movies(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

create table if not exists public.linked_users (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint linked_users_not_self check (requester_id <> target_id),
  unique (requester_id, target_id)
);

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz
);

create table if not exists public.shared_watchlist (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid not null references public.linked_users(id) on delete cascade,
  movie_id text not null references public.movies(id) on delete cascade,
  watched boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (linked_user_id, movie_id)
);

create index if not exists idx_swipes_user_id on public.swipes(user_id);
create index if not exists idx_swipes_movie_id on public.swipes(movie_id);
create index if not exists idx_linked_users_requester_id on public.linked_users(requester_id);
create index if not exists idx_linked_users_target_id on public.linked_users(target_id);
create index if not exists idx_invite_links_inviter_id on public.invite_links(inviter_id);
create index if not exists idx_shared_watchlist_linked_user_id on public.shared_watchlist(linked_user_id);

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create or replace view public.shared_matches as
select
  l.id as linked_user_id,
  s1.movie_id,
  l.requester_id,
  l.target_id
from public.linked_users l
join public.swipes s1
  on s1.user_id = l.requester_id
 and s1.decision = 'accepted'
join public.swipes s2
  on s2.user_id = l.target_id
 and s2.movie_id = s1.movie_id
 and s2.decision = 'accepted'
where l.status = 'accepted';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.movies enable row level security;
alter table public.swipes enable row level security;
alter table public.linked_users enable row level security;
alter table public.invite_links enable row level security;
alter table public.shared_watchlist enable row level security;

drop policy if exists "profile_photos_public_read" on storage.objects;
create policy "profile_photos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

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
    where l.status = 'accepted'
      and (
        (l.requester_id = auth.uid() and l.target_id = profiles.id)
        or (l.target_id = auth.uid() and l.requester_id = profiles.id)
      )
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "settings_select_own" on public.settings;
create policy "settings_select_own"
on public.settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "settings_update_own" on public.settings;
create policy "settings_update_own"
on public.settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "movies_select_all" on public.movies;
create policy "movies_select_all"
on public.movies
for select
to authenticated
using (true);

drop policy if exists "movies_insert_authenticated" on public.movies;
create policy "movies_insert_authenticated"
on public.movies
for insert
to authenticated
with check (true);

drop policy if exists "movies_update_authenticated" on public.movies;
create policy "movies_update_authenticated"
on public.movies
for update
to authenticated
using (true)
with check (true);

drop policy if exists "swipes_select_own" on public.swipes;
create policy "swipes_select_own"
on public.swipes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "swipes_select_linked_accepted" on public.swipes;
create policy "swipes_select_linked_accepted"
on public.swipes
for select
to authenticated
using (
  decision = 'accepted'
  and exists (
    select 1
    from public.linked_users l
    where l.status = 'accepted'
      and (
        (l.requester_id = auth.uid() and l.target_id = swipes.user_id)
        or (l.target_id = auth.uid() and l.requester_id = swipes.user_id)
      )
  )
);

drop policy if exists "swipes_insert_own" on public.swipes;
create policy "swipes_insert_own"
on public.swipes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "swipes_update_own" on public.swipes;
create policy "swipes_update_own"
on public.swipes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "swipes_delete_own" on public.swipes;
create policy "swipes_delete_own"
on public.swipes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "links_select_members" on public.linked_users;
create policy "links_select_members"
on public.linked_users
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "links_insert_requester" on public.linked_users;
create policy "links_insert_requester"
on public.linked_users
for insert
to authenticated
with check (auth.uid() = requester_id);

drop policy if exists "links_update_members" on public.linked_users;
create policy "links_update_members"
on public.linked_users
for update
to authenticated
using (auth.uid() = requester_id or auth.uid() = target_id)
with check (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "links_delete_members" on public.linked_users;
create policy "links_delete_members"
on public.linked_users
for delete
to authenticated
using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "invite_links_select_owner" on public.invite_links;
create policy "invite_links_select_owner"
on public.invite_links
for select
to authenticated
using (auth.uid() = inviter_id);

drop policy if exists "invite_links_select_open" on public.invite_links;
create policy "invite_links_select_open"
on public.invite_links
for select
to authenticated
using (used_at is null);

drop policy if exists "invite_links_insert_owner" on public.invite_links;
create policy "invite_links_insert_owner"
on public.invite_links
for insert
to authenticated
with check (auth.uid() = inviter_id);

drop policy if exists "invite_links_update_owner" on public.invite_links;
create policy "invite_links_update_owner"
on public.invite_links
for update
to authenticated
using (auth.uid() = inviter_id)
with check (auth.uid() = inviter_id);

drop policy if exists "invite_links_update_open" on public.invite_links;
create policy "invite_links_update_open"
on public.invite_links
for update
to authenticated
using (used_at is null)
with check (true);

drop policy if exists "shared_watchlist_select_members" on public.shared_watchlist;
create policy "shared_watchlist_select_members"
on public.shared_watchlist
for select
to authenticated
using (
  exists (
    select 1
    from public.linked_users l
    where l.id = shared_watchlist.linked_user_id
      and (l.requester_id = auth.uid() or l.target_id = auth.uid())
  )
);

drop policy if exists "shared_watchlist_insert_members" on public.shared_watchlist;
create policy "shared_watchlist_insert_members"
on public.shared_watchlist
for insert
to authenticated
with check (
  exists (
    select 1
    from public.linked_users l
    where l.id = shared_watchlist.linked_user_id
      and (l.requester_id = auth.uid() or l.target_id = auth.uid())
  )
);

drop policy if exists "shared_watchlist_update_members" on public.shared_watchlist;
create policy "shared_watchlist_update_members"
on public.shared_watchlist
for update
to authenticated
using (
  exists (
    select 1
    from public.linked_users l
    where l.id = shared_watchlist.linked_user_id
      and (l.requester_id = auth.uid() or l.target_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.linked_users l
    where l.id = shared_watchlist.linked_user_id
      and (l.requester_id = auth.uid() or l.target_id = auth.uid())
  )
);

-- Security audit trail (API writes via service role; RLS on, no policies for authenticated = no direct client reads/writes).
create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  ip text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_security_audit_log_created_at
  on public.security_audit_log (created_at desc);

create index if not exists idx_security_audit_log_actor
  on public.security_audit_log (actor_user_id)
  where actor_user_id is not null;

alter table public.security_audit_log enable row level security;
