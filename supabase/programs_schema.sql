-- Programs and competitions schema for نظام إدارة جمعية ذكركم.
-- Review only. Do not run before explicit approval.
-- This file does not use DROP TABLE, TRUNCATE, DELETE, service_role, or storage.
-- It depends on app_private.current_user_has_role(role_name text)
-- and app_private.set_updated_at() from supabase/schema.sql.

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('competition', 'summer_course', 'initiative', 'project', 'educational')),
  description text,
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'archived')),
  sponsor_name text,
  estimated_budget numeric(12, 2) check (estimated_budget is null or estimated_budget >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  participant_type text not null check (participant_type in ('student', 'teacher', 'school', 'mosque', 'external')),
  participant_name text not null,
  related_student_id uuid references public.students(id) on delete restrict,
  related_teacher_id uuid references public.teachers(id) on delete restrict,
  related_mosque_id uuid references public.mosques(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive', 'withdrawn', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_committees (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  member_name text not null,
  role text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_tasks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  title text not null,
  description text,
  assigned_to text,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_expenses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  expense_date date,
  amount numeric(12, 2) not null check (amount >= 0),
  category text,
  description text,
  payment_method text,
  reference_number text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  title text not null,
  report_type text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_attachments_metadata (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  related_table text,
  related_id uuid,
  file_name text not null,
  file_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists programs_type_idx on public.programs(type);
create index if not exists programs_status_idx on public.programs(status);
create index if not exists programs_start_date_idx on public.programs(start_date);
create index if not exists programs_archived_at_idx on public.programs(archived_at);

create index if not exists program_participants_program_id_idx on public.program_participants(program_id);
create index if not exists program_participants_participant_type_idx on public.program_participants(participant_type);
create index if not exists program_participants_status_idx on public.program_participants(status);
create index if not exists program_participants_related_student_id_idx on public.program_participants(related_student_id);
create index if not exists program_participants_related_teacher_id_idx on public.program_participants(related_teacher_id);
create index if not exists program_participants_related_mosque_id_idx on public.program_participants(related_mosque_id);

create index if not exists program_committees_program_id_idx on public.program_committees(program_id);
create index if not exists program_tasks_program_id_idx on public.program_tasks(program_id);
create index if not exists program_tasks_status_idx on public.program_tasks(status);
create index if not exists program_tasks_due_date_idx on public.program_tasks(due_date);
create index if not exists program_expenses_program_id_idx on public.program_expenses(program_id);
create index if not exists program_expenses_status_idx on public.program_expenses(status);
create index if not exists program_expenses_expense_date_idx on public.program_expenses(expense_date);
create index if not exists program_reports_program_id_idx on public.program_reports(program_id);
create index if not exists program_attachments_metadata_program_id_idx on public.program_attachments_metadata(program_id);
create index if not exists program_attachments_metadata_related_idx on public.program_attachments_metadata(related_table, related_id);

drop trigger if exists set_programs_updated_at on public.programs;
create trigger set_programs_updated_at
before update on public.programs
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_program_tasks_updated_at on public.program_tasks;
create trigger set_program_tasks_updated_at
before update on public.program_tasks
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_program_expenses_updated_at on public.program_expenses;
create trigger set_program_expenses_updated_at
before update on public.program_expenses
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_program_reports_updated_at on public.program_reports;
create trigger set_program_reports_updated_at
before update on public.program_reports
for each row
execute function app_private.set_updated_at();

alter table public.programs enable row level security;
alter table public.program_participants enable row level security;
alter table public.program_committees enable row level security;
alter table public.program_tasks enable row level security;
alter table public.program_expenses enable row level security;
alter table public.program_reports enable row level security;
alter table public.program_attachments_metadata enable row level security;

insert into public.roles (name, display_name, description)
values
  ('programs_manager', 'مدير البرامج', 'إدارة البرامج والمسابقات والمبادرات')
on conflict (name) do update
set display_name = excluded.display_name,
    description = excluded.description;

drop policy if exists "Program admins can read programs" on public.programs;
create policy "Program admins can read programs"
on public.programs
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert programs" on public.programs;
create policy "Program admins can insert programs"
on public.programs
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update programs" on public.programs;
create policy "Program admins can update programs"
on public.programs
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read participants" on public.program_participants;
create policy "Program admins can read participants"
on public.program_participants
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert participants" on public.program_participants;
create policy "Program admins can insert participants"
on public.program_participants
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update participants" on public.program_participants;
create policy "Program admins can update participants"
on public.program_participants
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read committees" on public.program_committees;
create policy "Program admins can read committees"
on public.program_committees
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert committees" on public.program_committees;
create policy "Program admins can insert committees"
on public.program_committees
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update committees" on public.program_committees;
create policy "Program admins can update committees"
on public.program_committees
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read tasks" on public.program_tasks;
create policy "Program admins can read tasks"
on public.program_tasks
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert tasks" on public.program_tasks;
create policy "Program admins can insert tasks"
on public.program_tasks
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update tasks" on public.program_tasks;
create policy "Program admins can update tasks"
on public.program_tasks
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read expenses" on public.program_expenses;
create policy "Program admins can read expenses"
on public.program_expenses
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert expenses" on public.program_expenses;
create policy "Program admins can insert expenses"
on public.program_expenses
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update expenses" on public.program_expenses;
create policy "Program admins can update expenses"
on public.program_expenses
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read reports" on public.program_reports;
create policy "Program admins can read reports"
on public.program_reports
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert reports" on public.program_reports;
create policy "Program admins can insert reports"
on public.program_reports
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update reports" on public.program_reports;
create policy "Program admins can update reports"
on public.program_reports
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can read attachment metadata" on public.program_attachments_metadata;
create policy "Program admins can read attachment metadata"
on public.program_attachments_metadata
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can insert attachment metadata" on public.program_attachments_metadata;
create policy "Program admins can insert attachment metadata"
on public.program_attachments_metadata
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);

drop policy if exists "Program admins can update attachment metadata" on public.program_attachments_metadata;
create policy "Program admins can update attachment metadata"
on public.program_attachments_metadata
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('executive_manager')
  or app_private.current_user_has_role('programs_manager')
);
