-- Identity and tenancy: profiles, workspaces, membership, invites, and the
-- helper functions every later RLS policy in this schema builds on.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_path text,
  locale text not null default 'tr',
  onboarding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null check (kind in ('personal', 'team')),
  owner_id uuid not null references auth.users (id),
  plan_id text not null references public.plans (id) default 'free',
  branding jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create index workspaces_owner_id_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create trigger set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.workspace_invites
  for each row execute function public.set_updated_at();

create index workspace_invites_workspace_id_idx on public.workspace_invites (workspace_id);

-- Only one pending (unaccepted) invite per email per workspace.
create unique index workspace_invites_pending_unique_idx
  on public.workspace_invites (workspace_id, email)
  where accepted_at is null;

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies everywhere else in the schema.
-- security definer + fixed search_path so they can't be tricked by a caller
-- controlling search_path, and so they can read workspace_members regardless
-- of the caller's own RLS visibility into that table.
-- ---------------------------------------------------------------------------

create or replace function public.is_member(ws uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_role(ws uuid, roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- New auth.users row -> profile + personal workspace + owner membership.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name)
  values (new.id, display_name);

  insert into public.workspaces (name, slug, kind, owner_id, plan_id)
  values (
    display_name || ' Çalışma Alanı',
    'ws-' || replace(new.id::text, '-', ''),
    'personal',
    new.id,
    'free'
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Safety net: never let a workspace end up without an owner via a role
-- change or membership removal (deleting the whole workspace is fine; that
-- cascades workspace_members away entirely).
-- ---------------------------------------------------------------------------

create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_owners int;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'owner' then
      return old;
    end if;
  else
    if old.role <> 'owner' or new.role = 'owner' then
      return new;
    end if;
  end if;

  select count(*) into remaining_owners
  from public.workspace_members m
  where m.workspace_id = old.workspace_id
    and m.role = 'owner'
    and m.user_id <> old.user_id;

  if remaining_owners = 0 then
    raise exception 'workspace_must_have_owner' using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger prevent_last_owner_removal
  before update or delete on public.workspace_members
  for each row execute function public.prevent_last_owner_removal();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

-- profiles: visible to yourself and to anyone who shares a workspace with you
-- (so members can see each other's names); editable only by yourself. No
-- client insert/delete — lifecycle is owned by the auth.users trigger/cascade.
create policy "profiles_select_self_or_co_member" on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
  );

create policy "profiles_update_self" on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces: members read; only team workspaces can be self-served created
-- (personal workspaces are trigger-managed); admin/owner edit settings;
-- owner deletes.
create policy "workspaces_select_members" on public.workspaces
  for select
  to authenticated
  using (public.is_member(id));

create policy "workspaces_insert_team_self" on public.workspaces
  for insert
  to authenticated
  with check (kind = 'team' and owner_id = (select auth.uid()));

create policy "workspaces_update_admins" on public.workspaces
  for update
  to authenticated
  using (public.has_role(id, array['owner', 'admin']))
  with check (public.has_role(id, array['owner', 'admin']));

create policy "workspaces_delete_owner" on public.workspaces
  for delete
  to authenticated
  using (public.has_role(id, array['owner']));

-- workspace_members: members read; owner/admin manage membership (editor
-- cannot add members, per the role matrix).
create policy "workspace_members_select_members" on public.workspace_members
  for select
  to authenticated
  using (public.is_member(workspace_id));

create policy "workspace_members_insert_admins" on public.workspace_members
  for insert
  to authenticated
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create policy "workspace_members_update_admins" on public.workspace_members
  for update
  to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create policy "workspace_members_delete_admins" on public.workspace_members
  for delete
  to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']));

-- workspace_invites: admin/owner only. Anonymous invite-accept flow goes
-- through a server route with the service role, not direct client RLS.
create policy "workspace_invites_select_admins" on public.workspace_invites
  for select
  to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']));

create policy "workspace_invites_insert_admins" on public.workspace_invites
  for insert
  to authenticated
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create policy "workspace_invites_update_admins" on public.workspace_invites
  for update
  to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create policy "workspace_invites_delete_admins" on public.workspace_invites
  for delete
  to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']));
