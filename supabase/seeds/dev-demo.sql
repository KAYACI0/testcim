-- Development-only demo data: one demo teacher account with a small sample
-- folder, question, and test, so the local UI has something to show. Never
-- runs against a real project (`db push` ignores seed files).
--
-- Login locally with: demo@testcim.local / demo-password-123

do $$
declare
  v_user_id uuid := '11111111-1111-1111-1111-111111111111';
  v_workspace_id uuid;
  v_folder_id uuid;
  v_question_id uuid;
  v_question_revision_id uuid;
  v_test_id uuid;
begin
  if exists (select 1 from auth.users where id = v_user_id) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'demo@testcim.local',
    extensions.crypt('demo-password-123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Öğretmen"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- public.handle_new_auth_user() has already created the profile, personal
  -- workspace, and owner membership by this point.
  select id into v_workspace_id
  from public.workspaces
  where owner_id = v_user_id and kind = 'personal';

  insert into public.folders (workspace_id, kind, name)
  values (v_workspace_id, 'questions', 'Örnek Klasör')
  returning id into v_folder_id;

  insert into public.questions (
    workspace_id, folder_id, created_by, kind, question_type,
    stem_text, options, option_count, correct, points, difficulty
  )
  values (
    v_workspace_id, v_folder_id, v_user_id, 'rich', 'mcq',
    'Örnek soru metni: 2 + 2 kaçtır?',
    jsonb_build_array(
      jsonb_build_object('id', 'a', 'text', '3'),
      jsonb_build_object('id', 'b', 'text', '4'),
      jsonb_build_object('id', 'c', 'text', '5'),
      jsonb_build_object('id', 'd', 'text', '6')
    ),
    4,
    jsonb_build_object('option_id', 'b'),
    1,
    1
  )
  returning id into v_question_id;

  select id into v_question_revision_id
  from public.question_revisions
  where question_id = v_question_id and revision = 1;

  insert into public.tests (workspace_id, folder_id, created_by, title, type)
  values (v_workspace_id, null, v_user_id, 'Örnek Test', 'test_paper')
  returning id into v_test_id;

  -- apply_test_ops() authorizes via auth.uid()/has_role(); this script runs
  -- as postgres with no JWT, so fake the claim for this transaction.
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  perform public.apply_test_ops(
    v_test_id,
    1,
    jsonb_build_array(
      jsonb_build_object(
        'type', 'add_item',
        'question_id', v_question_id,
        'question_revision_id', v_question_revision_id,
        'position', 'a0'
      )
    )
  );
end $$;
