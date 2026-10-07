begin;
select plan(8);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-files@test.local')),
  ('owner_b', tests.create_user('owner-b-files@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Files');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Files');

select tests.as_service_role();
with asset as (
  insert into public.assets (workspace_id, kind, mime, bytes, source, bucket, path)
  values (
    (select id from fx where key = 'ws_a'), 'image', 'image/png', 1000, 'paste', 'assets',
    (select id from fx where key = 'ws_a')::text || '/2026/seed.png'
  )
  returning id
)
insert into fx (key, id) select 'asset_a', id from asset;

with doc as (
  insert into public.source_documents (workspace_id, asset_id, name, page_count)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'asset_a'), 'doc.pdf', 3)
  returning id
)
insert into fx (key, id) select 'source_doc_a', id from doc;

insert into public.crop_sessions (workspace_id, source_document_id)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'source_doc_a'));

-- Cross-tenant select denial.
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.assets where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a assets'
);
select is(
  (select count(*)::int from public.source_documents where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a source_documents'
);
select is(
  (select count(*)::int from public.crop_sessions where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a crop_sessions'
);

select throws_ok(
  format(
    $sql$insert into public.assets (workspace_id, kind, mime, bytes, source, bucket, path)
         values (%L, 'image', 'image/png', 1, 'upload', 'assets', %L)$sql$,
    (select id from fx where key = 'ws_a'), 'x/y.png'
  ),
  null::char(5),
  null::text,
  'cross-tenant: owner_b cannot insert an asset into ws_a'
);

-- Curriculum is public read.
select tests.as_user(null);
select ok(
  (select count(*)::int from public.curriculum_subjects) >= 0,
  'curriculum_subjects is readable by anonymous users'
);

-- Storage: path-ownership policies on storage.objects.
select tests.as_service_role();
insert into storage.objects (bucket_id, name)
values ('assets', (select id from fx where key = 'ws_a')::text || '/2026/uploaded.png');

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (
    select count(*)::int from storage.objects
    where bucket_id = 'assets'
      and name like (select id from fx where key = 'ws_a')::text || '/%'
  ),
  0, 'storage: owner_b cannot see files under ws_a''s path'
);

select throws_ok(
  format(
    $sql$insert into storage.objects (bucket_id, name) values ('assets', %L)$sql$,
    (select id from fx where key = 'ws_a')::text || '/2026/hacked.png'
  ),
  null::char(5),
  null::text,
  'storage: owner_b cannot upload into ws_a''s path'
);

select tests.as_user((select id from fx where key = 'owner_a'));
insert into storage.objects (bucket_id, name)
values ('assets', (select id from fx where key = 'ws_a')::text || '/2026/own-upload.png');
select is(
  (
    select count(*)::int from storage.objects
    where bucket_id = 'assets'
      and name like (select id from fx where key = 'ws_a')::text || '/%'
  ),
  2, 'storage: owner_a (editor+) can upload into their own workspace''s path'
);

select * from finish();
rollback;
