-- Direct teacher student addition and practical exam assessment fields.
-- Safe additive migration. No DROP, DELETE, or TRUNCATE.

alter table public.students
  add column if not exists created_by_teacher_id uuid references public.teachers(id) on delete set null;

create index if not exists students_created_by_teacher_idx
  on public.students(created_by_teacher_id, created_at desc);

alter table public.exams
  add column if not exists full_score numeric not null default 100,
  add column if not exists mistake_deduction numeric not null default 1,
  add column if not exists alerts_deduct boolean not null default false,
  add column if not exists alert_deduction numeric not null default 0;

alter table public.exam_results
  add column if not exists selected_juz integer[] not null default '{}'::integer[],
  add column if not exists from_surah_no integer,
  add column if not exists from_surah_name text,
  add column if not exists from_ayah integer,
  add column if not exists to_surah_no integer,
  add column if not exists to_surah_name text,
  add column if not exists to_ayah integer,
  add column if not exists passage_length text,
  add column if not exists memorization_notes text,
  add column if not exists tajweed_notes text,
  add column if not exists general_notes text,
  add column if not exists recommendation text,
  add column if not exists full_score numeric not null default 100,
  add column if not exists mistake_deduction numeric not null default 1,
  add column if not exists alerts_deduct boolean not null default false,
  add column if not exists alert_deduction numeric not null default 0,
  add column if not exists calculated_score numeric,
  add column if not exists manual_score_override numeric,
  add column if not exists manual_override_reason text;

create index if not exists exam_results_teacher_date_student_idx
  on public.exam_results(teacher_id, exam_date, student_id)
  where archived_at is null;

create or replace function app_private.normalize_arabic_name(input_name text)
returns text language sql immutable
set search_path = public, app_private, pg_temp
as $$
  select trim(regexp_replace(
    translate(lower(coalesce(input_name, '')), 'أإآىةؤئـ', 'ااايهوي '),
    '[ًٌٍَُِّْ[:space:]]+', ' ', 'g'
  ));
$$;

create or replace function app_private.teacher_student_name_matches(input_name text)
returns table(student_id uuid, student_name text, halaqa_id uuid, halaqa_name text)
language sql stable security definer
set search_path = public, app_private, pg_temp
as $$
  select s.id, s.full_name, se.halaqa_id, h.name
  from public.students s
  left join public.student_enrollments se on se.student_id = s.id and se.status = 'active' and se.archived_at is null
  left join public.halaqat h on h.id = se.halaqa_id
  where s.archived_at is null and app_private.current_teacher_id_v2() is not null
    and (
      app_private.normalize_arabic_name(s.full_name) = app_private.normalize_arabic_name(input_name)
      or s.full_name ilike '%' || split_part(trim(input_name), ' ', 1) || '%'
    )
  order by (app_private.normalize_arabic_name(s.full_name) = app_private.normalize_arabic_name(input_name)) desc, s.full_name
  limit 20;
$$;

create or replace function public.teacher_student_name_matches(input_name text)
returns table(student_id uuid, student_name text, halaqa_id uuid, halaqa_name text)
language sql stable security invoker
set search_path = public, app_private, pg_temp
as $$ select * from app_private.teacher_student_name_matches(input_name); $$;

create or replace function app_private.teacher_add_student_to_halaqa(
  input_name text, input_halaqa_id uuid, input_guardian_phone text default null,
  input_level text default null, input_notes text default null
)
returns uuid language plpgsql security definer
set search_path = public, app_private, pg_temp
as $$
declare teacher_uuid uuid; new_student_id uuid;
begin
  teacher_uuid := app_private.current_teacher_id_v2();
  if teacher_uuid is null then raise exception 'teacher_profile_missing'; end if;
  if not exists (select 1 from public.halaqat h where h.id = input_halaqa_id and h.archived_at is null and (h.teacher_id = teacher_uuid or h.assistant_teacher_id = teacher_uuid))
    then raise exception 'halaqa_out_of_scope'; end if;
  if exists (select 1 from public.students s join public.student_enrollments se on se.student_id = s.id where se.halaqa_id = input_halaqa_id and se.status = 'active' and se.archived_at is null and s.archived_at is null and app_private.normalize_arabic_name(s.full_name) = app_private.normalize_arabic_name(input_name))
    then raise exception 'duplicate_same_halaqa'; end if;
  if exists (select 1 from public.students s join public.student_enrollments se on se.student_id = s.id where se.status = 'active' and se.archived_at is null and se.halaqa_id <> input_halaqa_id and s.archived_at is null and app_private.normalize_arabic_name(s.full_name) = app_private.normalize_arabic_name(input_name))
    then raise exception 'duplicate_other_halaqa'; end if;
  insert into public.students(full_name, guardian_phone, level, notes, status, enrolled_at, created_by_teacher_id)
  values (trim(input_name), nullif(trim(input_guardian_phone), ''), nullif(trim(input_level), ''), nullif(trim(input_notes), ''), 'active', current_date, teacher_uuid)
  returning id into new_student_id;
  insert into public.student_enrollments(student_id, halaqa_id, status, enrolled_at)
  values (new_student_id, input_halaqa_id, 'active', current_date);
  return new_student_id;
end;
$$;

create or replace function public.teacher_add_student_to_halaqa(
  input_name text, input_halaqa_id uuid, input_guardian_phone text default null,
  input_level text default null, input_notes text default null
)
returns uuid language sql volatile security invoker
set search_path = public, app_private, pg_temp
as $$ select app_private.teacher_add_student_to_halaqa(input_name, input_halaqa_id, input_guardian_phone, input_level, input_notes); $$;

revoke all on function app_private.teacher_student_name_matches(text) from public;
revoke all on function app_private.teacher_add_student_to_halaqa(text, uuid, text, text, text) from public;
grant execute on function app_private.teacher_student_name_matches(text) to authenticated;
grant execute on function app_private.teacher_add_student_to_halaqa(text, uuid, text, text, text) to authenticated;
grant execute on function public.teacher_student_name_matches(text) to authenticated;
grant execute on function public.teacher_add_student_to_halaqa(text, uuid, text, text, text) to authenticated;
