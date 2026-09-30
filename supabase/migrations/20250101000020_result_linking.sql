-- Prompt 12 (PR2): bulk-link exam_attempts / omr_scans rows to student
-- records. Both tables already carry a nullable student_id FK; exam_attempts
-- has no authenticated write policy (anonymous exam-taking is server-only via
-- the service role per 20250101000010_online_exam.sql), so linking must go
-- through this security-definer RPC rather than a direct RLS-guarded update.

create or replace function public.link_attempts_to_students(
  p_workspace_id uuid,
  p_links jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link jsonb;
  v_kind text;
  v_id uuid;
  v_student_id uuid;
  v_linked int := 0;
begin
  if not public.has_role(p_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for v_link in select * from jsonb_array_elements(p_links) loop
    v_kind := v_link ->> 'kind';
    v_id := (v_link ->> 'id')::uuid;
    v_student_id := (v_link ->> 'studentId')::uuid;

    if not exists (
      select 1 from public.students
      where id = v_student_id and workspace_id = p_workspace_id
    ) then
      raise exception 'student_not_found';
    end if;

    if v_kind = 'exam_attempt' then
      update public.exam_attempts
      set student_id = v_student_id
      where id = v_id and workspace_id = p_workspace_id;
    elsif v_kind = 'omr_scan' then
      update public.omr_scans
      set student_id = v_student_id
      where id = v_id and workspace_id = p_workspace_id;
    else
      raise exception 'invalid_kind';
    end if;

    if found then
      v_linked := v_linked + 1;
    end if;
  end loop;

  return jsonb_build_object('linked', v_linked);
end;
$$;
