-- Core launch modules for Zikrukum operational platform.
-- Safe/idempotent migration for core launch modules.

create extension if not exists pgcrypto;

-- Complete daily student progress fields without replacing existing table/data.
alter table if exists public.student_progress_records
  add column if not exists entry_type text default 'memorization',
  add column if not exists surah_name text,
  add column if not exists from_ayah integer,
  add column if not exists to_ayah integer,
  add column if not exists pages_count numeric default 0,
  add column if not exists mistakes_count integer default 0,
  add column if not exists attendance_status text default 'present';

alter table if exists public.donors
  add column if not exists city text,
  add column if not exists category text default 'uncategorized';

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text,
  recipient_name text not null,
  student_id uuid references public.students(id),
  certificate_type text not null default 'memorization',
  title text not null,
  body text not null,
  program_id uuid references public.programs(id),
  issued_at date default current_date,
  approved_by text,
  status text not null default 'draft',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.donors(id),
  donation_date date not null default current_date,
  amount numeric not null default 0,
  support_type text not null default 'general',
  program_id uuid references public.programs(id),
  bank_account text,
  reference_number text,
  receipt_status text not null default 'not_issued',
  notes text,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.pledges (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.donors(id),
  pledged_amount numeric not null default 0,
  pledge_date date not null default current_date,
  due_date date,
  status text not null default 'open',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.donation_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text,
  donor_id uuid references public.donors(id),
  donation_id uuid references public.donations(id),
  receipt_date date not null default current_date,
  amount numeric not null default 0,
  thank_you_text text,
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  national_id text,
  skills text,
  specialization text,
  status text not null default 'candidate',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  opportunity_date date,
  expected_hours numeric default 0,
  responsible_name text,
  status text not null default 'open',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.volunteer_hours (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references public.volunteers(id),
  opportunity_id uuid references public.volunteer_opportunities(id),
  work_date date not null default current_date,
  hours_count numeric not null default 0,
  work_description text,
  approval_status text not null default 'pending',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.ministry_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  report_period text,
  report_date date not null default current_date,
  mosques_count integer default 0,
  halaqat_count integer default 0,
  teachers_count integer default 0,
  students_count integer default 0,
  attendance_summary text,
  memorization_summary text,
  programs_summary text,
  notes text,
  status text not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  exam_type text not null default 'memorization',
  halaqa_id uuid references public.halaqat(id),
  exam_date date default current_date,
  surah_scope text,
  committee_name text,
  status text not null default 'draft',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id),
  student_id uuid references public.students(id),
  evaluator_name text,
  score numeric default 0,
  rating text,
  mistakes_count integer default 0,
  result_status text not null default 'pending',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.external_notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'whatsapp_sms_future',
  message_body text not null,
  status text not null default 'inactive',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.external_notification_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.external_notification_templates(id),
  recipient_name text,
  recipient_contact text,
  channel text not null default 'whatsapp_sms_future',
  status text not null default 'disabled',
  related_student_id uuid references public.students(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists donations_donor_id_idx on public.donations(donor_id);
create index if not exists donations_program_id_idx on public.donations(program_id);
create index if not exists donations_donation_date_idx on public.donations(donation_date);
create index if not exists pledges_donor_id_idx on public.pledges(donor_id);
create index if not exists donation_receipts_donor_id_idx on public.donation_receipts(donor_id);
create index if not exists volunteer_hours_volunteer_id_idx on public.volunteer_hours(volunteer_id);
create index if not exists exam_results_exam_id_idx on public.exam_results(exam_id);
create index if not exists exam_results_student_id_idx on public.exam_results(student_id);
create index if not exists certificates_student_id_idx on public.certificates(student_id);

do $$
declare
  t text;
begin
  foreach t in array array[
    'certificates',
    'donations',
    'pledges',
    'donation_receipts',
    'volunteers',
    'volunteer_opportunities',
    'volunteer_hours',
    'ministry_reports',
    'exams',
    'exam_results',
    'external_notification_templates',
    'external_notification_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create or replace function app_private.current_user_can_manage_launch_modules()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager');
$$;

grant execute on function app_private.current_user_can_manage_launch_modules() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'certificates',
    'donations',
    'pledges',
    'donation_receipts',
    'volunteers',
    'volunteer_opportunities',
    'volunteer_hours',
    'ministry_reports',
    'exams',
    'exam_results',
    'external_notification_templates',
    'external_notification_logs'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'Launch modules read'
    ) then
      execute format('create policy "Launch modules read" on public.%I for select to authenticated using (app_private.current_user_can_manage_launch_modules())', t);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'Launch modules insert'
    ) then
      execute format('create policy "Launch modules insert" on public.%I for insert to authenticated with check (app_private.current_user_can_manage_launch_modules())', t);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'Launch modules update'
    ) then
      execute format('create policy "Launch modules update" on public.%I for update to authenticated using (app_private.current_user_can_manage_launch_modules()) with check (app_private.current_user_can_manage_launch_modules())', t);
    end if;
  end loop;
end $$;
