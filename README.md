# Charity Admin

Charity Admin is a Next.js administrative platform template for Arabic nonprofit and educational operations. It includes role-based portals, student and teacher management, meetings, reports, payroll workflows, program winners, internal tasks, imports, and printable Arabic documents.

This repository is prepared as an open-source-safe copy. It does not include production secrets, real operational exports, private assets, or Git history from the original working repository.

## Features

- Arabic RTL interface for administrative dashboards.
- Role-based portals for administration, executive users, supervisors, teachers, and media users.
- Student, teacher, halaqa, attendance, progress, exam, and report workflows.
- Payroll and transfer preparation screens with validation and masking patterns.
- Meeting minutes, official reports, print layouts, and letterhead-ready pages.
- Excel/CSV import validation flows.
- Supabase Auth and Postgres integration patterns.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Supabase
- Vitest
- ESLint
- ExcelJS

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to your local environment file and fill in your own project values:

```bash
cp .env.example .env.local
```

Never commit real environment files or secrets.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

## Data Safety

This open-source copy is intended to be data-free. Do not commit:

- Production `.env*` files.
- Private assets, signatures, stamps, or official scans.
- CSV, Excel, PDF, exports, backups, or screenshots containing real people or financial data.
- Supabase service role keys, tokens, cookies, or database connection strings.

## Supabase

The `supabase/` directory contains schema and migration examples only. Review and adapt them before applying to any database. Do not run migrations against production without a rollback plan and a separate approval process.

## License

MIT. See `LICENSE`.
