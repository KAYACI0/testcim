-- AI generated questions stay in the review tray until a teacher approves
-- them (docs/prompts/11 acceptance criteria: "Onaylanmamış hiçbir yapay zekâ
-- içeriği teste eklenemiyor"). Enforced in the database so no code path,
-- including apply_test_ops and any future caller, can bypass it.

create or replace function public.test_items_block_ai_draft()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.questions q
    where q.id = new.question_id
      and q.ai_generated
      and q.ai_review_status is distinct from 'approved'
  ) then
    raise exception 'ai_draft_not_approved' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger test_items_block_ai_draft
  before insert or update of question_id on public.test_items
  for each row execute function public.test_items_block_ai_draft();
