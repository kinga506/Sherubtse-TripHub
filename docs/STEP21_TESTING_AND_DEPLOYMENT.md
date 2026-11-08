# Step 21 — Automated testing and deployment preparation

This step adds a GitHub Actions test pipeline, a non-root production Docker image, a `.dockerignore`, a dependency-free source preflight and regression assertions. **These are not evidence of successful integration or production deployment.**

## Run locally

1. Install Node.js 22, PostgreSQL and MongoDB. Create the **isolated test database** `sherubtse_triphub_test`; never point automated test commands at production.
2. Copy `.env.example` to `.env` for local runtime configuration and use `.env.test` as a starting reference for test-only settings. Never commit real credentials or use production R2 buckets during tests.
3. Run `npm install`, `npm run check:release` and `npm test`.
4. For local database integration tests, initialize `db/schema.sql` and numbered migrations in the order shown in `.github/workflows/test.yml`. Apply the Step 14 source-packing migration after seeding if you want destination-specific packing suggestions populated; CI applies it without seed, so its structural changes still run but no demo destination records are created.
5. For a container smoke check, run `docker build -t sherubtse-triphub:local .`. Runtime requires configured PostgreSQL, MongoDB, Resend and Cloudflare R2. Docker does **not** bundle those services or any secrets.
6. Test full Student/DSA/Superadmin workflows manually using a separate nonproduction database and private test storage. Record observed status codes and screenshots before publishing.

## Manual regression checklist

- [ ] Student signup allows only numeric-prefix `.sherubtse@rub.edu.bt`, verifies email, and prevents public DSA/Superadmin signup.
- [ ] Unverified and deactivated accounts cannot access protected routes.
- [ ] Only DSA can create, transfer or end active trip-specific Coordinator assignments; user role stays `student`.
- [ ] Supporting proposal attachments are private and immutable across submissions.
- [ ] Approved trip remains closed until assigned Coordinator opens registration.
- [ ] Pending **plus** approved join requests consume capacity; concurrent requests cannot overbook.
- [ ] Invalid consent cannot be approved; corrections preserve document versions and keep pending seat.
- [ ] Rejection/withdrawal holds vacancy closed until a Coordinator explicitly reopens it; expired deadlines require DSA authorization.
- [ ] Final package includes only approved participants with current verified consent; DSA may approve a smaller roster.
- [ ] Approved participant withdrawal, replacement or changed verified consent invalidates clearance and requires DSA reapproval.
- [ ] Official college travel form uses the original template and never fabricates signatures or approvals.
- [ ] Expenses, contributions, packing and attendance obey trip-specific access controls; CSV exports are restricted.
- [ ] A completed trip archives exactly one final report, closes registration and ends assignments without disabling Student accounts.
- [ ] Feedback is stored in MongoDB and available only to eligible participants and authorized active/former Coordinators.
- [ ] Public REST APIs return no private attachments, personal details, or hidden trips.
- [ ] Docker container starts with production configuration and `GET /health` responds successfully.
- [ ] Resend email is delivered from a verified sender; R2 signed/private retrieval works and objects are not public.

## Deployment settings

Use the already documented variables from `.env.example`, notably `NODE_ENV=production`, `APP_URL=https://...`, `PORT`, `SESSION_SECRET` (32+ characters), `DB_*` (Neon PostgreSQL), `MONGO_URI` (MongoDB Atlas), `EMAIL_MODE=api`, `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM`, `STORAGE_MODE=r2` and `R2_*`. Set these in Render, **never** in the repository. Apply migrations explicitly before first start. Route `/health` is a process-level check, not proof that database, email or object storage are functioning.

## Verification status at generation

- Source-file presence and JavaScript syntax preflight: checked locally.
- Jest/Supertest, PostgreSQL migrations, live MongoDB, Docker build, Resend delivery and Cloudflare R2: **not executed successfully in this environment**.
- GitHub Actions: workflow authored, **not yet run on GitHub**. A green workflow is still required before deployment.
- No `package-lock.json` was available because dependency installation did not succeed; CI currently uses `npm install`, and Docker falls back to that when no lockfile exists. Generate and commit a lockfile on a machine with npm registry access, then switch CI to `npm ci` for reproducible dependency installation.
