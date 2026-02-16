create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_email text not null,
  created_at timestamp with time zone default now(),
  unique (owner_user_id)
);

create table public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamp with time zone default now(),
  unique (user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  positioning text,
  narratives text,
  risks text,
  created_at timestamp with time zone default now()
);

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  role text,
  avatar_url text,
  cadence text default 'daily',
  tags text[],
  created_at timestamp with time zone default now()
);

create table public.watchlist_sources (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid references public.watchlist(id) on delete cascade,
  source text not null,
  source_url text not null,
  handle text,
  created_at timestamp with time zone default now()
);

create unique index if not exists watchlist_sources_unique
  on public.watchlist_sources (watchlist_id, source, source_url);

create table public.client_watchlist_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  watchlist_id uuid not null references public.watchlist(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (client_id, watchlist_id)
);

create table public.briefing_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  digest_id uuid references public.digests(id) on delete cascade,
  file_name text not null,
  mime_type text,
  file_size_bytes integer not null,
  file_data_base64 text not null,
  created_at timestamp with time zone default now()
);

create table public.daily_run_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  status text not null check (status in ('success', 'failed')),
  posts_inserted integer not null default 0,
  briefs_created integer not null default 0,
  emails_sent integer not null default 0,
  error_message text
);

create table public.digests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  summary text,
  created_at timestamp with time zone default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  watchlist_id uuid references public.watchlist(id) on delete set null,
  source text not null,
  author_name text not null,
  author_url text,
  post_url text,
  content text,
  posted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create unique index if not exists posts_workspace_post_url_unique
  on public.posts (workspace_id, post_url)
  where post_url is not null;

alter table public.workspaces enable row level security;
alter table public.beta_signups enable row level security;
alter table public.clients enable row level security;
alter table public.watchlist enable row level security;
alter table public.watchlist_sources enable row level security;
alter table public.client_watchlist_links enable row level security;
alter table public.digests enable row level security;
alter table public.briefing_attachments enable row level security;
alter table public.daily_run_logs enable row level security;
alter table public.posts enable row level security;

create policy workspaces_select_own on public.workspaces
for select using (owner_user_id = auth.uid());

create policy workspaces_insert_own on public.workspaces
for insert with check (owner_user_id = auth.uid());

create policy workspaces_update_own on public.workspaces
for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy workspaces_delete_own on public.workspaces
for delete using (owner_user_id = auth.uid());

create policy beta_signups_select_own on public.beta_signups
for select using (user_id = auth.uid());

create policy beta_signups_insert_own on public.beta_signups
for insert with check (user_id = auth.uid());

create policy beta_signups_update_own on public.beta_signups
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

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

create policy client_watchlist_links_all_own on public.client_watchlist_links
for all using (
  exists (
    select 1
    from public.clients c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = client_watchlist_links.client_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clients c
    join public.workspaces w on w.id = c.workspace_id
    where c.id = client_watchlist_links.client_id and w.owner_user_id = auth.uid()
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

create policy briefing_attachments_all_own on public.briefing_attachments
for all using (
  exists (
    select 1 from public.workspaces w
    where w.id = briefing_attachments.workspace_id and w.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces w
    where w.id = briefing_attachments.workspace_id and w.owner_user_id = auth.uid()
  )
);

create policy daily_run_logs_select_own on public.daily_run_logs
for select using (
  exists (
    select 1 from public.workspaces w
    where w.id = daily_run_logs.workspace_id and w.owner_user_id = auth.uid()
  )
);
