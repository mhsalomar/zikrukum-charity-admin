-- =============================================================
-- supervisor_full_halaqat_teacher_progress_policies.sql
-- جمعية ذكركم - صلاحيات إشراف كل الحلقات وتحديث منجز المعلم
--
-- آمن وقابل لإعادة التشغيل:
-- - لا DROP
-- - لا TRUNCATE
-- - لا DELETE
-- - يضيف سياسات محدودة للقراءة/الإدخال/التحديث فقط
-- =============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'halaqat'
      and policyname = 'Supervisors can read all halaqat for supervision'
  ) then
    create policy "Supervisors can read all halaqat for supervision"
      on public.halaqat
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_enrollments'
      and policyname = 'Supervisors can read all enrollments for supervision'
  ) then
    create policy "Supervisors can read all enrollments for supervision"
      on public.student_enrollments
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
      and policyname = 'Supervisors can read all students for supervision'
  ) then
    create policy "Supervisors can read all students for supervision"
      on public.students
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teachers'
      and policyname = 'Supervisors can read all teachers for supervision'
  ) then
    create policy "Supervisors can read all teachers for supervision"
      on public.teachers
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisors'
      and policyname = 'Supervisors can read supervision profiles'
  ) then
    create policy "Supervisors can read supervision profiles"
      on public.supervisors
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisors can read all supervision visits'
  ) then
    create policy "Supervisors can read all supervision visits"
      on public.supervisor_visits
      for select
      to authenticated
      using (
        app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisors can insert visits for any halaqa'
  ) then
    create policy "Supervisors can insert visits for any halaqa"
      on public.supervisor_visits
      for insert
      to authenticated
      with check (
        app_private.current_user_has_role('supervisor')
        and supervisor_id = app_private.current_supervisor_id()
        and created_by = auth.uid()
        and exists (
          select 1
          from public.halaqat h
          where h.id = supervisor_visits.circle_id
            and h.archived_at is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Teachers can insert assigned student progress'
  ) then
    create policy "Teachers can insert assigned student progress"
      on public.student_progress_records
      for insert
      to authenticated
      with check (
        teacher_id = app_private.current_teacher_id()
        and exists (
          select 1
          from public.halaqat h
          where h.id = student_progress_records.halaqa_id
            and h.archived_at is null
            and (
              h.teacher_id = app_private.current_teacher_id()
              or h.assistant_teacher_id = app_private.current_teacher_id()
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Teachers can update assigned student progress'
  ) then
    create policy "Teachers can update assigned student progress"
      on public.student_progress_records
      for update
      to authenticated
      using (
        teacher_id = app_private.current_teacher_id()
        and exists (
          select 1
          from public.halaqat h
          where h.id = student_progress_records.halaqa_id
            and h.archived_at is null
            and (
              h.teacher_id = app_private.current_teacher_id()
              or h.assistant_teacher_id = app_private.current_teacher_id()
            )
        )
      )
      with check (
        teacher_id = app_private.current_teacher_id()
        and exists (
          select 1
          from public.halaqat h
          where h.id = student_progress_records.halaqa_id
            and h.archived_at is null
            and (
              h.teacher_id = app_private.current_teacher_id()
              or h.assistant_teacher_id = app_private.current_teacher_id()
            )
        )
      );
  end if;
end $$;
