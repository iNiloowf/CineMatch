-- Public profile style so linked users can see Pro profile presentation.

alter table if exists public.profiles
  add column if not exists profile_style text not null default 'classic';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_profile_style_check'
  ) then
    alter table public.profiles
      add constraint profiles_profile_style_check
      check (profile_style in ('classic', 'glass', 'neon', 'spotlight', 'minimal'));
  end if;
end
$$;
