-- =============================================================
-- finance_delete_policy.sql
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- الغرض:
-- السماح بحذف سجلات مالية مفردة أُدخلت بالخطأ من واجهة المالية فقط.
--
-- لا يحتوي هذا الملف على أوامر حذف بيانات أو تفريغ أو إسقاط للجداول.
-- لا تشغّله إلا بعد مراجعة واعتماد الصلاحية.
-- =============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_expenses' and policyname = 'Finance delete expenses'
  ) then
    create policy "Finance delete expenses"
    on public.finance_expenses
    for delete
    to authenticated
    using (app_private.current_user_can_write_finance());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_revenues' and policyname = 'Finance delete revenues'
  ) then
    create policy "Finance delete revenues"
    on public.finance_revenues
    for delete
    to authenticated
    using (app_private.current_user_can_write_finance());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_budget_items' and policyname = 'Finance delete budget_items'
  ) then
    create policy "Finance delete budget_items"
    on public.finance_budget_items
    for delete
    to authenticated
    using (app_private.current_user_can_write_finance());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'donors' and policyname = 'Finance delete donors'
  ) then
    create policy "Finance delete donors"
    on public.donors
    for delete
    to authenticated
    using (app_private.current_user_can_write_finance());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'finance_reports' and policyname = 'Finance delete reports'
  ) then
    create policy "Finance delete reports"
    on public.finance_reports
    for delete
    to authenticated
    using (app_private.current_user_can_write_finance());
  end if;
end $$;
