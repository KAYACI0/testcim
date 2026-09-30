-- Prompt 09 (çevrimiçi sınav) runtime support:
--   1. A Postgres-backed fixed-window rate limiter for the anonymous
--      /api/exam/* routes. docs/prompts/09 names Upstash Redis, but no
--      Upstash credentials/infra exist in this environment (see
--      docs/adr/0004-cevrimici-sinav-tehdit-modeli.md §5) — this table +
--      RPC gives the same true/false contract with zero new infra, and can
--      be swapped for Upstash later without touching the calling code.
--   2. Auto-submitting attempts left `in_progress` once their exam closes
--      or their own deadline passes ("kapanan sınavda devam eden denemeler
--      otomatik teslim", docs/prompts/09 item 10). Only flips status/
--      submitted_at here — actual point tallying happens in TS
--      (apps/web/src/features/online-exam/scoring.server.ts) the next time
--      the attempt is read, so the answer-scoring logic has one home
--      instead of being duplicated in SQL and TS.

-- Publishing an exam pins the test's current items to their *current
-- question revision* by copying test_items into this table (docs/prompts/09
-- item 1: "yayınlanan sınav testin sabitlenmiş kopyasını kullanır"). Content
-- itself doesn't need duplicating here — `question_revisions.snapshot` (set
-- by 20250101000007_questions.sql's questions_record_revision trigger) is
-- already an immutable copy of stem/options/correct/points at that
-- revision, so the exam-taking routes read through
-- online_exam_items.question_revision_id -> question_revisions.snapshot and
-- never touch the live, editable `questions` row.
create table public.online_exam_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  online_exam_id uuid not null,
  test_item_id uuid,
  question_id uuid not null,
  question_revision_id uuid not null,
  section_id uuid,
  group_id uuid,
  position text not null,
  points_override numeric,
  correct_override jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, online_exam_id) references public.online_exams (workspace_id, id) on delete cascade
);

create index online_exam_items_workspace_id_idx on public.online_exam_items (workspace_id);
create index online_exam_items_online_exam_id_idx on public.online_exam_items (online_exam_id);

alter table public.online_exam_items enable row level security;

create policy "online_exam_items_select_members" on public.online_exam_items
  for select to authenticated using (public.is_member(workspace_id));
create policy "online_exam_items_insert_editors" on public.online_exam_items
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
-- Immutable once published: no update/delete policy. Re-publishing a
-- changed test creates a new online_exams row rather than mutating one
-- that may already have live attempts pinned to it.

create table public.exam_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  count int not null default 0
);

create or replace function public.check_exam_rate_limit(p_key text, p_limit int, p_window_sec int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.exam_rate_limits (bucket_key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (bucket_key) do update
    set window_start = case
          when public.exam_rate_limits.window_start < v_now - (p_window_sec || ' seconds')::interval
            then v_now
          else public.exam_rate_limits.window_start
        end,
        count = case
          when public.exam_rate_limits.window_start < v_now - (p_window_sec || ' seconds')::interval
            then 1
          else public.exam_rate_limits.count + 1
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function public.close_expired_exams()
returns void
language sql
security definer
set search_path = public
as $$
  update public.online_exams
  set status = 'closed'
  where status = 'open'
    and closes_at is not null
    and closes_at < now();

  update public.exam_attempts a
  set status = 'expired',
      submitted_at = now()
  from public.online_exams e
  where a.online_exam_id = e.id
    and a.status = 'in_progress'
    and (e.status = 'closed' or (a.deadline_at is not null and a.deadline_at < now()));
$$;

-- ---------------------------------------------------------------------------
-- RLS: exam_rate_limits is written only by the security-definer RPC above
-- (called from the service-role /api/exam/* routes); no client policy at
-- all, matching exam_attempts/attempt_answers.
-- ---------------------------------------------------------------------------

alter table public.exam_rate_limits enable row level security;
