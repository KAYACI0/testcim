-- Online exams. The anonymous student flow (exam_attempts, attempt_answers)
-- is server-only via the service role per docs/02 §5.3 and CLAUDE.md — the
-- browser never talks to these two tables directly, so they get a
-- teacher-facing select policy and nothing else.

create table public.online_exams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  test_snapshot_id uuid references public.test_snapshots (id) on delete set null,
  title text not null,
  mode text not null check (mode in ('async', 'live')),
  access text not null check (access in ('link', 'code', 'roster')),
  join_code text,
  slug text not null unique,
  opens_at timestamptz,
  closes_at timestamptz,
  duration_sec int,
  max_attempts int,
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  show_results text not null default 'after_close' check (show_results in ('never', 'after_submit', 'after_close')),
  show_answers boolean not null default false,
  required_fields jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'open', 'closed')),
  participant_cap int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.online_exams
  for each row execute function public.set_updated_at();

create index online_exams_workspace_id_idx on public.online_exams (workspace_id);
create unique index online_exams_workspace_join_code_unique_idx
  on public.online_exams (workspace_id, join_code)
  where join_code is not null;

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  online_exam_id uuid not null,
  student_id uuid,
  display_name text,
  student_no text,
  class_label text,
  token_hash text not null unique,
  started_at timestamptz,
  deadline_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  ip_hash text,
  ua_hash text,
  flags jsonb not null default '{}'::jsonb,
  score numeric,
  max_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, online_exam_id) references public.online_exams (workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id) references public.students (workspace_id, id) on delete set null
);

create trigger set_updated_at
  before update on public.exam_attempts
  for each row execute function public.set_updated_at();

create index exam_attempts_workspace_id_idx on public.exam_attempts (workspace_id);
create index exam_attempts_online_exam_id_idx on public.exam_attempts (online_exam_id);

create table public.attempt_answers (
  workspace_id uuid not null,
  attempt_id uuid not null,
  item_id uuid not null references public.test_items (id) on delete cascade,
  answer jsonb,
  is_correct boolean,
  points numeric,
  answered_at timestamptz,
  time_spent_ms int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, item_id),
  foreign key (workspace_id, attempt_id) references public.exam_attempts (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.attempt_answers
  for each row execute function public.set_updated_at();

create index attempt_answers_workspace_id_idx on public.attempt_answers (workspace_id);

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
$$;

select cron.schedule(
  'close-expired-exams',
  '*/5 * * * *',
  $$select public.close_expired_exams();$$
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.online_exams enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.attempt_answers enable row level security;

create policy "online_exams_select_members" on public.online_exams
  for select to authenticated using (public.is_member(workspace_id));
create policy "online_exams_insert_editors" on public.online_exams
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "online_exams_update_editors" on public.online_exams
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "online_exams_delete_editors" on public.online_exams
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

-- Teacher dashboard read only. No insert/update/delete policy for
-- anon/authenticated: the anonymous exam-taking flow writes exclusively via
-- server routes using the service role, which bypasses RLS entirely.
create policy "exam_attempts_select_members" on public.exam_attempts
  for select to authenticated using (public.is_member(workspace_id));

create policy "attempt_answers_select_members" on public.attempt_answers
  for select to authenticated using (public.is_member(workspace_id));
