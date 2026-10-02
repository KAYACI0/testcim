begin;
select plan(9);

create temporary table fx (key text primary key, id uuid);

insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-sweep@test.local')),
  ('owner_b', tests.create_user('owner-b-sweep@test.local'));

insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Sweep');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Sweep');

-- Seed rows in workspace A as owner_a or service role
select tests.as_user((select id from fx where key = 'owner_a'));

-- 1. workspace_invites
insert into public.workspace_invites (workspace_id, email, role, token_hash, expires_at)
values ((select id from fx where key = 'ws_a'), 'guest@test.local', 'editor', 'hash_invite_a', now() + interval '1 day');

-- Create test in ws_a for dependent tables
with t as (
  insert into public.tests (workspace_id, title)
  values ((select id from fx where key = 'ws_a'), 'Test A Sweep')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

-- 2. test_sections
insert into public.test_sections (workspace_id, test_id, position, title)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 1, 'Section 1');

-- 3. test_versions
insert into public.test_versions (workspace_id, test_id, name, letter)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'Version A', 'A');

-- 4. export_templates
insert into public.export_templates (workspace_id, name, settings)
values ((select id from fx where key = 'ws_a'), 'Template A', '{}'::jsonb);

-- 5. exports
insert into public.exports (workspace_id, test_id, format, status)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'pdf', 'ready');

-- 6. share_links
insert into public.share_links (workspace_id, test_id, token_hash)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'token_share_a');

-- 7. omr_forms
insert into public.omr_forms (workspace_id, test_id, template)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), '{"layout":"standard"}'::jsonb);

-- 8. billing_profiles
insert into public.billing_profiles (workspace_id, legal_name, tax_office, tax_number)
values ((select id from fx where key = 'ws_a'), 'Kurum A', 'Kadikoy', '1234567890');

-- 9. coupon_redemptions
select tests.as_service_role();
insert into public.coupons (code, kind, percent_off, active)
values ('SWEEP10', 'percent', 10, true)
on conflict (code) do nothing;

insert into public.coupon_redemptions (coupon_code, workspace_id, redeemed_by)
values ('SWEEP10', (select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'));

-- SWITCH TO OWNER B: ASSERT ZERO VISIBILITY INTO WORKSPACE A TABLES (CROSS-TENANT REJECTION)
select tests.as_user((select id from fx where key = 'owner_b'));

-- 1. workspace_invites
select is(
  (select count(*)::int from public.workspace_invites where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a workspace_invites'
);

-- 2. test_sections
select is(
  (select count(*)::int from public.test_sections where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a test_sections'
);

-- 3. test_versions
select is(
  (select count(*)::int from public.test_versions where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a test_versions'
);

-- 4. export_templates
select is(
  (select count(*)::int from public.export_templates where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a export_templates'
);

-- 5. exports
select is(
  (select count(*)::int from public.exports where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a exports'
);

-- 6. share_links
select is(
  (select count(*)::int from public.share_links where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a share_links'
);

-- 7. omr_forms
select is(
  (select count(*)::int from public.omr_forms where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a omr_forms'
);

-- 8. billing_profiles
select is(
  (select count(*)::int from public.billing_profiles where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a billing_profiles'
);

-- 9. coupon_redemptions
select is(
  (select count(*)::int from public.coupon_redemptions where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see ws_a coupon_redemptions'
);

rollback;
