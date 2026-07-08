-- Align teacher daily exam scoring defaults with the direct-save workflow.
-- Safe additive/default-only migration. No DROP, DELETE, TRUNCATE, or data rewrite.

alter table public.exams
  alter column alerts_deduct set default true,
  alter column alert_deduction set default 0.25;

alter table public.exam_results
  add column if not exists needs_review boolean not null default false,
  alter column alerts_deduct set default true,
  alter column alert_deduction set default 0.25;
