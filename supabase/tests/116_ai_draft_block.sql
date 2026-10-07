-- AI draft questions must not enter a test until approved (Prompt 11).

begin;
select plan(5);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values ('owner_a', tests.create_user('owner-a-ai-draft@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A AI Draft');

select tests.as_user((select id from fx where key = 'owner_a'));

with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct, ai_generated, ai_review_status)
  values
    ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Taslak soru', '[]'::jsonb, '{}'::jsonb, true, 'draft'),
    ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Onayli soru', '[]'::jsonb, '{}'::jsonb, true, 'approved'),
    ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Elle yazilan soru', '[]'::jsonb, '{}'::jsonb, false, null)
  returning id, stem_text
)
insert into fx (key, id)
select case stem_text when 'Taslak soru' then 'q_draft' when 'Onayli soru' then 'q_approved' else 'q_manual' end, id from q;

insert into fx (key, id)
select 'rev_' || f.key, r.id
from fx f
join public.question_revisions r on r.question_id = f.id and r.revision = 1
where f.key like 'q\_%';

with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'T1', 'test_paper')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

select throws_ok(
  format(
    $sql$select public.apply_test_ops(%L, 1, jsonb_build_array(jsonb_build_object(
      'type', 'add_item', 'question_id', %L, 'question_revision_id', %L, 'position', 'a0'
    )))$sql$,
    (select id from fx where key = 'test_a'),
    (select id from fx where key = 'q_draft'),
    (select id from fx where key = 'rev_q_draft')
  ),
  'P0001',
  'ai_draft_not_approved',
  'apply_test_ops: an AI draft question cannot be added to a test'
);

select is(
  (select count(*) from public.test_items where test_id = (select id from fx where key = 'test_a')),
  0::bigint,
  'the rejected draft left no test item behind'
);

select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 1,
    jsonb_build_array(jsonb_build_object(
      'type', 'add_item',
      'question_id', (select id from fx where key = 'q_approved'),
      'question_revision_id', (select id from fx where key = 'rev_q_approved'),
      'position', 'a0'
    ))
  ) ->> 'ok',
  'true',
  'apply_test_ops: an approved AI question can be added'
);

select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 2,
    jsonb_build_array(jsonb_build_object(
      'type', 'add_item',
      'question_id', (select id from fx where key = 'q_manual'),
      'question_revision_id', (select id from fx where key = 'rev_q_manual'),
      'position', 'a1'
    ))
  ) ->> 'ok',
  'true',
  'apply_test_ops: a hand written question is unaffected'
);

-- Approving the draft makes it addable.
update public.questions set ai_review_status = 'approved' where id = (select id from fx where key = 'q_draft');

select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 3,
    jsonb_build_array(jsonb_build_object(
      'type', 'add_item',
      'question_id', (select id from fx where key = 'q_draft'),
      'question_revision_id', (select id from fx where key = 'rev_q_draft'),
      'position', 'a2'
    ))
  ) ->> 'ok',
  'true',
  'apply_test_ops: a draft becomes addable once approved'
);

select * from finish();
rollback;
