-- Add subscription settings used by app/admin monetization flow.
alter table if exists public.settings
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists admin_mode_simulate_pro boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settings_subscription_tier_check'
  ) then
    alter table public.settings
      add constraint settings_subscription_tier_check
      check (subscription_tier in ('free', 'pro'));
  end if;
end
$$;
