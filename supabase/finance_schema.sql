-- =============================================================
-- finance_schema.sql — وحدة المالية والرواتب
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
-- عرض للمراجعة — لا تشغّل قبل الموافقة الصريحة
--
-- ⚠️ تنبيه: هذا الملف يعتمد على جدول public.programs
-- تأكد من تشغيل supabase/programs_schema.sql أولاً
-- قبل تشغيل هذا الملف.
-- =============================================================

-- 1. employees_payroll — سجل الموظفين الأساسي
create table if not exists public.employees_payroll (
  id              uuid primary key default gen_random_uuid(),
  employee_name   text not null,
  employee_type   text not null check (employee_type in ('teacher','female_teacher','staff','female_staff','supervisor')),
  iban            text,
  bank_name       text,
  national_id     text,
  phone           text,
  base_salary     numeric(12,2) not null default 0,
  allowances      numeric(12,2) not null default 0,
  deductions      numeric(12,2) not null default 0,
  net_salary      numeric(12,2) generated always as (base_salary + allowances - deductions) stored,
  notes           text,
  status          text not null default 'active' check (status in ('active','inactive','on_leave')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

-- 2. payroll_runs — دفعات الرواتب الشهرية
create table if not exists public.payroll_runs (
  id               uuid primary key default gen_random_uuid(),
  month            text not null,
  year             int not null,
  total_employees  int not null default 0,
  total_amount     numeric(14,2) not null default 0,
  notes            text,
  status           text not null default 'draft' check (status in ('draft','approved','paid','cancelled')),
  approved_by      uuid references auth.users(id) on delete set null,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (month, year)
);

-- 3. payroll_run_items — تفاصيل كل دفعة
create table if not exists public.payroll_run_items (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.payroll_runs(id) on delete restrict,
  employee_id     uuid not null references public.employees_payroll(id) on delete restrict,
  base_salary     numeric(12,2) not null default 0,
  allowances      numeric(12,2) not null default 0,
  deductions      numeric(12,2) not null default 0,
  net_salary      numeric(12,2) not null default 0,
  payment_status  text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (run_id, employee_id)
);

-- 4. finance_expenses — المصروفات
create table if not exists public.finance_expenses (
  id               uuid primary key default gen_random_uuid(),
  expense_date     date not null,
  amount           numeric(14,2) not null,
  category         text not null,
  description      text,
  program_id       uuid references public.programs(id) on delete set null,
  payment_method   text,
  reference_number text,
  status           text not null default 'draft' check (status in ('draft','approved','rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);

-- 5. finance_revenues — الإيرادات
create table if not exists public.finance_revenues (
  id               uuid primary key default gen_random_uuid(),
  revenue_date     date not null,
  amount           numeric(14,2) not null,
  source_name      text not null,
  donor_name       text,
  program_id       uuid references public.programs(id) on delete set null,
  description      text,
  reference_number text,
  status           text not null default 'draft' check (status in ('draft','approved','rejected')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);

-- 6. finance_budget_items — بنود الميزانية
create table if not exists public.finance_budget_items (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  allocated_amount numeric(14,2) not null default 0,
  spent_amount     numeric(14,2) not null default 0,
  program_id       uuid references public.programs(id) on delete set null,
  fiscal_year      int not null,
  notes            text,
  status           text not null default 'active' check (status in ('active','inactive','archived')),
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 7. donors — المانحون
create table if not exists public.donors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  donor_type  text,
  phone       text,
  email       text,
  notes       text,
  status      text not null default 'active' check (status in ('active','inactive','archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- 8. finance_reports — التقارير المالية
create table if not exists public.finance_reports (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  report_type  text,
  period_start date,
  period_end   date,
  summary      text,
  status       text not null default 'draft' check (status in ('draft','approved','archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz
);

-- =============================================================
-- فهارس الأداء
-- =============================================================
create index if not exists employees_payroll_status_idx      on public.employees_payroll(status);
create index if not exists payroll_runs_month_idx             on public.payroll_runs(month);
create index if not exists payroll_run_items_run_id_idx       on public.payroll_run_items(run_id);
create index if not exists payroll_run_items_employee_id_idx  on public.payroll_run_items(employee_id);
create index if not exists finance_expenses_expense_date_idx  on public.finance_expenses(expense_date);
create index if not exists finance_revenues_revenue_date_idx  on public.finance_revenues(revenue_date);
create index if not exists finance_reports_status_idx         on public.finance_reports(status);

-- =============================================================
-- Triggers لتحديث updated_at
-- =============================================================
drop trigger if exists set_employees_payroll_updated_at on public.employees_payroll;
create trigger set_employees_payroll_updated_at
before update on public.employees_payroll
for each row execute function app_private.set_updated_at();

drop trigger if exists set_payroll_runs_updated_at on public.payroll_runs;
create trigger set_payroll_runs_updated_at
before update on public.payroll_runs
for each row execute function app_private.set_updated_at();

drop trigger if exists set_finance_expenses_updated_at on public.finance_expenses;
create trigger set_finance_expenses_updated_at
before update on public.finance_expenses
for each row execute function app_private.set_updated_at();

drop trigger if exists set_finance_revenues_updated_at on public.finance_revenues;
create trigger set_finance_revenues_updated_at
before update on public.finance_revenues
for each row execute function app_private.set_updated_at();

drop trigger if exists set_finance_budget_items_updated_at on public.finance_budget_items;
create trigger set_finance_budget_items_updated_at
before update on public.finance_budget_items
for each row execute function app_private.set_updated_at();

drop trigger if exists set_donors_updated_at on public.donors;
create trigger set_donors_updated_at
before update on public.donors
for each row execute function app_private.set_updated_at();

drop trigger if exists set_finance_reports_updated_at on public.finance_reports;
create trigger set_finance_reports_updated_at
before update on public.finance_reports
for each row execute function app_private.set_updated_at();

-- =============================================================
-- RLS
-- =============================================================
alter table public.employees_payroll   enable row level security;
alter table public.payroll_runs         enable row level security;
alter table public.payroll_run_items    enable row level security;
alter table public.finance_expenses     enable row level security;
alter table public.finance_revenues     enable row level security;
alter table public.finance_budget_items enable row level security;
alter table public.donors               enable row level security;
alter table public.finance_reports      enable row level security;

create or replace function app_private.current_user_is_finance()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('admin','executive_manager','finance_viewer')
  );
$$;

create or replace function app_private.current_user_can_write_finance()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('admin','executive_manager')
  );
$$;

-- ملاحظة: سياسات SELECT/INSERT/UPDATE فقط — بدون DELETE

-- employees_payroll
drop policy if exists "Finance read employees_payroll" on public.employees_payroll;
create policy "Finance read employees_payroll" on public.employees_payroll for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert employees_payroll" on public.employees_payroll;
create policy "Finance insert employees_payroll" on public.employees_payroll for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update employees_payroll" on public.employees_payroll;
create policy "Finance update employees_payroll" on public.employees_payroll for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- payroll_runs
drop policy if exists "Finance read payroll_runs" on public.payroll_runs;
create policy "Finance read payroll_runs" on public.payroll_runs for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert payroll_runs" on public.payroll_runs;
create policy "Finance insert payroll_runs" on public.payroll_runs for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update payroll_runs" on public.payroll_runs;
create policy "Finance update payroll_runs" on public.payroll_runs for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- payroll_run_items
drop policy if exists "Finance read payroll_run_items" on public.payroll_run_items;
create policy "Finance read payroll_run_items" on public.payroll_run_items for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert payroll_run_items" on public.payroll_run_items;
create policy "Finance insert payroll_run_items" on public.payroll_run_items for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update payroll_run_items" on public.payroll_run_items;
create policy "Finance update payroll_run_items" on public.payroll_run_items for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- finance_expenses
drop policy if exists "Finance read expenses" on public.finance_expenses;
create policy "Finance read expenses" on public.finance_expenses for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert expenses" on public.finance_expenses;
create policy "Finance insert expenses" on public.finance_expenses for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update expenses" on public.finance_expenses;
create policy "Finance update expenses" on public.finance_expenses for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- finance_revenues
drop policy if exists "Finance read revenues" on public.finance_revenues;
create policy "Finance read revenues" on public.finance_revenues for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert revenues" on public.finance_revenues;
create policy "Finance insert revenues" on public.finance_revenues for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update revenues" on public.finance_revenues;
create policy "Finance update revenues" on public.finance_revenues for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- finance_budget_items
drop policy if exists "Finance read budget_items" on public.finance_budget_items;
create policy "Finance read budget_items" on public.finance_budget_items for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert budget_items" on public.finance_budget_items;
create policy "Finance insert budget_items" on public.finance_budget_items for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update budget_items" on public.finance_budget_items;
create policy "Finance update budget_items" on public.finance_budget_items for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- donors
drop policy if exists "Finance read donors" on public.donors;
create policy "Finance read donors" on public.donors for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert donors" on public.donors;
create policy "Finance insert donors" on public.donors for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update donors" on public.donors;
create policy "Finance update donors" on public.donors for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

-- finance_reports
drop policy if exists "Finance read reports" on public.finance_reports;
create policy "Finance read reports" on public.finance_reports for select to authenticated using (app_private.current_user_is_finance());
drop policy if exists "Finance insert reports" on public.finance_reports;
create policy "Finance insert reports" on public.finance_reports for insert to authenticated with check (app_private.current_user_can_write_finance());
drop policy if exists "Finance update reports" on public.finance_reports;
create policy "Finance update reports" on public.finance_reports for update to authenticated using (app_private.current_user_can_write_finance()) with check (app_private.current_user_can_write_finance());

grant execute on function app_private.current_user_is_finance() to authenticated;
grant execute on function app_private.current_user_can_write_finance() to authenticated;
