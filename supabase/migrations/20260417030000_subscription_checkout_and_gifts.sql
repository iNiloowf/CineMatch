-- Stripe checkout intents + one-time partner gift codes for Pro.

create table if not exists public.subscription_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  purchaser_user_id uuid not null references auth.users(id) on delete cascade,
  partner_user_id uuid references auth.users(id) on delete set null,
  plan_type text not null check (plan_type in ('pro_monthly', 'pro_yearly', 'pro_partner_gift')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'expired')),
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_subscription_checkout_intents_purchaser
  on public.subscription_checkout_intents (purchaser_user_id, created_at desc);

create table if not exists public.subscription_partner_gift_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  purchaser_user_id uuid not null references auth.users(id) on delete cascade,
  intended_partner_user_id uuid references auth.users(id) on delete set null,
  checkout_intent_id uuid references public.subscription_checkout_intents(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscription_partner_gift_codes_purchaser
  on public.subscription_partner_gift_codes (purchaser_user_id, created_at desc);

create index if not exists idx_subscription_partner_gift_codes_status
  on public.subscription_partner_gift_codes (status, expires_at);

alter table public.subscription_checkout_intents enable row level security;
alter table public.subscription_partner_gift_codes enable row level security;

drop policy if exists "checkout_intents_select_own" on public.subscription_checkout_intents;
create policy "checkout_intents_select_own"
  on public.subscription_checkout_intents
  for select
  to authenticated
  using (
    auth.uid() = purchaser_user_id
    or auth.uid() = partner_user_id
  );

drop policy if exists "gift_codes_select_own" on public.subscription_partner_gift_codes;
create policy "gift_codes_select_own"
  on public.subscription_partner_gift_codes
  for select
  to authenticated
  using (
    auth.uid() = purchaser_user_id
    or auth.uid() = intended_partner_user_id
    or auth.uid() = redeemed_by_user_id
  );
