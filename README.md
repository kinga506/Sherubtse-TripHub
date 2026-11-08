# Sherubtse TripHub

Academic demonstration of a college trip planning and management platform for Sherubtse College. Source code for Steps 1–21 is present, including registration, DSA review, consent handling, itinerary, financial records, final reports and an API. **This is not an officially authorised college system or a verified production deployment.** The full Jest suite, database migrations, complete browser workflows, live email/R2 integrations and Docker build still require successful testing.

## Start locally (historical Step 1 instructions; use the current consolidated guide below)

1. Install Node.js 22+, PostgreSQL and npm.
2. Run `npm install`.
3. Copy `.env.example` to `.env`; enter your own local PostgreSQL password (`DB_PASS`) and a random `SESSION_SECRET` for future steps.
4. Create a local PostgreSQL database called `sherubtse_triphub` via pgAdmin (tables are built in Step 2).
5. Run `npm run dev` and visit `http://localhost:3000`.
6. Visit `http://localhost:3000/health` for an app health check.
7. Visit `http://localhost:3000/dev/db-test` to test the database connection. Expected: `{ "database": "connected" }` only when PostgreSQL is running and the `.env` credentials match; otherwise a safe `503` diagnostic. This route is **not available in production**.
8. Run `npm test` to run Step 1 automated tests. Run `npm run check:env` to validate settings.

No signup or trip functionality exists yet. The `DB_SSL=true` option uses TLS certificate verification; configure your cloud database accordingly.

## Chosen production services

- **Resend** (`EMAIL_MODE=api`, `EMAIL_PROVIDER=resend`): verify a sender/domain in the Resend dashboard and set `EMAIL_API_KEY` and `EMAIL_FROM` as production environment secrets. Sending is implemented in Step 3, not Step 1. Never use `EMAIL_MODE=log` in production.
- **Cloudflare R2** (`STORAGE_MODE=r2`): create a **private** R2 bucket and R2 API token with limited bucket permissions. Set `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` in your host's environment. The adapter supports `put`, `get`, and `delete`; upload authorization, validation, metadata and versioning are future steps. There is **no public upload route**.
- Local storage (`STORAGE_MODE=local`) writes only to ignored `private_uploads/`, outside `public/`.
- The project intentionally contains **no real keys**. `.env.example` and `.env.test` only hold examples / fake test data.

## Structure

`app.js` creates the Express app; `server.js` starts it. `routes/` holds URL routes, `controllers/` will handle request flow, `models/` will hold parameterized PostgreSQL queries, `views/` provides EJS templates, `public/` holds public assets, `config/db.js` initializes pg-promise, and `services/storage/` contains local and R2 adapters. `tests/` holds Jest + Supertest tests. Planning instructions are in `AGENTS.md`; reference gaps in `REFERENCE_NOTES.md`.

## Unresolved official reference

The official two-page `Student-Travel-Form.pdf` has now been provided. It will be used in the later official travel-form generation step. The uploaded `Signature form.docx` is a passport form, not the travel-form reference.

## Step 1 verification record (2026-11-08)

- JavaScript files passed `node --check` syntax validation.
- Direct Node assertions passed for development/test environment defaults, production safety checks, and local private storage create/read/delete/path-traversal rejection.
- `npm install` was attempted here but timed out while fetching packages, so the Jest/Supertest tests and live Express server could **not** be executed in this environment. Run `npm install`, `npm test`, then `npm run dev` on your internet-connected workstation; do not treat these checks as passed until they run successfully.
- The database connection check cannot be verified without a live PostgreSQL instance configured for the application.
- R2 operations were not exercised; real credentials and a private bucket are required.

## Step 2 — PostgreSQL schema, source content and demo seed

**For LOCAL development only. This is a project demonstration, not an officially
approved Sherubtse College travel service.** The five original TripPack trips
are seeded as `pending_dsa` instead of inventing real DSA decisions. The two
relative-date demo trips carry explicitly **SIMULATED** approval records.

1. Create a new empty PostgreSQL database named `sherubtse_triphub` in pgAdmin.
2. Open pgAdmin's Query Tool on that database and execute `db/schema.sql` in full.
3. Copy `.env.example` to `.env`, set your PostgreSQL credentials, and set
   `DEMO_MODE=true` **only on your local development computer**.
4. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DSA_EMAIL`,
   `SEED_DSA_PASSWORD`, and `DEMO_PASSWORD` to private values. All seed passwords
   must be at least 12 characters. Use separate email addresses for DSA/Admin.
5. Install dependencies with `npm install` and run `npm run seed`.
6. Check `destinations`, `destination_photos`, `users`, `trips`,
   `trip_coordinators`, `trip_approval_history`, `trip_final_reports` and
   `participants` in pgAdmin. Re-run the seeder and verify counts do not rise.

To re-extract original photographs, install Python packages `python-docx`
and `Pillow`, copy `trippack_photos.docx` to the project's parent directory,
then run `python scripts/extract-photos.py ../trippack_photos.docx`.
The six photos are already included in this delivery, matched to their
captions. The source document's photos do not provide reliable individual
copyright/credit metadata; verify rights before public deployment.

To re-extract source data, install `python-docx`, copy `TripPack.docx` to the
parent directory, and run `python scripts/build-seed-data.py ../TripPack.docx`.
The generated `db/seed-data.json` is already included. No detailed estimated
cost breakdown was supplied for the five source trips; none is invented.

**Seed safety:** `scripts/seed.js` fails in production and when `DEMO_MODE`
is not `true`. Existing matching accounts are not changed. Existing seed
records are not overwritten or deleted. It does not seed genuine consent
letters, verified signatures or actual participant approvals. Its one example
join request is deliberately rejected because it has no consent document.

**Not yet implemented:** live registration, consent verification, final roster
clearance, MongoDB feedback and secure authentication are later build steps.
The official `Student-Travel-Form.pdf` has since been supplied; its generation feature remains a later step.


## Step 3 — Authentication and email (implementation)

1. Run `db/step3-auth-migration.sql` in pgAdmin if your Step 2 schema already exists. The updated `db/schema.sql` contains the same columns for fresh installations.
2. Run `npm install`; set `SESSION_SECRET` to a random 32+ character value in `.env` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
3. Run `npm run dev` and browse `/auth/signup`, `/auth/login` or `/auth/resend-verification`.
4. For local email debugging set `EMAIL_MODE=log`: verification URLs are printed **only to the local terminal** (never use in production). For local SMTP mode set `EMAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM`. For production set `EMAIL_MODE=api`, `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY` and `EMAIL_FROM` using a domain verified in Resend. Keep production `STORAGE_MODE=r2`.
5. Apply `db/schema.sql` to an empty database, and seed only in explicit demo mode. Accounts with DSA and Superadmin roles are provisioned by the seed/admin process, **never public signup**.
6. Test with `npm test`. The Student account should start unverified, receive a 1-hour verification link, become verified after clicking it, and only then be able to log in. Resending is guarded by per-IP rate limits and a per-account 2-minute cooldown. Logout is POST-only and CSRF protected.

**Security boundaries:** All login and signup POST forms require CSRF tokens. Login regenerates the session identifier. `connect-pg-simple` uses PostgreSQL's `session` table; this must exist before web requests. Account `/account` requires a verified, active session. `verification_token` contains a SHA-256 token hash, never the raw email link. Future Step 4 handles password recovery and change-password. Step 5 adds the full role- and trip-specific authorization middleware.

**Verification note:** npm installation timed out in the artifact environment; Jest, PostgreSQL session persistence and live Resend delivery must be checked on a configured local machine before marking the stage complete.

## Step 4 — Password recovery and account security

The `/auth/login` page links to **Forgot password?**. Enter an existing verified, active Student, DSA, or Superadmin account email and submit the form. The confirmation is deliberately identical whether the account exists or not. In local development, `EMAIL_MODE=log` prints a one-hour recovery link to the terminal; production uses the configured Resend API. Never forward password links. Requesting a new link invalidates the previously issued link. The reset form checks a one-use cryptographically random token, asks for a matching new password (12–72 characters), then removes the token and **all** existing PostgreSQL sessions for that account. Expired, malformed and reused links offer a fresh request. If email delivery fails, check secure server logs; do not assume the message was delivered.

While logged in, visit **My account → Account Settings → Security → Change Password** (`/auth/change-password`). The current password is required; the new password must differ from it. On success, every session is invalidated and the user must log in again. Student, DSA and Superadmin account roles and any trip-specific assignments stay unchanged.

**Migrations:** For an existing Step 2/3 database, run `db/step4-password-migration.sql` in pgAdmin. Fresh databases use the revised `db/schema.sql`. Keep PostgreSQL's `session` table intact. Run `npm install`, `npm test`, and `npm run dev` before manual testing. Relevant rate limits and CSRF protection from Step 3 apply to the new POST routes; rate-limit storage is in-memory in this development release and must be replaced with a shared production store when scaling beyond one app instance.

**Manual test scenarios:** forgot-password with an existing and unknown email; expired and already-used reset links; mismatched new passwords; wrong current password; attempting to reuse the current password; changing the password on each account role; checking another device is logged out. Never enter real production passwords in demo tests.

**Step 4 verification:** Syntax checks and source-level tests are available. Full Jest/Supertest integration and a real database/session test still require working dependencies and PostgreSQL. No live password reset email delivery or running Render service has been verified here.

## Step 5 — Authorization

Trip-scoped role and assignment checks, example protected routes, and tests are in `middleware/authorization.js`, `routes/workspaces.js`, `models/Access.js`, and `tests/step5-authorization.test.js`. See `docs/STEP5_AUTHORIZATION.md` for route examples, authorised Superadmin SQL, and testing steps. Future private file/API routes must add their own middleware checks.

## Step 6 — Responsive shared design system and public shell

The shared EJS header/footer, visual tokens and reusable styling are in `views/partials/`, `public/css/styles.css` and `public/js/ui.js`. The accessible mobile menu uses an expanded-state toggle; it closes when selecting a link or pressing Escape. All account roles use the same navigation system, with a Student-only **Organise a Trip** anchor and conditional **My Coordinating Trips** link if active assignments exist. This is a navigational preview only: proposal creation begins in Step 8, public destination detail pages in Step 7, and private trip operations later.

Run `npm run dev` and open `/` and `/design-system` in a browser. The second route is a **non-production data demonstration** of badges, buttons, inputs, dialogs, live toast notifications, an illustrative spinner, empty/error states and responsive cards. The example form validates locally but does not save records. Use mobile viewport widths of 360, 390, 768 and desktop 1280 pixels to verify layout and keyboard navigation. Login/signup, My Account and protected workspace pages now use the same shell.

**Step 6 validation:** JavaScript syntax and static layout assertions were checked in this artifact environment. `npm test` was attempted but `jest` is not installed because dependency installation was unavailable. Actual EJS rendering, browser interactions, DB-scoped navigation and full integration tests must be checked after `npm install` succeeds on your configured workstation. The prior Step 1–5 integration limitations still apply. Do not deploy as a complete travel system.

## Step 7 — Public destinations

Visit `/destinations` to browse seeded destinations or `/destinations/chorten-kora` for a destination guide. The gallery and detail pages read records from PostgreSQL, including destination photo paths from `destination_photos`. Their published upcoming trip section **only** queries trips with approval_status `approved`, an active lead coordinator, active/planned status, and a future start date. No public trip registration is available yet (Step 10 onward).

Apply `db/schema.sql` and run `npm run seed` with `DEMO_MODE=true` and valid seed account credentials before opening these pages. Photos ship within `public/images/destinations/`. If images need regeneration, use `python scripts/extract-photos.py` with the source DOCX available in the configured reference location. Photograph credit is shown when recorded; otherwise the interface explicitly says the project reference did not provide attribution. Never infer a photographer or claim original photographs are college-owned.

The five original source sample trips are pending DSA review and therefore are **not** shown as publicly approved upcoming trips. Demo trips with synthetic approval must be labelled as simulated; the public pages do not bypass the database approval rules.

Test: `npm test` (including `tests/step7-destinations.test.js`), and manually check `/destinations`, `/destinations/bumdeling`, an invalid slug, the image lightbox, keyboard closing with Escape, mobile layouts, and the empty upcoming trips state. This stage does not introduce new database migrations.


## Step 8 — Student trip proposals

Verified Student accounts can visit `/workspace/proposals/new` to create a private proposal draft, `/workspace/proposals` to list drafts and `/workspace/proposals/:tripId/preview` for the server-validated preview. Draft changes are saved together with itinerary activities and estimated cost items in one PostgreSQL transaction. The editor shows validation errors without changing a previously saved version. Submissions to DSA, supporting documents and assignments remain reserved for Step 9. New proposals always start as `draft`, `registration_open=false`, `operational_status=planned`. No coordinator assignment is created.

Test locally after applying `db/schema.sql` and running the seed: `npm install`, `npm test`, `npm run dev`. Register and verify a student, create a draft, add itinerary and estimated costs, save, edit, and preview. Test with another account to verify ownership restrictions. Do not treat a preview-ready draft as institutionally approved.

Assumptions: A draft may omit operational details until it is ready for DSA review; dates, a destination, title, participant limit and nonnegative cost are needed to save. Each itinerary day must have at least one activity for strict preview validation. Costs represent estimated per-student costs. All times entered are Bhutan local time.

## Step 9 — Supporting-document uploads, DSA decisions and coordinator assignment

Run `db/step9-proposals-migration.sql` on an existing Step 8 PostgreSQL database before using Step 9 routes, then run `npm install`, `npm test`, and `npm run dev`. Students manage proposal attachments via `/workspace/proposals/:tripId/attachments`; DSA reviews submissions via `/workspace/dsa/proposals`. Approved and verified Students can see active trip-specific assignments on `/workspace/coordinating-trips`. Assigned students can submit material revisions (which reset DSA approval and close registration) or request DSA-supervised handover. Production stores private files in Cloudflare R2; no document is a publicly served static asset.

See `docs/STEP9_REVIEW.md` for test scenarios and permissions. The official Student Travel Form, consent letters, participant registration and departure clearance are separate later development stages. Jest, live PostgreSQL and R2 integration remain unverified in the artifact environment.

## Step 10 — Public trip discovery

This step adds `GET /trips` and `GET /trips/:id` with destination search, dzongkhag and registration filters, ordering, trip comparison, estimated-cost items and public trip detail pages. The visible set is limited in PostgreSQL to **approved, active, planned, upcoming trips that have an active lead Coordinator**. Private proposals, supporting documents, full participant names and consent letters are not selected. Both occupied (`pending` + `approved`) and confirmed (`approved`) counts are displayed; these are different numbers. `Slots Full` means occupied capacity includes pending requests, while `Fully Booked` means all occupied requests are approved. Opening registration and submitting join requests are Step 11, and are **not** active here.

No schema migration is needed for Step 10. To test locally, apply the earlier schema and migrations, configure `.env`, run `npm install`, `npm run seed` in local demo mode if desired, `npm test`, then `npm run dev`. Visit `/trips`, select filters and open a trip. The five original sample proposals remain pending DSA approval, so they must not appear publicly until deliberately reviewed. No real DSA approval is implied by local demonstration fixtures.

Automated test source is in `tests/step10-discovery.test.js`. Run real PostgreSQL/HTTP/browser integration tests locally: source-only syntax and pure function checks do **not** establish database access or production readiness.


## Step 11 — Trip registration and individual consent-letter uploads

This stage enables an **active assigned lead or assistant Trip Coordinator** to open, close or manually reopen registration. Students can submit a joining reason, cost/safety/availability acknowledgements and a parent/guardian consent PDF/JPG/PNG (up to 10 MB). A valid pending request occupies one slot without becoming a confirmed participant. Students can view their requests and withdraw with a reason; every withdrawn vacancy must be explicitly reopened by an assigned Coordinator. Consent remains `pending_review` until Step 12 verification.

**Existing databases must execute `db/step11-registration-migration.sql` through pgAdmin before starting.** New databases use the updated `db/schema.sql`. Routes: `/workspace/trips/:tripId/registration`, `/trips/:id/join`, `/workspace/my-trips`, and `/trips/:id/withdraw`. The Coordinator POST actions are `open`, `close`, `reopen` and all forms include CSRF protection. The joining upload parser precedes global CSRF middleware. Private consent objects are stored via the existing local/R2 adapter and are never exposed by a public route.

To test: `npm install`, configure `.env` and PostgreSQL, apply the migration, run `npm test` and `npm run dev`, then follow `docs/STEP11_REGISTRATION.md`. Tests for simultaneous real PostgreSQL requests and deployed R2 storage remain outstanding until the dependencies, database and cloud credentials are available.

Step 12 will add Coordinator approval/rejection, correction and consent-review workflows. Step 12A will generate the combined final namelist and seek DSA departure approval. **Do not treat a pending registration or uploaded consent letter as approval to travel.**

## Step 12 — Join-request decisions and DSA replacement extensions

New files: `models/JoinReview.js`, `controllers/joinReviewController.js`, `routes/joinReview.js`,
`middleware/consentCorrectionUpload.js`, `views/trips/join-requests.ejs`,
`views/dsa/deadline-extensions.ejs`, `db/step12-join-review-migration.sql`,
`docs/STEP12_JOIN_REQUESTS.md` and `tests/step12-join-review.test.js`.

Apply the Step 12 migration after Step 11, then run `npm test` and `npm run dev`.
The Coordinator join-request page is `/workspace/trips/:tripId/requests` and the DSA extension queue is `/workspace/dsa/deadline-extensions`. Student consent replacement is available in My Trips only when correction has been requested. Reopening a held vacancy does not override a separate manual registration closure. See the Step 12 guide for exact tests and restrictions.

## Step 12A — Final namelist and DSA review

See `docs/STEP12A_FINAL_NAMELIST.md`. Apply `db/step12a-final-namelist-migration.sql` after Step 12, then install `pdf-lib` via `npm install` and run `npm test`. Live database, browser and object-storage integration remain to be verified locally.

## Step 13: Private itinerary and announcements

Approved participants and DSA can view the itinerary and notices. Active assigned Trip Coordinators can publish announcements or update activities, with material changes automatically creating a fresh proposal version and closing registration for DSA reapproval. Print-friendly itinerary available. See `docs/STEP13_ITINERARY_ANNOUNCEMENTS.md`.

## Step 13A — Official Student Travel Form

Apply `db/step13a-student-travel-form-migration.sql` after earlier migrations. The original two-page PDF template is stored in `private_templates/Student-Travel-Form.pdf`. Active assigned Trip Coordinators can generate an unsigned form at `/workspace/trips/:tripId/student-travel-form`, using approved participants only. PDF copies use the configured private local or Cloudflare R2 object storage. Generated historical copies are immutable; no signature or institutional approval is fabricated. See `docs/STEP13A_OFFICIAL_TRAVEL_FORM.md`. Resend settings remain unchanged.


## Step 14 — Packing
Run `db/step14-packing-migration.sql` **after** seed data is installed. Approved participants can manage their private checklist at `/workspace/trips/:tripId/packing`; active Coordinators manage only the trip-level suggestions. See `docs/STEP14_PACKING.md`.

## Step 15 — Actual expenses and student contributions

- `/workspace/trips/:tripId/finance` shows Coordinators a restricted trip financial summary, approved participants and manually recorded transactions; approved Students see only their own contributions and indicative balance.
- Active assigned Coordinators may create/edit actual expenses and student contribution records. All money is recorded in Nu.; no payments are processed online.
- `trips.estimated_cost` stays separate from `expenses.amount`. Estimated balance due compares this per-student estimate to the student's manually recorded contributions, not an official fee demand.
- PostgreSQL uses the existing `expenses` and `contributions` tables; no Step 15 migration is needed. See `docs/STEP15_FINANCES.md`.
- Verification: JavaScript syntax and direct pure-validation checks passed. Jest/PostgreSQL/browser integration checks remain outstanding due to missing npm dependencies and database service in this environment.


## Step 16 — Attendance and exports
The private `/workspace/trips/:tripId/attendance` page supports date-based attendance and coordinator-only CSV exports for attendance and actual expenses. See `docs/STEP16_ATTENDANCE.md`. No new migration is required.

## Step 17 — MongoDB feedback

Run `npm install` to install the native `mongodb` driver, and configure `MONGO_URI` for local MongoDB or MongoDB Atlas. The app starts a single reusable connection and creates a unique `(tripId, studentId)` index before accepting requests. The temporary MongoDB test route was intentionally not retained. Feedback is trip-based, not tied to any individual Coordinator.

After an approved trip's end date and with status `awaiting_final_report` or `completed`, approved Students can submit one rating (1–5) and comment at `/workspace/trips/:tripId/feedback`. Assigned and former Coordinators can see only their own trip's feedback summary at `/workspace/trips/:tripId/feedback/summary`. Eligibility is always checked in PostgreSQL before using MongoDB. See `docs/STEP17_FEEDBACK.md`.

**Verification:** JavaScript syntax/direct checks were performed, but live MongoDB/Atlas, PostgreSQL, Jest and browser integration still require testing on a configured machine.

## Step 18 — Trip completion and archive
Apply `db/step18-lifecycle-migration.sql`, then see `docs/STEP18_COMPLETION.md` for lifecycle/DSA cancellation tests. Use `npm run reconcile:trips` in a recurring external scheduler; request-time reconciliation also runs on trip-specific pages. The final report is an immutable PostgreSQL snapshot of attendance, financial totals and MongoDB feedback at submission time. Resend is used for durable notification-outbox delivery.

## Step 19 — Help and administration

Public pages: `/help`, `/about`, `/faq`, `/safety`, `/photo-credits`. The wording and safety numbers are sourced from the supplied TripPack reference; check official emergency numbers before publishing. The testimonials remain marked as fictional samples.

Superadmin: `/workspace/superadmin` (overview, accounts, DSA account creation, programmes, destinations, destination photo upload/metadata, FAQ/rule/testimonial editing, and read-only trip assignment oversight). Superadmin **cannot** assign a Coordinator or approve a trip. DSA review history and completed reports are at `/workspace/dsa/history`, while assignment and handover remain at `/workspace/dsa/proposals/:tripId`.

Uploaded public photos use the configured private storage backend, served through `/managed-photos/:photoId` only for active destinations. Only JPEG/PNG images with matching file signatures are accepted. No credentials are embedded in URLs. The existing seeded static destination photos remain unchanged.

Before checking the admin pages, finish applying migrations and seeding the database. `npm test` requires installed dependencies and a configured PostgreSQL test environment. The Step 19 source and isolated tests do **not** substitute for browser, access-control, real R2, or database integration testing.


## Step 20 — Public REST API

Three read-only JSON endpoints are implemented, using the same PostgreSQL models and public visibility rules as the corresponding website pages:

- `GET /api/trips` — upcoming, active, DSA-approved trips with an active lead assignment; optional `q`, `dzongkhag`, `registration=all|open|closed`, and `sort=soonest|cost_low|cost_high`. Up to 100 results.
- `GET /api/trips/:id` — one eligible published trip plus its estimated cost items, or JSON `404` when unavailable.
- `GET /api/destinations` — active destinations with public photo and credit information.

Public JSON returns selected fields only. It excludes proposal/consent attachments, participant identities, DSA review remarks, financial contribution records and Coordinator assignment records. Registration status is calculated from explicit opening, the deadline, capacity occupied by both pending and approved requests, and any manually held vacancy. The API contains no write endpoints, so it cannot modify completed trips. Existing private historical pages remain under their own authorization rules.

Use `docs/STEP20_REST_API.md` for API examples, status and privacy rules, and manual tests. Import `docs/postman/Sherubtse_TripHub_Public_API.postman_collection.json` into Postman and set `baseUrl` as necessary.

Step 20 code and static checks are included. Full Jest/Supertest and PostgreSQL/Postman verification are pending until npm dependencies and a local database are available.

## Step 21 — Automated testing and deployment preparation

Run `npm run check:release` for a dependency-free JavaScript syntax and packaging check. The new `.github/workflows/test.yml` provisions isolated PostgreSQL and MongoDB services, applies schema/migrations, runs Jest/Supertest, and attempts a Docker build. `Dockerfile` uses Node.js 22 Alpine, production-only npm packages and the non-root `node` user. `.dockerignore` excludes credentials and locally uploaded private files.

The workflow is **not yet verified green**: the current environment could not obtain npm dependencies or run PostgreSQL/MongoDB/Docker, so those runtime checks must be carried out on GitHub Actions or a properly configured development machine. No lockfile could be generated in this environment; `npm install` is used until a verified lockfile is committed. Refer to `docs/STEP21_TESTING_AND_DEPLOYMENT.md` for a manual acceptance checklist covering the Section 31 workflows and the necessary private cloud checks. Steps 22 documentation and handover remain separate and have not been performed.


## Step 22 — Current handover and verification status

Read `docs/SETUP_GUIDE.md` first for the **current** installation/migration sequence, deployment configuration, prerequisites and known blockers. Then use `docs/DEMO_SCRIPT.md` for the demonstration and `docs/CODE_TOUR.md` for a beginner-friendly architecture guide. A printable Word guide is in `docs/Sherubtse_TripHub_Setup_and_Deployment_Guide.docx`. Earlier numbered sections of this README document the project's incremental history; instructions describing features as “not yet built” apply to those historical steps, not the current source tree.

**Not yet verified:** Complete npm installation, Jest/Supertest suite, live PostgreSQL/MongoDB data operations, migration application, official filled PDF output, private Cloudflare R2 round-trips, Resend email delivery, end-to-end browser user journeys, GitHub Actions, Docker image build, and Render deployment. Do not claim these passed. A green CI run alone also does not replace the manual acceptance checklist.

### Assumptions and placeholders

- This project is an **academic demonstration**, not an official Sherubtse College system or evidence of college authorisation. DSA actions entered in demo fixtures are simulated, not institutional permissions.
- `trippack@sherubtse.edu.bt` appearing in reference content is a **nonverified placeholder** and must not be used as a functioning support mailbox without college approval.
- The five source trip dates, budgets and participant limits are **sample plans**; costs are estimates, not verified fares; no itemised cost breakdown was supplied for the five original samples.
- Demo Student, DSA and Superadmin accounts are fictional/test records and may be seeded only with `DEMO_MODE=true` outside production.
- Original destination photos are included from the user's supplied document, but licensing, photographer attribution and reuse rights were **not verified**; photo credit fields may be empty.
- Programme names in the source are suggested examples, not an independently verified current college catalogue.
- The official Student Travel Form includes a travel-time instruction whose interpretation requires DSA confirmation; the app must not treat its own clearance as formal submission/signature/approval of the college form.
- `.env.example` contains placeholder database, Resend, R2 and seed credentials that must be replaced. Real API keys and passwords are never shipped.
- Actual emergency numbers, travel routes, seasonal access, permit conditions, and college policy must be confirmed with the relevant authorities before public use.
- Source sample and relative-date demo trips must be visibly labelled as demo, not genuine approved events.

### Final handover checklist

- [ ] Install dependencies and commit a generated `package-lock.json`; replace CI `npm install` with `npm ci` once the lockfile exists.
- [ ] Apply `db/schema.sql` and the ten migration files in the exact order in `docs/SETUP_GUIDE.md`, using a **nonproduction** database first.
- [ ] Run `npm run check:release`, `npm test`, and manual end-to-end journeys; correct any failures.
- [ ] Test all three account roles and a trip-specific lead/assistant assignment with different users.
- [ ] Verify live Resend delivery, Cloudflare R2 private uploads, MongoDB and Neon connections.
- [ ] Visually compare a filled official travel-form PDF against the original two-page reference.
- [ ] Run GitHub Actions to a green result, build the Docker image, and then deploy to Render with real private credentials.
- [ ] Obtain college/DSA review of institutional wording and any required permissions before real use.
