-- Extends automatic auditing to additional sensitive records discovered during
-- the final security pass. Safe/idempotent and contains no data changes.

do $$
declare
  v_table text;
  v_trigger_name text;
  v_tables text[] := array[
    'supervisor_visits',
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
