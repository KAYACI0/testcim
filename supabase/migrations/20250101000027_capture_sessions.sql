-- Capture Ecosystem (Prompt 14): Short-lived capture sessions for phone,
-- extension, and desktop companion.
--
-- Sessions link an external device to a target test in a workspace.
-- The pairing token hash is stored, ensuring secrets are not held in plaintext.

create table public.capture_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  test_id uuid not null references public.tests (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  token_hash text not null unique,
  device_type text not null check (device_type in ('phone', 'extension', 'desktop')),
  status text not null default 'active' check (status in ('active', 'closed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create index capture_sessions_workspace_id_idx on public.capture_sessions (workspace_id, created_at desc);
create index capture_sessions_test_id_idx on public.capture_sessions (test_id, status);
create index capture_sessions_token_hash_idx on public.capture_sessions (token_hash) where status = 'active';

alter table public.capture_sessions enable row level security;

create policy "capture_sessions_select_members" on public.capture_sessions
  for select to authenticated
  using (public.is_member(workspace_id));

create policy "capture_sessions_insert_editors" on public.capture_sessions
  for insert to authenticated
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

create policy "capture_sessions_update_editors" on public.capture_sessions
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin', 'editor']))
  with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

-- Function to validate capture token and refresh last_active_at (used by anonymous phone / device endpoints)
create or replace function public.validate_capture_session(p_token_hash text)
returns table (
  session_id uuid,
  workspace_id uuid,
  test_id uuid,
  test_title text,
  device_type text,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.capture_sessions;
  v_title text;
begin
  select * into v_session from public.capture_sessions
  where token_hash = p_token_hash and status = 'active' and expires_at > now();

  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text, false;
    return;
  end if;

  update public.capture_sessions set last_active_at = now() where id = v_session.id;
  select title into v_title from public.tests where id = v_session.test_id;

  return query select v_session.id, v_session.workspace_id, v_session.test_id, coalesce(v_title, ''), v_session.device_type, true;
end;
$$;

revoke all on function public.validate_capture_session(text) from public;
grant execute on function public.validate_capture_session(text) to authenticated, anon, service_role;

-- Atomic RPC to register captured question from an external device session
create or replace function public.submit_capture_question(
  p_token_hash text,
  p_item_id uuid,
  p_position text,
  p_asset_path text,
  p_mime text,
  p_bytes bigint,
  p_width int,
  p_height int,
  p_sha256 text,
  p_phash text,
  p_answer text default null
)
returns table (
  ok boolean,
  question_id uuid,
  question_revision_id uuid,
  asset_id uuid,
  item_id uuid,
  test_id uuid,
  workspace_id uuid,
  current_revision int,
  error text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_session public.capture_sessions;
  v_asset_id uuid;
  v_question_id uuid;
  v_revision_id uuid;
  v_item_id uuid;
  v_position text;
  v_last_pos text;
  v_test public.tests;
  v_correct jsonb := null;
  v_source text;
begin
  -- Validate session
  select * into v_session from public.capture_sessions
  where token_hash = p_token_hash and status = 'active' and expires_at > now();

  if not found then
    return query select false, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::int, 'session_invalid_or_expired'::text;
    return;
  end if;

  -- Validate path format: must be {workspace_id}/...
  if not (p_asset_path like (v_session.workspace_id::text || '/%')) then
    return query select false, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::int, 'path_mismatch'::text;
    return;
  end if;

  -- Lock test row
  select * into v_test from public.tests
  where id = v_session.test_id and workspace_id = v_session.workspace_id
  for update;

  if not found then
    return query select false, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, null::int, 'test_not_found'::text;
    return;
  end if;

  v_item_id := coalesce(p_item_id, gen_random_uuid());
  v_position := p_position;
  if v_position is null or v_position = '' then
    select position into v_last_pos
    from public.test_items
    where test_id = v_session.test_id
    order by position desc
    limit 1;
    v_position := coalesce(v_last_pos || 'a', 'a0');
  end if;

  -- Prepare answer jsonb if provided
  if p_answer is not null and p_answer in ('A', 'B', 'C', 'D', 'E') then
    v_correct := jsonb_build_object('question_type', 'mcq', 'option_id', p_answer);
  end if;

  -- Map device type to asset source enum ('mobile', 'extension', 'paste')
  if v_session.device_type = 'phone' then
    v_source := 'mobile';
  elsif v_session.device_type = 'extension' then
    v_source := 'extension';
  else
    v_source := 'paste';
  end if;

  -- Reuse or insert asset
  select id into v_asset_id
  from public.assets
  where workspace_id = v_session.workspace_id
    and sha256 = p_sha256
    and kind = 'image'
    and deleted_at is null
  limit 1;

  if v_asset_id is null then
    insert into public.assets (
      workspace_id, owner_id, bucket, path, kind, mime, bytes, width, height, sha256, phash, source
    )
    values (
      v_session.workspace_id, v_session.created_by, 'assets', p_asset_path, 'image',
      p_mime, p_bytes, p_width, p_height, p_sha256, p_phash, v_source
    )
    returning id into v_asset_id;
  end if;

  -- Insert question
  insert into public.questions (
    workspace_id, created_by, kind, question_type, stem_asset_id, option_count, points, correct, source_meta
  )
  values (
    v_session.workspace_id, v_session.created_by, 'image', 'mcq', v_asset_id, 5, 1, v_correct,
    jsonb_build_object('source', v_session.device_type, 'session_id', v_session.id)
  )
  returning id into v_question_id;

  -- Fetch auto-created question_revision_id
  select id into v_revision_id from public.question_revisions
  where question_id = v_question_id and revision = 1;

  -- Insert test_item
  insert into public.test_items (
    id, workspace_id, test_id, question_id, question_revision_id, position, points_override, correct_override, pinned
  )
  values (
    v_item_id, v_session.workspace_id, v_session.test_id, v_question_id, v_revision_id, v_position,
    null, v_correct, false
  );

  -- Increment test revision
  update public.tests
  set revision = revision + 1, updated_at = now()
  where id = v_session.test_id
  returning revision into v_test.revision;

  -- Record test snapshot
  insert into public.test_snapshots (workspace_id, test_id, revision, snapshot, reason)
  values (
    v_session.workspace_id, v_session.test_id, v_test.revision,
    jsonb_build_object('ops', jsonb_build_array(
      jsonb_build_object(
        'type', 'add_item',
        'item_id', v_item_id,
        'question_id', v_question_id,
        'question_revision_id', v_revision_id,
        'position', v_position,
        'correct_override', v_correct
      )
    )),
    'capture_session_add'
  );

  -- Update session last_active_at
  update public.capture_sessions
  set last_active_at = now()
  where id = v_session.id;

  return query select true, v_question_id, v_revision_id, v_asset_id, v_item_id, v_session.test_id, v_session.workspace_id, v_test.revision, null::text;
end;
$$;

revoke all on function public.submit_capture_question(text, uuid, text, text, text, bigint, int, int, text, text, text) from public;
grant execute on function public.submit_capture_question(text, uuid, text, text, text, bigint, int, int, text, text, text) to authenticated, anon, service_role;

-- Close capture session
create or replace function public.close_capture_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.capture_sessions
  set status = 'closed', last_active_at = now()
  where id = p_session_id
    and public.has_role(workspace_id, array['owner', 'admin', 'editor']);
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.close_capture_session(uuid) from public;
grant execute on function public.close_capture_session(uuid) to authenticated, service_role;

