-- Files (assets, source documents, crop sessions), system curriculum data,
-- and the Storage buckets/policies backing asset uploads.

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  owner_id uuid references auth.users (id) on delete set null,
  bucket text not null check (bucket in ('assets', 'exports', 'branding')),
  path text not null,
  kind text not null check (kind in ('image', 'thumb', 'pdf', 'render', 'logo', 'export')),
  mime text not null,
  bytes bigint not null,
  width int,
  height int,
  sha256 text,
  phash text,
  source text not null check (source in ('paste', 'drop', 'pdf_crop', 'mobile', 'extension', 'ai', 'upload')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create index assets_workspace_id_idx on public.assets (workspace_id);
create unique index assets_workspace_sha256_kind_unique_idx
  on public.assets (workspace_id, sha256, kind)
  where sha256 is not null and deleted_at is null;

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  asset_id uuid not null references public.assets (id) on delete cascade,
  name text,
  page_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create trigger set_updated_at
  before update on public.source_documents
  for each row execute function public.set_updated_at();

create index source_documents_workspace_id_idx on public.source_documents (workspace_id);

create table public.crop_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  source_document_id uuid not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, source_document_id)
    references public.source_documents (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.crop_sessions
  for each row execute function public.set_updated_at();

create index crop_sessions_workspace_id_idx on public.crop_sessions (workspace_id);

-- ---------------------------------------------------------------------------
-- Curriculum: system data. No workspace_id by design (public.02 doc lists it
-- explicitly as tenant-less); read-only to everyone, writable only by a
-- migration or the official import script (slice 08).
-- ---------------------------------------------------------------------------

create table public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  grade_from int,
  grade_to int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.curriculum_subjects
  for each row execute function public.set_updated_at();

create table public.curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.curriculum_subjects (id) on delete cascade,
  parent_id uuid references public.curriculum_topics (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.curriculum_topics
  for each row execute function public.set_updated_at();

create index curriculum_topics_subject_id_idx on public.curriculum_topics (subject_id);

create table public.curriculum_outcomes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.curriculum_subjects (id) on delete cascade,
  topic_id uuid references public.curriculum_topics (id) on delete set null,
  grade int,
  code text unique,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.curriculum_outcomes
  for each row execute function public.set_updated_at();

create index curriculum_outcomes_subject_id_idx on public.curriculum_outcomes (subject_id);
create index curriculum_outcomes_topic_id_idx on public.curriculum_outcomes (topic_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.assets enable row level security;
alter table public.source_documents enable row level security;
alter table public.crop_sessions enable row level security;
alter table public.curriculum_subjects enable row level security;
alter table public.curriculum_topics enable row level security;
alter table public.curriculum_outcomes enable row level security;

create policy "assets_select_members" on public.assets
  for select to authenticated using (public.is_member(workspace_id));
create policy "assets_insert_editors" on public.assets
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "assets_update_editors" on public.assets
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "assets_delete_editors" on public.assets
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "source_documents_select_members" on public.source_documents
  for select to authenticated using (public.is_member(workspace_id));
create policy "source_documents_insert_editors" on public.source_documents
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "source_documents_update_editors" on public.source_documents
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "source_documents_delete_editors" on public.source_documents
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "crop_sessions_select_members" on public.crop_sessions
  for select to authenticated using (public.is_member(workspace_id));
create policy "crop_sessions_insert_editors" on public.crop_sessions
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "crop_sessions_update_editors" on public.crop_sessions
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "crop_sessions_delete_editors" on public.crop_sessions
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "curriculum_subjects_select_all" on public.curriculum_subjects
  for select to anon, authenticated using (true);
create policy "curriculum_topics_select_all" on public.curriculum_topics
  for select to anon, authenticated using (true);
create policy "curriculum_outcomes_select_all" on public.curriculum_outcomes
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage: private buckets, path convention {workspace_id}/{yıl}/{uuid}.{ext}.
-- Size/MIME limits are enforced at the bucket level.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('assets', 'assets', false, 26214400, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('exports', 'exports', false, 104857600, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]),
  ('branding', 'branding', false, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

create policy "assets_bucket_select_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'assets' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "assets_bucket_insert_editors" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));
create policy "assets_bucket_update_editors" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']))
  with check (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));
create policy "assets_bucket_delete_editors" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));

create policy "exports_bucket_select_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'exports' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "exports_bucket_insert_editors" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exports' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));
create policy "exports_bucket_update_editors" on storage.objects
  for update to authenticated
  using (bucket_id = 'exports' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']))
  with check (bucket_id = 'exports' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));
create policy "exports_bucket_delete_editors" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exports' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor']));

create policy "branding_bucket_select_members" on storage.objects
  for select to authenticated
  using (bucket_id = 'branding' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "branding_bucket_insert_admins" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']));
create policy "branding_bucket_update_admins" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']))
  with check (bucket_id = 'branding' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']));
create policy "branding_bucket_delete_admins" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin']));
