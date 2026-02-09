-- Multi-user onboarding + private data walls migration
create extension if not exists pgcrypto;

alter table public.workspaces
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

-- Backfill current workspace rows to your current logged-in user if possible
update public.workspaces
set owner_user_id = auth.uid()
where owner_user_id is null
  and auth.uid() is not null;

create unique index if not exists workspaces_owner_user_id_unique
  on public.workspaces (owner_user_id)
  where owner_user_id is not null;

alter table public.watchlist
  add column if not exists avatar_url text;

create table if not exists public.watchlist_sources (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references public.watchlist(id) on delete cascade,
  source text not null,
  source_url text not null,
  handle text,
  created_at timestamp with time zone default now()
);

create unique index if not exists watchlist_sources_unique
  on public.watchlist_sources (watchlist_id, source, source_url);

create unique index if not exists posts_post_url_unique
  on public.posts (post_url)
  where post_url is not null;

alter table public.workspaces enable row level security;
alter table public.clients enable row level security;
alter table public.watchlist enable row level security;
alter table public.watchlist_sources enable row level security;
alter table public.digests enable row level security;
alter table public.posts enable row level security;

drop policy if exists workspaces_select_own on public.workspaces;
drop policy if exists workspaces_insert_own on public.workspaces;
drop policy if exists workspaces_update_own on public.workspaces;
drop policy if exists workspaces_delete_own on public.workspaces;
drop policy if exists clients_all_own on public.clients;
drop policy if exists watchlist_all_own on public.watchlist;
drop policy if exists watchlist_sources_all_own on public.watchlist_sources;
drop policy if exists digests_all_own on public.digests;
drop policy if exists posts_all_own on public.posts;

create policy workspaces_select_own on public.workspaces
for select using (owner_user_id = auth.uid());

create policy workspaces_insert_own on public.workspaces
for insert with check (owner_user_id = auth.uid());

create policy workspaces_update_own on public.workspaces
for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy workspaces_delete_own on public.workspaces
for delete using (owner_user_id = auth.uid());

create policy clients_all_own on public.clients
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = clients.workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = clients.workspace_id and w.owner_user_id = auth.uid()
  )
);

create policy watchlist_all_own on public.watchlist
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = watchlist.workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = watchlist.workspace_id and w.owner_user_id = auth.uid()
  )
);

create policy watchlist_sources_all_own on public.watchlist_sources
for all using (
  exists (
    select 1
    from public.watchlist wl
    join public.workspaces w on w.id = wl.workspace_id
    where wl.id = watchlist_sources.watchlist_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.watchlist wl
    join public.workspaces w on w.id = wl.workspace_id
    where wl.id = watchlist_sources.watchlist_id and w.owner_user_id = auth.uid()
  )
);

create policy digests_all_own on public.digests
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = digests.workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = digests.workspace_id and w.owner_user_id = auth.uid()
  )
);

create policy posts_all_own on public.posts
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = posts.workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = posts.workspace_id and w.owner_user_id = auth.uid()
  )
);
