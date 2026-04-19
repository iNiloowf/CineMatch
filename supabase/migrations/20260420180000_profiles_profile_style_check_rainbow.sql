-- Ensure profiles.profile_style allows rainbow (re-run safe: drops named check then re-adds).

alter table public.profiles
  drop constraint if exists profiles_profile_style_check;

alter table public.profiles
  add constraint profiles_profile_style_check
  check (profile_style in ('classic', 'glass', 'neon', 'rainbow'));
