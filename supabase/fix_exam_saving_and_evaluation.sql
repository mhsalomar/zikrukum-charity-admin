-- Fix recursive exam RLS and align the practical evaluation fields.
-- Safe and additive: no table deletion, data deletion, or truncation.

alter table public.exam_results
  add column if not exists alerts_count integer not null default 0,
  add column if not exists tajweed_rating text,
  add column if not exists evaluation_date date;

create or replace function app_private.teacher_can_read_exam(target_exam_id uuid)
returns boolean language sql stable security definer
set search_path = public, app_private, pg_temp
as $$
  select exists (
    select 1 from public.exams e
    join public.exam_results er on er.exam_id = e.id
    join public.student_enrollments se on se.student_id = er.student_id
    join public.halaqat h on h.id = se.halaqa_id
    join public.teachers t on t.id = h.teacher_id
    where e.id = target_exam_id and e.status = 'approved'
      and er.archived_at is null and se.archived_at is null
      and se.status = 'active' and t.auth_user_id = auth.uid()
  );
$$;

create or replace function app_private.teacher_can_read_exam_result(target_exam_id uuid, target_student_id uuid)
returns boolean language sql stable security definer
set search_path = public, app_private, pg_temp
as $$
  select exists (
    select 1 from public.exams e
    join public.student_enrollments se on se.student_id = target_student_id
    join public.halaqat h on h.id = se.halaqa_id
    join public.teachers t on t.id = h.teacher_id
    where e.id = target_exam_id and e.status = 'approved'
      and se.archived_at is null and se.status = 'active'
      and t.auth_user_id = auth.uid()
  );
$$;

create or replace function app_private.supervisor_can_read_exam(target_exam_id uuid)
returns boolean language sql stable security definer
set search_path = public, app_private, pg_temp
as $$
  select exists (
    select 1 from public.exam_results er
    join public.halaqat h on h.id = er.halaqa_id
    left join public.supervisors s on s.id = h.supervisor_id
    left join public.profiles p on p.id = s.profile_id
    where er.exam_id = target_exam_id and er.archived_at is null
      and (
        p.user_id = auth.uid()
        or exists (
          select 1 from public.supervisor_circles sc
          join public.supervisors ss on ss.id = sc.supervisor_id
          join public.profiles sp on sp.id = ss.profile_id
          where sc.halaqa_id = h.id and sc.archived_at is null and sp.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function app_private.supervisor_can_read_exam_result(target_halaqa_id uuid)
returns boolean language sql stable security definer
set search_path = public, app_private, pg_temp
as $$
  select exists (
    select 1 from public.halaqat h
    left join public.supervisors s on s.id = h.supervisor_id
    left join public.profiles p on p.id = s.profile_id
    where h.id = target_halaqa_id
      and (
        p.user_id = auth.uid()
        or exists (
          select 1 from public.supervisor_circles sc
          join public.supervisors ss on ss.id = sc.supervisor_id
          join public.profiles sp on sp.id = ss.profile_id
          where sc.halaqa_id = h.id and sc.archived_at is null and sp.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function app_private.teacher_can_read_exam(uuid) from public;
revoke all on function app_private.teacher_can_read_exam_result(uuid, uuid) from public;
revoke all on function app_private.supervisor_can_read_exam(uuid) from public;
revoke all on function app_private.supervisor_can_read_exam_result(uuid) from public;
grant execute on function app_private.teacher_can_read_exam(uuid) to authenticated;
grant execute on function app_private.teacher_can_read_exam_result(uuid, uuid) to authenticated;
grant execute on function app_private.supervisor_can_read_exam(uuid) to authenticated;
grant execute on function app_private.supervisor_can_read_exam_result(uuid) to authenticated;

alter policy "Teachers read approved related exams" on public.exams
  using (app_private.teacher_can_read_exam(id));
alter policy "Teachers read approved related exam results" on public.exam_results
  using (student_id is not null and app_private.teacher_can_read_exam_result(exam_id, student_id));
alter policy "Supervisors read scoped exams" on public.exams
  using (app_private.current_user_has_role('supervisor') and app_private.supervisor_can_read_exam(id));
alter policy "Supervisors read scoped exam results" on public.exam_results
  using (app_private.current_user_has_role('supervisor') and halaqa_id is not null and app_private.supervisor_can_read_exam_result(halaqa_id));
