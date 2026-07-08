-- Internal task management workflow.
-- Safe, additive, idempotent. No DROP, DELETE, or TRUNCATE.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  target_type text not null default 'user',
  assigned_user_id uuid references auth.users(id),
  target_role text,
  priority text not null default 'normal',
  status text not null default 'new',
  due_date date,
  linked_url text,
  executor_note text,
  admin_note text,
  created_by uuid not null references auth.users(id),
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  cancelled_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_assigned_user_id_idx on public.tasks(assigned_user_id);
create index if not exists tasks_target_role_idx on public.tasks(target_role);
create index if not exists tasks_status_due_date_idx on public.tasks(status, due_date);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_completed_by_idx on public.tasks(completed_by);

alter table public.tasks enable row level security;
grant select, insert, update on public.tasks to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks'
      and policyname='Admins manage all internal tasks'
  ) then
    create policy "Admins manage all internal tasks"
      on public.tasks for all to authenticated
      using (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
      )
      with check (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks'
      and policyname='Users read assigned internal tasks'
  ) then
    create policy "Users read assigned internal tasks"
      on public.tasks for select to authenticated
      using (
        assigned_user_id = auth.uid()
        or (
          target_type = 'role'
          and exists (
            select 1
            from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and r.name = tasks.target_role
          )
        )
        or app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks'
      and policyname='Users update assigned internal tasks'
  ) then
    create policy "Users update assigned internal tasks"
      on public.tasks for update to authenticated
      using (
        assigned_user_id = auth.uid()
        or (
          target_type = 'role'
          and exists (
            select 1
            from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and r.name = tasks.target_role
          )
        )
      )
      with check (
        assigned_user_id = auth.uid()
        or (
          target_type = 'role'
          and exists (
            select 1
            from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and r.name = tasks.target_role
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks'
      and policyname='Restrict task details to admins and assignees'
  ) then
    create policy "Restrict task details to admins and assignees"
      on public.tasks as restrictive for select to authenticated
      using (
        app_private.current_user_has_role('admin')
        or app_private.current_user_has_role('demo_admin')
        or assigned_user_id = auth.uid()
        or (
          target_type = 'role'
          and exists (
            select 1 from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = auth.uid() and r.name = tasks.target_role
          )
        )
      );
  end if;
end $$;

create or replace function app_private.protect_internal_task_assignment()
returns trigger
language plpgsql
security invoker
set search_path = public, app_private
as $$
begin
  if app_private.current_user_has_role('admin') or app_private.current_user_has_role('demo_admin') then
    return new;
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.target_type is distinct from old.target_type
    or new.assigned_user_id is distinct from old.assigned_user_id
    or new.target_role is distinct from old.target_role
    or new.priority is distinct from old.priority
    or new.due_date is distinct from old.due_date
    or new.linked_url is distinct from old.linked_url
    or new.admin_note is distinct from old.admin_note
    or new.created_by is distinct from old.created_by
    or new.cancelled_at is distinct from old.cancelled_at
    or new.archived_at is distinct from old.archived_at
  then
    raise exception 'Only administration can change task assignment or administration fields';
  end if;

  if new.status not in ('in_progress', 'completed', 'not_completed') then
    raise exception 'Task assignees can only update execution statuses';
  end if;

  if new.completed_by is distinct from old.completed_by
    and new.completed_by is not null
    and new.completed_by is distinct from auth.uid()
  then
    raise exception 'Task completion identity must match the current user';
  end if;

  if new.completed_at is distinct from old.completed_at and new.status <> 'completed' then
    raise exception 'Task completion time is only allowed for completed tasks';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname='protect_internal_task_assignment_trigger') then
    create trigger protect_internal_task_assignment_trigger
      before update on public.tasks
      for each row execute function app_private.protect_internal_task_assignment();
  end if;
end $$;
