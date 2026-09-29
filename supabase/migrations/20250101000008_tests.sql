-- Tests: the "tests" row itself allows normal editor+ CRUD, but its content
-- (sections, groups, items, versions, snapshot history) is select-only for
-- clients — all structural mutation goes through apply_test_ops() so every
-- change is optimistic-concurrency-checked and recorded in test_snapshots.

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  title text not null,
  type text not null check (type in ('exam', 'test_paper', 'mock', 'written', 'worksheet', 'quiz')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  settings_version int not null default 1,
  version_count int not null default 1,
  seed bigint,
  question_count int not null default 0,
  revision int not null default 1,
  last_exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.tests
  for each row execute function public.set_updated_at();

create index tests_workspace_id_idx on public.tests (workspace_id);

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  position int not null,
  title text,
  quota int,
  time_limit_sec int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.test_sections
  for each row execute function public.set_updated_at();

create index test_sections_workspace_id_idx on public.test_sections (workspace_id);
create index test_sections_test_id_idx on public.test_sections (test_id);

create table public.test_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  passage_rich jsonb,
  passage_asset_id uuid references public.assets (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.test_groups
  for each row execute function public.set_updated_at();

create index test_groups_workspace_id_idx on public.test_groups (workspace_id);
create index test_groups_test_id_idx on public.test_groups (test_id);

create table public.test_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  section_id uuid references public.test_sections (id) on delete set null,
  group_id uuid references public.test_groups (id) on delete set null,
  question_id uuid not null references public.questions (id) on delete restrict,
  question_revision_id uuid not null references public.question_revisions (id) on delete restrict,
  position text not null,
  points_override numeric,
  correct_override jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.test_items
  for each row execute function public.set_updated_at();

create index test_items_workspace_id_idx on public.test_items (workspace_id);
create index test_items_test_id_idx on public.test_items (test_id);

create table public.test_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  code text not null,
  item_order jsonb not null default '[]'::jsonb,
  option_permutations jsonb not null default '{}'::jsonb,
  seed bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, code),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.test_versions
  for each row execute function public.set_updated_at();

create index test_versions_workspace_id_idx on public.test_versions (workspace_id);

create table public.test_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  revision int not null,
  snapshot jsonb not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (test_id, revision),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create index test_snapshots_workspace_id_idx on public.test_snapshots (workspace_id);

create table public.export_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  header jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.export_templates
  for each row execute function public.set_updated_at();

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  test_id uuid not null,
  kind text not null check (kind in ('pdf', 'answer_key', 'solutions', 'docx', 'pptx', 'omr_form', 'zip')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  asset_id uuid references public.assets (id) on delete set null,
  params jsonb not null default '{}'::jsonb,
  page_count int,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, test_id) references public.tests (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.exports
  for each row execute function public.set_updated_at();

create index exports_workspace_id_idx on public.exports (workspace_id);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  token_hash text not null unique,
  permissions jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.share_links
  for each row execute function public.set_updated_at();

create index share_links_workspace_id_idx on public.share_links (workspace_id);

-- ---------------------------------------------------------------------------
-- apply_test_ops: the single write path for test structure. Single
-- transaction, row-locked on tests, optimistic-concurrency-checked against
-- `revision`. On conflict, returns the ops recorded in test_snapshots for
-- every revision after base_revision so the caller can rebase.
-- ---------------------------------------------------------------------------

create or replace function public.apply_test_ops(p_test_id uuid, p_base_revision int, p_ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
  v_revision int;
  v_op jsonb;
  v_op_type text;
  v_missing_ops jsonb;
begin
  select workspace_id, revision into v_ws, v_revision
  from public.tests
  where id = p_test_id
  for update;

  if v_ws is null then
    raise exception 'test_not_found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_ws, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_revision <> p_base_revision then
    select coalesce(jsonb_agg(elem order by s.revision), '[]'::jsonb)
    into v_missing_ops
    from public.test_snapshots s,
         lateral jsonb_array_elements(coalesce(s.snapshot -> 'ops', '[]'::jsonb)) as elem
    where s.test_id = p_test_id and s.revision > p_base_revision;

    return jsonb_build_object(
      'ok', false,
      'current_revision', v_revision,
      'missing_ops', coalesce(v_missing_ops, '[]'::jsonb)
    );
  end if;

  for v_op in select * from jsonb_array_elements(p_ops)
  loop
    v_op_type := v_op ->> 'type';

    if v_op_type = 'add_item' then
      insert into public.test_items (
        id, workspace_id, test_id, section_id, group_id,
        question_id, question_revision_id, position,
        points_override, correct_override, pinned
      )
      values (
        coalesce(nullif(v_op ->> 'item_id', '')::uuid, gen_random_uuid()),
        v_ws, p_test_id,
        nullif(v_op ->> 'section_id', '')::uuid,
        nullif(v_op ->> 'group_id', '')::uuid,
        (v_op ->> 'question_id')::uuid,
        (v_op ->> 'question_revision_id')::uuid,
        v_op ->> 'position',
        nullif(v_op ->> 'points_override', '')::numeric,
        v_op -> 'correct_override',
        coalesce((v_op ->> 'pinned')::boolean, false)
      );

    elsif v_op_type = 'remove_item' then
      delete from public.test_items
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'move_item' then
      update public.test_items
      set position = v_op ->> 'position',
          section_id = case when v_op ? 'section_id'
            then nullif(v_op ->> 'section_id', '')::uuid
            else section_id
          end
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_correct' then
      update public.test_items
      set correct_override = v_op -> 'correct'
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_points' then
      update public.test_items
      set points_override = (v_op ->> 'points')::numeric
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_group' then
      update public.test_items
      set group_id = nullif(v_op ->> 'group_id', '')::uuid
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'update_settings' then
      update public.tests
      set settings = v_op -> 'settings',
          settings_version = settings_version + 1
      where id = p_test_id;

    elsif v_op_type = 'update_title' then
      update public.tests
      set title = v_op ->> 'title'
      where id = p_test_id;

    else
      raise exception 'unknown_op_type: %', v_op_type;
    end if;
  end loop;

  update public.tests
  set revision = revision + 1,
      question_count = (select count(*) from public.test_items where test_id = p_test_id)
  where id = p_test_id
  returning revision into v_revision;

  insert into public.test_snapshots (workspace_id, test_id, revision, snapshot, reason)
  values (v_ws, p_test_id, v_revision, jsonb_build_object('ops', p_ops), 'apply_test_ops');

  return jsonb_build_object('ok', true, 'current_revision', v_revision);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tests enable row level security;
alter table public.test_sections enable row level security;
alter table public.test_groups enable row level security;
alter table public.test_items enable row level security;
alter table public.test_versions enable row level security;
alter table public.test_snapshots enable row level security;
alter table public.export_templates enable row level security;
alter table public.exports enable row level security;
alter table public.share_links enable row level security;

create policy "tests_select_members" on public.tests
  for select to authenticated using (public.is_member(workspace_id));
create policy "tests_insert_editors" on public.tests
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "tests_update_editors" on public.tests
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "tests_delete_editors" on public.tests
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

-- Content tables: select-only for clients. Mutation exclusively via
-- apply_test_ops (security definer, bypasses RLS).
create policy "test_sections_select_members" on public.test_sections
  for select to authenticated using (public.is_member(workspace_id));
create policy "test_groups_select_members" on public.test_groups
  for select to authenticated using (public.is_member(workspace_id));
create policy "test_items_select_members" on public.test_items
  for select to authenticated using (public.is_member(workspace_id));
create policy "test_versions_select_members" on public.test_versions
  for select to authenticated using (public.is_member(workspace_id));
create policy "test_snapshots_select_members" on public.test_snapshots
  for select to authenticated using (public.is_member(workspace_id));

create policy "export_templates_select_members" on public.export_templates
  for select to authenticated using (public.is_member(workspace_id));
create policy "export_templates_insert_editors" on public.export_templates
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "export_templates_update_editors" on public.export_templates
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "export_templates_delete_editors" on public.export_templates
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "exports_select_members" on public.exports
  for select to authenticated using (public.is_member(workspace_id));
create policy "exports_insert_editors" on public.exports
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "exports_update_editors" on public.exports
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "exports_delete_editors" on public.exports
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "share_links_select_members" on public.share_links
  for select to authenticated using (public.is_member(workspace_id));
create policy "share_links_insert_editors" on public.share_links
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "share_links_update_editors" on public.share_links
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "share_links_delete_editors" on public.share_links
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
