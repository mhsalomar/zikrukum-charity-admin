-- Bulk staff import fields and private teacher attachments.
-- Safe migration: no destructive statements and no production data rewrites.

alter table public.teachers
  add column if not exists document_expiry_date date;

alter table public.supervisors
  add column if not exists document_type text default 'other',
  add column if not exists document_number text,
  add column if not exists document_expiry_date date,
  add column if not exists job_title text,
  add column if not exists bank_name text,
  add column if not exists iban text,
  add column if not exists salary_amount numeric,
  add column if not exists notes text;

create table if not exists public.teacher_attachments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  category text not null check (
    category in ('identity', 'contract', 'qualification', 'iban_certificate', 'training', 'other')
  ),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists teacher_attachments_teacher_id_idx
  on public.teacher_attachments(teacher_id, created_at desc);

alter table public.teacher_attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-attachments',
  'teacher-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_attachments'
      and policyname = 'Staff administrators can read teacher attachments'
  ) then
    create policy "Staff administrators can read teacher attachments"
      on public.teacher_attachments for select
      to authenticated
      using (
        exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = auth.uid()
            and r.name in ('admin', 'executive_director', 'executive_manager', 'halaqat_manager')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_attachments'
      and policyname = 'Staff administrators can add teacher attachments'
  ) then
    create policy "Staff administrators can add teacher attachments"
      on public.teacher_attachments for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = auth.uid()
            and r.name in ('admin', 'executive_director', 'executive_manager', 'halaqat_manager')
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Staff administrators can read private teacher files'
  ) then
    create policy "Staff administrators can read private teacher files"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'teacher-attachments'
        and exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = auth.uid()
            and r.name in ('admin', 'executive_director', 'executive_manager', 'halaqat_manager')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Staff administrators can add private teacher files'
  ) then
    create policy "Staff administrators can add private teacher files"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'teacher-attachments'
        and exists (
          select 1
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = auth.uid()
            and r.name in ('admin', 'executive_director', 'executive_manager', 'halaqat_manager')
        )
      );
  end if;
end $$;
