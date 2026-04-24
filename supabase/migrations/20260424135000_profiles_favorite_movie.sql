-- Favorite movie metadata for profile card display/editing.
alter table if exists public.profiles
  add column if not exists favorite_movie_id text,
  add column if not exists favorite_movie_title text,
  add column if not exists favorite_movie_year integer,
  add column if not exists favorite_movie_poster_url text,
  add column if not exists favorite_movie_media_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_favorite_movie_media_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_favorite_movie_media_type_check
      check (
        favorite_movie_media_type is null
        or favorite_movie_media_type in ('movie', 'series')
      );
  end if;
end
$$;
