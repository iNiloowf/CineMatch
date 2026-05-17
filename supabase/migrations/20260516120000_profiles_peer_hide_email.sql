-- Linked friends may read public profile fields only; email stays on own row.

drop policy if exists "profiles_select_own_or_linked" on public.profiles;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop view if exists public.profiles_peer;

create view public.profiles_peer
with (security_invoker = true) as
select
  id,
  public_handle,
  full_name,
  avatar_text,
  avatar_image_url,
  bio,
  city,
  profile_style,
  favorite_movie_id,
  favorite_movie_title,
  favorite_movie_year,
  favorite_movie_poster_url,
  favorite_movie_media_type,
  profile_header_movie_id,
  profile_header_movie_title,
  profile_header_movie_year,
  profile_header_poster_url,
  profile_header_media_type,
  created_at,
  updated_at
from public.profiles;

grant select on public.profiles_peer to authenticated;

alter view public.profiles_peer set (security_invoker = true);

drop policy if exists "profiles_peer_select_own_or_linked" on public.profiles_peer;
create policy "profiles_peer_select_own_or_linked"
on public.profiles_peer
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.linked_users l
    where l.status = 'accepted'
      and (
        (l.requester_id = auth.uid() and l.target_id = profiles_peer.id)
        or (l.target_id = auth.uid() and l.requester_id = profiles_peer.id)
      )
  )
);
