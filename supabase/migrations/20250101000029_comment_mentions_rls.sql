-- Fix: `comment_mentions` shipped without RLS (migration 023 reasoned it was
-- only reached through its parent comment), but Supabase grants table
-- privileges to anon/authenticated by default, so any signed-in user could
-- read every tenant's mention rows through PostgREST. Found by the pgTAP
-- "every table in public has row level security enabled" check.
--
-- Reads are scoped through the parent comment's workspace. There is no
-- client write policy: rows are only written by the security definer
-- `notify_comment_mentions` function.

alter table public.comment_mentions enable row level security;

create policy "comment_mentions_select_members" on public.comment_mentions
  for select to authenticated
  using (
    exists (
      select 1 from public.comments c
      where c.id = comment_mentions.comment_id
        and public.is_member(c.workspace_id)
    )
  );
