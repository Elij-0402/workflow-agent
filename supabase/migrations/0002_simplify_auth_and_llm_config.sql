-- Simplify auth to email/password only and replace llm_presets with llm_config.

create table if not exists public.llm_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'deepseek', 'anthropic', 'custom')),
  base_url text not null,
  api_key_encrypted text not null,
  model text not null,
  temperature numeric(3,2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  max_tokens int not null default 4096 check (max_tokens > 0 and max_tokens <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.llm_config (
  user_id,
  provider,
  base_url,
  api_key_encrypted,
  model,
  temperature,
  max_tokens,
  created_at,
  updated_at
)
select
  chosen.user_id,
  chosen.provider,
  chosen.base_url,
  chosen.api_key_encrypted,
  chosen.model,
  chosen.temperature,
  chosen.max_tokens,
  chosen.created_at,
  chosen.updated_at
from (
  select distinct on (user_id)
    user_id,
    provider,
    base_url,
    api_key_encrypted,
    model,
    temperature,
    max_tokens,
    created_at,
    updated_at
  from public.llm_presets
  order by user_id, is_default desc, created_at asc
) as chosen
on conflict (user_id) do update
set
  provider = excluded.provider,
  base_url = excluded.base_url,
  api_key_encrypted = excluded.api_key_encrypted,
  model = excluded.model,
  temperature = excluded.temperature,
  max_tokens = excluded.max_tokens,
  updated_at = now();

alter table public.llm_config enable row level security;

drop policy if exists "users access own llm_config" on public.llm_config;
create policy "users access own llm_config"
  on public.llm_config for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_llm_config_updated on public.llm_config;
create trigger trg_llm_config_updated
  before update on public.llm_config
  for each row execute function public.touch_updated_at();

alter table public.analyses drop constraint if exists analyses_preset_id_fkey;
alter table public.variants drop constraint if exists variants_preset_id_fkey;
alter table public.analyses drop constraint if exists analyses_llm_config_id_fkey;
alter table public.variants drop constraint if exists variants_llm_config_id_fkey;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'preset_id'
  ) then
    alter table public.analyses rename column preset_id to llm_config_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'variants'
      and column_name = 'preset_id'
  ) then
    alter table public.variants rename column preset_id to llm_config_id;
  end if;
end $$;

alter table public.analyses
  add constraint analyses_llm_config_id_fkey
  foreign key (llm_config_id) references public.llm_config(id) on delete set null;

alter table public.variants
  add constraint variants_llm_config_id_fkey
  foreign key (llm_config_id) references public.llm_config(id) on delete set null;

drop policy if exists "users access own llm_presets" on public.llm_presets;
drop trigger if exists trg_llm_presets_updated on public.llm_presets;
drop table if exists public.llm_presets;
