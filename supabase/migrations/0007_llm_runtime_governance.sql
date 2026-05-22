alter table public.llm_config
  add column if not exists last_validated_at timestamptz,
  add column if not exists last_connection_ok_at timestamptz,
  add column if not exists last_connection_error text,
  add column if not exists last_connection_status text not null default 'unverified'
    check (last_connection_status in ('unverified', 'ok', 'error')),
  add column if not exists encryption_version int not null default 1;

create table if not exists public.llm_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  llm_config_id uuid not null references public.llm_config(id) on delete cascade,
  route text not null,
  operation text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  cache_key text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  estimated_cost_cny numeric(12,4),
  success boolean not null default true,
  error_code text,
  created_at timestamptz not null default now()
);

alter table public.llm_usage_events enable row level security;

drop policy if exists "users access own llm_usage_events" on public.llm_usage_events;
create policy "users access own llm_usage_events"
  on public.llm_usage_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_llm_usage_events_user_created
  on public.llm_usage_events(user_id, created_at desc);

create index if not exists idx_llm_usage_events_config_created
  on public.llm_usage_events(llm_config_id, created_at desc);

alter table public.analyses
  add column if not exists prompt_version text,
  add column if not exists schema_version text,
  add column if not exists estimated_cost_cny numeric(12,4),
  add column if not exists cache_key text;

alter table public.variants
  add column if not exists prompt_version text,
  add column if not exists schema_version text,
  add column if not exists prompt_tokens int,
  add column if not exists completion_tokens int,
  add column if not exists estimated_cost_cny numeric(12,4),
  add column if not exists cache_key text;
