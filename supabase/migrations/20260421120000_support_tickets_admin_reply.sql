-- Admin reply stored on ticket for in-app support (user sees it in Ticket manager).

alter table public.support_tickets
  add column if not exists admin_reply text,
  add column if not exists admin_replied_at timestamptz;
