-- Invite links are reusable (one stable link for group sharing).
-- Accept no longer "consumes" a token; used_at is legacy/always clear for active links.
update public.invite_links
set used_at = null
where used_at is not null;
