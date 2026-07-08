-- Electronic exams workflow for administration.
-- Safe, additive, idempotent. No DROP, DELETE, or TRUNCATE.

alter table public.exams
  add column if not exists exam_time time,
  add column if not exists venue text,
  add column if not exists nomination_open boolean not null default false,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id),
  add column if not exists reopened_at timestamptz;

alter table public.exam_results
  add column if not exists participant_name text,
  add column if not exists halaqa_id uuid references public.halaqat(id),
  add column if not exists halaqa_name text,
  add column if not exists teacher_name text,
  add column if not exists exam_scope text,
  add column if not exists attendance_status text not null default 'not_started',
  add column if not exists memorization_score numeric,
  add column if not exists accuracy_score numeric,
  add column if not exists tajweed_score numeric,
  add column if not exists fluency_score numeric,
  add column if not exists waqf_score numeric,
  add column if not exists linked_from_manual boolean not null default false;

create unique index if not exists exam_results_unique_linked_student_idx
  on public.exam_results (exam_id, student_id)
  where student_id is not null and archived_at is null;

create unique index if not exists exam_results_unique_manual_participant_idx
  on public.exam_results (exam_id, lower(participant_name), coalesce(halaqa_name, ''))
  where student_id is null and participant_name is not null and archived_at is null;

create index if not exists exam_results_halaqa_id_idx on public.exam_results(halaqa_id);
create index if not exists exams_status_date_idx on public.exams(status, exam_date);
create index if not exists exams_approved_by_idx on public.exams(approved_by);
create index if not exists exams_reopened_by_idx on public.exams(reopened_by);

alter table public.exams enable row level security;
alter table public.exam_results enable row level security;

grant select, insert, update on public.exams to authenticated;
grant select, insert, update on public.exam_results to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exams'
      and policyname = 'Teachers read approved related exams'
  ) then
    create policy "Teachers read approved related exams"
      on public.exams for select to authenticated
      using (
        status = 'approved'
        and exists (
          select 1
          from public.exam_results er
          join public.student_enrollments se on se.student_id = er.student_id
          join public.halaqat h on h.id = se.halaqa_id
          join public.teachers t on t.id = h.teacher_id
          where er.exam_id = exams.id
            and er.archived_at is null
            and se.archived_at is null
            and se.status = 'active'
            and t.auth_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exam_results'
      and policyname = 'Teachers read approved related exam results'
  ) then
    create policy "Teachers read approved related exam results"
      on public.exam_results for select to authenticated
      using (
        student_id is not null
        and exists (
          select 1
          from public.exams e
          join public.student_enrollments se on se.student_id = exam_results.student_id
          join public.halaqat h on h.id = se.halaqa_id
          join public.teachers t on t.id = h.teacher_id
          where e.id = exam_results.exam_id
            and e.status = 'approved'
            and se.archived_at is null
            and se.status = 'active'
            and t.auth_user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exams'
      and policyname = 'Supervisors read scoped exams'
  ) then
    create policy "Supervisors read scoped exams"
      on public.exams for select to authenticated
      using (
        app_private.current_user_has_role('supervisor')
        and exists (
          select 1
          from public.exam_results er
          join public.halaqat h on h.id = er.halaqa_id
          left join public.supervisors s on s.id = h.supervisor_id
          left join public.profiles p on p.id = s.profile_id
          where er.exam_id = exams.id
            and er.archived_at is null
            and (
              p.user_id = auth.uid()
              or exists (
                select 1
                from public.supervisor_circles sc
                join public.supervisors ss on ss.id = sc.supervisor_id
                join public.profiles sp on sp.id = ss.profile_id
                where sc.halaqa_id = h.id
                  and sc.archived_at is null
                  and sp.user_id = auth.uid()
              )
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'exam_results'
      and policyname = 'Supervisors read scoped exam results'
  ) then
    create policy "Supervisors read scoped exam results"
      on public.exam_results for select to authenticated
      using (
        app_private.current_user_has_role('supervisor')
        and halaqa_id is not null
        and exists (
          select 1
          from public.halaqat h
          left join public.supervisors s on s.id = h.supervisor_id
          left join public.profiles p on p.id = s.profile_id
          where h.id = exam_results.halaqa_id
            and (
              p.user_id = auth.uid()
              or exists (
                select 1
                from public.supervisor_circles sc
                join public.supervisors ss on ss.id = sc.supervisor_id
                join public.profiles sp on sp.id = ss.profile_id
                where sc.halaqa_id = h.id
                  and sc.archived_at is null
                  and sp.user_id = auth.uid()
              )
            )
        )
      );
  end if;
end $$;
