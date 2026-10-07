begin;
select plan(6);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-rcs@test.local')),
  ('owner_b', tests.create_user('owner-b-rcs@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A RCS');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B RCS');

select tests.as_user((select id from fx where key = 'owner_a'));

with c as (
  insert into public.classes (workspace_id, name) values ((select id from fx where key = 'ws_a'), '9A') returning id
)
insert into fx (key, id) select 'class_a', id from c;

with s as (
  insert into public.students (workspace_id, full_name) values ((select id from fx where key = 'ws_a'), 'Ada Lovelace') returning id
)
insert into fx (key, id) select 'student_a', id from s;

with rcs as (
  insert into public.report_card_summaries (workspace_id, student_id, class_id, source_report, summary_text)
  values (
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'student_a'),
    (select id from fx where key = 'class_a'),
    '{"scores": []}'::jsonb,
    'Ogrenci bu donem cebir konusunda ilerleme kaydetti.'
  )
  returning id
)
insert into fx (key, id) select 'summary_a', id from rcs;

select is(
  (select status from public.report_card_summaries where id = (select id from fx where key = 'summary_a')),
  'draft', 'a new summary starts as draft'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.report_card_summaries where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a report card summaries'
);

select throws_ok(
  format(
    $sql$select public.approve_report_card_summary(%L, %L)$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'summary_a')
  ),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot approve ws_a''s summary'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select public.approve_report_card_summary(
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'summary_a')
);
select is(
  (select status from public.report_card_summaries where id = (select id from fx where key = 'summary_a')),
  'approved', 'approve_report_card_summary marks the summary approved'
);
select isnt(
  (select approved_at from public.report_card_summaries where id = (select id from fx where key = 'summary_a')),
  null, 'approve_report_card_summary stamps approved_at'
);

select throws_ok(
  format(
    $sql$select public.approve_report_card_summary(%L, %L)$sql$,
    (select id from fx where key = 'ws_a'),
    gen_random_uuid()
  ),
  'P0001',
  null::text,
  'approve_report_card_summary raises for an unknown summary id'
);

select * from finish();
rollback;
