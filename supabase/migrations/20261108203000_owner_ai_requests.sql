create table public.owner_ai_requests (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  prompt text not null check (char_length(prompt) between 1 and 4000),
  answer text,
  status text not null default 'pending' check (status in ('pending','done','failed'))
);
alter table public.owner_ai_requests enable row level security;
revoke all on public.owner_ai_requests from public, anon, authenticated;
grant select, insert, update on public.owner_ai_requests to service_role;
create index owner_ai_requests_history on public.owner_ai_requests(owner_id, created_at desc);