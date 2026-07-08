# Environment Setup

This project requires environment variables for Supabase, the public app URL, and optional scheduled health checks. Use your own local or hosting-provider environment manager. Do not commit real values.

## Required Variables

| Variable | Scope | Placeholder | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | `https://your-project-ref.supabase.co` | Public Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | `replace-with-your-anon-key` | Supabase anon key. Must still rely on RLS for data protection. |
| `APP_URL` | Server | `http://localhost:3000` | Base URL used for redirects and server-side links. |

## Server-Only Variables

| Variable | Scope | Placeholder | Notes |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `replace-in-server-runtime-only` | Never expose to client code. Use only for trusted server-side actions. |
| `CRON_SECRET` | Server only | `replace-with-a-strong-random-secret` | Optional secret for protected health or warm-up endpoints. |

## Local Setup Guidance

Create your local environment file outside Git using your own values. Keep real keys in your machine or hosting provider only.

Do not commit:

- Real `.env` files.
- Production keys.
- Service role keys.
- Database URLs.
- OAuth tokens.
- Private certificates.

## Deployment Notes

Configure the same variables in your deployment platform. Keep server-only values restricted to server runtime environments and review access permissions regularly.
