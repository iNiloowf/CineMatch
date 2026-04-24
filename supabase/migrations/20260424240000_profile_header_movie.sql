-- Optional movie poster for profile header (owner + friends see the same art).
alter table if exists public.profiles
  add column if not exists profile_header_movie_id text,
  add column if not exists profile_header_movie_title text,
  add column if not exists profile_header_movie_year integer,
  add column if not exists profile_header_poster_url text,
  add column if not exists profile_header_media_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_header_media_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_header_media_type_check
      check (
        profile_header_media_type is null
        or profile_header_media_type in ('movie', 'series')
      );
  end if;
end
$$;
