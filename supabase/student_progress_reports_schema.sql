-- =============================================================
-- student_progress_reports_schema.sql
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- تجهيز استيراد منجزات الطلاب وتقارير الحفظ والمراجعة
-- آمن وقابل لإعادة التشغيل:
-- - بلا DROP
-- - بلا DELETE
-- - بلا TRUNCATE
-- =============================================================

create table if not exists public.student_progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  halaqa_id uuid not null references public.halaqat(id) on delete restrict,
  teacher_id uuid references public.teachers(id) on delete set null,
  mosque_id uuid references public.mosques(id) on delete set null,
  level text,
  memorization_surah_number int,
  memorization_surah_name text,
  memorization_from_ayah int,
  memorization_to_ayah int,
  review_surah_number int,
  review_surah_name text,
  review_from_ayah int,
  review_to_ayah int,
  memorization_pages numeric(8,2) not null default 0 check (memorization_pages >= 0),
  review_pages numeric(8,2) not null default 0 check (review_pages >= 0),
  progress_date date not null default current_date,
  rating text,
  notes text,
  source text not null default 'import'
    check (source in ('import', 'teacher_entry', 'manual')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, halaqa_id)
);

create index if not exists student_progress_records_student_id_idx
  on public.student_progress_records(student_id);

create index if not exists student_progress_records_halaqa_id_idx
  on public.student_progress_records(halaqa_id);

create index if not exists student_progress_records_teacher_id_idx
  on public.student_progress_records(teacher_id);

create index if not exists student_progress_records_mosque_id_idx
  on public.student_progress_records(mosque_id);

create index if not exists student_progress_records_progress_date_idx
  on public.student_progress_records(progress_date);

create index if not exists student_progress_records_created_by_idx
  on public.student_progress_records(created_by);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_student_progress_records_updated_at'
      and tgrelid = 'public.student_progress_records'::regclass
  ) then
    create trigger set_student_progress_records_updated_at
    before update on public.student_progress_records
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.student_progress_records enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Education managers can read student progress'
  ) then
    create policy "Education managers can read student progress"
      on public.student_progress_records for select to authenticated
      using (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
        or app_private.current_user_has_role('halaqat_manager')
        or app_private.current_user_has_role('supervisor')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Teachers can read assigned student progress'
  ) then
    create policy "Teachers can read assigned student progress"
      on public.student_progress_records for select to authenticated
      using (
        exists (
          select 1
          from public.halaqat h
          where h.id = student_progress_records.halaqa_id
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
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Education managers can insert student progress'
  ) then
    create policy "Education managers can insert student progress"
      on public.student_progress_records for insert to authenticated
      with check (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
        or app_private.current_user_has_role('halaqat_manager')
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_progress_records'
      and policyname = 'Education managers can update student progress'
  ) then
    create policy "Education managers can update student progress"
      on public.student_progress_records for update to authenticated
      using (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
        or app_private.current_user_has_role('halaqat_manager')
      )
      with check (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
        or app_private.current_user_has_role('halaqat_manager')
      );
  end if;
end $$;
