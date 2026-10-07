-- Fix: attempt_answers.item_id pointed at test_items (migration 010), but the
-- exam runtime pins questions in online_exam_items (migration 017) and writes
-- THOSE ids. Every student answer was rejected by the foreign key, so every
-- attempt scored zero. The report RPCs joined test_items for the same reason
-- and would have returned empty results once answers did save.
--
-- No attempt_answers row can exist with a test_items id: the runtime never
-- wrote one and the old constraint rejected everything else, so re-pointing
-- the constraint needs no data migration.

alter table public.attempt_answers drop constraint attempt_answers_item_id_fkey;

alter table public.attempt_answers
  add constraint attempt_answers_item_id_fkey
  foreign key (item_id) references public.online_exam_items (id) on delete cascade;

-- Same bodies as 20250101000022_report_rpcs.sql, with `test_items ti` replaced
-- by `online_exam_items oei`. get_student_progress does not touch items and is
-- unchanged.

create or replace function public.get_class_report(
  p_workspace_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  with roster as (
    select student_id from public.class_students
    where workspace_id = p_workspace_id and class_id = p_class_id
  ),
  scored_attempts as (
    select ea.id, ea.student_id, ea.score, ea.max_score
    from public.exam_attempts ea
    join roster r on r.student_id = ea.student_id
    where ea.workspace_id = p_workspace_id
      and ea.score is not null and ea.max_score is not null and ea.max_score > 0
  ),
  per_question as (
    select
      oei.id as item_id,
      oei.question_id,
      left(coalesce(q.stem_text, ''), 120) as stem_preview,
      count(*) filter (where aa.is_correct) as correct_count,
      count(*) as total_count
    from public.attempt_answers aa
    join public.exam_attempts ea on ea.id = aa.attempt_id
    join roster r on r.student_id = ea.student_id
    join public.online_exam_items oei on oei.id = aa.item_id
    join public.questions q on q.id = oei.question_id
    where ea.workspace_id = p_workspace_id
    group by oei.id, oei.question_id, q.stem_text
  ),
  hardest as (
    select item_id, question_id, stem_preview,
      round((correct_count::numeric / total_count) * 100, 1) as correct_rate_percent
    from per_question
    where total_count > 0
    order by (correct_count::numeric / total_count) asc
    limit 10
  )
  select jsonb_build_object(
    'student_count', (select count(*) from roster),
    'attempt_count', (select count(*) from scored_attempts),
    'average_percent', (
      select round(avg((score / max_score) * 100)::numeric, 1) from scored_attempts
    ),
    'score_distribution', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'student_id', student_id,
          'percent', round((score / max_score) * 100, 1)
        )),
        '[]'::jsonb
      )
      from scored_attempts
    ),
    'hardest_questions', (
      select coalesce(jsonb_agg(to_jsonb(hardest)), '[]'::jsonb) from hardest
    )
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.get_outcome_report(
  p_workspace_id uuid,
  p_class_id uuid,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  with roster as (
    select student_id from public.class_students
    where workspace_id = p_workspace_id and class_id = p_class_id
      and (p_student_id is null or student_id = p_student_id)
  ),
  per_outcome as (
    select
      co.id as outcome_id,
      co.description,
      count(*) filter (where aa.is_correct) as correct_count,
      count(*) as total_count
    from public.attempt_answers aa
    join public.exam_attempts ea on ea.id = aa.attempt_id
    join roster r on r.student_id = ea.student_id
    join public.online_exam_items oei on oei.id = aa.item_id
    join public.question_outcomes qo on qo.question_id = oei.question_id
    join public.curriculum_outcomes co on co.id = qo.outcome_id
    where ea.workspace_id = p_workspace_id
    group by co.id, co.description
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'outcome_id', outcome_id,
        'description', description,
        'correct_count', correct_count,
        'total_count', total_count,
        'correct_rate_percent', round((correct_count::numeric / total_count) * 100, 1)
      )
      order by (correct_count::numeric / total_count) asc
    ),
    '[]'::jsonb
  ) into v_result
  from per_outcome
  where total_count > 0;

  return v_result;
end;
$$;

create or replace function public.get_weak_topics(
  p_workspace_id uuid,
  p_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_member(p_workspace_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  with roster as (
    select student_id from public.class_students
    where workspace_id = p_workspace_id and class_id = p_class_id
  ),
  per_topic as (
    select
      ct.id as topic_id,
      ct.name,
      count(*) filter (where aa.is_correct) as correct_count,
      count(*) as total_count
    from public.attempt_answers aa
    join public.exam_attempts ea on ea.id = aa.attempt_id
    join roster r on r.student_id = ea.student_id
    join public.online_exam_items oei on oei.id = aa.item_id
    join public.question_outcomes qo on qo.question_id = oei.question_id
    join public.curriculum_outcomes co on co.id = qo.outcome_id
    join public.curriculum_topics ct on ct.id = co.topic_id
    where ea.workspace_id = p_workspace_id
    group by ct.id, ct.name
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'topic_id', topic_id,
        'name', name,
        'correct_count', correct_count,
        'total_count', total_count,
        'correct_rate_percent', round((correct_count::numeric / total_count) * 100, 1)
      )
      order by (correct_count::numeric / total_count) asc
    ),
    '[]'::jsonb
  ) into v_result
  from per_topic
  where total_count > 0;

  return v_result;
end;
$$;
