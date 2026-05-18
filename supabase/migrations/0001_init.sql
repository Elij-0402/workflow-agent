-- NovelFusion AI — Initial Schema
-- Run this in Supabase SQL Editor.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- Tables
-- ============================================================================

-- LLM 配置预设（BYOK：Bring Your Own Key）
create table if not exists public.llm_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('openai', 'deepseek', 'anthropic', 'custom')),
  base_url text not null,
  api_key_encrypted text not null,
  model text not null,
  temperature numeric(3,2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  max_tokens int not null default 4096 check (max_tokens > 0 and max_tokens <= 200000),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_llm_presets_user on public.llm_presets(user_id);
create unique index if not exists uniq_llm_presets_default
  on public.llm_presets(user_id) where is_default = true;

-- 会话（一次完整分析工作流）
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Session',
  status text not null default 'draft' check (status in ('draft', 'uploaded', 'analyzing', 'analyzed', 'generating', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user on public.sessions(user_id, created_at desc);

-- 上传的小说
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null,
  word_count int,
  chapter_count int,
  metadata jsonb default '{}'::jsonb,
  cleaned_content text,
  created_at timestamptz not null default now()
);

create index if not exists idx_books_session on public.books(session_id);

-- 分析结果（按维度）
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension text not null check (dimension in ('worldview', 'characters', 'narrative')),
  result jsonb not null,
  preset_id uuid references public.llm_presets(id) on delete set null,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz not null default now(),
  unique(book_id, dimension)
);

create index if not exists idx_analyses_book on public.analyses(book_id);
create index if not exists idx_analyses_user on public.analyses(user_id, created_at desc);

-- 生成的变体小说
create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Variant',
  config jsonb not null,
  content text not null,
  word_count int,
  preset_id uuid references public.llm_presets(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_variants_session on public.variants(session_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.llm_presets enable row level security;
alter table public.sessions enable row level security;
alter table public.books enable row level security;
alter table public.analyses enable row level security;
alter table public.variants enable row level security;

drop policy if exists "users access own llm_presets" on public.llm_presets;
create policy "users access own llm_presets"
  on public.llm_presets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users access own sessions" on public.sessions;
create policy "users access own sessions"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users access own books" on public.books;
create policy "users access own books"
  on public.books for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users access own analyses" on public.analyses;
create policy "users access own analyses"
  on public.analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users access own variants" on public.variants;
create policy "users access own variants"
  on public.variants for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_llm_presets_updated on public.llm_presets;
create trigger trg_llm_presets_updated
  before update on public.llm_presets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_sessions_updated on public.sessions;
create trigger trg_sessions_updated
  before update on public.sessions
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Storage Bucket
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'novels',
  'novels',
  false,
  52428800,                              -- 50 MB
  array['text/plain', 'text/markdown', 'application/octet-stream']
) on conflict (id) do nothing;

drop policy if exists "users access own novel files" on storage.objects;
create policy "users access own novel files"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'novels'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'novels'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
