-- Safe, idempotent delete policies for payroll cleanup only.
-- No data is deleted by this migration.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payroll_run_items'
      and policyname = 'Admins can cleanup payroll run items'
  ) then
    create policy "Admins can cleanup payroll run items"
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
      and policyname = 'Admins can cleanup payroll runs'
  ) then
    create policy "Admins can cleanup payroll runs"
    on public.payroll_runs
    for delete
    to authenticated
    using (app_private.current_user_has_role('admin'));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'employees_payroll'
      and policyname = 'Admins can cleanup payroll beneficiaries'
  ) then
    create policy "Admins can cleanup payroll beneficiaries"
    on public.employees_payroll
    for delete
    to authenticated
    using (app_private.current_user_has_role('admin'));
  end if;
end $$;
