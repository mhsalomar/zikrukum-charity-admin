-- Halaqat foundation schema for نظام إدارة جمعية ذكركم.
-- Review before running in Supabase. This file does not use DROP TABLE or DELETE.
-- It depends on app_private.current_user_has_role(role_name text) from supabase/schema.sql.

create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete restrict,
  name text not null,
  district text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete restrict,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete restrict,
  full_name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.halaqat (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  supervisor_id uuid references public.supervisors(id) on delete set null,
  name text not null,
  period text not null check (period in ('fajr', 'asr', 'maghrib', 'isha')),
  sponsor_name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  guardian_name text,
  guardian_phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  halaqa_id uuid not null references public.halaqat(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive', 'completed', 'transferred')),
  enrolled_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, halaqa_id)
);

create index if not exists centers_status_idx on public.centers(status);
create index if not exists mosques_center_id_idx on public.mosques(center_id);
create index if not exists mosques_status_idx on public.mosques(status);
create index if not exists teachers_status_idx on public.teachers(status);
create index if not exists supervisors_status_idx on public.supervisors(status);
create index if not exists halaqat_mosque_id_idx on public.halaqat(mosque_id);
create index if not exists halaqat_teacher_id_idx on public.halaqat(teacher_id);
create index if not exists halaqat_supervisor_id_idx on public.halaqat(supervisor_id);
create index if not exists halaqat_status_idx on public.halaqat(status);
create index if not exists students_status_idx on public.students(status);
create index if not exists student_enrollments_student_id_idx on public.student_enrollments(student_id);
create index if not exists student_enrollments_halaqa_id_idx on public.student_enrollments(halaqa_id);
create index if not exists student_enrollments_status_idx on public.student_enrollments(status);

drop trigger if exists set_centers_updated_at on public.centers;
create trigger set_centers_updated_at
before update on public.centers
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_mosques_updated_at on public.mosques;
create trigger set_mosques_updated_at
before update on public.mosques
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_teachers_updated_at on public.teachers;
create trigger set_teachers_updated_at
before update on public.teachers
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_supervisors_updated_at on public.supervisors;
create trigger set_supervisors_updated_at
before update on public.supervisors
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_halaqat_updated_at on public.halaqat;
create trigger set_halaqat_updated_at
before update on public.halaqat
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row
execute function app_private.set_updated_at();

drop trigger if exists set_student_enrollments_updated_at on public.student_enrollments;
create trigger set_student_enrollments_updated_at
before update on public.student_enrollments
for each row
execute function app_private.set_updated_at();

alter table public.centers enable row level security;
alter table public.mosques enable row level security;
alter table public.teachers enable row level security;
alter table public.supervisors enable row level security;
alter table public.halaqat enable row level security;
alter table public.students enable row level security;
alter table public.student_enrollments enable row level security;

drop policy if exists "Admins and halaqat managers can read centers" on public.centers;
create policy "Admins and halaqat managers can read centers"
on public.centers
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage centers" on public.centers;
drop policy if exists "Admins and halaqat managers can insert centers" on public.centers;
create policy "Admins and halaqat managers can insert centers"
on public.centers
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update centers" on public.centers;
create policy "Admins and halaqat managers can update centers"
on public.centers
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read mosques" on public.mosques;
create policy "Admins and halaqat managers can read mosques"
on public.mosques
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage mosques" on public.mosques;
drop policy if exists "Admins and halaqat managers can insert mosques" on public.mosques;
create policy "Admins and halaqat managers can insert mosques"
on public.mosques
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update mosques" on public.mosques;
create policy "Admins and halaqat managers can update mosques"
on public.mosques
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read teachers" on public.teachers;
create policy "Admins and halaqat managers can read teachers"
on public.teachers
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage teachers" on public.teachers;
drop policy if exists "Admins and halaqat managers can insert teachers" on public.teachers;
create policy "Admins and halaqat managers can insert teachers"
on public.teachers
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update teachers" on public.teachers;
create policy "Admins and halaqat managers can update teachers"
on public.teachers
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read supervisors" on public.supervisors;
create policy "Admins and halaqat managers can read supervisors"
on public.supervisors
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage supervisors" on public.supervisors;
drop policy if exists "Admins and halaqat managers can insert supervisors" on public.supervisors;
create policy "Admins and halaqat managers can insert supervisors"
on public.supervisors
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update supervisors" on public.supervisors;
create policy "Admins and halaqat managers can update supervisors"
on public.supervisors
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read halaqat" on public.halaqat;
create policy "Admins and halaqat managers can read halaqat"
on public.halaqat
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage halaqat" on public.halaqat;
drop policy if exists "Admins and halaqat managers can insert halaqat" on public.halaqat;
create policy "Admins and halaqat managers can insert halaqat"
on public.halaqat
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update halaqat" on public.halaqat;
create policy "Admins and halaqat managers can update halaqat"
on public.halaqat
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read students" on public.students;
create policy "Admins and halaqat managers can read students"
on public.students
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage students" on public.students;
drop policy if exists "Admins and halaqat managers can insert students" on public.students;
create policy "Admins and halaqat managers can insert students"
on public.students
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update students" on public.students;
create policy "Admins and halaqat managers can update students"
on public.students
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can read enrollments" on public.student_enrollments;
create policy "Admins and halaqat managers can read enrollments"
on public.student_enrollments
for select
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can manage enrollments" on public.student_enrollments;
drop policy if exists "Admins and halaqat managers can insert enrollments" on public.student_enrollments;
create policy "Admins and halaqat managers can insert enrollments"
on public.student_enrollments
for insert
to authenticated
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);

drop policy if exists "Admins and halaqat managers can update enrollments" on public.student_enrollments;
create policy "Admins and halaqat managers can update enrollments"
on public.student_enrollments
for update
to authenticated
using (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
)
with check (
  app_private.current_user_has_role('admin')
  or app_private.current_user_has_role('halaqat_manager')
);
