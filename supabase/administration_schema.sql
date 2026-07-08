-- =============================================================
-- administration_schema.sql
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- تجهيز أقسام الاجتماعات، الحوكمة، الموارد البشرية، والتقارير.
-- لا يحتوي هذا الملف على أوامر حذف أو تفريغ أو إسقاط للجداول.
-- لا تشغّله إلا بعد المراجعة والموافقة.
-- =============================================================

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_type text not null default 'committee'
    check (meeting_type in ('board','committee','work_team','general_assembly','other')),
  meeting_date date not null,
  start_time time,
  end_time time,
  location text,
  attendees text,
  absentees text,
  agenda text,
  minutes text,
  decisions text,
  recommendations text,
  status text not null default 'draft'
    check (status in ('draft','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.governance_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  item_type text not null default 'policy'
    check (item_type in ('policy','disclosure','board_member','committee_member','decision','compliance_indicator','other')),
  item_date date,
  responsible_person text,
  status text not null default 'active'
    check (status in ('active','needs_update','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  national_id text,
  phone text,
  email text,
  job_title text,
  department text,
  start_date date,
  payroll_employee_id uuid references public.employees_payroll(id) on delete set null,
  salary numeric(12,2),
  status text not null default 'active'
    check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees(id) on delete restrict,
  title text not null,
  contract_type text,
  start_date date,
  end_date date,
  status text not null default 'active'
    check (status in ('active','expired','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees(id) on delete restrict,
  leave_type text,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft','approved','rejected','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_assets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees(id) on delete set null,
  asset_name text not null,
  asset_code text,
  assigned_at date,
  returned_at date,
  status text not null default 'assigned'
    check (status in ('assigned','returned','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.hr_employees(id) on delete restrict,
  evaluation_date date not null,
  rating numeric(4,2) check (rating is null or (rating >= 0 and rating <= 100)),
  evaluator_name text,
  summary text,
  status text not null default 'draft'
    check (status in ('draft','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.management_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_type text not null default 'executive'
    check (report_type in ('financial','programs','competitions','hr','meetings_governance','executive','other')),
  period_start date,
  period_end date,
  status text not null default 'draft'
    check (status in ('draft','approved','archived')),
  summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists meetings_date_idx on public.meetings(meeting_date);
create index if not exists meetings_status_idx on public.meetings(status);
create index if not exists governance_items_type_idx on public.governance_items(item_type);
create index if not exists governance_items_status_idx on public.governance_items(status);
create index if not exists hr_employees_status_idx on public.hr_employees(status);
create index if not exists management_reports_type_idx on public.management_reports(report_type);
create index if not exists management_reports_status_idx on public.management_reports(status);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_meetings_updated_at' and tgrelid = 'public.meetings'::regclass) then
    create trigger set_meetings_updated_at before update on public.meetings
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_governance_items_updated_at' and tgrelid = 'public.governance_items'::regclass) then
    create trigger set_governance_items_updated_at before update on public.governance_items
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_hr_employees_updated_at' and tgrelid = 'public.hr_employees'::regclass) then
    create trigger set_hr_employees_updated_at before update on public.hr_employees
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_hr_contracts_updated_at' and tgrelid = 'public.hr_contracts'::regclass) then
    create trigger set_hr_contracts_updated_at before update on public.hr_contracts
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_hr_leaves_updated_at' and tgrelid = 'public.hr_leaves'::regclass) then
    create trigger set_hr_leaves_updated_at before update on public.hr_leaves
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_hr_assets_updated_at' and tgrelid = 'public.hr_assets'::regclass) then
    create trigger set_hr_assets_updated_at before update on public.hr_assets
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_hr_evaluations_updated_at' and tgrelid = 'public.hr_evaluations'::regclass) then
    create trigger set_hr_evaluations_updated_at before update on public.hr_evaluations
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_management_reports_updated_at' and tgrelid = 'public.management_reports'::regclass) then
    create trigger set_management_reports_updated_at before update on public.management_reports
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.meetings enable row level security;
alter table public.governance_items enable row level security;
alter table public.hr_employees enable row level security;
alter table public.hr_contracts enable row level security;
alter table public.hr_leaves enable row level security;
alter table public.hr_assets enable row level security;
alter table public.hr_evaluations enable row level security;
alter table public.management_reports enable row level security;

create or replace function app_private.current_user_can_manage_admin_sections()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('executive_director');
$$;

create or replace function app_private.current_user_can_manage_hr()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('hr');
$$;

grant execute on function app_private.current_user_can_manage_admin_sections() to authenticated;
grant execute on function app_private.current_user_can_manage_hr() to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'meetings' and policyname = 'Meetings read') then
    create policy "Meetings read" on public.meetings for select to authenticated using (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'meetings' and policyname = 'Meetings insert') then
    create policy "Meetings insert" on public.meetings for insert to authenticated with check (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'meetings' and policyname = 'Meetings update') then
    create policy "Meetings update" on public.meetings for update to authenticated using (app_private.current_user_can_manage_admin_sections()) with check (app_private.current_user_can_manage_admin_sections());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'governance_items' and policyname = 'Governance read') then
    create policy "Governance read" on public.governance_items for select to authenticated using (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'governance_items' and policyname = 'Governance insert') then
    create policy "Governance insert" on public.governance_items for insert to authenticated with check (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'governance_items' and policyname = 'Governance update') then
    create policy "Governance update" on public.governance_items for update to authenticated using (app_private.current_user_can_manage_admin_sections()) with check (app_private.current_user_can_manage_admin_sections());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_employees' and policyname = 'HR employees read') then
    create policy "HR employees read" on public.hr_employees for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_employees' and policyname = 'HR employees insert') then
    create policy "HR employees insert" on public.hr_employees for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_employees' and policyname = 'HR employees update') then
    create policy "HR employees update" on public.hr_employees for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_contracts' and policyname = 'HR contracts read') then
    create policy "HR contracts read" on public.hr_contracts for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_contracts' and policyname = 'HR contracts insert') then
    create policy "HR contracts insert" on public.hr_contracts for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_contracts' and policyname = 'HR contracts update') then
    create policy "HR contracts update" on public.hr_contracts for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_leaves' and policyname = 'HR leaves read') then
    create policy "HR leaves read" on public.hr_leaves for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_leaves' and policyname = 'HR leaves insert') then
    create policy "HR leaves insert" on public.hr_leaves for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_leaves' and policyname = 'HR leaves update') then
    create policy "HR leaves update" on public.hr_leaves for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_assets' and policyname = 'HR assets read') then
    create policy "HR assets read" on public.hr_assets for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_assets' and policyname = 'HR assets insert') then
    create policy "HR assets insert" on public.hr_assets for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_assets' and policyname = 'HR assets update') then
    create policy "HR assets update" on public.hr_assets for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_evaluations' and policyname = 'HR evaluations read') then
    create policy "HR evaluations read" on public.hr_evaluations for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_evaluations' and policyname = 'HR evaluations insert') then
    create policy "HR evaluations insert" on public.hr_evaluations for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_evaluations' and policyname = 'HR evaluations update') then
    create policy "HR evaluations update" on public.hr_evaluations for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'management_reports' and policyname = 'Management reports read') then
    create policy "Management reports read" on public.management_reports for select to authenticated using (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'management_reports' and policyname = 'Management reports insert') then
    create policy "Management reports insert" on public.management_reports for insert to authenticated with check (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'management_reports' and policyname = 'Management reports update') then
    create policy "Management reports update" on public.management_reports for update to authenticated using (app_private.current_user_can_manage_admin_sections()) with check (app_private.current_user_can_manage_admin_sections());
  end if;
end $$;
