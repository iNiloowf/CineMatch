-- Threaded follow-ups after the initial message (user ↔ admin).

alter table public.support_tickets
  add column if not exists conversation jsonb not null default '[]'::jsonb;

-- Backfill: move legacy single admin_reply into conversation when thread is empty
update public.support_tickets
set conversation = jsonb_build_array(
  jsonb_build_object(
    'from', 'admin',
    'body', admin_reply,
    'at', (coalesce(admin_replied_at, updated_at))::text
  )
)
where admin_reply is not null
  and trim(admin_reply) <> ''
  and conversation = '[]'::jsonb;
