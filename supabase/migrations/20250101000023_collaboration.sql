-- Prompt 12 (PR6): comments/mentions on questions or tests, and a per-user
-- notification inbox for mentions and approval requests.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  resource_type text not null check (resource_type in ('question', 'test')),
  resource_id uuid not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create index comments_workspace_id_idx on public.comments (workspace_id);
create index comments_resource_idx on public.comments (resource_type, resource_id);

create table public.comment_mentions (
  comment_id uuid not null references public.comments (id) on delete cascade,
  mentioned_user_id uuid not null references auth.users (id) on delete cascade,
  primary key (comment_id, mentioned_user_id)
);

-- No workspace_id/RLS on this table: it is only ever read alongside its
-- parent comment (already workspace-scoped) or joined from a notification
-- (also workspace-scoped) — never queried as a bare table by a client.
create index comment_mentions_mentioned_user_id_idx on public.comment_mentions (mentioned_user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('mention', 'approval_request')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_workspace_id_idx on public.notifications (workspace_id);
create index notifications_user_id_idx on public.notifications (user_id);

alter table public.comments enable row level security;
alter table public.notifications enable row level security;

create policy "comments_select_members" on public.comments
  for select to authenticated using (public.is_member(workspace_id));
create policy "comments_insert_editors" on public.comments
  for insert to authenticated
  with check (
    public.has_role(workspace_id, array['owner', 'admin', 'editor'])
    and author_id = auth.uid()
  );
create policy "comments_update_author_or_admin" on public.comments
  for update to authenticated
  using (
    public.is_member(workspace_id)
    and (author_id = auth.uid() or public.has_role(workspace_id, array['owner', 'admin']))
  )
  with check (
    public.is_member(workspace_id)
    and (author_id = auth.uid() or public.has_role(workspace_id, array['owner', 'admin']))
  );
create policy "comments_delete_author_or_admin" on public.comments
  for delete to authenticated
  using (
    public.is_member(workspace_id)
    and (author_id = auth.uid() or public.has_role(workspace_id, array['owner', 'admin']))
  );

-- Notifications are personal, not workspace-shared: only the addressed user
-- can read/update their own row, regardless of role. Insert has no
-- authenticated policy at all — every write goes through
-- `notify_comment_mentions` (security definer, called by `createComment`),
-- keeping "who gets notified for what" as one server-side decision rather
-- than something a client could fabricate directly.
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_comment_mentions(
  p_workspace_id uuid,
  p_comment_id uuid,
  p_mentioned_user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  foreach v_user_id in array p_mentioned_user_ids
  loop
    if not exists (
      select 1 from public.workspace_members
      where workspace_id = p_workspace_id and user_id = v_user_id
    ) then
      continue;
    end if;

    insert into public.comment_mentions (comment_id, mentioned_user_id)
    values (p_comment_id, v_user_id)
    on conflict do nothing;

    insert into public.notifications (workspace_id, user_id, kind, payload)
    values (p_workspace_id, v_user_id, 'mention', jsonb_build_object('comment_id', p_comment_id));
  end loop;
end;
$$;
