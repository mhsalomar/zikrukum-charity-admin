-- Security hardening for the single-association production project.
-- Safe/idempotent: changes policies and privileges only. No data deletion.

alter policy attendance_select on public.attendance
  to authenticated
  using (
    app_private.current_user_is_halaqat_admin()
    or app_private.current_user_has_role('supervisor')
    or exists (
      select 1
      from public.halaqat h
      where h.id = attendance.halaqa_id
        and (
          h.teacher_id = app_private.current_teacher_id()
          or h.assistant_teacher_id = app_private.current_teacher_id()
        )
    )
  );

alter policy attendance_insert on public.attendance
  to authenticated
  with check (
    app_private.current_user_is_halaqat_admin()
    or (
      recorded_by = auth.uid()
      and exists (
        select 1
        from public.halaqat h
        where h.id = attendance.halaqa_id
          and (
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    )
  );

alter policy attendance_update on public.attendance
  to authenticated
  using (
    app_private.current_user_is_halaqat_admin()
    or (
      recorded_by = auth.uid()
      and exists (
        select 1
        from public.halaqat h
        where h.id = attendance.halaqa_id
          and (
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    )
  )
  with check (
    app_private.current_user_is_halaqat_admin()
    or (
      recorded_by = auth.uid()
      and exists (
        select 1
        from public.halaqat h
        where h.id = attendance.halaqa_id
          and (
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    )
  );

alter policy hr_read_attendance on public.employee_attendance
  to authenticated
  using (app_private.current_user_can_manage_hr());

alter policy hr_write_attendance on public.employee_attendance
  to authenticated
  using (app_private.current_user_can_manage_hr())
  with check (app_private.current_user_can_manage_hr());

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
alter function public.set_updated_at() set search_path = public, pg_temp;
