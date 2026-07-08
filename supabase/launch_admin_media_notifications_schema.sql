-- =============================================================
-- launch_admin_media_notifications_schema.sql
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- تجهيز الصادر والخطابات، المركز الإعلامي، والإشعارات الداخلية.
-- آمن وقابل لإعادة التشغيل، ولا يحتوي أوامر إزالة أو تفريغ شاملة.
-- =============================================================

create or replace function app_private.current_user_can_manage_admin_sections()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager');
$$;

create or replace function app_private.current_user_can_manage_hr()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('hr');
$$;

create or replace function app_private.current_user_can_send_notifications()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('supervisor');
$$;

grant execute on function app_private.current_user_can_manage_admin_sections() to authenticated;
grant execute on function app_private.current_user_can_manage_hr() to authenticated;
grant execute on function app_private.current_user_can_send_notifications() to authenticated;

alter table public.meetings add column if not exists meeting_number text;
alter table public.meetings add column if not exists chair_name text;
alter table public.meetings add column if not exists prepared_by text;
alter table public.meetings add column if not exists excused text;
alter table public.meetings add column if not exists decision_owner text;
alter table public.meetings add column if not exists decision_due_date date;

create table if not exists public.hr_letters (
  id uuid primary key default gen_random_uuid(),
  letter_number text,
  letter_date date not null default current_date,
  letter_type text not null default 'internal'
    check (letter_type in ('introduction','start_work','assignment','warning','thanks','donor','internal','other')),
  recipient_name text,
  related_person_name text,
  subject text not null,
  body text,
  prepared_by text,
  approved_by text,
  status text not null default 'draft'
    check (status in ('draft','ready','approved','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.media_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  status text not null default 'active'
    check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null default 'news'
    check (content_type in ('news','announcement','coverage','achievement','program','competition','circular','other')),
  category text,
  summary text,
  content text,
  proposed_publish_date date,
  status text not null default 'draft'
    check (status in ('draft','ready_for_review','approved','published','archived')),
  author_name text,
  related_program_id uuid references public.programs(id),
  related_halaqa_id uuid references public.halaqat(id),
  external_asset_url text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'general'
    check (type in ('general','alert','task','reminder','approval')),
  priority text not null default 'normal'
    check (priority in ('normal','important','urgent')),
  target_type text not null default 'role'
    check (target_type in ('user','role','circle','all_teachers','all_supervisors')),
  target_role text,
  target_user_id uuid,
  target_circle_id uuid references public.halaqat(id),
  link_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id),
  user_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

create index if not exists hr_letters_status_idx on public.hr_letters(status);
create index if not exists hr_letters_date_idx on public.hr_letters(letter_date);
create index if not exists media_posts_status_idx on public.media_posts(status);
create index if not exists media_posts_type_idx on public.media_posts(content_type);
create index if not exists notifications_created_at_idx on public.notifications(created_at);
create index if not exists notification_recipients_user_read_idx on public.notification_recipients(user_id, read_at);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_hr_letters_updated_at' and tgrelid = 'public.hr_letters'::regclass) then
    create trigger set_hr_letters_updated_at before update on public.hr_letters
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_media_categories_updated_at' and tgrelid = 'public.media_categories'::regclass) then
    create trigger set_media_categories_updated_at before update on public.media_categories
    for each row execute function app_private.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_media_posts_updated_at' and tgrelid = 'public.media_posts'::regclass) then
    create trigger set_media_posts_updated_at before update on public.media_posts
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.hr_letters enable row level security;
alter table public.media_categories enable row level security;
alter table public.media_posts enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_letters' and policyname = 'HR letters read') then
    create policy "HR letters read" on public.hr_letters for select to authenticated using (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_letters' and policyname = 'HR letters insert') then
    create policy "HR letters insert" on public.hr_letters for insert to authenticated with check (app_private.current_user_can_manage_hr());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'hr_letters' and policyname = 'HR letters update') then
    create policy "HR letters update" on public.hr_letters for update to authenticated using (app_private.current_user_can_manage_hr()) with check (app_private.current_user_can_manage_hr());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_categories' and policyname = 'Media categories read') then
    create policy "Media categories read" on public.media_categories for select to authenticated using (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_categories' and policyname = 'Media categories insert') then
    create policy "Media categories insert" on public.media_categories for insert to authenticated with check (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_categories' and policyname = 'Media categories update') then
    create policy "Media categories update" on public.media_categories for update to authenticated using (app_private.current_user_can_manage_admin_sections()) with check (app_private.current_user_can_manage_admin_sections());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_posts' and policyname = 'Media posts read') then
    create policy "Media posts read" on public.media_posts for select to authenticated using (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_posts' and policyname = 'Media posts insert') then
    create policy "Media posts insert" on public.media_posts for insert to authenticated with check (app_private.current_user_can_manage_admin_sections());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_posts' and policyname = 'Media posts update') then
    create policy "Media posts update" on public.media_posts for update to authenticated using (app_private.current_user_can_manage_admin_sections()) with check (app_private.current_user_can_manage_admin_sections());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Notifications read own or managers') then
    create policy "Notifications read own or managers" on public.notifications for select to authenticated using (
      app_private.current_user_can_send_notifications()
      or exists (
        select 1 from public.notification_recipients nr
        where nr.notification_id = notifications.id
          and nr.user_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Notifications insert managers') then
    create policy "Notifications insert managers" on public.notifications for insert to authenticated with check (app_private.current_user_can_send_notifications());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'Notifications update managers') then
    create policy "Notifications update managers" on public.notifications for update to authenticated using (app_private.current_user_can_send_notifications()) with check (app_private.current_user_can_send_notifications());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_recipients' and policyname = 'Notification recipients read own or managers') then
    create policy "Notification recipients read own or managers" on public.notification_recipients for select to authenticated using (
      user_id = auth.uid() or app_private.current_user_can_send_notifications()
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_recipients' and policyname = 'Notification recipients insert managers') then
    create policy "Notification recipients insert managers" on public.notification_recipients for insert to authenticated with check (app_private.current_user_can_send_notifications());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_recipients' and policyname = 'Notification recipients update own or managers') then
    create policy "Notification recipients update own or managers" on public.notification_recipients for update to authenticated using (
      user_id = auth.uid() or app_private.current_user_can_send_notifications()
    ) with check (
      user_id = auth.uid() or app_private.current_user_can_send_notifications()
    );
  end if;
end $$;
