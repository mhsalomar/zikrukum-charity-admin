-- Lightweight student operational requests for launch.
-- Safe migration:
-- - No DROP
-- - No TRUNCATE
-- - No DELETE
-- - Uses RLS scoped to teachers, supervisors, and administration.

create table if not exists public.student_change_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (
    request_type in ('add_student', 'edit_attendance', 'edit_recitation', 'transfer_student')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled')
  ),
  requester_id uuid references auth.users(id) on delete set null,
  requester_teacher_id uuid references public.teachers(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  current_halaqa_id uuid references public.halaqat(id) on delete set null,
  target_halaqa_id uuid references public.halaqat(id) on delete set null,
  attendance_id uuid references public.attendance(id) on delete set null,
  session_entry_id uuid references public.teacher_session_entries(id) on delete set null,
  requested_student_name text,
  requested_payload jsonb not null default '{}'::jsonb,
  reason text,
  decision_notes text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_change_requests_status_idx
on public.student_change_requests(status);

create index if not exists student_change_requests_requester_teacher_idx
on public.student_change_requests(requester_teacher_id);

create index if not exists student_change_requests_student_idx
on public.student_change_requests(student_id);

create index if not exists student_change_requests_current_halaqa_idx
on public.student_change_requests(current_halaqa_id);

create index if not exists student_change_requests_created_at_idx
on public.student_change_requests(created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_student_change_requests_updated_at'
      and tgrelid = 'public.student_change_requests'::regclass
  ) then
    create trigger set_student_change_requests_updated_at
    before update on public.student_change_requests
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.student_change_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_change_requests'
      and policyname = 'Teachers can create own student requests'
  ) then
    create policy "Teachers can create own student requests"
    on public.student_change_requests
    for insert
    to authenticated
    with check (
      requester_id = auth.uid()
      and requester_teacher_id = app_private.current_teacher_id()
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_change_requests'
      and policyname = 'Teachers can read own student requests'
  ) then
    create policy "Teachers can read own student requests"
    on public.student_change_requests
    for select
    to authenticated
    using (
      archived_at is null
      and (
        requester_id = auth.uid()
        or requester_teacher_id = app_private.current_teacher_id()
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_change_requests'
      and policyname = 'Operations can read student requests'
  ) then
    create policy "Operations can read student requests"
    on public.student_change_requests
    for select
    to authenticated
    using (
      archived_at is null
      and (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('halaqat_manager')
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
        or app_private.current_user_has_role('supervisor')
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_change_requests'
      and policyname = 'Supervisors and admins can decide student requests'
  ) then
    create policy "Supervisors and admins can decide student requests"
    on public.student_change_requests
    for update
    to authenticated
    using (
      archived_at is null
      and (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('halaqat_manager')
        or app_private.current_user_has_role('supervisor')
      )
    )
    with check (
      archived_at is null
      and (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or app_private.current_user_has_role('halaqat_manager')
        or app_private.current_user_has_role('supervisor')
      )
    );
  end if;
end $$;
