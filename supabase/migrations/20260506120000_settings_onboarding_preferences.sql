-- Discover onboarding answers (favorite genres, etc.) — synced across devices when completed.
alter table public.settings
  add column if not exists onboarding_preferences jsonb;

-- Existing accounts: treat as already onboarded so they are not forced through the flow again.
update public.settings
set onboarding_preferences = jsonb_build_object(
  'favoriteGenres', '[]'::jsonb,
  'dislikedGenres', '[]'::jsonb,
  'mediaPreference', 'both',
  'tasteProfile', '[]'::jsonb,
  'completedAt', '1970-01-01T00:00:00.000Z'
)
where onboarding_preferences is null;
