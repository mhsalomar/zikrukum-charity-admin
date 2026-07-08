-- =============================================================
-- invited_user_role_linking_rls.sql
-- جمعية ذكركم - ربط حسابات الدعوة ووضوح بيانات البوابات
--
-- آمن وقابل لإعادة التشغيل:
-- - لا DROP
-- - لا TRUNCATE
-- - لا DELETE
-- - يضيف/يحدث سياسات قراءة محدودة للأدوار المعتمدة فقط
-- =============================================================

create or replace function app_private.current_user_is_halaqat_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('admin', 'demo_admin', 'executive_director', 'executive_manager', 'halaqat_manager')
  );
$$;

grant execute on function app_private.current_user_is_halaqat_admin() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisors'
      and policyname = 'Supervisors can read own profile'
  ) then
    create policy "Supervisors can read own profile"
      on public.supervisors
      for select
      to authenticated
      using (
        app_private.current_user_is_halaqat_admin()
        or id = app_private.current_supervisor_id()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'halaqat'
      and policyname = 'Supervisors can read scoped halaqat'
  ) then
    create policy "Supervisors can read scoped halaqat"
      on public.halaqat
      for select
      to authenticated
      using (
        app_private.current_user_is_halaqat_admin()
        or supervisor_id = app_private.current_supervisor_id()
        or exists (
          select 1
          from public.supervisor_circles sc
          where sc.halaqa_id = halaqat.id
            and sc.supervisor_id = app_private.current_supervisor_id()
            and sc.status = 'active'
            and sc.archived_at is null
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_enrollments'
      and policyname = 'Supervisors can read scoped enrollments'
  ) then
    create policy "Supervisors can read scoped enrollments"
      on public.student_enrollments
      for select
      to authenticated
      using (
        app_private.current_user_is_halaqat_admin()
        or exists (
          select 1
          from public.halaqat h
          where h.id = student_enrollments.halaqa_id
            and h.archived_at is null
            and (
              h.supervisor_id = app_private.current_supervisor_id()
              or exists (
                select 1
                from public.supervisor_circles sc
                where sc.halaqa_id = h.id
                  and sc.supervisor_id = app_private.current_supervisor_id()
                  and sc.status = 'active'
                  and sc.archived_at is null
              )
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
      and policyname = 'Supervisors can read students in scoped halaqat'
  ) then
    create policy "Supervisors can read students in scoped halaqat"
      on public.students
      for select
      to authenticated
      using (
        app_private.current_user_is_halaqat_admin()
        or exists (
          select 1
          from public.student_enrollments se
          join public.halaqat h on h.id = se.halaqa_id
          where se.student_id = students.id
            and se.status = 'active'
            and se.archived_at is null
            and h.archived_at is null
            and (
              h.supervisor_id = app_private.current_supervisor_id()
              or exists (
                select 1
                from public.supervisor_circles sc
                where sc.halaqa_id = h.id
                  and sc.supervisor_id = app_private.current_supervisor_id()
                  and sc.status = 'active'
                  and sc.archived_at is null
              )
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teachers'
      and policyname = 'Supervisors can read teachers in scoped halaqat'
  ) then
    create policy "Supervisors can read teachers in scoped halaqat"
      on public.teachers
      for select
      to authenticated
      using (
        app_private.current_user_is_halaqat_admin()
        or exists (
          select 1
          from public.halaqat h
          where h.archived_at is null
            and (h.teacher_id = teachers.id or h.assistant_teacher_id = teachers.id)
            and (
              h.supervisor_id = app_private.current_supervisor_id()
              or exists (
                select 1
                from public.supervisor_circles sc
                where sc.halaqa_id = h.id
                  and sc.supervisor_id = app_private.current_supervisor_id()
                  and sc.status = 'active'
                  and sc.archived_at is null
              )
            )
        )
      );
  end if;
end $$;
