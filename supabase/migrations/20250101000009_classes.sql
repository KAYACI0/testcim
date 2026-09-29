-- Classes and students, used by both online exams and OMR sessions.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  grade int,
  school_year text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

create index classes_workspace_id_idx on public.classes (workspace_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  student_no text,
  full_name text not null,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create index students_workspace_id_idx on public.students (workspace_id);
create unique index students_workspace_student_no_unique_idx
  on public.students (workspace_id, student_no)
  where student_no is not null;

create table public.class_students (
  workspace_id uuid not null,
  class_id uuid not null,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id),
  foreign key (workspace_id, class_id) references public.classes (workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id) references public.students (workspace_id, id) on delete cascade
);

create index class_students_workspace_id_idx on public.class_students (workspace_id);

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.class_students enable row level security;

create policy "classes_select_members" on public.classes
  for select to authenticated using (public.is_member(workspace_id));
create policy "classes_insert_editors" on public.classes
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "classes_update_editors" on public.classes
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "classes_delete_editors" on public.classes
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "students_select_members" on public.students
  for select to authenticated using (public.is_member(workspace_id));
create policy "students_insert_editors" on public.students
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "students_update_editors" on public.students
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "students_delete_editors" on public.students
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "class_students_select_members" on public.class_students
  for select to authenticated using (public.is_member(workspace_id));
create policy "class_students_insert_editors" on public.class_students
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "class_students_delete_editors" on public.class_students
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
