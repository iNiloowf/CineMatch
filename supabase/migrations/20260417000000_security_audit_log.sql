-- Security audit trail for sensitive API actions (written by Next.js with service role).
-- RLS enabled with no policies for authenticated users = no direct client access; service role bypasses RLS.

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  ip text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_security_audit_log_created_at
  on public.security_audit_log (created_at desc);

create index if not exists idx_security_audit_log_actor
  on public.security_audit_log (actor_user_id)
  where actor_user_id is not null;

alter table public.security_audit_log enable row level security;
