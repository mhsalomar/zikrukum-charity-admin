-- =============================================================
-- competition_winners_transfers_schema.sql
-- توسيع جدول فائزين البرامج/المسابقات لدعم بيانات التحويل البنكي.
-- آمن ومكرر التشغيل: لا يحتوي DROP أو DELETE أو TRUNCATE.
-- المشروع الصحيح فقط: your-supabase-project-ref
-- =============================================================

alter table public.program_winners
  add column if not exists attendance_no text,
  add column if not exists winner_name text,
  add column if not exists rank_level text,
  add column if not exists iban text,
  add column if not exists bank_name text,
  add column if not exists national_id text,
  add column if not exists prize_amount numeric(12,2),
  add column if not exists transfer_status text not null default 'draft',
  add column if not exists transfer_exported_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_winners_prize_amount_non_negative'
      and conrelid = 'public.program_winners'::regclass
  ) then
    alter table public.program_winners
      add constraint program_winners_prize_amount_non_negative
      check (prize_amount is null or prize_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_winners_transfer_status_check'
      and conrelid = 'public.program_winners'::regclass
  ) then
    alter table public.program_winners
      add constraint program_winners_transfer_status_check
      check (transfer_status in ('draft', 'ready', 'exported', 'paid'));
  end if;
end $$;

create index if not exists program_winners_transfer_status_idx
  on public.program_winners(program_id, transfer_status);

create unique index if not exists program_winners_program_national_id_unique
  on public.program_winners(program_id, national_id)
  where national_id is not null and national_id <> '' and archived_at is null;

create unique index if not exists program_winners_program_iban_unique
  on public.program_winners(program_id, iban)
  where iban is not null and iban <> '' and archived_at is null;

create unique index if not exists program_winners_program_name_rank_unique
  on public.program_winners(program_id, winner_name, rank_level)
  where winner_name is not null and winner_name <> '' and rank_level is not null and rank_level <> '' and archived_at is null;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'program_winners'
      and policyname = 'Executive directors can read winner transfers'
  ) then
    create policy "Executive directors can read winner transfers"
      on public.program_winners
      for select
      to authenticated
      using (
        app_private.current_user_has_role('executive_director')
        or app_private.current_user_has_role('demo_admin')
      );
  end if;
end $$;
