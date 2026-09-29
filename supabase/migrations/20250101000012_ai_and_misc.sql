-- AI job records, the generic background job queue, workspace feedback, and
-- public question reports.

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  model text,
  tokens_in int,
  tokens_out int,
  cost_micro bigint,
  credits_charged int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.ai_jobs
  for each row execute function public.set_updated_at();

create index ai_jobs_workspace_id_idx on public.ai_jobs (workspace_id);

-- Generic system job queue. No workspace_id by design (not tenant data) and
-- no client-facing policies at all: only the service role (which bypasses
-- RLS) and pg_cron-driven server code ever touch it.
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  body text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index feedback_workspace_id_idx on public.feedback (workspace_id);

-- Public rights-holder / content report form. The reporter is anonymous and
-- can't be trusted to set workspace_id, so it's derived server-side from the
-- referenced question.
create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  reporter_email text not null,
  question_id uuid not null references public.questions (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.question_reports
  for each row execute function public.set_updated_at();

create index question_reports_workspace_id_idx on public.question_reports (workspace_id);

create or replace function public.question_reports_set_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select q.workspace_id into new.workspace_id
  from public.questions q
  where q.id = new.question_id;

  if new.workspace_id is null then
    raise exception 'question_not_found';
  end if;

  return new;
end;
$$;

create trigger question_reports_set_workspace
  before insert on public.question_reports
  for each row execute function public.question_reports_set_workspace();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ai_jobs enable row level security;
alter table public.jobs enable row level security;
alter table public.feedback enable row level security;
alter table public.question_reports enable row level security;

create policy "ai_jobs_select_members" on public.ai_jobs
  for select to authenticated using (public.is_member(workspace_id));

-- `jobs` intentionally has zero policies: RLS is enabled (so it isn't flagged
-- by the "no table without RLS" check) but nothing is granted to
-- anon/authenticated, so every access is denied by default.

create policy "feedback_insert_members" on public.feedback
  for insert to authenticated with check (public.is_member(workspace_id));
create policy "feedback_select_admins" on public.feedback
  for select to authenticated using (public.has_role(workspace_id, array['owner', 'admin']));

create policy "question_reports_insert_public" on public.question_reports
  for insert to anon, authenticated with check (true);
create policy "question_reports_select_admins" on public.question_reports
  for select to authenticated using (public.has_role(workspace_id, array['owner', 'admin']));
create policy "question_reports_update_admins" on public.question_reports
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));
