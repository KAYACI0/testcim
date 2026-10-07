-- Shared pgTAP test fixtures. `supabase test db` runs every file in this
-- directory against the same database instance in filename order, so
-- helpers defined here (00 sorts first) are available to every later file.
-- Hand-rolled rather than pulling in a third-party pgTAP-helpers extension,
-- per CLAUDE.md's "read the real docs, don't invent/depend on unverified
-- APIs" — this is plain SQL, nothing exotic.

create schema if not exists tests;

-- Creates a confirmed auth.users row and returns its id. Bypasses the Auth
-- API entirely (standard local/test pattern), which also exercises
-- public.handle_new_auth_user() (profile + personal workspace + owner
-- membership) for free.
create or replace function tests.create_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

  return v_id;
end;
$$;

-- Creates a team workspace owned by p_owner with the given role, and returns
-- its id. `role` defaults to 'owner' (the owner is always a member; pass a
-- different role only meaningfully after also adding another owner).
create or replace function tests.create_workspace(p_owner uuid, p_name text default 'Test Workspace')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.workspaces (name, slug, kind, owner_id, plan_id)
  values (p_name, 'ws-' || replace(gen_random_uuid()::text, '-', ''), 'team', p_owner, 'free')
  returning id into v_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, p_owner, 'owner');

  return v_id;
end;
$$;

create or replace function tests.add_member(p_ws uuid, p_user uuid, p_role text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_ws, p_user, p_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;
$$;

-- Switches the current transaction's auth context to act as the given user
-- (or anon when p_user is null) for subsequent RLS-checked statements.
create or replace function tests.as_user(p_user uuid)
returns void
language plpgsql
as $$
begin
  if p_user is null then
    -- NULL resets the GUC to unset (not '') so auth.uid() can't hit a
    -- cast-empty-string-to-uuid error regardless of its exact guard logic.
    perform set_config('request.jwt.claim.sub', null, true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claim.sub', p_user::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end;
$$;

create or replace function tests.as_service_role()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', null, true);
  perform set_config('role', 'service_role', true);
end;
$$;

-- Tests switch to anon/authenticated/service_role mid-transaction and still
-- call these helpers (e.g. tests.create_user), so those roles need access.
grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- This file is picked up by the pgTAP runner like any test, so it needs a
-- valid (trivial) plan. It is not wrapped in a transaction on purpose: the
-- helpers above must persist for the later files.
select plan(1);
select ok(true, 'test helpers loaded');
select * from finish();
