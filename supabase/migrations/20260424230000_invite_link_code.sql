-- Short public URL form: {origin}/c/{link_code} → /connect?invite=…
-- (Telegram etc. can wrap long query URLs across lines and only the domain becomes tappable.)
alter table public.invite_links
add column if not exists link_code text;

create unique index if not exists idx_invite_links_link_code
on public.invite_links (link_code)
where link_code is not null;
