-- Charity admin foundation: profiles, roles, permissions, and audit tables.
-- Run this file in the Supabase SQL Editor after reviewing it.

create extension if not exists pgcrypto;

create schema if not exists app_private;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  email text,
  full_name text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists roles_name_idx on public.roles(name);
create index if not exists permissions_name_idx on public.permissions(name);
create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_role_id_idx on public.user_roles(role_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function app_private.set_updated_at();

create or replace function app_private.current_user_has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
  );
$$;

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function app_private.handle_new_auth_user();

insert into public.profiles (user_id, email, full_name)
select
  users.id,
  users.email,
  nullif(users.raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (user_id) do update
set email = excluded.email,
    updated_at = now();

insert into public.roles (name, display_name, description)
values
  ('admin', 'مدير النظام', 'صلاحيات كاملة لإدارة النظام'),
  ('executive_manager', 'المدير التنفيذي', 'متابعة إدارية عامة'),
  ('halaqat_manager', 'مدير الحلقات', 'إدارة شؤون الحلقات عند إضافتها لاحقًا'),
  ('supervisor', 'مشرف', 'متابعة إشرافية'),
  ('teacher', 'معلم', 'صلاحيات المعلم الأساسية'),
  ('hr', 'الموارد البشرية', 'إدارة شؤون الموارد البشرية عند إضافتها لاحقًا'),
  ('finance_viewer', 'مطلع مالي', 'اطلاع مالي عند إضافة الوحدة المالية لاحقًا')
on conflict (name) do update
set display_name = excluded.display_name,
    description = excluded.description;

insert into public.permissions (name, display_name, description)
values
  ('dashboard.view', 'عرض لوحة التحكم', 'الدخول إلى لوحة التحكم الأساسية'),
  ('users.view', 'عرض المستخدمين', 'عرض صفحة المستخدمين'),
  ('roles.manage', 'إدارة الأدوار', 'إنشاء وتحديث الأدوار'),
  ('permissions.manage', 'إدارة الصلاحيات', 'إنشاء وتحديث الصلاحيات'),
  ('audit_logs.view', 'عرض سجل التدقيق', 'قراءة سجلات التدقيق')
on conflict (name) do update
set display_name = excluded.display_name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.name = 'dashboard.view'
where r.name in (
  'executive_manager',
  'halaqat_manager',
  'supervisor',
  'teacher',
  'hr',
  'finance_viewer'
)
on conflict (role_id, permission_id) do nothing;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (app_private.current_user_has_role('admin'));

drop policy if exists "Users can update their own profile basics" on public.profiles;

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (app_private.current_user_has_role('admin'))
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Authenticated users can read roles" on public.roles;
create policy "Authenticated users can read roles"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "Admins can insert roles" on public.roles;
create policy "Admins can insert roles"
on public.roles
for insert
to authenticated
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can update roles" on public.roles;
create policy "Admins can update roles"
on public.roles
for update
to authenticated
using (app_private.current_user_has_role('admin'))
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Authenticated users can read permissions" on public.permissions;
create policy "Authenticated users can read permissions"
on public.permissions
for select
to authenticated
using (true);

drop policy if exists "Admins can insert permissions" on public.permissions;
create policy "Admins can insert permissions"
on public.permissions
for insert
to authenticated
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can update permissions" on public.permissions;
create policy "Admins can update permissions"
on public.permissions
for update
to authenticated
using (app_private.current_user_has_role('admin'))
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can read role permissions" on public.role_permissions;
create policy "Admins can read role permissions"
on public.role_permissions
for select
to authenticated
using (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can insert role permissions" on public.role_permissions;
create policy "Admins can insert role permissions"
on public.role_permissions
for insert
to authenticated
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can update role permissions" on public.role_permissions;
create policy "Admins can update role permissions"
on public.role_permissions
for update
to authenticated
using (app_private.current_user_has_role('admin'))
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all user roles" on public.user_roles;
create policy "Admins can read all user roles"
on public.user_roles
for select
to authenticated
using (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can assign roles" on public.user_roles;
create policy "Admins can assign roles"
on public.user_roles
for insert
to authenticated
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can update role assignments" on public.user_roles;
create policy "Admins can update role assignments"
on public.user_roles
for update
to authenticated
using (app_private.current_user_has_role('admin'))
with check (app_private.current_user_has_role('admin'));

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (app_private.current_user_has_role('admin'));

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
create policy "Authenticated users can insert audit logs"
on public.audit_logs
for insert
to authenticated
with check ((select auth.uid()) = actor_user_id);

grant usage on schema app_private to authenticated;
grant execute on function app_private.current_user_has_role(text) to authenticated;
grant execute on function app_private.handle_new_auth_user() to supabase_auth_admin;
grant execute on function app_private.set_updated_at() to authenticated;
