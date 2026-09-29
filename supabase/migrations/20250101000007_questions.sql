-- Question bank: folders, tags, questions (with immutable revision history),
-- and the outcome/tag junction tables.

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  kind text not null check (kind in ('questions', 'tests')),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create index folders_workspace_id_idx on public.folders (workspace_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create trigger set_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('image', 'rich')),
  question_type text not null check (question_type in ('mcq', 'tf', 'fill', 'match', 'open', 'numeric', 'order')),
  stem_asset_id uuid references public.assets (id) on delete set null,
  stem_rich jsonb,
  stem_text text,
  options jsonb not null default '[]'::jsonb,
  option_count int,
  correct jsonb,
  points numeric not null default 1,
  difficulty int check (difficulty between 1 and 5),
  difficulty_observed numeric,
  subject_id uuid references public.curriculum_subjects (id) on delete set null,
  topic_id uuid references public.curriculum_topics (id) on delete set null,
  explanation_rich jsonb,
  explanation_asset_id uuid references public.assets (id) on delete set null,
  source_meta jsonb not null default '{}'::jsonb,
  lang text not null default 'tr',
  ai_generated boolean not null default false,
  ai_review_status text check (ai_review_status in ('draft', 'approved')),
  status text not null default 'active' check (status in ('active', 'archived')),
  search tsvector,
  embedding extensions.vector(1536),
  current_revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create index questions_workspace_id_idx on public.questions (workspace_id);
create index questions_folder_id_idx on public.questions (folder_id);
create index questions_search_idx on public.questions using gin (search);
create index questions_stem_text_trgm_idx on public.questions using gin (stem_text extensions.gin_trgm_ops);

-- HNSW over IVFFlat: IVFFlat needs a representative sample already in the
-- table to train its lists at index-build time, which doesn't fit a bank
-- that starts empty and grows incrementally; HNSW builds and refines
-- incrementally with predictable query latency at our expected scale.
create index questions_embedding_hnsw_idx
  on public.questions using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.questions_bump_revision()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.current_revision := 1;
    return new;
  end if;

  if (new.stem_rich is distinct from old.stem_rich)
    or (new.stem_text is distinct from old.stem_text)
    or (new.stem_asset_id is distinct from old.stem_asset_id)
    or (new.options is distinct from old.options)
    or (new.correct is distinct from old.correct)
    or (new.points is distinct from old.points)
    or (new.explanation_rich is distinct from old.explanation_rich)
    or (new.explanation_asset_id is distinct from old.explanation_asset_id)
  then
    new.current_revision := old.current_revision + 1;
  end if;

  return new;
end;
$$;

create trigger questions_bump_revision
  before insert or update on public.questions
  for each row execute function public.questions_bump_revision();

create or replace function public.questions_update_search()
returns trigger
language plpgsql
as $$
begin
  new.search := to_tsvector('simple', public.tr_normalize(coalesce(new.stem_text, '')));
  return new;
end;
$$;

create trigger questions_update_search
  before insert or update on public.questions
  for each row execute function public.questions_update_search();

create table public.question_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  question_id uuid not null,
  revision int not null,
  snapshot jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (question_id, revision),
  foreign key (workspace_id, question_id) references public.questions (workspace_id, id) on delete cascade
);

create index question_revisions_workspace_id_idx on public.question_revisions (workspace_id);

create or replace function public.questions_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.current_revision <> old.current_revision then
    insert into public.question_revisions (workspace_id, question_id, revision, snapshot, created_by)
    values (
      new.workspace_id,
      new.id,
      new.current_revision,
      jsonb_build_object(
        'kind', new.kind,
        'question_type', new.question_type,
        'stem_asset_id', new.stem_asset_id,
        'stem_rich', new.stem_rich,
        'stem_text', new.stem_text,
        'options', new.options,
        'option_count', new.option_count,
        'correct', new.correct,
        'points', new.points,
        'explanation_rich', new.explanation_rich,
        'explanation_asset_id', new.explanation_asset_id
      ),
      coalesce(new.created_by, (select auth.uid()))
    );
  end if;
  return new;
end;
$$;

create trigger questions_record_revision
  after insert or update on public.questions
  for each row execute function public.questions_record_revision();

create table public.question_outcomes (
  workspace_id uuid not null,
  question_id uuid not null,
  outcome_id uuid not null references public.curriculum_outcomes (id) on delete cascade,
  primary key (question_id, outcome_id),
  foreign key (workspace_id, question_id) references public.questions (workspace_id, id) on delete cascade
);

create index question_outcomes_workspace_id_idx on public.question_outcomes (workspace_id);

create table public.question_tags (
  workspace_id uuid not null,
  question_id uuid not null,
  tag_id uuid not null,
  primary key (question_id, tag_id),
  foreign key (workspace_id, question_id) references public.questions (workspace_id, id) on delete cascade,
  foreign key (workspace_id, tag_id) references public.tags (workspace_id, id) on delete cascade
);

create index question_tags_workspace_id_idx on public.question_tags (workspace_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.questions enable row level security;
alter table public.question_revisions enable row level security;
alter table public.question_outcomes enable row level security;
alter table public.question_tags enable row level security;

create policy "folders_select_members" on public.folders
  for select to authenticated using (public.is_member(workspace_id));
create policy "folders_insert_editors" on public.folders
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "folders_update_editors" on public.folders
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "folders_delete_editors" on public.folders
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "tags_select_members" on public.tags
  for select to authenticated using (public.is_member(workspace_id));
create policy "tags_insert_editors" on public.tags
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "tags_update_editors" on public.tags
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "tags_delete_editors" on public.tags
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "questions_select_members" on public.questions
  for select to authenticated using (public.is_member(workspace_id));
create policy "questions_insert_editors" on public.questions
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "questions_update_editors" on public.questions
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "questions_delete_editors" on public.questions
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

-- Immutable history: readable by members, never written to directly by
-- clients (only the questions_record_revision trigger, which is security
-- definer and bypasses RLS).
create policy "question_revisions_select_members" on public.question_revisions
  for select to authenticated using (public.is_member(workspace_id));

create policy "question_outcomes_select_members" on public.question_outcomes
  for select to authenticated using (public.is_member(workspace_id));
create policy "question_outcomes_insert_editors" on public.question_outcomes
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "question_outcomes_delete_editors" on public.question_outcomes
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "question_tags_select_members" on public.question_tags
  for select to authenticated using (public.is_member(workspace_id));
create policy "question_tags_insert_editors" on public.question_tags
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "question_tags_delete_editors" on public.question_tags
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
