-- 0004 multi-book + blueprint workbench

-- sessions.mode
alter table public.sessions
  add column if not exists mode text not null default 'single'
    check (mode in ('single','dual'));

-- books.position
alter table public.books
  add column if not exists position smallint not null default 0
    check (position between 0 and 1);
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'books_session_position_unique'
  ) then
    alter table public.books
      add constraint books_session_position_unique unique (session_id, position);
  end if;
end $$;

-- chapters
create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  index       int  not null,
  title       text not null,
  start_char  int  not null,
  end_char    int  not null,
  source      text not null check (source in ('regex','length-chunk','manual')),
  created_at  timestamptz not null default now(),
  unique (book_id, index)
);

alter table public.chapters enable row level security;
drop policy if exists "users access own chapters" on public.chapters;
create policy "users access own chapters"
  on public.chapters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- analyses.scope + chapter_id
alter table public.analyses
  add column if not exists scope text not null default 'book'
    check (scope in ('book','chapter')),
  add column if not exists chapter_id uuid null
    references public.chapters(id) on delete cascade;

-- relax dimension to text (we add new dimensions chapter_brief, book_synthesis)
alter table public.analyses
  drop constraint if exists analyses_dimension_check;

-- partial unique indexes (NULL-safe)
drop index if exists analyses_book_dimension_unique;
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'analyses_book_id_dimension_key'
  ) then
    alter table public.analyses drop constraint analyses_book_id_dimension_key;
  end if;
end $$;

create unique index if not exists analyses_book_scope_book_uniq
  on public.analyses (book_id, dimension)
  where scope = 'book' and chapter_id is null;

create unique index if not exists analyses_book_scope_chapter_uniq
  on public.analyses (book_id, chapter_id, dimension)
  where scope = 'chapter' and chapter_id is not null;

-- blueprints
create table if not exists public.blueprints (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references public.sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft','confirmed')),
  sections     jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.blueprints enable row level security;
drop policy if exists "users access own blueprints" on public.blueprints;
create policy "users access own blueprints"
  on public.blueprints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_blueprints_updated on public.blueprints;
create trigger trg_blueprints_updated
  before update on public.blueprints
  for each row execute function public.touch_updated_at();

-- variants.blueprint_id
alter table public.variants
  add column if not exists blueprint_id uuid null
    references public.blueprints(id) on delete restrict;

create index if not exists variants_blueprint_id_idx
  on public.variants (blueprint_id);
