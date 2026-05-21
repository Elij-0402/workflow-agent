-- 0005 sessions soft-delete (archival)
-- Variants/books/chapters/analyses cascade through sessions, so archived sessions
-- can be hidden from lists by filtering archived_at on sessions alone.

alter table public.sessions
  add column if not exists archived_at timestamptz null;

create index if not exists sessions_user_archived_idx
  on public.sessions (user_id, archived_at);
