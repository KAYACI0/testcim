begin;
select plan(15);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-cap@test.local')),
  ('owner_b', tests.create_user('owner-b-cap@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Capture');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Capture');

-- Create a test in WS A
with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'Test A Math', 'test_paper')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

-- 1. Create a capture session for phone
select tests.as_user((select id from fx where key = 'owner_a'));

with s as (
  insert into public.capture_sessions (workspace_id, test_id, created_by, token_hash, device_type, expires_at)
  values (
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'test_a'),
    (select id from fx where key = 'owner_a'),
    'hash_valid_token_123',
    'phone',
    now() + interval '15 minutes'
  )
  returning id
)
insert into fx (key, id) select 'sess_1', id from s;

select is((select count(*)::int from public.capture_sessions where id = (select id from fx where key = 'sess_1')), 1, 'session created in ws_a');

-- 2. Validate with valid hash
select is((select is_valid from public.validate_capture_session('hash_valid_token_123')), true, 'valid token validates to true');
select is((select test_title from public.validate_capture_session('hash_valid_token_123')), 'Test A Math', 'valid token returns test title');

-- 3. Validate with nonexistent hash
select is((select is_valid from public.validate_capture_session('hash_nonexistent')), false, 'nonexistent token returns false');

-- 4. Expired token returns false
insert into public.capture_sessions (workspace_id, test_id, created_by, token_hash, device_type, expires_at)
values (
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'test_a'),
  (select id from fx where key = 'owner_a'),
  'hash_expired_456',
  'phone',
  now() - interval '1 minute'
);
select is((select is_valid from public.validate_capture_session('hash_expired_456')), false, 'expired token returns false');

-- 5. Closed session returns false
insert into public.capture_sessions (workspace_id, test_id, created_by, token_hash, device_type, expires_at, status)
values (
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'test_a'),
  (select id from fx where key = 'owner_a'),
  'hash_closed_789',
  'phone',
  now() + interval '15 minutes',
  'closed'
);
select is((select is_valid from public.validate_capture_session('hash_closed_789')), false, 'closed session returns false');

-- 6. Cross-tenant isolation: owner_b cannot see ws_a capture sessions
select tests.as_user((select id from fx where key = 'owner_b'));
select is((select count(*)::int from public.capture_sessions where workspace_id = (select id from fx where key = 'ws_a')), 0, 'cross-tenant: cannot view ws_a sessions');

-- 7. owner_b cannot update ws_a capture sessions
update public.capture_sessions set status = 'closed' where id = (select id from fx where key = 'sess_1');
select is((select status from public.capture_sessions where id = (select id from fx where key = 'sess_1')), null, 'cross-tenant: update does not touch other workspace');

-- 8. Verify status in ws_a is still active
select tests.as_user((select id from fx where key = 'owner_a'));
select is((select status from public.capture_sessions where id = (select id from fx where key = 'sess_1')), 'active', 'ws_a session status unchanged');

-- 9. Submit question via submit_capture_question with valid session
select is(
  (select ok from public.submit_capture_question(
    'hash_valid_token_123',
    gen_random_uuid(),
    'a0',
    (select id::text from fx where key = 'ws_a') || '/2025/test_asset.png',
    'image/png',
    1024::bigint,
    800,
    600,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    '0123456789abcdef',
    'B'
  )),
  true,
  'submit_capture_question succeeds with valid token'
);

-- 10. Check test item was created with correct answer
select is(
  (select correct_override ->> 'option_id' from public.test_items where test_id = (select id from fx where key = 'test_a') limit 1),
  'B',
  'test item has correct_override set to B'
);

-- 11. Submit with invalid token fails
select is(
  (select ok from public.submit_capture_question(
    'invalid_token_xyz',
    gen_random_uuid(),
    'a1',
    (select id::text from fx where key = 'ws_a') || '/2025/test_asset2.png',
    'image/png',
    1024::bigint,
    800,
    600,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856',
    '0123456789abcdef',
    'C'
  )),
  false,
  'submit_capture_question fails with invalid token'
);

-- 12. Submit with path outside workspace fails
select is(
  (select error from public.submit_capture_question(
    'hash_valid_token_123',
    gen_random_uuid(),
    'a2',
    (select id::text from fx where key = 'ws_b') || '/2025/hacked.png',
    'image/png',
    1024::bigint,
    800,
    600,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b857',
    '0123456789abcdef',
    null
  )),
  'path_mismatch',
  'submit_capture_question rejects path outside workspace'
);

-- 13. Close session
select is(
  (select public.close_capture_session((select id from fx where key = 'sess_1'))),
  true,
  'close_capture_session returns true for owner'
);

-- 14. Validation after close returns false
select is((select is_valid from public.validate_capture_session('hash_valid_token_123')), false, 'closed token is no longer valid');

select * from finish();
rollback;

