create table if not exists public.supervisor_visits (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid references public.supervisors(id) on delete set null,
  circle_id uuid not null references public.halaqat(id) on delete restrict,
  teacher_id uuid references public.teachers(id) on delete set null,
  sample_student_id uuid references public.students(id) on delete set null,
  visit_date date not null,
  teacher_status text,
  present_count integer not null default 0 check (present_count >= 0),
  absent_count integer not null default 0 check (absent_count >= 0),
  late_count integer not null default 0 check (late_count >= 0),
  excused_count integer not null default 0 check (excused_count >= 0),
  tajweed_lesson_given boolean not null default false,
  observed_session_type text,
  achievement_match_status text,
  recitation_quality_score integer check (recitation_quality_score between 1 and 5),
  circle_discipline_score integer check (circle_discipline_score between 1 and 5),
  student_engagement_score integer check (student_engagement_score between 1 and 5),
  teacher_organization_score integer check (teacher_organization_score between 1 and 5),
  notes text,
  recommendation text,
  status text,
  created_by uuid references auth.users(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.supervisor_visits enable row level security;

create index if not exists supervisor_visits_supervisor_id_idx on public.supervisor_visits(supervisor_id);
create index if not exists supervisor_visits_circle_id_idx on public.supervisor_visits(circle_id);
create index if not exists supervisor_visits_visit_date_idx on public.supervisor_visits(visit_date);
create index if not exists supervisor_visits_created_by_idx on public.supervisor_visits(created_by);

create or replace function app_private.current_supervisor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.supervisors s
  where s.archived_at is null
    and s.status = 'active'
    and (
      lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or s.profile_id in (
        select p.id
        from public.profiles p
        where p.user_id = auth.uid()
      )
    )
  order by case when lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')) then 0 else 1 end
  limit 1;
$$;

create or replace function app_private.current_user_can_manage_supervisor_visits()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('halaqat_manager');
$$;

grant execute on function app_private.current_supervisor_id() to authenticated;
grant execute on function app_private.current_user_can_manage_supervisor_visits() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisor visit managers can read'
  ) then
    create policy "Supervisor visit managers can read"
    on public.supervisor_visits
    for select
    to authenticated
    using (app_private.current_user_can_manage_supervisor_visits());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisors can read own scoped visits'
  ) then
    create policy "Supervisors can read own scoped visits"
    on public.supervisor_visits
    for select
    to authenticated
    using (
      supervisor_id = app_private.current_supervisor_id()
      or exists (
        select 1
        from public.supervisor_circles sc
        where sc.supervisor_id = app_private.current_supervisor_id()
          and sc.halaqa_id = supervisor_visits.circle_id
          and sc.status = 'active'
          and sc.archived_at is null
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisor visit managers can insert'
  ) then
    create policy "Supervisor visit managers can insert"
    on public.supervisor_visits
    for insert
    to authenticated
    with check (app_private.current_user_can_manage_supervisor_visits());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisors can insert own scoped visits'
  ) then
    create policy "Supervisors can insert own scoped visits"
    on public.supervisor_visits
    for insert
    to authenticated
    with check (
      supervisor_id = app_private.current_supervisor_id()
      and created_by = auth.uid()
      and exists (
        select 1
        from public.supervisor_circles sc
        where sc.supervisor_id = app_private.current_supervisor_id()
          and sc.halaqa_id = supervisor_visits.circle_id
          and sc.status = 'active'
          and sc.archived_at is null
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'supervisor_visits'
      and policyname = 'Supervisor visit managers can update'
  ) then
    create policy "Supervisor visit managers can update"
    on public.supervisor_visits
    for update
    to authenticated
    using (app_private.current_user_can_manage_supervisor_visits())
    with check (app_private.current_user_can_manage_supervisor_visits());
  end if;
end $$;
