-- Prompt 12 (PR4): AI-drafted report-card (karne) summaries. Generation goes
-- through `executeAiJob` (an authenticated, credit-spending call), so this
-- table gets a normal authenticated insert policy rather than the
-- service-role-only pattern used by the anonymous exam-taking tables.

create table public.report_card_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  student_id uuid not null,
  class_id uuid not null,
  source_report jsonb not null,
  summary_text text not null,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, student_id) references public.students (workspace_id, id) on delete cascade,
  foreign key (workspace_id, class_id) references public.classes (workspace_id, id) on delete cascade
);

create trigger set_updated_at
  before update on public.report_card_summaries
  for each row execute function public.set_updated_at();

create index report_card_summaries_workspace_id_idx on public.report_card_summaries (workspace_id);
create index report_card_summaries_student_id_idx on public.report_card_summaries (student_id);

alter table public.report_card_summaries enable row level security;

create policy "report_card_summaries_select_members" on public.report_card_summaries
  for select to authenticated using (public.is_member(workspace_id));
create policy "report_card_summaries_insert_editors" on public.report_card_summaries
  for insert to authenticated with check (public.has_role(workspace_id, array['owner', 'admin', 'editor']));
create policy "report_card_summaries_delete_editors" on public.report_card_summaries
  for delete to authenticated using (public.has_role(workspace_id, array['owner', 'admin', 'editor']));

-- No authenticated update policy: approval is the only mutation after
-- insert, and it's owner/admin-only plus needs to stamp approved_by/at
-- atomically, so it goes through this RPC instead of a direct table update.
create or replace function public.approve_report_card_summary(
  p_workspace_id uuid,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(p_workspace_id, array['owner', 'admin']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.report_card_summaries
  set status = 'approved', approved_by = auth.uid(), approved_at = now()
  where id = p_id and workspace_id = p_workspace_id;

  if not found then
    raise exception 'summary_not_found';
  end if;
end;
$$;
