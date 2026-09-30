-- Prompt 12 (PR1): retention + archival for classes/students, and batch
-- RPCs for roster import and bulk deletion. Batch RPCs exist so a 300-row
-- import or delete is one round trip, not N.

alter table public.classes add column retention_until date;
alter table public.students add column archived_at timestamptz;

-- Deletes stale class<->student links once a class's retention period has
-- passed. Only the link is removed, never the `students` row itself (a
-- student may belong to other, still-retained classes) per the KVKK
-- decision: minimum data, bounded retention, but no silent loss of a
-- student record that's still in active use elsewhere.
create or replace function public.cleanup_expired_class_retention()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.class_students cs
  using public.classes c
  where cs.class_id = c.id
    and c.retention_until is not null
    and c.retention_until < current_date;
$$;

select cron.schedule(
  'cleanup-expired-class-retention',
  '0 3 * * *',
  $$select public.cleanup_expired_class_retention();$$
);

-- Bulk roster import: inserts/updates students and links them to one class
-- in a single transaction. Rows are expected to already be validated
-- (Zod, client-side) before this is called; a row whose `student_no` matches
-- an existing student in the workspace updates that student's name and
-- reuses it (so re-importing a roster doesn't create duplicates) rather than
-- erroring. Returns how many student rows were touched and how many class
-- links were created, for the UI's confirmation message.
create or replace function public.bulk_import_students(
  p_workspace_id uuid,
  p_class_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_linked int := 0;
  v_row jsonb;
  v_student_id uuid;
begin
  if not public.has_role(p_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.classes
    where id = p_class_id and workspace_id = p_workspace_id
  ) then
    raise exception 'class_not_found';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    if v_row ->> 'student_no' is not null and v_row ->> 'student_no' <> '' then
      insert into public.students (workspace_id, student_no, full_name)
      values (p_workspace_id, v_row ->> 'student_no', v_row ->> 'full_name')
      on conflict (workspace_id, student_no)
        where student_no is not null
        do update set full_name = excluded.full_name
      returning id into v_student_id;
    else
      insert into public.students (workspace_id, full_name)
      values (p_workspace_id, v_row ->> 'full_name')
      returning id into v_student_id;
    end if;

    v_inserted := v_inserted + 1;

    insert into public.class_students (workspace_id, class_id, student_id)
    values (p_workspace_id, p_class_id, v_student_id)
    on conflict (class_id, student_id) do nothing;

    if found then
      v_linked := v_linked + 1;
    end if;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'linked', v_linked);
end;
$$;

-- Permanently deletes students (owner/admin only). `class_students` rows
-- cascade automatically (FK on delete cascade); `exam_attempts.student_id`
-- and `omr_scans.student_id` are set to null (existing FKs), never cascaded,
-- so past results stay in place, just unlinked. Writes one audit_log row per
-- workspace call summarizing the count, per the KVKK deletion trail
-- requirement.
create or replace function public.bulk_delete_students(
  p_workspace_id uuid,
  p_student_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if not public.has_role(p_workspace_id, array['owner', 'admin']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  with removed as (
    delete from public.students
    where workspace_id = p_workspace_id and id = any(p_student_ids)
    returning id
  )
  select count(*) into v_deleted from removed;

  insert into public.audit_log (workspace_id, actor_id, action, target_type, meta)
  values (
    p_workspace_id,
    (select auth.uid()),
    'bulk_delete_students',
    'students',
    jsonb_build_object('count', v_deleted)
  );
end;
$$;
