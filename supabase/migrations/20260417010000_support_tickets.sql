-- Support tickets submitted by users inside the app.
-- Admin dashboard reads this table via server-side service role.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'under_review', 'closed'))
);

create index if not exists idx_support_tickets_user_id
  on public.support_tickets (user_id);

create index if not exists idx_support_tickets_created_at
  on public.support_tickets (created_at desc);

create index if not exists idx_support_tickets_status
  on public.support_tickets (status);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "support_tickets_select_own" on public.support_tickets;
create policy "support_tickets_select_own"
on public.support_tickets
for select
to authenticated
using (user_id = auth.uid());
