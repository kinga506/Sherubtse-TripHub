# Sherubtse TripHub — Setup and Deployment Guide

**Status:** Source package through Step 21 is present; Step 22 documents and validates the source structure. End-to-end tests and deployment are **not verified**. This is an academic prototype, not a college-approved operational system.

## 1. Install prerequisites

Install Node.js **22**, npm and PostgreSQL with pgAdmin. MongoDB Community Server or Atlas is optional unless you enable feedback. Install Git and optionally Docker Desktop. The project uses Express/EJS, PostgreSQL with pg-promise, an optional MongoDB native driver for feedback, Jest/Supertest, Docker and GitHub Actions. Use a terminal in `sherubtse-triphub/`.

## 2. Create a safe development environment

1. Run `npm install` (a registry connection is required). Generate and commit `package-lock.json` after successful dependency resolution.
2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell; `cp .env.example .env` in macOS/Linux). **Do not commit `.env`.**
3. Set `NODE_ENV=development`, `PORT=3000`, `APP_URL=http://localhost:3000`, `DB_HOST`, `DB_PORT`, `DB_NAME=sherubtse_triphub`, `DB_USER`, `DB_PASS`, `DB_SSL=false`, `ENABLE_MONGODB=true`, `MONGO_URI`, and a fresh `SESSION_SECRET` of at least 32 characters. Generate one using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Set `EMAIL_MODE=api`, `EMAIL_PROVIDER=google-apps-script`, `GOOGLE_SCRIPT_URL` and `GOOGLE_SCRIPT_SECRET` to send real local verification and password-reset links. Set `STORAGE_MODE=local` to keep documents under ignored private uploads. Keep `ALLOWED_EMAIL_SUFFIX=.sherubtse@rub.edu.bt`.
5. Set `DEMO_MODE=false` for ordinary local use. Only use `DEMO_MODE=true` deliberately with separate disposable records and test-only seed credentials, never in production.

## 3. Database creation and migrations

In pgAdmin, create the empty database `sherubtse_triphub`. Use Query Tool to run the following **in order**. Never run the full schema over an existing production database without a backup and migration review.

```text
db/schema.sql
db/step3-auth-migration.sql
db/step4-password-migration.sql
db/step9-proposals-migration.sql
db/step11-registration-migration.sql
db/step12-join-review-migration.sql
db/step12a-final-namelist-migration.sql
db/step13a-student-travel-form-migration.sql
db/step14-packing-migration.sql
db/step18-lifecycle-migration.sql
db/step19-trip-visibility-migration.sql
```

**Important:** The project's schema evolved across steps. Some fresh-install columns are included in `schema.sql`, and some migrations may repeat safe alterations; check each SQL file and run the full sequence first against a disposable database. The Step 19 migration is additive: it adds `trips.is_publicly_hidden` and `trip_public_visibility_events` without changing or deleting trip or participant records. Apply it after Step 18 before deploying the visibility feature. The above ordering matches `.github/workflows/test.yml` but it has **not passed an actual database run** here.

To load sample content for a safe local demo, set `DEMO_MODE=true` and fill `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DSA_EMAIL`, `SEED_DSA_PASSWORD`, `DEMO_PASSWORD` in your private `.env`, then run `npm run seed`. Use nonproduction credentials and clearly label all simulated trip approvals. Return `DEMO_MODE=false` after seeding.

## 4. Start and verify locally

```bash
npm run check:env
npm run check:release
npm test
npm run dev
```

Visit `http://localhost:3000`, `http://localhost:3000/health` and `http://localhost:3000/destinations`. While `NODE_ENV=development`, `/dev/db-test` is a temporary database connectivity check. For API testing, use `/api/destinations`, `/api/trips`, and `/api/trips/:id`. The Postman collection is `docs/postman/Sherubtse_TripHub_Public_API.postman_collection.json`. **The health endpoint only checks application response, not Neon, optional MongoDB, R2 or email delivery.**

## 5. Test roles and protected documents

Student signup is at `/auth/signup`, login at `/auth/login`, password recovery at `/auth/forgot-password`, and account management at `/account`. Proposal creation begins at `/workspace/proposals/new`; DSA review at `/workspace/dsa/proposals`; public trips at `/trips`; Coordinator activities use `/workspace/trips/:tripId/...`. Complete the user-journey checklist in Section 9 with distinct Student, DSA and Superadmin test accounts. A Trip Coordinator is a temporary assignment of an existing Student, not a fourth database role.

## 6. Production services — configured, not connected here

**Neon:** provision PostgreSQL; set `DB_HOST`, `DB_PORT=5432`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SSL=true`. Validate TLS and database access before starting the app.

**MongoDB Atlas (optional):** set `ENABLE_MONGODB=true` and configure `MONGO_URI` to use trip feedback. MongoDB is enabled by default for backward compatibility, and its connection is checked separately at startup. To deploy a temporary PostgreSQL-only Render beta, set `ENABLE_MONGODB=false` and omit `MONGO_URI`; feedback routes return HTTP 503 and final reports record feedback as unavailable. PostgreSQL remains required.

**Google Apps Script email:** deploy the mailer as an HTTPS web app, configure the deployed `/exec` URL and a strong shared secret in local `.env` and Render. The script must compare the secret and return `{ "ok": true }` after sending. Rotate any shared secret that appeared in prior configuration text; set the same newly generated secret in Apps Script and each environment. Never log request bodies or links.

**Resend alternative:** verify the sending domain; configure `EMAIL_MODE=api`, `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, and `EMAIL_FROM`. Provider credentials are required only for the selected provider.

**Cloudflare R2:** create a private bucket and appropriately scoped API credentials; set `STORAGE_MODE=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. Verify that uploads and downloads require authorization; do not expose a public bucket.

**Render:** create a Docker web service connected to the GitHub repository. Set `NODE_ENV=production`, HTTPS `APP_URL`, `PORT` according to platform configuration, a strong `SESSION_SECRET`, plus the private variables above. Apply schema/migrations through an administrative one-off process; **do not** run demo seeding in production. Use the platform health path `/health`, then run deeper smoke tests.

## 7. CI, Docker and deployment checks

```bash
npm run check:release
npm test
docker build -t sherubtse-triphub:local .
```

`.github/workflows/test.yml` defines GitHub Actions services for PostgreSQL 16 and MongoDB 7, applies the migrations and runs the test suite and Docker build. It has not run successfully in this environment. Once a lockfile is generated, use `npm ci` instead of `npm install` in CI for reproducible dependency resolution. Record successful CI, Docker, database, browser, email and R2 outcomes before production use.

## 8. Useful locations

- `app.js` — Express registration and shared middleware; `server.js` — startup.
- `routes/`, `controllers/`, `models/` — MVC request flow and database logic.
- `views/`, `public/` — EJS and static frontend files.
- `config/` — DB, email, MongoDB, environment and storage.
- `services/storage/` — private local and Cloudflare R2 adapters.
- `db/schema.sql`, `db/step*-migration.sql`, `db/seed-data.json` — schema and sample content.
- `scripts/seed.js`, `scripts/reconcile-trips.js`, `scripts/check-release.js` — sample data, lifecycle reconciliation, static release checks.
- `private_templates/` — original two-page Student Travel Form template.

## 9. Manual acceptance checklist (not yet executed)

- [ ] Student-only signup accepts a permitted `.sherubtse@rub.edu.bt` address; verification, login, logout, forgot/reset/change password and session invalidation work.
- [ ] DSA and Superadmin cannot self-sign up; protected URLs reject incorrect roles.
- [ ] Student creates draft via Organise a Trip, uploads supporting files, submits to DSA; previous submission attachments remain retrievable and immutable.
- [ ] DSA requests changes, rejects, and approves a proposal; approves only with an eligible lead and optionally assistants; only DSA reassigns/hands over roles.
- [ ] Approval makes eligible trip public without automatically opening registration.
- [ ] Coordinator opens registration; pending + approved requests reserve seats transactionally; last-seat concurrent requests cannot overbook.
- [ ] Student joins with a valid consent upload; missing/invalid file cannot reserve; Coordinator requests correction, verifies, approves or rejects; prior versions remain private.
- [ ] Uncorrected invalid letter may be rejected with a reason; vacancy stays held until manually reopened.
- [ ] Students can withdraw before departure, including after the deadline; replacement after deadline requires DSA-approved extension and Coordinator reopening.
- [ ] Lead generates combined PDF from only approved/current verified consent letters; DSA can approve a roster smaller than the capacity.
- [ ] Withdrawals, replacements or changed verified consent invalidate prior departure clearance; latest roster needs renewed DSA approval.
- [ ] Original college Student Travel Form PDF is populated without invented data or signatures; printed layout visually matches the two-page reference and is not claimed as formal institutional approval.
- [ ] Participants see only their itinerary, announcements, packing, personal contributions and attendance; Coordinators cannot manage unassigned trips.
- [ ] Coordinator edits trigger reapproval for material itinerary changes; expenses/contributions remain manual records, not online payments.
- [ ] Attendance and expense CSV downloads are Coordinator-only; data cannot be read across trips.
- [ ] MongoDB feedback accepts one eligible review per trip and is visible only to permitted viewers.
- [ ] After trip end, lead submits final report; records become read-only; all assignment records end; former Coordinators stay active Students and can access permitted history.
- [ ] Public REST APIs expose no private documents or unpublished trips.
- [ ] `npm test`, GitHub Actions, Docker build, PostgreSQL connection, MongoDB when enabled, R2 uploads/downloads, selected email-provider delivery and Render smoke checks all pass.

## 10. Known limitations and handover warnings

No successful end-to-end browser tests, complete Jest run, PostgreSQL migrations, MongoDB integration, R2 integration, email delivery, Docker build, or deployed Render URL are evidenced in this environment. The documentation has been cross-checked against source filenames, routes, `package.json` scripts and `.env.example`, **not against successful runtime behavior**. Original destination photo attribution and usage rights remain unverified. The source travel-time instruction needs DSA interpretation; TripHub DSA approval never substitutes for the signed official Student Travel Form or other permissions.
