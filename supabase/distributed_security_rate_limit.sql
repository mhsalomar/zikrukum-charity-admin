-- Distributed rate limiting shared by all Vercel function instances.
-- Safe/idempotent. Stores counters only and does not touch application data.

create table if not exists app_private.security_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

revoke all on table app_private.security_rate_limits from public, anon, authenticated;
grant usage on schema app_private to anon, authenticated;
grant select, insert, update on table app_private.security_rate_limits
  to anon, authenticated;

create or replace function public.consume_security_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, app_private
as $$
declare
  v_allowed boolean;
begin
  if p_key_hash is null
    or length(p_key_hash) <> 64
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds < 1
    or p_window_seconds > 3600
  then
    return false;
  end if;

  insert into app_private.security_rate_limits (
    key_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update
  set
    request_count = case
      when security_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else security_rate_limits.request_count + 1
    end,
    window_started_at = case
      when security_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else security_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count <= p_limit into v_allowed;

  return v_allowed;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, integer, integer)
  from public;
grant execute on function public.consume_security_rate_limit(text, integer, integer)
  to anon, authenticated;

-- Minimal automatic audit trail for sensitive operational tables. It records
-- who changed a record and status transitions without copying PII into logs.
create or replace function app_private.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_old jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_new jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  v_record_id uuid;
begin
  v_record_id := coalesce(
    nullif(v_new ->> 'id', '')::uuid,
    nullif(v_old ->> 'id', '')::uuid
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    metadata
  )
  values (
    auth.uid(),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    v_record_id,
    jsonb_strip_nulls(jsonb_build_object(
      'operation', tg_op,
      'old_status', v_old ->> 'status',
      'new_status', v_new ->> 'status'
    ))
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
exception
  when others then
    raise warning 'Audit event failed for %.%: %', tg_table_name, tg_op, sqlerrm;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
end;
$$;

revoke all on function app_private.audit_sensitive_change() from public, anon, authenticated;

do $$
declare
  v_table text;
  v_trigger_name text;
  v_tables text[] := array[
    'user_roles',
    'user_onboarding_requests',
    'teachers',
    'supervisors',
    'hr_employees',
    'students',
    'student_enrollments',
    'attendance',
    'teacher_session_entries',
    'student_progress_records',
    'nooraniya_students',
    'supervisor_visits',
    'employees_payroll',
    'payroll_runs',
    'payroll_run_items',
    'programs',
    'program_winners',
    'exams',
    'exam_results',
    'tasks',
    'task_groups',
    'finance_expenses',
    'finance_revenues',
    'donors',
    'donations',
    'meetings',
    'hr_letters',
    'governance_items',
    'notifications',
    'certificates'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      v_trigger_name := 'audit_sensitive_' || v_table;
      if not exists (
        select 1
        from pg_trigger
        where tgname = v_trigger_name
          and tgrelid = to_regclass('public.' || v_table)
          and not tgisinternal
      ) then
        execute format(
          'create trigger %I after insert or update or delete on public.%I for each row execute function app_private.audit_sensitive_change()',
          v_trigger_name,
          v_table
        );
      end if;
    end if;
  end loop;
end;
$$;
