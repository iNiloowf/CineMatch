-- Watched pick reviews: recommended / not after watching; synced for linked friends' profiles.
create table if not exists public.watched_pick_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id text not null,
  recommended boolean not null default true,
  watched_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

create index if not exists watched_pick_reviews_user_id_idx
  on public.watched_pick_reviews (user_id);

alter table public.watched_pick_reviews enable row level security;

drop policy if exists "watched_pick_reviews_select_own" on public.watched_pick_reviews;
create policy "watched_pick_reviews_select_own"
  on public.watched_pick_reviews for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "watched_pick_reviews_select_linked" on public.watched_pick_reviews;
create policy "watched_pick_reviews_select_linked"
  on public.watched_pick_reviews for select
  to authenticated
  using (
    exists (
      select 1
      from public.linked_users l
      where l.status = 'accepted'
        and (
          (l.requester_id = (select auth.uid()) and l.target_id = user_id)
          or (l.target_id = (select auth.uid()) and l.requester_id = user_id)
        )
    )
  );

drop policy if exists "watched_pick_reviews_insert_own" on public.watched_pick_reviews;
create policy "watched_pick_reviews_insert_own"
  on public.watched_pick_reviews for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "watched_pick_reviews_update_own" on public.watched_pick_reviews;
create policy "watched_pick_reviews_update_own"
  on public.watched_pick_reviews for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "watched_pick_reviews_delete_own" on public.watched_pick_reviews;
create policy "watched_pick_reviews_delete_own"
  on public.watched_pick_reviews for delete
  to authenticated
  using (user_id = (select auth.uid()));
