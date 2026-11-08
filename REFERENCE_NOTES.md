# Sherubtse TripHub — Step 0 Reference Notes

Date reviewed: 2026-11-08. This is planning, not application implementation. No deployed service, database or functioning application has been created.

## Reference inventory and access

- `Campus_eats(4).zip` — ZIP, present, central source files inspected by reading ZIP entries without extracting private environment files. The prompt calls it `Campus_eats.zip`; provided file has a suffix. ZIP contains nested `Campus_eats/Campus_eats/` project and `.git`, `node_modules`/generated assets, which must be excluded from a fresh project. Do not copy `.env` or secrets.
- `unit_I-Fundamentals of Backend Development (a)(2).pdf` and `(b)(2).pdf` — present; parsed text accessible, covering frontend/backend and multi-tier architecture.
- `UNIT_2 (1).docx` — present; parsed, Node.js and asynchronous programming.
- `Unit_3(3).pdf` — present; parsed, MVC architecture.
- `UNIT4__1 (2).DOC` through `UNIT4__4 (1)(2).DOC` — present; legacy DOC teaching materials on SQL/data model, transactions and labs.
- `UNIT5__1 (1).DOC` through `UNIT5__4 (2)(1).DOC`, `UNIT5_Auth (2).DOC`, `UNIT5_MongoDB (2).docx` — present; theory/labs for APIs, authentication and MongoDB.
- `Unit6.1 (1).docx`, `Unit6.2(2).DOC`, `Unit6.3 (2).docx`, `Unit6.4 (2).docx` — present; testing and deployment theory/labs.
- `TripPack.docx` — present, 26-page extracted representation, 6 destinations, 5 sample trips, content and fictional demo-user profiles; inspected text and tables. Preserve the content and mark samples as sample.
- `trippack_photos.docx` — present, inspected six embedded pictures/captions. Photos (in document order): Dangling Tsho, Sakteng Village, Merak Village, Chorten Kora, Takila, Bumdeling. Images should be extracted at implementation time, with credits only when verifiable.
- `Signature form.docx` — present, reviewed heading: **SIGNATURE FORM FOR ONLINE PASSPORT APPLICATION**. It is not the Sherubtse official Student Travel Form and cannot be substituted.
- `Sherubtse_Student_Travel_Form.pdf` — **missing**. Thus its exact fields, layout, rules and travel-time instruction **cannot be independently verified**. Do not implement official PDF generation or assert its meaning until supplied.
- `Sherubtse_TripHub_Final_Codex_Prompt_Ready_For_Codex(1).txt` — present; inspected and embedded in `AGENTS.md`.

## Existing Campus Eats patterns verified

The project uses CommonJS Node.js, Express, EJS, pg-promise (PostgreSQL), the native MongoDB driver, bcrypt, express-session, nodemailer, Jest and Supertest. The `app.js` mounts browser/API routes, parsers, sessions, static assets and EJS. `server.js` starts the listener. Routes dispatch to controllers; controllers call table-oriented models; models perform parameterized database queries. HTML is rendered using views/partials; REST endpoints return JSON. Tests, Jest config, Dockerfile and GitHub workflow exist. Reuse the pattern, not food-ordering business logic. Replace/develop suitable session persistence and security measures as specified, rather than copying any insecure demo implementation verbatim.

## Account and approval model

Three persistent account roles only: `student`, `dsa`, `admin` (UI name Superadmin). Everyone registering publicly receives `student`; only active, verified Sherubtse student accounts can be appointed trip-specific lead/assistant Coordinators by DSA. `trip_coordinators` rows hold trip scope, assignment type, audit metadata and end status; they do not change user role. DSA separately approves the trip proposal and later the current final namelist + verified consent package. The system must not claim to replace official college travel permission. Completed trips end all coordinator assignments while preserving Student accounts and read-only history.

## Proposed storage and data model

PostgreSQL owns `users`, `programmes`, `destinations`, `destination_photos`, `trips`, `trip_coordinators`, `trip_cost_items`, `trip_attachments`, `trip_submissions`, `trip_approval_history`, `participant_consent_documents`, `final_participant_submissions`, `final_participant_review_history`, `participants`, `itineraries`, `expenses`, `contributions`, `packing_suggestions`, `packing_items`, `attendance`, `announcements`, `trip_final_reports`, editable FAQs/rules/testimonials and sessions. Key partial uniqueness rules: one active lead per trip, one active assignment per trip/student, one active participant request record per trip/student. Lock trip rows for capacity-changing actions, and atomically preserve approval/audit snapshots. Never store sensitive files in a public folder.

MongoDB is used only for feedback in `sherubtse_triphub_feedback.feedback`, keyed by numeric PostgreSQL trip/user IDs; cross-store foreign keys cannot be enforced by MongoDB and must be checked in the application. Restrict queries by authorized trip scope.

Store immutable proposal attachments, individual versioned consent letters and generated final-list packages under random private object keys. Store metadata/checksum/version and access grants in PostgreSQL. In development use a private local adapter; in production use a cloud object store (e.g. Cloudinary private/authenticated storage or S3-compatible object storage), never Render's ephemeral disk. Do not treat Cloudinary public image URLs as private storage for consent documents.

## Source-data mapping to `db/seed-data.json` (design only)

- `destinations[]`: six entries with names, Dzongkhag, description, seasons, travel/trek estimates, transport budget caveats, no-unverified-fee notes and practical tips from TripPack.
- `destinationPhotos[]`: six figure-caption mappings; include real attributions only when supported.
- `programmes[]`: eight proposed programme values marked unverified as current official catalogue.
- `trips[]`: five dated 2027 sample trips with source cost totals, caps, dates, meeting details, descriptions and itineraries; **no invented line-item budgets**. Include source-only notices and `is_sample`. Additional dynamic demonstration trips must be clearly marked demo and not be represented as actual scheduled trips.
- `users[]`: twelve clearly fictional demonstration accounts, all persistent `student` role; two may have *trip-specific* demo assignments, not Coordinator account roles. Add separate protected seed accounts for DSA/Superadmin in development only.
- `faqs[]`, `tripRules[]`, `testimonials[]`, `emergencyContacts[]`, `packingSuggestions[]`: directly from supplied source, labelled where placeholders, fictional, or unverified. Emergency service numbers should be independently confirmed before public deployment.

## Registration and clearance behavior to test

Pending join requests containing a valid upload reserve capacity immediately; approved requests keep their slot. Invalid/missing upload cannot reserve a slot. A request awaiting consent correction retains its capacity hold; a Coordinator may reject with reason if not corrected. Withdrawal or rejection frees capacity but new booking still requires explicit Coordinator reopening. Withdrawals may happen after the registration deadline but before departure. Replacement after deadline requires a Coordinator's requested extension and DSA approval, then manual reopening. DSA may approve fewer confirmed participants than max capacity. Every change to approved roster or consent version invalidates the latest departure clearance, requiring new PDF package and DSA decision. All state transitions must be enforced server-side, including concurrency and audit history.

## Unresolved or institution-dependent matters

1. **Missing official travel form PDF:** cannot confirm exact layout, fields, whether the purported 05:00 AM–12:00 PM instruction actually appears, or how it should be interpreted. The prompt mentions that rule, but it is **unverified**; do not enforce it. Obtain the college's official PDF and DSA clarification before Step 13A.
2. College approval process: DSA pre-departure clearance, extension and cancellation workflows are **application requirements/proposals**, not verified official policy; verify with Sherubtse DSA before production claims.
3. Email: user selected **Resend** for HTTPS production email. A verified sending domain and real API key are required before production sending; neither was supplied.
4. Private cloud storage: user selected **Cloudflare R2** (private S3-compatible bucket). Required production names are `STORAGE_MODE=r2`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`. For local mode use `LOCAL_UPLOAD_DIR` outside `public/`.
5. The five TripPack sample trips are reference/demo examples and must not be misrepresented as officially scheduled or approved trips. Source photo credits need verification, programme list is unverified, destination travel times and fees are estimates.
6. `Campus_eats(4).zip` contains private `.env` files and version-control history; do not copy them or their contents into this project or publish the source archive.

## Planned directory structure

`sherubtse-triphub/`: `app.js`, `server.js`, `package.json`, `AGENTS.md`, `REFERENCE_NOTES.md`, `.env.example`, `config/`, `controllers/`, `models/`, `middleware/`, `routes/`, `views/partials/`, `public/css/`, `public/js/`, `public/images/` (non-private destination photos only), `services/storage/`, `services/pdf/`, `db/schema.sql`, `db/seed-data.json`, `scripts/`, `tests/`, `docs/`, `.github/workflows/`, `Dockerfile`. Private uploaded files are stored outside public assets.

## Step status

Step 0 review/planning done to the extent possible without the missing official form and unspecified providers. **No application code written.** User selected Resend/R2 and authorised proceeding. Step 1 foundation code is implemented separately. Official travel PDF is still required before Step 13A.


## Step 3 reference update
The official two-page `Student-Travel-Form.pdf` was supplied after Step 2; it includes organiser details, student table rows 1–30, a travel-time instruction on page two, and blank signature areas. Preserve this as the travel-form reference for the dedicated later step. Do not mistake the earlier passport signature file for this form. No official-form generator was built in Step 3.
Production email was explicitly selected as Resend HTTPS API; private attachments use Cloudflare R2 per the earlier foundation configuration.

## Step 4 implementation note

Password recovery and change-password routes, EJS forms, SQL model methods and security tests have been added. Reset links have 1-hour expiry; the raw link token is never stored in PostgreSQL, only a SHA-256 digest. Reset/change transactions update the password and delete PostgreSQL session rows for the account together. All POST routes retain Step 3 CSRF and rate limits. Production email remains Resend, and private cloud storage remains R2. The submitted two-page `Student-Travel-Form.pdf` is now the authoritative future travel-form reference; the printed 05:00 AM–12:00 PM instruction still requires institutional interpretation rather than automatic enforcement. Step 5 authorization middleware is not yet implemented.

## Step 5

Trip-specific authorization added using active PostgreSQL Coordinator assignment rows, not a permanent role. User selected Resend and Cloudflare R2; these remain unchanged. The official `Student-Travel-Form.pdf` is supplied and will be handled in the later form-generation step.

## Step 6 reference notes

The shared shell uses the supplied TripPack tagline "Explore. Experience. Connect." and the selected Sherubtse TripHub branding; the homepage uses original CSS/SVG artwork instead of substituting synthetic location photographs. The six supplied destination photographs remain reserved for Step 7. No official approval, new destination, fee or travel policy was invented. The supplied official Student Travel Form remains a separate later feature, and its ambiguous travel-time instruction remains subject to DSA clarification. Resend and Cloudflare R2 choices are unchanged.

## Step 7 destination public pages
- Six destination records and supplied destination photos come from `TripPack.docx` and `trippack_photos.docx`; no new geographic or fare claims added.
- Original sample trips remain pending DSA review and are not publicly listed as approved. Only database-approved future trips with an active lead assignment appear as upcoming trips.
- Photo captions/credits were not supplied as clear photographer attributions; do not fabricate them. A descriptive attribution-unavailable note is rendered instead.
- Sample/shared travel amounts are preliminary and must not be presented as verified fares. Drive and trek time are kept distinct.
- The official `Student-Travel-Form.pdf` has been supplied; official PDF generation belongs to a later step.

## Step 9 decisions

- Production email: Resend (unchanged); private uploads: Cloudflare R2 (development: private local storage).
- Original travel-form reference is available as `Student-Travel-Form.pdf`; official generation remains a later step.
- Versioned proposal snapshots use `trip_submissions`, `trip_attachments`, and `trip_submission_attachments`. Active documents may be reused across numbered submissions without overwriting or duplicating storage objects. Historical files are not physically deleted when superseded.
- DSA controls appointment, replacement and ending of trip-specific Coordinators. Student roles do not change.
- npm dependencies / database / cloud uploads are not live-verified here. This is not a production-ready authorization or file service until all integration and security tests pass.

## Step 10 notes

The original TripPack source provides estimated total costs but no itemized cost breakdown for the five sample trips; the UI reports that honestly. Public trip pages deliberately do not expose proposal attachments, private itineraries, participant names, consent letters, or DSA-only review details. The Step 10 status and seat counters are informational; transaction-safe capacity checks and manual vacancy reopening belong to Steps 11–12.

## Step 12 decisions
- Implemented Coordinator consent review, document replacement, acceptance/rejection, private downloads, and audited DSA replacement-deadline extensions.
- Resend notifications are best effort and do not roll back committed transactions.
- Official Student-Travel-Form.pdf is supplied for a later numbered feature; its travel time ambiguity remains pending DSA interpretation.

## Step 13A: official PDF now supplied and inspected

The actual two-page `Student-Travel-Form.pdf` was received after Step 12A and is now copied to `private_templates/Student-Travel-Form.pdf`. It contains rows 1–30, the organiser/driver/vehicle fields, safety undertaking and blank signature area. Earlier notes referring to it as missing are historical; **it is no longer missing**. The 05:00 AM–12:00 PM wording is on page two and requires DSA clarification; it is displayed without automated restriction.

## Step 15 — Finance scope
The final prompt specifies actual expense recording, manually recorded Student contributions, totals and balance due in Nu., with Coordinator-only writes and student-specific privacy. Existing `expenses`/`contributions` tables from `db/schema.sql` are used unchanged. `trips.estimated_cost` is treated as an estimated per-student comparison amount and not an official invoice. No online payment or bank balance feature was introduced.

## Step 17 feedback implementation

MongoDB native driver stores trip feedback only; PostgreSQL verifies approved Student participation and historical trip-specific Coordinator assignments. No general feedback dump endpoint exists. No temporary `/mongo-test` public route is shipped; successful startup confirms the initial connection. The Step 18 end-date transition remains pending.


## Step 18
Dates are interpreted as Asia/Thimphu calendar days for start/end reconciliation. DSA clearance is required for normal start; blocked attempts are audited. A successful final-report submission archives the trip and ends trip assignments, but never changes Student user accounts. Notification delivery is persisted in an outbox for retry.

## Step 21 verification notes
Added GitHub Actions test services (PostgreSQL 16 and MongoDB 7), a Node.js 22 Alpine production Dockerfile, a dependency-free release source check, and regression tests that assert privacy, role and deployment structure. These files are tooling, not new institutional rules. The final approved-namelist workflow, original unsigned Student Travel Form, Resend and private Cloudflare R2 choices are unchanged. Current environment could not install npm dependencies, run Jest or apply migrations against a running database. Consequently CI, container startup, production email and R2 permissions must be verified before claiming release readiness. Do not claim this Step 21 package is deployed or fully tested.
