-- =============================================================
-- program_competition_schema.sql — جداول الجولات والتحكيم والجوائز
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- مراجعة فقط: لا تشغل قبل الموافقة الصريحة.
-- لا يحتوي هذا الملف على أوامر حذف أو تفريغ أو إسقاط للجداول.
-- يعتمد على:
-- - public.programs
-- - public.program_participants
-- - app_private.set_updated_at()
-- - app_private.current_user_has_role(role_name text)
-- =============================================================

create table if not exists public.program_rounds (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  round_order int not null default 1 check (round_order > 0),
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_judging_criteria (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  max_score numeric(8,2) not null default 100 check (max_score > 0),
  weight numeric(8,2) not null default 1 check (weight > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_scores (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  round_id uuid references public.program_rounds(id) on delete restrict,
  participant_id uuid not null references public.program_participants(id) on delete restrict,
  criterion_id uuid not null references public.program_judging_criteria(id) on delete restrict,
  judge_name text,
  score numeric(8,2) not null default 0 check (score >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (program_id, round_id, participant_id, criterion_id, judge_name)
);

create table if not exists public.program_awards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  name text not null,
  rank int check (rank is null or rank > 0),
  prize_amount numeric(12,2) check (prize_amount is null or prize_amount >= 0),
  prize_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.program_winners (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  participant_id uuid not null references public.program_participants(id) on delete restrict,
  award_id uuid references public.program_awards(id) on delete restrict,
  final_score numeric(8,2) check (final_score is null or final_score >= 0),
  rank int check (rank is null or rank > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (program_id, participant_id, award_id)
);

create index if not exists program_rounds_program_id_idx on public.program_rounds(program_id);
create index if not exists program_rounds_status_idx on public.program_rounds(status);
create index if not exists program_judging_criteria_program_id_idx on public.program_judging_criteria(program_id);
create index if not exists program_scores_program_id_idx on public.program_scores(program_id);
create index if not exists program_scores_round_id_idx on public.program_scores(round_id);
create index if not exists program_scores_participant_id_idx on public.program_scores(participant_id);
create index if not exists program_awards_program_id_idx on public.program_awards(program_id);
create index if not exists program_winners_program_id_idx on public.program_winners(program_id);
create index if not exists program_winners_participant_id_idx on public.program_winners(participant_id);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_program_rounds_updated_at' and tgrelid = 'public.program_rounds'::regclass) then
    create trigger set_program_rounds_updated_at before update on public.program_rounds
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_program_judging_criteria_updated_at' and tgrelid = 'public.program_judging_criteria'::regclass) then
    create trigger set_program_judging_criteria_updated_at before update on public.program_judging_criteria
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_program_scores_updated_at' and tgrelid = 'public.program_scores'::regclass) then
    create trigger set_program_scores_updated_at before update on public.program_scores
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_program_awards_updated_at' and tgrelid = 'public.program_awards'::regclass) then
    create trigger set_program_awards_updated_at before update on public.program_awards
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_program_winners_updated_at' and tgrelid = 'public.program_winners'::regclass) then
    create trigger set_program_winners_updated_at before update on public.program_winners
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.program_rounds enable row level security;
alter table public.program_judging_criteria enable row level security;
alter table public.program_scores enable row level security;
alter table public.program_awards enable row level security;
alter table public.program_winners enable row level security;

-- سياسات القراءة والإضافة والتحديث فقط.

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_rounds' and policyname = 'Program managers can read rounds') then
    create policy "Program managers can read rounds" on public.program_rounds for select to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_rounds' and policyname = 'Program managers can insert rounds') then
    create policy "Program managers can insert rounds" on public.program_rounds for insert to authenticated with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_rounds' and policyname = 'Program managers can update rounds') then
    create policy "Program managers can update rounds" on public.program_rounds for update to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager')) with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_judging_criteria' and policyname = 'Program managers can read criteria') then
    create policy "Program managers can read criteria" on public.program_judging_criteria for select to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_judging_criteria' and policyname = 'Program managers can insert criteria') then
    create policy "Program managers can insert criteria" on public.program_judging_criteria for insert to authenticated with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_judging_criteria' and policyname = 'Program managers can update criteria') then
    create policy "Program managers can update criteria" on public.program_judging_criteria for update to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager')) with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_scores' and policyname = 'Program managers can read scores') then
    create policy "Program managers can read scores" on public.program_scores for select to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_scores' and policyname = 'Program managers can insert scores') then
    create policy "Program managers can insert scores" on public.program_scores for insert to authenticated with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_scores' and policyname = 'Program managers can update scores') then
    create policy "Program managers can update scores" on public.program_scores for update to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager')) with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_awards' and policyname = 'Program managers can read awards') then
    create policy "Program managers can read awards" on public.program_awards for select to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_awards' and policyname = 'Program managers can insert awards') then
    create policy "Program managers can insert awards" on public.program_awards for insert to authenticated with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_awards' and policyname = 'Program managers can update awards') then
    create policy "Program managers can update awards" on public.program_awards for update to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager')) with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_winners' and policyname = 'Program managers can read winners') then
    create policy "Program managers can read winners" on public.program_winners for select to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_winners' and policyname = 'Program managers can insert winners') then
    create policy "Program managers can insert winners" on public.program_winners for insert to authenticated with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'program_winners' and policyname = 'Program managers can update winners') then
    create policy "Program managers can update winners" on public.program_winners for update to authenticated using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager')) with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('executive_manager') or app_private.current_user_has_role('programs_manager'));
  end if;
end $$;
