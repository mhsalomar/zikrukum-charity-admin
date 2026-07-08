-- =============================================================
-- launch_users_media_letters_reports_schema.sql
-- منصة جمعية ذكركم لتحفيظ القرآن الكريم
--
-- تشغيل رسمي قبل الإطلاق:
-- - إضافة دور الإعلامي
-- - تمكين بوابة الإعلام من الوصول إلى محتواها
-- - تجهيز طلبات إضافة المستخدمين من داخل النظام دون إنشاء Auth user
--
-- آمن وقابل لإعادة التشغيل:
-- - بلا أوامر إزالة أو حذف أو تفريغ
-- =============================================================

insert into public.roles (name, display_name, description, is_system)
values
  ('media_officer', 'إعلامي', 'إعداد الأخبار والتغطيات والمواد الإعلامية الداخلية', true)
on conflict (name) do update
set display_name = excluded.display_name,
    description = excluded.description;

create or replace function app_private.current_user_can_manage_media()
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
    or app_private.current_user_has_role('media_officer');
$$;

grant execute on function app_private.current_user_can_manage_media() to authenticated;

create table if not exists public.user_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  requested_role text not null
    check (requested_role in ('teacher','supervisor','hr_employee','executive_director','media_officer','admin')),
  status text not null default 'pending_auth'
    check (status in ('pending_auth','linked','inactive','archived')),
  auth_status text not null default 'manual_auth_required'
    check (auth_status in ('manual_auth_required','auth_created','linked')),
  linked_teacher_id uuid references public.teachers(id) on delete set null,
  linked_supervisor_id uuid references public.supervisors(id) on delete set null,
  linked_hr_employee_id uuid references public.hr_employees(id) on delete set null,
  document_type text,
  document_number text,
  bank_name text,
  iban text,
  payroll_data_status text default 'incomplete'
    check (payroll_data_status in ('complete','incomplete','needs_review')),
  circle_ids uuid[] not null default '{}'::uuid[],
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (email, requested_role)
);

create index if not exists user_onboarding_requests_email_idx on public.user_onboarding_requests(lower(email));
create index if not exists user_onboarding_requests_role_idx on public.user_onboarding_requests(requested_role);
create index if not exists user_onboarding_requests_status_idx on public.user_onboarding_requests(status);

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_user_onboarding_requests_updated_at'
      and tgrelid = 'public.user_onboarding_requests'::regclass
  ) then
    create trigger set_user_onboarding_requests_updated_at
    before update on public.user_onboarding_requests
    for each row execute function app_private.set_updated_at();
  end if;
end $$;

alter table public.user_onboarding_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_onboarding_requests'
      and policyname = 'Admins manage onboarding requests read'
  ) then
    create policy "Admins manage onboarding requests read"
      on public.user_onboarding_requests for select to authenticated
      using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('demo_admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_onboarding_requests'
      and policyname = 'Admins manage onboarding requests insert'
  ) then
    create policy "Admins manage onboarding requests insert"
      on public.user_onboarding_requests for insert to authenticated
      with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('demo_admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_onboarding_requests'
      and policyname = 'Admins manage onboarding requests update'
  ) then
    create policy "Admins manage onboarding requests update"
      on public.user_onboarding_requests for update to authenticated
      using (app_private.current_user_has_role('admin') or app_private.current_user_has_role('demo_admin'))
      with check (app_private.current_user_has_role('admin') or app_private.current_user_has_role('demo_admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_posts'
      and policyname = 'Media officers can read posts'
  ) then
    create policy "Media officers can read posts"
      on public.media_posts for select to authenticated
      using (app_private.current_user_can_manage_media());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_posts'
      and policyname = 'Media officers can insert posts'
  ) then
    create policy "Media officers can insert posts"
      on public.media_posts for insert to authenticated
      with check (app_private.current_user_can_manage_media());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_posts'
      and policyname = 'Media officers can update posts'
  ) then
    create policy "Media officers can update posts"
      on public.media_posts for update to authenticated
      using (app_private.current_user_can_manage_media())
      with check (app_private.current_user_can_manage_media());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_categories'
      and policyname = 'Media officers can read categories'
  ) then
    create policy "Media officers can read categories"
      on public.media_categories for select to authenticated
      using (app_private.current_user_can_manage_media());
  end if;
end $$;
