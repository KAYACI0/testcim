-- Prompt 12 (PR6): a review/approval workflow for a test's content,
-- independent of `tests.status` (draft/ready/archived is a lifecycle for
-- whether a test is usable at all; approval_status is "has someone signed
-- off on this content" — a test can be 'ready' and still 'draft' approval).

alter table public.tests
  add column approval_status text not null default 'draft'
  check (approval_status in ('draft', 'in_review', 'approved'));

create or replace function public.set_test_approval_status(
  p_test_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.tests where id = p_test_id;
  if v_ws is null then
    raise exception 'test_not_found' using errcode = 'P0002';
  end if;

  if p_status = 'approved' then
    if not public.has_role(v_ws, array['owner', 'admin']) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  else
    if not public.has_role(v_ws, array['owner', 'admin', 'editor']) then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  end if;

  update public.tests set approval_status = p_status where id = p_test_id;
end;
$$;
