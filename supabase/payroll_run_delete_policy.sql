-- =============================================================
-- payroll_run_delete_policy.sql
-- حذف آمن لمسيرات الرواتب التجريبية/المسودة فقط
--
-- لا يحتوي هذا الملف على أوامر حذف بيانات أو تفريغ أو إسقاط.
-- الغرض: السماح للإدارة فقط بحذف مسير الرواتب وبنوده عند الحاجة.
-- =============================================================

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payroll_run_items'
      and policyname = 'Admins can delete payroll run items'
  ) then
    create policy "Admins can delete payroll run items"
    on public.payroll_run_items
    for delete
    to authenticated
    using (app_private.current_user_has_role('admin'));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payroll_runs'
      and policyname = 'Admins can delete draft payroll runs'
  ) then
    create policy "Admins can delete draft payroll runs"
    on public.payroll_runs
    for delete
    to authenticated
    using (
      app_private.current_user_has_role('admin')
      and status = 'draft'
    );
  end if;
end $$;
