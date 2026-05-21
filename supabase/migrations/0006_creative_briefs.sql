-- 0006 creative briefs + variants iteration chain (V0.3 M4)

create table if not exists public.creative_briefs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  session_id         uuid not null references public.sessions(id) on delete cascade,
  title              text not null default '未命名简报',
  persona_directives jsonb not null default '[]'::jsonb,
  plot_directives    jsonb not null default '[]'::jsonb,
  style_directives   jsonb not null default '{}'::jsonb,
  retention_rules    jsonb not null default '[]'::jsonb,
  status             text not null default 'draft'
    check (status in ('draft','active','archived')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.creative_briefs enable row level security;
drop policy if exists "users access own briefs" on public.creative_briefs;
create policy "users access own briefs"
  on public.creative_briefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_briefs_updated on public.creative_briefs;
create trigger trg_briefs_updated
  before update on public.creative_briefs
  for each row execute function public.touch_updated_at();

create index if not exists creative_briefs_session_idx
  on public.creative_briefs(session_id, status);

-- variants iteration chain
alter table public.variants
  add column if not exists brief_id uuid null
    references public.creative_briefs(id) on delete set null,
  add column if not exists parent_variant_id uuid null
    references public.variants(id) on delete set null,
  add column if not exists scope text not null default 'full'
    check (scope in ('outline','chapter','full')),
  add column if not exists chapter_index int null;

create index if not exists variants_brief_idx on public.variants(brief_id);
create index if not exists variants_parent_idx on public.variants(parent_variant_id);
