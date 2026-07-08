-- =============================================================
-- teacher_portal_schema.sql — بوابة المعلم وسجلات الحصص
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- Safe migration:
-- - Does not remove tables or rows
-- - Uses existing teachers / halaqat / students / student_enrollments
-- - Enables teacher scoped RLS without elevated secrets
-- =============================================================

-- Extend teachers with official and payroll-related fields.
alter table public.teachers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists document_type text default 'other',
  add column if not exists document_number text,
  add column if not exists nationality text,
  add column if not exists teacher_role text default 'teacher',
  add column if not exists start_date date,
  add column if not exists payroll_employee_id uuid references public.employees_payroll(id) on delete set null,
  add column if not exists bank_name text,
  add column if not exists iban text,
  add column if not exists account_holder_name text,
  add column if not exists salary_amount numeric(12,2),
  add column if not exists payroll_data_status text default 'incomplete',
  add column if not exists payroll_notes text,
  add column if not exists notes text;

alter table public.employees_payroll
  add column if not exists teacher_id uuid references public.teachers(id) on delete set null;

alter table public.halaqat
  add column if not exists assistant_teacher_id uuid references public.teachers(id) on delete set null,
  add column if not exists level text,
  add column if not exists notes text;

alter table public.students
  add column if not exists national_id text,
  add column if not exists level text,
  add column if not exists enrolled_at date,
  add column if not exists notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'teachers_document_type_check'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public.teachers
      add constraint teachers_document_type_check
      check (document_type in ('national_id', 'iqama', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'teachers_teacher_role_check'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public.teachers
      add constraint teachers_teacher_role_check
      check (teacher_role in ('teacher', 'supervisor', 'assistant_teacher', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'teachers_payroll_data_status_check'
      and conrelid = 'public.teachers'::regclass
  ) then
    alter table public.teachers
      add constraint teachers_payroll_data_status_check
      check (payroll_data_status in ('complete', 'incomplete', 'needs_review'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'halaqat_level_check'
      and conrelid = 'public.halaqat'::regclass
  ) then
    alter table public.halaqat
      add constraint halaqat_level_check
      check (level is null or level in ('beginner', 'intermediate', 'advanced', 'memorization', 'review'));
  end if;
end $$;

create table if not exists public.teacher_circle_lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  halaqa_id uuid not null references public.halaqat(id) on delete restrict,
  lesson_date date not null default current_date,
  lesson_type text not null check (lesson_type in ('tajweed', 'tafsir', 'tadabbur', 'group_recitation', 'group_review', 'group_test', 'activity', 'other')),
  lesson_title text,
  present_count int not null default 0 check (present_count >= 0),
  absent_count int not null default 0 check (absent_count >= 0),
  late_count int not null default 0 check (late_count >= 0),
  excused_count int not null default 0 check (excused_count >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_session_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  halaqa_id uuid not null references public.halaqat(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  session_date date not null default current_date,
  session_type text not null check (session_type in ('recitation', 'review', 'teaching', 'test')),
  attendance_status text not null default 'present' check (attendance_status in ('present', 'absent', 'late', 'excused')),
  recitation_surah_number int,
  recitation_surah_name text,
  recitation_from_ayah int,
  recitation_to_ayah int,
  review_surah_number int,
  review_surah_name text,
  review_from_ayah int,
  review_to_ayah int,
  memorization_pages numeric(6,2) not null default 0 check (memorization_pages >= 0),
  review_pages numeric(6,2) not null default 0 check (review_pages >= 0),
  major_mistakes_count int not null default 0 check (major_mistakes_count >= 0),
  minor_mistakes_count int not null default 0 check (minor_mistakes_count >= 0),
  rating text check (rating is null or rating in ('excellent', 'very_good', 'good', 'needs_follow_up')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_auth_user_id_idx on public.teachers(auth_user_id);
create index if not exists teachers_email_idx on public.teachers(lower(email));
create index if not exists teachers_document_number_idx on public.teachers(document_number);
create index if not exists teachers_payroll_employee_id_idx on public.teachers(payroll_employee_id);
create index if not exists employees_payroll_teacher_id_idx on public.employees_payroll(teacher_id);
create index if not exists halaqat_assistant_teacher_id_idx on public.halaqat(assistant_teacher_id);
create index if not exists students_national_id_idx on public.students(national_id);
create index if not exists teacher_circle_lessons_teacher_id_idx on public.teacher_circle_lessons(teacher_id);
create index if not exists teacher_circle_lessons_halaqa_id_idx on public.teacher_circle_lessons(halaqa_id);
create index if not exists teacher_circle_lessons_lesson_date_idx on public.teacher_circle_lessons(lesson_date);
create index if not exists teacher_session_entries_teacher_id_idx on public.teacher_session_entries(teacher_id);
create index if not exists teacher_session_entries_halaqa_id_idx on public.teacher_session_entries(halaqa_id);
create index if not exists teacher_session_entries_student_id_idx on public.teacher_session_entries(student_id);
create index if not exists teacher_session_entries_session_date_idx on public.teacher_session_entries(session_date);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_teacher_circle_lessons_updated_at'
      and tgrelid = 'public.teacher_circle_lessons'::regclass
  ) then
    create trigger set_teacher_circle_lessons_updated_at
    before update on public.teacher_circle_lessons
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_teacher_session_entries_updated_at'
      and tgrelid = 'public.teacher_session_entries'::regclass
  ) then
    create trigger set_teacher_session_entries_updated_at
    before update on public.teacher_session_entries
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.teacher_circle_lessons enable row level security;
alter table public.teacher_session_entries enable row level security;

create or replace function app_private.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.teachers t
  where t.archived_at is null
    and t.status = 'active'
    and (
      t.auth_user_id = auth.uid()
      or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  order by case when t.auth_user_id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function app_private.current_user_is_halaqat_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('admin', 'executive_manager', 'halaqat_manager')
  );
$$;

grant execute on function app_private.current_teacher_id() to authenticated;
grant execute on function app_private.current_user_is_halaqat_admin() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teachers'
      and policyname = 'Teachers can read own teacher profile'
  ) then
    create policy "Teachers can read own teacher profile"
    on public.teachers
    for select
    to authenticated
    using (
      id = app_private.current_teacher_id()
      or app_private.current_user_is_halaqat_admin()
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'halaqat'
      and policyname = 'Teachers can read assigned halaqat'
  ) then
    create policy "Teachers can read assigned halaqat"
    on public.halaqat
    for select
    to authenticated
    using (
      app_private.current_user_is_halaqat_admin()
      or teacher_id = app_private.current_teacher_id()
      or assistant_teacher_id = app_private.current_teacher_id()
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_enrollments'
      and policyname = 'Teachers can read assigned enrollments'
  ) then
    create policy "Teachers can read assigned enrollments"
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
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'students'
      and policyname = 'Teachers can read students in assigned halaqat'
  ) then
    create policy "Teachers can read students in assigned halaqat"
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
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_circle_lessons'
      and policyname = 'Admins can manage teacher circle lessons'
  ) then
    create policy "Admins can manage teacher circle lessons"
    on public.teacher_circle_lessons
    for all
    to authenticated
    using (app_private.current_user_is_halaqat_admin())
    with check (app_private.current_user_is_halaqat_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_circle_lessons'
      and policyname = 'Teachers can read own circle lessons'
  ) then
    create policy "Teachers can read own circle lessons"
    on public.teacher_circle_lessons
    for select
    to authenticated
    using (
      teacher_id = app_private.current_teacher_id()
      and archived_at is null
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_circle_lessons'
      and policyname = 'Teachers can insert own circle lessons'
  ) then
    create policy "Teachers can insert own circle lessons"
    on public.teacher_circle_lessons
    for insert
    to authenticated
    with check (
      teacher_id = app_private.current_teacher_id()
      and created_by = auth.uid()
      and exists (
        select 1
        from public.halaqat h
        where h.id = teacher_circle_lessons.halaqa_id
          and h.archived_at is null
          and h.status = 'active'
          and (
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_circle_lessons'
      and policyname = 'Teachers can update same-day own circle lessons'
  ) then
    create policy "Teachers can update same-day own circle lessons"
    on public.teacher_circle_lessons
    for update
    to authenticated
    using (
      teacher_id = app_private.current_teacher_id()
      and lesson_date = current_date
      and archived_at is null
    )
    with check (
      teacher_id = app_private.current_teacher_id()
      and lesson_date = current_date
      and archived_at is null
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_session_entries'
      and policyname = 'Admins can manage teacher session entries'
  ) then
    create policy "Admins can manage teacher session entries"
    on public.teacher_session_entries
    for all
    to authenticated
    using (app_private.current_user_is_halaqat_admin())
    with check (app_private.current_user_is_halaqat_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_session_entries'
      and policyname = 'Teachers can read own session entries'
  ) then
    create policy "Teachers can read own session entries"
    on public.teacher_session_entries
    for select
    to authenticated
    using (
      teacher_id = app_private.current_teacher_id()
      and archived_at is null
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_session_entries'
      and policyname = 'Teachers can insert own session entries'
  ) then
    create policy "Teachers can insert own session entries"
    on public.teacher_session_entries
    for insert
    to authenticated
    with check (
      teacher_id = app_private.current_teacher_id()
      and created_by = auth.uid()
      and exists (
        select 1
        from public.halaqat h
        join public.student_enrollments se on se.halaqa_id = h.id
        where h.id = teacher_session_entries.halaqa_id
          and se.student_id = teacher_session_entries.student_id
          and h.archived_at is null
          and h.status = 'active'
          and se.status = 'active'
          and se.archived_at is null
          and (
            h.teacher_id = app_private.current_teacher_id()
            or h.assistant_teacher_id = app_private.current_teacher_id()
          )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teacher_session_entries'
      and policyname = 'Teachers can update same-day own session entries'
  ) then
    create policy "Teachers can update same-day own session entries"
    on public.teacher_session_entries
    for update
    to authenticated
    using (
      teacher_id = app_private.current_teacher_id()
      and session_date = current_date
      and archived_at is null
    )
    with check (
      teacher_id = app_private.current_teacher_id()
      and session_date = current_date
      and archived_at is null
    );
  end if;
end $$;
