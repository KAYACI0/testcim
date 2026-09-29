-- Prompt 08 (soru bankası ve müfredat): the bank screen needs a thumbnail
-- asset for its grid view (docs/backlog.md already flagged this gap), and
-- test_items needs a way to move a pinned-false item onto the question's
-- latest revision ("güncel sürüme yükselt", docs/prompts/08 item 7) without
-- a full apply_test_ops remove+add round trip that would lose position/
-- section/group/overrides.

alter table public.questions
  add column thumb_asset_id uuid references public.assets (id) on delete set null;

-- Full create-or-replace, same pattern as 20250101000013_apply_test_ops_quota.sql:
-- the whole function body from that migration, plus one new op type.
create or replace function public.apply_test_ops(p_test_id uuid, p_base_revision int, p_ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
  v_revision int;
  v_op jsonb;
  v_op_type text;
  v_missing_ops jsonb;
  v_current_count int;
  v_net_add int;
  v_limit numeric;
begin
  select workspace_id, revision into v_ws, v_revision
  from public.tests
  where id = p_test_id
  for update;

  if v_ws is null then
    raise exception 'test_not_found' using errcode = 'P0002';
  end if;

  if not public.has_role(v_ws, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_revision <> p_base_revision then
    select coalesce(jsonb_agg(elem order by s.revision), '[]'::jsonb)
    into v_missing_ops
    from public.test_snapshots s,
         lateral jsonb_array_elements(coalesce(s.snapshot -> 'ops', '[]'::jsonb)) as elem
    where s.test_id = p_test_id and s.revision > p_base_revision;

    return jsonb_build_object(
      'ok', false,
      'current_revision', v_revision,
      'missing_ops', coalesce(v_missing_ops, '[]'::jsonb)
    );
  end if;

  select (public.get_entitlements(v_ws) ->> 'questions_per_test')::numeric into v_limit;

  if v_limit is not null and v_limit >= 0 then
    select count(*) into v_current_count from public.test_items where test_id = p_test_id;

    select
      count(*) filter (where elem ->> 'type' = 'add_item')
      - count(*) filter (where elem ->> 'type' = 'remove_item')
    into v_net_add
    from jsonb_array_elements(p_ops) as elem;

    if v_current_count + coalesce(v_net_add, 0) > v_limit then
      raise exception 'usage_limit_exceeded' using errcode = 'P0001', detail = 'questions_per_test';
    end if;
  end if;

  for v_op in select * from jsonb_array_elements(p_ops)
  loop
    v_op_type := v_op ->> 'type';

    if v_op_type = 'add_item' then
      insert into public.test_items (
        id, workspace_id, test_id, section_id, group_id,
        question_id, question_revision_id, position,
        points_override, correct_override, pinned
      )
      values (
        coalesce(nullif(v_op ->> 'item_id', '')::uuid, gen_random_uuid()),
        v_ws, p_test_id,
        nullif(v_op ->> 'section_id', '')::uuid,
        nullif(v_op ->> 'group_id', '')::uuid,
        (v_op ->> 'question_id')::uuid,
        (v_op ->> 'question_revision_id')::uuid,
        v_op ->> 'position',
        nullif(v_op ->> 'points_override', '')::numeric,
        v_op -> 'correct_override',
        coalesce((v_op ->> 'pinned')::boolean, false)
      );

    elsif v_op_type = 'remove_item' then
      delete from public.test_items
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'move_item' then
      update public.test_items
      set position = v_op ->> 'position',
          section_id = case when v_op ? 'section_id'
            then nullif(v_op ->> 'section_id', '')::uuid
            else section_id
          end
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_correct' then
      update public.test_items
      set correct_override = v_op -> 'correct'
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_points' then
      update public.test_items
      set points_override = (v_op ->> 'points')::numeric
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'set_group' then
      update public.test_items
      set group_id = nullif(v_op ->> 'group_id', '')::uuid
      where workspace_id = v_ws and test_id = p_test_id and id = (v_op ->> 'item_id')::uuid;

    elsif v_op_type = 'upgrade_revision' then
      update public.test_items ti
      set question_revision_id = qr.id
      from public.question_revisions qr
      where ti.workspace_id = v_ws
        and ti.test_id = p_test_id
        and ti.id = (v_op ->> 'item_id')::uuid
        and ti.pinned = false
        and qr.workspace_id = v_ws
        and qr.question_id = ti.question_id
        and qr.revision = (select q.current_revision from public.questions q where q.id = ti.question_id);

    elsif v_op_type = 'update_settings' then
      update public.tests
      set settings = v_op -> 'settings',
          settings_version = settings_version + 1
      where id = p_test_id;

    elsif v_op_type = 'update_title' then
      update public.tests
      set title = v_op ->> 'title'
      where id = p_test_id;

    else
      raise exception 'unknown_op_type: %', v_op_type;
    end if;
  end loop;

  update public.tests
  set revision = revision + 1,
      question_count = (select count(*) from public.test_items where test_id = p_test_id)
  where id = p_test_id
  returning revision into v_revision;

  insert into public.test_snapshots (workspace_id, test_id, revision, snapshot, reason)
  values (v_ws, p_test_id, v_revision, jsonb_build_object('ops', p_ops), 'apply_test_ops');

  return jsonb_build_object('ok', true, 'current_revision', v_revision);
end;
$$;
