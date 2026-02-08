create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text not null,
  created_at timestamp with time zone default now()
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

create unique index if not exists posts_post_url_unique
  on public.posts (post_url)
  where post_url is not null;
