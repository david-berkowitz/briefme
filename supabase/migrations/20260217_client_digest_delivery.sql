alter table public.clients
  add column if not exists digest_enabled boolean not null default false;

alter table public.clients
  add column if not exists digest_recipients text[] not null default '{}';
