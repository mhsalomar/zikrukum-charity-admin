# Security Policy

## Reporting A Vulnerability

Please report suspected vulnerabilities privately to the repository maintainers. Do not open a public issue containing exploit details, credentials, personal data, or production configuration.

## Sensitive Data Rules

Do not commit:

- `.env*` files with real values.
- API keys, tokens, cookies, private keys, database URLs, or service role keys.
- Payroll exports, IBANs, IDs, phone numbers, student records, or teacher records.
- Official stamps, signatures, scanned documents, or private attachments.

## Database Safety

Review migrations before applying them. Avoid destructive operations in production. Use least-privilege credentials and keep service role keys server-side only.

## Supported Checks

Before publishing or releasing changes, run:

```bash
npm run lint
npm run typecheck
npm run build
```
