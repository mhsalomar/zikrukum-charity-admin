-- Invitations system: track invite emails sent from the admin invitations page.
-- Additive only. Safe to run multiple times. No data is deleted.

-- 1) Track when an invite email was last sent.
alter table public.user_onboarding_requests
  add column if not exists invited_at timestamptz;

comment on column public.user_onboarding_requests.invited_at is
  'Timestamp of the last invite email sent via the admin invitations page.';
