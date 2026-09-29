-- Optical mark recognition: form templates, scan sessions, individual scans.

create table public.omr_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  template jsonb not null,
  template_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.omr_forms
  for each row execute function public.set_updated_at();

create index omr_forms_workspace_id_idx on public.omr_forms (workspace_id);

create table public.omr_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  class_id uuid,
  status text not null default 'pending' check (status in ('pending', 'scanning', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade,
  foreign key (workspace_id, class_id) references public.classes (workspace_id, id) on delete set null
);

create trigger set_updated_at
  before update on public.omr_sessions
  for each row execute function public.set_updated_at();

create index omr_sessions_workspace_id_idx on public.omr_sessions (workspace_id);

create table public.omr_scans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  session_id uuid not null,
  asset_id uuid references public.assets (id) on delete set null,
  student_id uuid,
  student_no_read text,
  version_code text,
  answers jsonb not null default '{}'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  needs_review boolean not null default false,
  reviewed_by uuid references auth.users (id) on delete set null,
  score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, session_id) references public.omr_sessions (workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id) references public.students (workspace_id, id) on delete set null
);

create trigger set_updated_at
  before update on public.omr_scans
  for each row execute function public.set_updated_at();

create index omr_scans_workspace_id_idx on public.omr_scans (workspace_id);
create index omr_scans_session_id_idx on public.omr_scans (session_id);

alter table public.omr_forms enable row level security;
alter table public.omr_sessions enable row level security;
alter table public.omr_scans enable row level security;

create policy "omr_forms_select_members" on public.omr_forms
  for select to authenticated using (public.is_member(workspace_id));
create policy "omr_forms_insert_editors" on public.omr_forms
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_forms_update_editors" on public.omr_forms
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_forms_delete_editors" on public.omr_forms
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "omr_sessions_select_members" on public.omr_sessions
  for select to authenticated using (public.is_member(workspace_id));
create policy "omr_sessions_insert_editors" on public.omr_sessions
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_sessions_update_editors" on public.omr_sessions
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_sessions_delete_editors" on public.omr_sessions
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "omr_scans_select_members" on public.omr_scans
  for select to authenticated using (public.is_member(workspace_id));
create policy "omr_scans_insert_editors" on public.omr_scans
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_scans_update_editors" on public.omr_scans
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "omr_scans_delete_editors" on public.omr_scans
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
