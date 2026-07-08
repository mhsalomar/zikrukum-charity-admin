-- Grouped task distributions built on top of the existing tasks table.
-- Safe, additive, idempotent. No DROP, DELETE, or TRUNCATE.

create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  program_name text,
  general_notes text,
  status text not null default 'open',
  created_by uuid not null references auth.users(id),
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists group_id uuid references public.task_groups(id),
  add column if not exists temporary_assignee_name text;

create index if not exists task_groups_status_date_idx on public.task_groups(status, event_date);
create index if not exists task_groups_created_by_idx on public.task_groups(created_by);
create index if not exists tasks_group_id_idx on public.tasks(group_id);

alter table public.task_groups enable row level security;
grant select, insert, update on public.task_groups to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='task_groups'
      and policyname='Admins manage task distributions'
  ) then
    create policy "Admins manage task distributions"
      on public.task_groups for all to authenticated
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
    select 1 from pg_policies where schemaname='public' and tablename='task_groups'
      and policyname='Executives read task distributions'
  ) then
    create policy "Executives read task distributions"
      on public.task_groups for select to authenticated
      using (
        app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
      );
  end if;
end $$;

alter policy "Restrict task details to admins and assignees"
  on public.tasks
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
    or (
      group_id is not null
      and (
        app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('executive_manager')
      )
    )
  );

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
    or new.group_id is distinct from old.group_id
    or new.temporary_assignee_name is distinct from old.temporary_assignee_name
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
