-- ⚠️ تشغيل يدوي فقط على Supabase project: your-supabase-project-ref
-- مركز دورة النورانية (نور البيان) — جدول الطلاب المستقل

create table if not exists public.nooraniya_students (
  id            uuid        primary key default gen_random_uuid(),
  student_name  text        not null,
  form_name     text        not null,  -- الاسم الرباعي من نموذج Google Forms
  parent_phone  text        not null,  -- جوال ولي الأمر (05XXXXXXXX)
  group_name    text        not null default 'الأولى',  -- الأولى / الثانية / الثالثة
  session_time  text        not null default '',         -- مثال: 3:50 - 4:50
  notes         text,
  status        text        not null default 'active' check (status in ('active', 'inactive')),
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists nooraniya_students_status_idx   on public.nooraniya_students(status);
create index if not exists nooraniya_students_group_idx    on public.nooraniya_students(group_name);

-- RLS
alter table public.nooraniya_students enable row level security;

drop policy if exists "Admins can manage nooraniya students" on public.nooraniya_students;
create policy "Admins can manage nooraniya students"
  on public.nooraniya_students
  for all
  to authenticated
  using (
    app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('halaqat_manager')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
  )
  with check (
    app_private.current_user_has_role('admin')
    or app_private.current_user_has_role('demo_admin')
    or app_private.current_user_has_role('halaqat_manager')
    or app_private.current_user_has_role('executive_director')
    or app_private.current_user_has_role('executive_manager')
  );
