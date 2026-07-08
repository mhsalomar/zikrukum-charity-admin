# Contributing

Thanks for helping improve Charity Admin.

## Local Setup

```bash
npm install
npm run dev
```

## Before Opening A Pull Request

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Contribution Guidelines

- Keep Arabic RTL layouts readable and responsive.
- Do not commit secrets, real exports, private assets, or personal data.
- Keep database changes explicit and reversible.
- Add focused tests for risky logic such as imports, scoring, payroll, and permissions.
- Use clear commit messages and describe any operational risk in the pull request.
