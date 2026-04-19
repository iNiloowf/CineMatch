-- Allow Rainbow Pro Studio profile style.

alter table if exists public.profiles
  drop constraint if exists profiles_profile_style_check;

alter table if exists public.profiles
  add constraint profiles_profile_style_check
  check (profile_style in ('classic', 'glass', 'neon', 'rainbow'));
