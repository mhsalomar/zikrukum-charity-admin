-- Launch readiness and donor relationship pipeline.
-- Safe, idempotent migration for the approved Supabase project only.

alter table if exists public.donors
  add column if not exists relationship_stage text default 'new_donor',
  add column if not exists next_action text,
  add column if not exists next_action_date date,
  add column if not exists last_contact_at date,
  add column if not exists contact_owner text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'donors_relationship_stage_check'
      and conrelid = 'public.donors'::regclass
  ) then
    alter table public.donors
      add constraint donors_relationship_stage_check
      check (
        relationship_stage is null or relationship_stage in (
          'new_donor',
          'first_contact',
          'interested',
          'pledged',
          'donated',
          'receipt_issued',
          'thanked',
          'follow_up',
          'inactive'
        )
      );
  end if;
end $$;

create index if not exists donors_relationship_stage_idx
  on public.donors(relationship_stage)
  where archived_at is null;

create index if not exists donors_next_action_date_idx
  on public.donors(next_action_date)
  where archived_at is null;

create index if not exists donors_last_contact_at_idx
  on public.donors(last_contact_at)
  where archived_at is null;
