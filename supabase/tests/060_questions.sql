begin;
select plan(11);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-questions@test.local')),
  ('owner_b', tests.create_user('owner-b-questions@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Q');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Q');

select tests.as_service_role();
with subj as (
  insert into public.curriculum_subjects (code, name) values ('TEST-SUBJ-060', 'Test Subject') returning id
), outcome as (
  insert into public.curriculum_outcomes (subject_id, description)
  select id, 'Test outcome' from subj
  returning id
)
insert into fx (key, id) select 'outcome', id from outcome;

select tests.as_user((select id from fx where key = 'owner_a'));

with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct)
  values (
    (select id from fx where key = 'ws_a'), 'rich', 'mcq', 'İstanbul hangi kıtadadır?',
    '[]'::jsonb, '{}'::jsonb
  )
  returning id
)
insert into fx (key, id) select 'question_a', id from q;

with t as (
  insert into public.tags (workspace_id, name) values ((select id from fx where key = 'ws_a'), 'geo') returning id
)
insert into fx (key, id) select 'tag_a', id from t;

-- Revision trigger: a fresh question is revision 1 with one history row.
select is(
  (select current_revision from public.questions where id = (select id from fx where key = 'question_a')),
  1, 'a new question starts at revision 1'
);
select is(
  (select count(*)::int from public.question_revisions where question_id = (select id from fx where key = 'question_a')),
  1, 'a new question has exactly one revision snapshot'
);

-- Non-content field change: no new revision.
update public.questions set difficulty = 3 where id = (select id from fx where key = 'question_a');
select is(
  (select current_revision from public.questions where id = (select id from fx where key = 'question_a')),
  1, 'changing difficulty (not content) does not bump the revision'
);

-- Content field change: revision bumps and a new snapshot is recorded.
update public.questions set stem_text = 'İstanbul hangi kıtalardadır?' where id = (select id from fx where key = 'question_a');
select is(
  (select current_revision from public.questions where id = (select id from fx where key = 'question_a')),
  2, 'changing stem_text bumps the revision'
);
select is(
  (select count(*)::int from public.question_revisions where question_id = (select id from fx where key = 'question_a')),
  2, 'the content change recorded a second revision snapshot'
);

-- Search vector uses tr_normalize, so accent/case-insensitive search works.
select ok(
  (select search @@ to_tsquery('simple', public.tr_normalize('Istanbul')) from public.questions where id = (select id from fx where key = 'question_a')),
  'search vector matches a case/accent-insensitive query'
);

-- question_tags / question_outcomes: junction rows carry workspace_id and
-- are guarded by a composite FK to the owning question.
insert into public.question_tags (workspace_id, question_id, tag_id)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'question_a'), (select id from fx where key = 'tag_a'));
insert into public.question_outcomes (workspace_id, question_id, outcome_id)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'question_a'), (select id from fx where key = 'outcome'));

-- Isolate the composite-FK tenant guard from RLS by testing it as the
-- service role (bypasses RLS entirely): the FK alone must reject a
-- workspace_id that doesn't match the referenced question's own workspace.
select tests.as_service_role();
select throws_ok(
  format(
    $sql$insert into public.question_tags (workspace_id, question_id, tag_id) values (%L, %L, %L)$sql$,
    (select id from fx where key = 'ws_b'),
    (select id from fx where key = 'question_a'),
    (select id from fx where key = 'tag_a')
  ),
  null::char(5),
  null::text,
  'a question_tags row cannot claim a workspace_id its question does not belong to'
);

-- Cross-tenant select denial.
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.questions where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a questions'
);
select is(
  (select count(*)::int from public.question_revisions where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a question_revisions'
);
select is(
  (select count(*)::int from public.question_tags where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a question_tags'
);
-- An RLS-filtered UPDATE doesn't raise an error, it just matches 0 rows —
-- verify the ground truth via the service role rather than expecting a throw.
update public.questions set status = 'archived' where id = (select id from fx where key = 'question_a');
select tests.as_service_role();
select is(
  (select status from public.questions where id = (select id from fx where key = 'question_a')),
  'active', 'cross-tenant: owner_b''s update to ws_a''s question affects 0 rows'
);

select * from finish();
rollback;
