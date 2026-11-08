# Sherubtse TripHub — Codex Instructions

The following is the complete supplied specification. Follow Step 0 findings in `REFERENCE_NOTES.md` and do not write application code until the user says **go**. After each step stop for **next**.

## Build checklist

- [x] Step 0 — Reference review and planning
- [ ] Step 1 — Project foundation
- [ ] Step 2 — Database and source content
- [ ] Step 3 — Authentication and email
- [ ] Step 4 — Password recovery
- [ ] Step 5 — Authorization and account security
- [ ] Step 6 — Shared design system and public shell
- [ ] Step 7 — Public destinations
- [ ] Step 8 — Student proposal preparation and itinerary
- [ ] Step 9 — Supporting-document uploads, DSA approval and assignment
- [ ] Step 10 — Public trip discovery
- [ ] Step 11 — Registration opening, consent upload and student trip registration
- [ ] Step 12 — Join-request management
- [x] Step 12A — Final namelist and DSA pre-departure approval (source implementation; runtime tests outstanding)
- [ ] Step 13 — Itinerary viewing and announcements
- [x] Step 13A — Official Student Travel Form (source implemented; integration verification pending)
- [ ] Step 14 — Packing
- [ ] Step 15 — Expenses and contributions
- [ ] Step 16 — Attendance and exports
- [ ] Step 17 — MongoDB feedback
- [ ] Step 18 — Trip completion, final report and archive
- [ ] Step 19 — Help and administration
- [x] Step 20 — REST API
- [ ] Step 21 — Automated testing and deployment files
- [ ] Step 22 — Documentation and handover

## Complete original specification

# PROJECT: SHERUBTSE TRIPHUB
## A College Trip Planning and Management Platform for Sherubtse College, Bhutan

Build a complete, functional and responsive web application called **Sherubtse TripHub** for Sherubtse College, Kanglung, Trashigang, Bhutan.

Sherubtse TripHub is a college trip planning and management platform. Each joining student uploads a parent/guardian consent letter, and DSA must approve the finalized participant namelist and combined consent package before the trip is marked cleared for departure. All ordinary users register as Students. A student can submit a trip proposal through the student-facing Organise a Trip workflow. The Dean of Student Affairs (DSA) reviews and approves each proposal. After approval, DSA assigns one or more students as Trip Coordinators for that specific trip. Coordinator permissions are temporary, trip-specific assignments, not permanent account roles.

**Application branding and naming:** The official user-facing website name is **Sherubtse TripHub** (not TripPack). Use this name in page titles, navigation, logo text, email templates, README, deployment guide, screenshots and demonstrations. Use the project folder `sherubtse-triphub/`, a safe package name such as `sherubtse-triphub`, and consistent database identifiers such as `sherubtse_triphub_test` and `sherubtse_triphub_feedback`. Keep the physical reference filenames `TripPack.docx` and `trippack_photos.docx` unchanged when locating the user's supplied documents. The existing reference-document tagline and content remain authoritative; do not invent a new institutional slogan or imply official college endorsement. The display name is a proposed project brand, not a claim of college approval.

The application must reflect the institutional trip approval process described in this specification.

Keep the application professional, modern, intuitive, visually appealing and easy to use. The code should remain simple and understandable because this is also an academic project.

---

# 1. IMPORTANT DEVELOPMENT RULES

Follow these rules throughout development.

1. Work through the numbered build steps one at a time.
2. Do not attempt to build the entire application in one go.
3. Complete the current step before moving to the next.
4. After completing each step:
   - Explain what you implemented in simple language.
   - List the files created or modified.
   - Explain how I can test the implementation.
   - Tell me exactly what I should see when testing.
   - Run the relevant tests.
   - Fix errors before considering the step complete.
   - Commit the completed work to Git.
5. After reporting a completed step, STOP and wait for me to say **"next"**.
6. Never continue to another step without my permission.
7. Do not claim that a feature is complete unless its frontend, backend, database operations, validation, permissions and error handling are implemented and tested.
8. If something is unclear, inspect the reference files first. Ask me only when an important decision cannot reasonably be determined.
9. Do not invent information, destinations, costs, dates, college policies or other institutional facts.
10. Keep the code simple, readable and beginner-friendly. Use short, meaningful comments.
11. Do not introduce unnecessary libraries, complicated architecture or features outside the requested scope.
12. Maintain the same coding conventions and project structure as my reference project, Campus Eats.

In Step 0, save this complete specification into the project as `AGENTS.md`. Convert the development steps into a checklist so future Codex sessions can follow the same instructions.

**Definition of done:**

- `npm install` works.
- `npm test` passes.
- `npm run dev` starts the application.
- All three account roles (Student, DSA and Superadmin) and the trip-specific Trip Coordinator workspace work correctly.
- All restricted routes enforce server-side permissions.
- All important forms, uploads and buttons work.
- Database operations use parameterised queries.
- No passwords, API keys, cookies or secrets are committed.
- All major workflows have automated tests.
- Signup, login, email verification, resend-verification, forgot-password, reset-password, change-password and logout work for the permitted account roles and pass automated security tests.
- The website is responsive on desktop, tablet and mobile.
- The setup and deployment documentation matches the actual code.
- The application can be deployed using the documented process.

# 2. REFERENCE MATERIALS

The following files will be provided in the Codex workspace. Locate and inspect them before writing application code.

### A. `Campus_eats.zip`

This is my completed sample project.

Extract and inspect it.

Ignore:
- `node_modules`
- `coverage`
- `.git`

Actually read the important source files, including:

- `package.json`
- `app.js`
- `server.js`
- `config/`
- `middleware/`
- `controllers/`
- `models/`
- `routes/`
- `views/` and partials
- `public/`
- `tests/`
- Jest configuration
- Dockerfile
- `.github/workflows/test.yml`

Inspect the database, email, authentication, session, MVC, testing and deployment implementations.

Use Campus Eats as the reference for project structure, MVC architecture, naming conventions, database connections, pg-promise usage, authentication, session management, email verification, password recovery, role-based permissions, Fetch API, REST APIs, Jest, Supertest, Docker and deployment.

Do not copy its restaurant, menu, order or payment logic.

Never print or reuse secrets from its `.env` files. Only identify the names of the environment variables.

Pay attention to how it restricts registration to college email addresses ending in:

`.sherubtse@rub.edu.bt`

Reuse that validation approach.

### B. Lab notes

Read the supplied Word and PDF lab notes fully.

Follow their teaching order:

- Unit I: Backend basics, Node.js, Express and npm.
- Unit II: Backend development.
- Unit III: MVC architecture.
- Unit IV: PostgreSQL, pgAdmin, pg-promise, CRUD operations and transactions.
- Unit V: REST APIs, Postman, frontend Fetch API, authentication, roles, email verification and password recovery.
- Unit V MongoDB guide: Native MongoDB driver, used only for feedback.
- Unit VI: Jest, Supertest, test database, Docker and deployment using Neon, MongoDB Atlas and Render.

If the lab notes and Campus Eats implementation differ, follow Campus Eats and explain the difference.

### C. `TripPack.docx`

This is the SOURCE OF TRUTH for website content.

Read the document fully.

Use its actual information for:

- Six destinations.
- Five sample trips.
- College identity.
- Testimonials.
- FAQs.
- Rules.
- Emergency information.
- Academic programmes.
- Twelve demo users.
- Other supplied website content.

Preserve the original wording and facts wherever possible.

Never invent destination information, travel distances, travel costs, entry fees, dates, testimonials, college policies or emergency information.

Ignore photo links in this document because the actual destination photos are provided separately.

### D. `trippack_photos.docx`

This document contains six destination photographs, one for each destination, with figure captions.

Extract the images and match each photograph to its destination using the figure captions.

Preserve photo credits if supplied.

### E. `Sherubtse_Student_Travel_Form.pdf`

This is the existing official Sherubtse College Student Travel Form.

Treat this PDF as the authoritative reference for the official travel document generation feature.

Read the entire PDF, including all pages, fields, instructions, notes, tables and signature sections. Do not rely only on its filename or a partial text extraction.

The official form is separate from Sherubtse TripHub's internal trip proposal and DSA approval workflow.

Do not redesign the institutional process or assume that Sherubtse TripHub approval replaces the official form or any other institutional permission.

If any reference file is missing or cannot be opened:

- Tell me its exact filename.
- Explain what could not be accessed.
- Do not guess its contents.
- Continue with the remaining accessible references.

Before writing application code, verify that the reference files physically exist in the Codex workspace. Do not claim to have read a file merely because it exists.

# 3. PROJECT CONCEPT AND SCOPE

Sherubtse TripHub must support the following activities:

- All ordinary college users register for one normal Student account using a verified Sherubtse college email address.
- Students discover college trips, view permitted information and request to participate.
- A student can select **Organise a Trip** from the Student dashboard and prepare a trip proposal using an existing destination.
- The student who prepares a proposal is its submitter. Before DSA approval, the submitter may manage only that proposal and its supporting documents; this does not give the student active Coordinator permissions.
- The submitter uploads supporting documents and submits the proposal to DSA.
- DSA reviews every proposal and can approve, request changes or reject it.
- DSA approval is mandatory before a trip is publicly visible.
- When approving a proposal, DSA assigns a lead Trip Coordinator. By default, the student who submitted the proposal should be assigned as lead if eligible and still willing. DSA may assign another verified Student instead. DSA may also assign one or more assistant Trip Coordinators when appropriate.
- Trip Coordinator permissions exist only for the trip or trips listed in the student's active assignment records. A student may coordinate several trips using the same account.
- After DSA approval, the assigned Trip Coordinator separately opens registration. DSA approval must never automatically open registration.
- Students request to join only while registration is open and upload an individual parent/guardian consent letter with each request. Active Trip Coordinators verify the letter and may immediately approve or reject the request.
- Pending requests with valid consent-letter uploads and approved join requests each occupy one temporary/confirmed capacity slot. When the trip reaches its limit, show "Slots Full" (if any pending) or "Fully Booked" (if all approved); no additional requests are accepted until an assigned Coordinator manually reopens a vacancy.
- Approved students access the detailed itinerary, announcements, their own contributions and attendance, and their personal packing checklist.
- Assigned Trip Coordinators manage the trip's permitted itinerary, announcements, expenses, contributions, attendance and participant records.
- Before departure, the assigned lead Trip Coordinator submits a final participant namelist and the combined consent-letter package to DSA. DSA must formally approve the final participant list and consent documents before the trip is allowed to proceed in Sherubtse TripHub. This is a second approval, separate from DSA approval of the original trip proposal.
- The assigned lead Trip Coordinator submits a final trip report after the trip ends. The report includes final attendance, actual expenses, student contributions, incidents if any, and a summary of feedback received by the time the report is submitted.
- After the final report is submitted, the trip is archived as completed, ordinary trip management becomes read-only, and all active Coordinator assignments for that trip are ended. Student accounts remain active.
- Students submit feedback after a completed trip. Former Trip Coordinators may view historical records for trips they were assigned to, but cannot continue managing completed trips.
- Trip Coordinators can generate the official Student Travel Form using available trip and approved-participant information.
- Superadmin manages the Sherubtse TripHub platform. DSA remains the institutional authority for trip approval and Coordinator assignment/handover decisions.

Do not create a separate Coordinator account type, Coordinator registration choice, Coordinator access-request queue or permanent Coordinator user role. A Trip Coordinator is a Student with an active assignment for a particular trip.

Do not build:

- Online booking.
- Online payments.
- Payment gateways.
- Chat or messaging.
- Maps or route navigation.
- Unrequested social networking features.

Money is only recorded for management purposes. It is never processed online.

All amounts must use Nu. (Bhutanese Ngultrum).

Keep destinations separate from trips. One destination can have multiple trips with different dates, assigned Trip Coordinators, costs and participant limits.

# 4. USER ROLES AND RESPONSIBILITIES

Sherubtse TripHub has **three account roles** and one trip-specific assignment. The four user-facing experiences are:

1. Student — the normal account role for every student user.
2. Trip Coordinator — a temporary assignment held by a Student for one particular trip; it is not a user account role.
3. DSA — the institutional trip-review and assignment authority.
4. Superadmin — the platform administrator.

The database account-role values are only `student`, `dsa` and `admin`. Use `admin` for Superadmin. Never store `coordinator` as a user role.

A Student may be a Trip Coordinator for one or more trips while remaining a Student for login, account management and all unrelated activities. A Student without an active assignment must not receive Coordinator permissions. Ending one assignment must not affect the user's Student account or any other active trip assignments.

## A. STUDENT

All ordinary student users have the `student` account role. Students can:

- Register using their Sherubtse college email.
- Verify their email address.
- Log in and log out.
- Reset forgotten passwords.
- Browse destinations.
- View destination details and photographs.
- Browse publicly visible, DSA-approved trips.
- View trip descriptions, total estimated costs, available estimated cost breakdowns and safety information before requesting to join.
- Request to join a trip only while registration is open, with a parent/guardian consent letter attached to that individual request.
- Provide a reason for joining.
- Withdraw their request before the trip starts, subject to the applicable rules.
- View their trip requests, consent-document review status, and participation approval status; replace an invalid consent letter when a Coordinator requests correction, subject to controlled versioning.
- Access detailed trip information after being approved by an active Trip Coordinator.
- View their approved trip itinerary.
- Read trip announcements.
- View their own contribution records.
- View their own attendance records.
- Manage their personal packing checklist.
- Submit ratings and feedback after a completed trip.
- Select **Organise a Trip** and prepare a proposal for DSA review.
- View and edit their own draft or changes-requested proposals and their supporting documents, subject to proposal workflow rules.
- View the DSA decision and history for proposals they submitted.

Students must never access:

- Other students' private records.
- Other students' personal contributions.
- Other students' attendance.
- Trip Coordinator management functions for trips to which they are not actively assigned.
- DSA review pages.
- Superadmin pages.
- Private proposal attachments for proposals they did not submit, unless DSA has authorised access through the review workflow.

## B. TRIP COORDINATOR — A TRIP-SPECIFIC STUDENT ASSIGNMENT

**Every Trip Coordinator is still a Student of Sherubtse College.** Faculty members and staff must not be assigned through this student workflow unless the college later defines a separate authorised process.

A Trip Coordinator assignment is created by DSA when a proposal is approved or when DSA later performs a handover/reassignment. It applies only to the trip named in the assignment record. It does not change the user's account role.

Support these assignment types:

- `lead`: the primary student organiser and accountable contact for the trip.
- `assistant`: a student who helps manage the same trip.

A trip may have one active lead and zero or more active assistants. A student may be lead or assistant on multiple trips. The same student must not have duplicate active assignments for the same trip.

The lead and active assistants can, for their assigned trip only:

- View the trip-specific Coordinator workspace.
- View the approved proposal and DSA remarks.
- Manage permitted trip details and the operational itinerary.
- Open or close registration after DSA approval.
- View student join requests.
- Inspect each applicant's parent/guardian consent letter and approve or reject student join requests immediately, with capacity rechecked in a database transaction. A missing or invalid consent letter must prevent approval.
- View and manage approved participants.
- Create announcements and mark them important.
- Manage packing suggestions.
- Record attendance for approved participants.
- Record actual expenses and student contributions.
- View permitted financial summaries.
- Generate and download the official Student Travel Form.
- Generate a finalized participant namelist and a combined PDF of the approved participants' consent letters; the lead submits the versioned package to DSA for formal pre-departure approval.
- Export attendance and expenses as CSV for that assigned trip only.
- View feedback for that trip.

The lead Trip Coordinator is additionally responsible for:

- Acting as the primary contact for the proposal and DSA review.
- Submitting material proposal changes and resubmissions.
- Requesting a handover if they cannot continue.
- Submitting the finalized participant namelist and combined consent package to DSA before departure, and resubmitting if an approved participant changes.
- Completing and submitting the final trip report.

Assistant Trip Coordinators may support day-to-day operations but must not independently change the lead assignment, assign other Coordinators, or submit the final report. DSA controls all Coordinator assignments and handovers.

A Trip Coordinator can manage only trips with a matching active assignment. They cannot manage another student's unrelated trips or access unrelated proposal attachments. When an assignment ends, the former Coordinator loses all write permissions for that trip but may retain read-only access to its historical records as described in the security rules.

## C. DSA — DEAN OF STUDENT AFFAIRS

DSA is a separate institutional authority.

The DSA role represents the college authority responsible for reviewing and approving college trip proposals and overseeing Trip Coordinator assignments.

DSA is NOT the Superadmin.

DSA responsibilities:

- Access a dedicated DSA dashboard.
- View submitted trip proposals.
- Review trip purposes and descriptions.
- Review destinations.
- Review dates.
- Review transport information.
- Review meeting arrangements.
- Review participant limits.
- Review registration deadlines.
- Review estimated costs and estimated cost breakdowns.
- Review supporting documents attached by the student submitter.
- View and download proposal attachments.
- Review proposed itineraries.
- Review safety information.
- Review emergency contacts.
- Approve trip proposals.
- Request changes.
- Reject proposals.
- Provide review remarks.
- View previous decisions and proposal resubmissions.
- Assign a lead Trip Coordinator when approving a proposal.
- Assign one or more assistant Trip Coordinators when appropriate.
- Reassign or end Trip Coordinator assignments when a handover is required.
- Review assignment history.
- Review and formally approve, request corrections to, or reject finalized participant namelists and their parent/guardian consent-letter packages before departure.
- View upcoming approved trips and completed-trip reports.

DSA must have three proposal decision actions:

1. APPROVE
2. REQUEST CHANGES
3. REJECT

When DSA requests changes or rejects a proposal, a reason must be provided.

DSA must also be able to assign, reassign or end trip-specific Coordinator assignments. Only DSA may make these assignment decisions. Verify that each assigned person is an active, email-verified Student account.

DSA must not:

- Manage ordinary student accounts or passwords.
- Manage general website content.
- Manage destinations.
- Manage Superadmin accounts.
- Perform Superadmin operations.

DSA must only have institutional trip-review, trip-assignment and historical trip-oversight permissions.

## D. SUPERADMIN

Use the name **Superadmin** throughout the user interface, documentation and explanations.

The database role value remains:

`admin`

Superadmin responsibilities:

- View the overall platform.
- View all registered users.
- Activate or deactivate accounts.
- Manage user accounts.
- Manage DSA accounts.
- Manage destinations.
- Manage destination photographs.
- Manage programmes.
- Manage FAQs and editable content.
- View all trips and trip approval statuses.
- View trip Coordinator assignments and their history for platform oversight.
- Manage system-level content.
- View administrative information.

Superadmin does not approve students for a permanent Coordinator account role. Superadmin must not create or grant trip Coordinator assignments; DSA performs those institutional actions.

Superadmin manages the software platform.

Superadmin does NOT replace the institutional authority of DSA.

A Superadmin must not approve a trip proposal, assign a Trip Coordinator, reassign a Trip Coordinator or bypass DSA approval.

The separation of responsibilities is mandatory.

# 5. COMPLETE TRIP WORKFLOW

Implement this institutional workflow exactly.

### Step 1: Student registration

A student creates one normal Student account using a valid Sherubtse college email address and verifies that email. There is no Student-versus-Coordinator signup choice. The account role remains `student` throughout the user's time on Sherubtse TripHub.

DSA and Superadmin accounts are provisioned separately by authorised administration or the seed/environment configuration. They cannot be created through public signup.

### Step 2: Student starts a trip proposal

The student selects **Organise a Trip** from the Student dashboard and creates a proposal using an existing destination.

The new trip starts with:

- `approval_status = 'draft'`
- `registration_open = false`
- `operational_status = 'planned'`

Store the submitter in `trips.proposed_by_user_id`. This identifies who created the proposal; it does not itself grant Coordinator permissions.

The submitter can edit their own draft proposal and supporting documents. Other students cannot edit it. DSA can review it only after submission.

### Step 3: Student prepares the proposal and supporting documents

The student enters:

- Trip title.
- Purpose.
- Description.
- Destination.
- Dates.
- Meeting point.
- Meeting time.
- Transport information.
- Participant limit.
- Registration deadline.
- Estimated cost per student.
- Estimated cost breakdown, subject to the source-data exception below.
- Proposed itinerary.
- Safety information.
- Emergency contact details.

The proposal form must include a dedicated **Supporting Documents** section. The student can upload multiple supporting documents while preparing the proposal and before submitting it to DSA.

Examples may include relevant schedules, supporting letters, quotations, transport information or other documents useful for review. Do not invent mandatory document categories or institutional requirements that are not confirmed by the reference materials.

For every attachment, allow the student to provide:

- Document title.
- Short description or document type.
- File.

Allow these file formats:

- PDF.
- DOC.
- DOCX.
- JPG.
- JPEG.
- PNG.

Use a reasonable configurable default file-size limit, such as 10 MB per file, and a reasonable configurable limit on the number of attachments.

Validate the actual file type on the server, not just the file extension or browser-provided MIME type. Use random server-generated storage names. Do not trust the original filename as a storage path.

Store attachment metadata in PostgreSQL, including attachment ID, trip ID, uploaded-by user ID, original display filename, document title, description, storage key, detected MIME type, file size, submission/version reference, upload timestamp and active/superseded status.

**Attachment rules:**

- Before initial submission, only the student who created the proposal can manage its draft attachments.
- When DSA requests changes, that proposal's submitter can add, replace or remove attachments before resubmission.
- When a proposal is submitted, preserve the exact submitted attachment versions as part of that submission's review record.
- Do not silently replace a document that DSA has already reviewed.
- After submission, do not allow the submitter to modify the submitted attachment version while DSA is reviewing it.
- If a material supporting document changes after trip approval, treat it as a material proposal change and require DSA re-review.
- DSA must be able to view and download the exact submitted documents from the proposal review page.
- DSA must be able to distinguish current attachments from earlier submitted versions.
- Proposal attachments must never be publicly accessible.
- After approval, active Trip Coordinators may access the supporting documents for their assigned trip according to their permissions.

Use local file storage during development and the configured cloud object storage in production. Do not rely on Render's temporary local filesystem for persistent production attachments.

Keep supporting documents separate from trip cover photos and destination photographs. Supporting documents must not be displayed as public website images.

### Step 4: Student submits the proposal to DSA

The student reviews the completed proposal and its attachments. Provide a final preview before submission.

When the student selects **Submit to DSA**:

- Validate all required proposal fields.
- Validate that the required itinerary is complete.
- Validate all attachments.
- Save the submission and its attachment-version records together.
- Change the trip status to `pending_dsa`.
- Record the submission in `trip_approval_history` and `trip_submissions`.
- Make the proposal and submitted attachments visible in the DSA dashboard.

The proposal must not yet be visible to ordinary public visitors or students. The submitter retains proposal-editing access only when DSA requests changes; they do not yet have active Trip Coordinator permissions.

### Step 5: DSA reviews the proposal and decides who will coordinate it

DSA reviews the submitted information and supporting documents.

DSA can:

**A. APPROVE**

The trip status becomes `approved`.

As part of the approval workflow, DSA must assign one lead Trip Coordinator. By default, offer the proposal submitter as the lead. DSA may choose another verified, active Student if the submitter is unavailable, unsuitable or does not wish to continue. DSA may also assign one or more assistant Trip Coordinators.

Create active rows in `trip_coordinators` for the lead and assistants in the same transaction as the approval decision. Record the DSA user who made each assignment and the assignment timestamp. The assigned students receive Coordinator permissions only for this trip. Their account role remains `student`.

The approval record must include:

- DSA reviewer.
- Review date and time.
- Decision.
- Optional remarks.
- Assigned lead and assistants.

If no eligible lead can be assigned, do not complete the approval/publication transaction. Keep the proposal pending and explain that DSA must select an eligible Student.

**B. REQUEST CHANGES**

The trip status becomes `changes_requested`.

DSA must provide remarks explaining what needs correction.

The proposal submitter can edit the proposal, update supporting documents and resubmit it. No active Coordinator assignment is created merely because the proposal is in this state.

After resubmission, its status returns to `pending_dsa`. Preserve both the earlier submission and the new submission in the approval history.

**C. REJECT**

The trip status becomes `rejected`.

DSA must provide a reason. The proposal must not be published or opened for registration. No active Coordinator assignment is created. If the proposal had previously been approved and later rejected after re-review, end its active Coordinator assignments and retain their history.

### Step 6: Approved trip becomes public

After DSA approval and successful lead assignment, the trip becomes publicly visible.

Visitors and students can see:

- Trip title.
- Destination.
- Description.
- Dates.
- Total estimated cost.
- Estimated cost breakdown, if available.
- Safety information.
- Emergency information.
- Registration status.

Supporting proposal documents remain private. Do not expose private attachments through public trip pages or public APIs.

**DSA approval does NOT automatically open registration.** Approval and registration opening are separate actions.

The assigned lead and assistants can see the trip in their trip-specific Coordinator workspace. They do not become permanent Coordinator accounts.

### Step 7: Assigned Trip Coordinator opens registration

After DSA approval, the assigned lead Trip Coordinator or an authorised active assistant explicitly selects:

**OPEN REGISTRATION**

Before opening registration, the server must verify:

- DSA approval exists.
- An active lead assignment exists.
- Required trip information is complete.
- Required itinerary is complete.
- Required estimated cost breakdown is complete, subject to the source-data exception described below.
- Registration deadline has not passed.
- Trip is active and not completed or cancelled.
- Participant limit is valid.

If any condition fails, registration must not open.

An active Trip Coordinator can also close registration manually. Every open/close action must be recorded with the user and timestamp.

### Step 8: Students request to join and assigned Trip Coordinators review requests

Students can request to join only when:

- The trip is DSA-approved.
- Registration is explicitly open.
- The registration deadline has not passed.
- The trip is active and not completed or cancelled.
- Capacity remains available.

Students submit a joining reason, confirm availability, trip rules and estimated cost, and attach a mandatory parent/guardian consent letter (PDF, JPG/JPEG or PNG). Identity fields are taken from their verified profiles. Validate and store the letter privately before completing the request transaction; a missing/invalid upload must not reserve a seat. Prevent duplicate active requests and enforce the first-come, first-served capacity check in a transaction.

The lead or an active assistant Trip Coordinator reviews requests and their consent letters, requests correction when a letter is unreadable or incomplete, and can approve or reject each valid request immediately. A correction request does not automatically reject the pending request or release its reserved slot; require a valid letter before participant approval. The student can replace the letter and the Coordinator can review the updated version. **If the student does not correct an invalid or incomplete letter, the Coordinator may reject the pending request with a recorded reason; the request cannot be approved without verified consent.** Rejecting frees its held slot, but never automatically opens registration to someone else: the assigned Coordinator must explicitly click `Reopen Available Slot` and pass the normal checks. Do not invent an automatic 48-hour expiration or automatic rejection deadline. The system records which assigned student made the decision.

**Pending and approved join requests both occupy capacity slots.** Show pending and approved counts separately, and calculate available slots as `max_participants - count(pending + approved)`. The first eligible students whose valid requests are committed under the trip capacity lock receive the available slots (first come, first served); use `requested_at` and ID for display ordering, without relying on timestamps alone for concurrency control. Once all slots are occupied, reject new requests with a clear "Slots Full" message; if all are approved, show "Fully Booked". An active lead or assistant Coordinator may approve or reject pending requests immediately, even while registration remains open. Approval changes pending to approved without using another slot. Rejection or withdrawal frees a slot, but registration stays closed/full for new requests until the Coordinator explicitly clicks "Reopen Available Slot", subject to the deadline, DSA approval and all eligibility checks. Use a transaction with locking for submitting, re-requesting, approving, rejecting and withdrawing so concurrent requests cannot overbook.

### Step 8A: Final participant namelist and consent-package approval before departure

After the Coordinator has confirmed the planned participants, the active lead generates the finalized namelist strictly from `approved` participant records (exclude pending, rejected and withdrawn applicants). **The roster does not need to reach `max_participants` to be submitted or approved**: a 10-slot trip may have a valid DSA-approved final list of 8 or 9 confirmed students. Show both the approved headcount and the maximum, but never create filler entries or treat unfilled places as a validation failure. A final list must contain at least one actual approved participant unless DSA provides a documented alternative decision. Generate a private combined, paginated PDF containing a cover/namelist, followed by each approved student's most recently verified parent/guardian consent letter, clearly labelled by student. Convert supported image letters to PDF pages; incorporate uploaded PDFs without distorting them. Preserve original uploads and secure the generated package. Do not fabricate signatures, consent, or institutional endorsement.

The lead submits the package as a numbered, immutable version to DSA. DSA reviews the named participants and each associated letter, and must formally **approve**, **request corrections**, or **reject** the package, with dated remarks and an audit trail. A rejection or correction request does not revoke the underlying trip-proposal approval, but prevents the trip from being cleared to depart. DSA can download the exact submitted version. This step must be completed before departure: Sherubtse TripHub must display `Not cleared for departure` until the latest package matching the current approved participants is DSA-approved.

If an approved student withdraws, is replaced, or changes a consent document after final namelist approval, invalidate the previous final-list clearance, retain the earlier approved version as history, and require a new namelist/package and DSA approval. This applies even if no replacement is chosen: DSA must approve the **updated smaller roster** before departure. Do not automatically reopen a vacancy; keep the existing manual reopening and deadline rules. Prevent silent participant edits or silent departure clearance. Distinguish this separate platform clearance from the college's official Student Travel Form and any additional real-world institutional authorisation.

### Step 9: Approved students access trip details and assigned Trip Coordinators manage the trip

Approved students can access:

- Detailed itinerary.
- Announcements.
- Packing checklist.
- Their own contribution information.
- Their own attendance information.
- Other permitted trip details.

Unapproved students must not access restricted trip information.

Active Trip Coordinators manage attendance, expenses, contributions, announcements, packing suggestions and trip progress for their assigned trip only. The official Student Travel Form is available to active assigned Trip Coordinators using the dedicated workflow in this specification.

### Step 10: Trip ends, final report is submitted and the trip is archived

When the trip's end date has passed, automatically close registration and move the operational status to `awaiting_final_report`. The active lead and assistants may finish entering final attendance, expenses and contributions and prepare the final report.

The lead Trip Coordinator must submit a final report containing:

- Final attendance summary, based on the attendance records.
- Total actual expenses and a summary of expense records.
- Total student contributions and a summary of contribution records.
- Incidents or problems during the trip, or an explicit statement that none were reported.
- A summary of student feedback received by the time the report is submitted. If no feedback has been received yet, state that clearly rather than inventing feedback.
- Any additional relevant closing notes.

On successful submission, store the final report, set the trip status to `completed`, set its completion/archive timestamp, close registration and make ordinary trip management read-only. End all active lead and assistant assignments for that trip while preserving assignment history. Do not deactivate, delete or change the Student account of any former Trip Coordinator.

DSA and Superadmin can view completed-trip records. Former Trip Coordinators can view historical records for trips they coordinated but cannot edit them. Feedback submitted by eligible students after completion remains available in the feedback module; it does not silently alter the submitted final-report snapshot.

### Step 11: Feedback

After the trip end date has passed, eligible approved participants can submit ratings and feedback while the trip is awaiting its final report and after it is completed. Former Trip Coordinators can view feedback for trips to which they were assigned. The student's account remains a normal Student account regardless of whether they ever coordinate another trip.

### Step 12: Coordinator handover or reassignment

If the lead or an assistant cannot continue before completion:

- The assigned student can request a handover through the trip workspace, giving a reason.
- DSA reviews the request and decides whether to end the assignment, appoint a replacement or promote an existing assistant to lead.
- DSA can also initiate a reassignment when necessary.
- Only DSA can manually create, change or end assignment records. The system may automatically end active assignments when the final report is submitted and the trip is archived.
- End the previous assignment with the actor, timestamp and reason; never delete it.
- Create a new assignment row for the replacement student and record DSA as the assigning authority.
- Keep the trip's approval and attachment history intact. If a material proposal change is also required, apply the DSA reapproval rules separately.
- A replacement must be an active, verified Student account.

Do not allow a Coordinator to transfer permissions to another student directly or to leave an active trip without a DSA-reviewed handover.

# 6. IMPORTANT DSA APPROVAL RULES

These rules must be enforced in the backend, not just in the interface.

### A. Trip approval status

Use:

- `draft`
- `pending_dsa`
- `approved`
- `changes_requested`
- `rejected`

### B. Registration status

Keep registration separate from institutional approval.

Use:

`registration_open BOOLEAN DEFAULT FALSE`

An approved trip may still have registration closed. Only an active Trip Coordinator assigned to that trip may open or close registration, subject to the server-side checks.

### C. Trip Coordinator assignment

A Trip Coordinator is not a user role. The user's account role remains `student`.

After DSA approves a proposal, DSA must assign one active lead Student and may assign one or more active assistant Students. The proposal submitter is the default suggested lead, but DSA may assign another eligible Student. Assignment records must be stored in `trip_coordinators` and must include assignment role, assigning DSA user, assignment timestamp and any ending details.

Only DSA can manually create, reassign, promote, demote or end trip Coordinator assignments. The system may automatically end all active assignments as part of the completed-trip archival transaction. Superadmin cannot grant Coordinator permissions. A Student can have assignments on multiple trips. A user with no active assignment for a particular trip must not access that trip's Coordinator management functions.

When a material edit resets an already-approved trip for DSA review, keep its existing assignment history and active assignment unless DSA ends or changes it. Registration must close during re-review. Active assigned students may edit/resubmit the proposal as permitted, but no new student join request may be accepted while the trip is not in an approved/open state. If DSA rejects the trip, end its active assignments and retain the history.

### D. Public visibility

Only trips with:

`approval_status = 'approved'`

may appear in public trip listings and public trip detail pages.

Draft, pending-review, changes-requested and rejected proposals must remain private to the Student who submitted the proposal and authorised DSA reviewers. After approval, public trip information may be visible, but proposal attachments remain private.

### E. Registration eligibility

A join request is permitted only if all of the following are true:

- `approval_status = 'approved'`
- `registration_open = true`
- `is_active = true`
- `operational_status` is not `completed` or `cancelled`.
- Registration deadline has not passed.
- Capacity remains available.

Enforce this in database queries, models, controllers, middleware and API endpoints. Do not rely on hiding buttons.

### F. Material changes after approval

The following changes are considered material:

- Trip date.
- Destination.
- Trip purpose.
- Trip description.
- Transport arrangements.
- Participant limit.
- Total estimated cost.
- Estimated cost breakdown.
- Itinerary.
- Safety information.
- Emergency information.
- Material supporting-document changes.

If a material field or document changes after DSA approval:

1. Reset approval status to `pending_dsa`.
2. Set `registration_open = false`.
3. Record the changed fields or attachments.
4. Record an approval-reset event.
5. Require DSA review again.
6. Require an assigned lead Trip Coordinator or an authorised active assistant to explicitly reopen registration after approval is restored.

Minor spelling and formatting corrections do not need to reset approval. Implement this rule on the server.

### G. Approval and assignment history

Never overwrite previous DSA decisions or delete assignment history.

Maintain an immutable history of:

- Proposal submission.
- Submitted attachment versions.
- Approval.
- Rejection.
- Changes requested.
- Resubmission.
- Attachment additions or replacements associated with resubmission.
- Approval reset.
- Lead and assistant assignments.
- Assignment ending, handover and reassignment, including the DSA actor, reason and timestamps.
- Final report submission and trip completion.

### H. Trip completion and archive

When the end date has passed, close registration and move the trip to `awaiting_final_report`. Keep only the operations needed to finish attendance, expenses, contributions and the final report writable. Once the lead submits a valid final report, set the trip to `completed`, preserve a final-report snapshot, end all active assignments and make ordinary trip-management actions read-only. Do not deactivate any Student account.

# 7. OFFICIAL SHERUBTSE STUDENT TRAVEL FORM

This is a separate and important feature.

The file `Sherubtse_Student_Travel_Form.pdf` is the authoritative reference.

Read the complete PDF before implementing this feature.

Do not invent fields or institutional requirements. Preserve the original wording, field labels, instructions and structure as closely as reasonably possible.

The official form is not the same as the Sherubtse TripHub proposal form.

**DSA approval inside Sherubtse TripHub must not be treated as proof that the official travel form has been submitted, signed or accepted by the college.**

### A. Form generation

Allow an active lead or assistant Trip Coordinator to generate the official Student Travel Form for the trip to which they are assigned.

Use available information from:

- Trip record.
- Assigned lead Trip Coordinator's Student profile.
- Approved participant records.
- Relevant transport information.
- Driver and vehicle information, if available.
- Other information explicitly present in the official PDF.

Avoid asking the Trip Coordinator to enter information again when it already exists in Sherubtse TripHub.

The PDF reference includes fields relating to:

- Organiser name.
- Programme.
- Year.
- Contact.
- Travel date and time.
- Destination.
- Via/route.
- Vehicle type and number.
- Driver name and licence number.
- Student name.
- Student programme.
- Student year.
- Residence hall.
- Student destination.
- Organiser safety undertaking.
- Signature fields.

Inspect the PDF to confirm all fields and their exact labels. Do not assume this list is exhaustive.

### B. Missing information

If a required official-form field is not available in Sherubtse TripHub:

- Display it clearly as missing.
- Allow the active Trip Coordinator to enter the missing information where appropriate.
- Do not invent values.
- Do not fill unknown information with misleading placeholders that look official.

If some information is not applicable, handle it according to the original form's wording.

### C. Participants

Include only approved participants in the generated student list.

Do not include pending, rejected or withdrawn join requests as approved participants.

The generated form should clearly identify the trip and its relevant participants.

### D. Preview, download and print

Provide:

- A form preview.
- Download as PDF.
- Print option.

Preserve the official form's wording and layout as closely as technically possible. Do not add Sherubtse TripHub branding in a way that changes or misrepresents the official document.

### E. Signatures and institutional status

Do not generate fake signatures.

Do not automatically mark the form as signed, submitted or accepted.

Leave signature and official-authorisation fields for the appropriate people to complete.

Display a clear note in the interface that generating the form does not mean it has been officially submitted or approved.

After a trip is completed, former Trip Coordinators may view or download a previously generated form as part of the read-only historical record, but they must not alter the completed trip.

### F. Unclear travel-time instruction

The PDF includes a travel-time instruction referring to not planning travel before 05:00 AM and after 12:00 PM.

Its exact interpretation is unclear.

Do not automatically enforce this as a hard validation rule.

Record the ambiguity in `REFERENCE_NOTES.md` and ask for confirmation from DSA before implementing any automatic restriction.

# 8. STUDENT ACCOUNT REGISTRATION AND TRIP COORDINATOR ELIGIBILITY

All ordinary users who are students register as Students. The public signup form must contain no Coordinator option, no request-for-Coordinator-access option and no role selector.

The required college email suffix is:

`.sherubtse@rub.edu.bt`

For example:

`07270030.sherubtse@rub.edu.bt`

Validate the exact suffix on both frontend and backend. Require email verification before normal account access.

Every public signup creates:

`role = 'student'`

The server must ignore or reject any submitted role value that attempts to create a DSA, Superadmin or Coordinator account. A browser request must never be able to grant elevated permissions by editing form data.

A Trip Coordinator is a verified Student with an active trip-specific assignment created by DSA. A student does not apply for a permanent Coordinator role. The student selects **Organise a Trip** to submit a proposal. If DSA approves the proposal and assigns that student, the student receives Coordinator permissions for that trip only.

DSA may assign a different verified Student as lead, and may assign assistants, when appropriate. Students may coordinate multiple trips using the same account. Ending an assignment never changes or deactivates the Student account.

Do not provide public DSA or Superadmin signup. Create or manage those accounts through the protected administrative process and the configured seed/environment variables. Do not create any equivalent global Coordinator approval queue or account-level Coordinator request workflow.

Faculty or staff must not use the student trip-coordination workflow unless Sherubtse later defines and authorises a separate process. Do not invent such a process.

# 9. TECHNICAL STACK

Use the same stack and coding habits as Campus Eats.

Backend:
- Node.js.
- Express.js.

Frontend:
- EJS.
- HTML.
- CSS.
- Vanilla JavaScript.
- Fetch API.

Architecture:
- MVC.

Database:
- PostgreSQL using pg-promise.
- MongoDB native driver for feedback only.

Authentication:
- express-session.
- PostgreSQL session storage using connect-pg-simple.
- bcrypt for password hashing.

Other:
- Nodemailer.
- HTTPS email API mode for deployment.
- Multer for uploads.
- Jest.
- Supertest.
- Postman.
- Docker.
- GitHub Actions.
- Neon.
- MongoDB Atlas.
- Render.

Do not introduce React, Vue, Angular or another frontend framework.

Do not use an ORM.

Keep PostgreSQL queries inside model files.

Keep controllers responsible for request handling and business flow.

Keep EJS files responsible for rendering.

Keep frontend JavaScript separate from backend logic.

# 10. DATABASE DESIGN

Use PostgreSQL as the primary database.

Use pg-promise.

Create:

`db/schema.sql`

This file must contain all required SQL statements so I can execute the schema through pgAdmin's Query Tool.

Use proper primary keys, foreign keys, unique constraints, check constraints, indexes, defaults, timestamps and transactions.

Use `users.id` as the internal user primary key. Do not confuse the college student ID with the internal user ID. Use `user_id` for foreign keys referencing `users.id`.

### Required PostgreSQL tables

**A. users**

Include:

- id
- name
- email
- password_hash
- role
- student_id
- programme_id
- academic_year
- residence_hall
- phone
- avatar
- is_verified
- verification_token
- reset_token
- reset_token_expires
- is_active
- is_demo
- created_at

Allowed account-role values:

- `student`
- `dsa`
- `admin`

Use `admin` for Superadmin. Set public student signup to `student` by default. Do not add a `coordinator` user role. Do not add a Coordinator-access-request table.

**B. programmes**

Include:

- id
- code
- name
- is_active

**C. destinations**

Include:

- id
- name
- slug
- dzongkhag
- description
- best_season
- transport
- transport_cost_min
- transport_cost_max
- entry_fee_note
- distance_text
- drive_time_text
- trek_time_text
- travel_note
- practical_tip
- is_trek
- is_active
- created_at

**D. destination_photos**

Include:

- id
- destination_id
- file_path
- alt_text
- photo_credit
- sort_order

**E. trips**

Include:

- id
- proposed_by_user_id (the Student who created/submitted the proposal; not a Coordinator role)
- destination_id
- title
- purpose
- description
- meeting_point
- meeting_time
- start_date
- end_date
- registration_deadline
- registration_open
- vacancies_held_closed (or an equivalent auditable manual reopening gate; default false)
- max_participants
- estimated_cost
- estimated_budget_note
- cover_photo
- transport information
- safety information
- emergency contact name
- emergency contact phone
- approval_status
- operational_status
- dsa_reviewed_by
- dsa_reviewed_at
- dsa_remarks
- is_sample
- is_active
- created_at
- updated_at
- completed_at
- cancelled_at (nullable)
- cancellation_reason (nullable; private/audited)

Use a separate `registration_open BOOLEAN DEFAULT FALSE`.

Use `operational_status` values such as:

- `planned`
- `ongoing`
- `awaiting_final_report`
- `completed`
- `cancelled`

Keep `approval_status`, `registration_open`, `operational_status` and `is_active` separate. DSA approval does not automatically open registration. A completed trip must be read-only for ordinary trip management.

Use appropriate constraints:

- End date must not be before start date.
- Participant limit must be greater than zero.
- Estimated cost must not be negative.
- `proposed_by_user_id` must reference a Student account.

**F. trip_coordinators**

This is the trip-specific assignment table. It replaces a permanent Coordinator user role and any Coordinator access-request table.

Include:

- id
- trip_id
- user_id
- assignment_role (`lead` or `assistant`)
- status (`active` or `ended`)
- assigned_by (DSA user ID)
- assigned_at
- ended_by (nullable DSA user ID; null when the system automatically ends the assignment on trip completion)
- ended_at
- end_reason

Rules:

- `user_id` must reference an active, verified Student account.
- `assigned_by` must reference a DSA account.
- Only one active lead may exist for a trip.
- A student may have active assignments on multiple trips.
- A student may have at most one active assignment row for the same trip.
- Do not delete assignment rows. End old rows and create new rows during handover/reassignment.
- Use a partial unique index for one active lead per trip and one active trip/user assignment.
- DSA is the only role allowed to manually create, change or end assignment records; the system may automatically end active assignments during final-report archival.
- Ending the assignment does not deactivate or change the Student account.

The assignment rows and their timestamps/actors/reasons form the permanent assignment history. If a separate event-history table is needed to preserve every assignment change, create it and document why.

**G. trip_cost_items**

These are estimated cost breakdown items entered during proposal preparation.

Include:

- id
- trip_id
- label
- amount
- sort_order

The estimated cost breakdown is not the same as actual expenses.

Do not invent cost-item allocations for sample trips when the source document provides only a total.

For newly created trips, the lead Trip Coordinator must enter an estimated breakdown before opening registration. The breakdown total must match the estimated cost, or the lead must explicitly confirm and explain the difference.

Existing source-based sample trips with no source breakdown are exempt and must show a note that no detailed breakdown was provided.

**H. trip_attachments**

Create a separate table for supporting documents uploaded with trip proposals.

Include appropriate fields for:

- id
- trip_id
- submission_id, when associated with a submitted proposal version
- uploaded_by
- original_filename
- document_title
- description
- storage_key or file_path
- detected_mime_type
- file_size
- upload timestamp
- active or superseded status

Preserve the attachment versions submitted to DSA. Do not store file contents directly in PostgreSQL.

**I. trip_submissions**

Create a submission/version table so each DSA review is linked to the exact proposal and attachment versions submitted at that time.

Include:

- id
- trip_id
- submitted_by
- submission_number
- submitted_at
- proposal_snapshot or a clearly documented equivalent version reference

Associate each submitted attachment version with the correct submission. Do not silently replace previously reviewed files.

**J. trip_approval_history**

Include:

- id
- trip_id
- submission_id, where applicable
- submitted_by
- reviewed_by
- action
- changed_fields
- remarks
- created_at

Actions should include:

- submitted
- approved
- changes_requested
- rejected
- resubmitted
- approval_reset

Maintain immutable history.

**J1. participant_consent_documents (individual join-request attachments)**

Create a separate private document/version table linked to a participant request, not to the trip-proposal supporting documents. Include id, trip_id, participant_id, student_user_id, original_filename, storage_key, detected_mime_type, file_size, uploaded_at, version_number, uploaded_by, verification_status (`pending_review`, `verified`, `correction_requested`), reviewed_by, reviewed_at, reviewer_note and is_current. Preserve historical versions. Do not treat an upload as proof that consent is genuine or as an official college approval; Coordinators check the submitted document. Never expose these files through public URLs.

**J2. final_participant_submissions and final_participant_review_history**

Store an immutable final-list submission version with trip_id, submitted_by (active lead), submission_number, submitted_at, snapshot of approved participant IDs/names and corresponding consent-document version IDs, private combined PDF storage key, a content hash/checksum, review_status (`pending_dsa`, `approved`, `changes_requested`, `rejected`, `superseded`), reviewed_by (DSA), reviewed_at and review remarks. Record each DSA review decision and supersession/invalidation reason in an append-only history table. Only the DSA role may decide. Ensure database constraints and transactions cannot treat an out-of-date snapshot as current departure clearance. Approve a snapshot of the actual confirmed participants even when its count is below the trip limit; do not require `approved_count = max_participants`. When an approved participant leaves after clearance, invalidate the old snapshot even if no replacement is added.

**K. participants**

Include:

- id
- trip_id
- user_id
- reason
- status
- requested_at
- withdrawn_at
- withdrawal_reason
- reviewed_by (assigned Student user ID)
- reviewed_at
- decision_note
- consent_status (derived from the current linked consent document; avoid duplicating document truth)

Statuses:

- pending
- approved
- rejected
- withdrawn

Use a unique constraint on trip and user. A withdrawn student may request again before the authorised deadline by updating the same row, but only if an assigned Coordinator has explicitly reopened a vacancy and all normal eligibility checks pass.

Pending and approved requests each count as one occupied slot for registration capacity. Confirmed participant counts include only approved requests. A rejected or withdrawn request occupies no slot; reopening a vacancy for new applications requires an explicit assigned-Coordinator action. A correction-requested consent letter keeps the request pending and its slot occupied until corrected, self-withdrawn or explicitly rejected by an assigned Coordinator. There is no automatic correction timeout.

**L. itineraries**

Include:

- id
- trip_id
- day_number
- start_time
- title
- description
- is_completed

**M. expenses**

Include:

- id
- trip_id
- category
- description
- amount
- spent_on
- recorded_by

Categories:

- transport
- accommodation
- food
- activities
- other

These are actual recorded expenses, not estimated proposal costs.

**N. contributions**

Include:

- id
- trip_id
- user_id
- amount
- paid_on
- note
- recorded_by

**O. packing_suggestions**

Include:

- id
- trip_id
- name
- quantity

**P. packing_items**

Include:

- id
- trip_id
- user_id
- name
- quantity
- is_packed

**Q. attendance**

Include:

- id
- trip_id
- user_id
- attendance_date
- status
- recorded_by

Statuses:

- present
- absent
- late
- excused

Use a unique constraint on trip, user and attendance date.

**R. announcements**

Include:

- id
- trip_id
- author_id
- title
- body
- is_important
- created_at

**S. trip_final_reports**

Create one final report per completed trip.

Include:

- id
- trip_id (unique)
- submitted_by (lead Trip Coordinator)
- submitted_at
- final_attendance_summary
- total_actual_expenses
- expense_summary
- total_student_contributions
- contribution_summary
- incident_report (must explicitly say none reported if applicable)
- feedback_count_at_submission
- feedback_summary_at_submission
- additional_notes
- archived_at

The final report must capture a stable snapshot of the relevant attendance, expense, contribution and feedback information at submission. Do not invent incidents or feedback. If no feedback has been received yet, state that clearly. Later student feedback remains available in the feedback module but must not silently rewrite the submitted report.

After a valid final report is submitted, set the trip's operational status to `completed`, close registration, set completion/archive timestamps, end all active `trip_coordinators` rows and make ordinary trip management read-only.

**T. Content tables**

Create simple editable tables for:

- FAQs.
- Trip rules.
- Testimonials.

Include sort order and suitable text fields. Mark sample testimonials clearly.

**U. Session table**

Create the standard table required by connect-pg-simple:

- sid
- sess
- expire

Enforce rules with CHECK constraints, foreign keys, indexes and suitable delete behaviour in the database, not only in code.

Use transactions for approval plus initial assignment creation, handover/reassignment, participant approval, final-report submission, assignment ending and trip archival. Do not permit an assignment to be active for a completed/cancelled trip.

# 11. MONGODB DATABASE

Use MongoDB only for trip feedback.

Database:

`sherubtse_triphub_feedback`

Collection:

`feedback`

Each document should include:

- tripId
- studentId
- studentName
- rating
- comment
- createdAt

Do not attach feedback to one individual Trip Coordinator because one trip may have a lead and multiple assistant Trip Coordinators. The relationship between a student and the trip's active/former Trip Coordinators is checked against PostgreSQL's `trip_coordinators` table.

The IDs are plain numbers copied from PostgreSQL, not real foreign keys. Explain this trade-off in one sentence.

`config/mongo.js` must expose `connectMongo()`, keep one connection alive and reuse it, and be called once when the server starts.

`models/Feedback.js` should provide functions such as:

- `createFeedback(...)`
- `getFeedbackForTrip(tripId)`
- `getFeedbackForTrips(tripIds)`
- `getFeedbackByStudent(studentId)`

No function may return every document in the collection. The controller must first verify that the requesting Student is an eligible participant or that the requesting user has an active or historical Trip Coordinator assignment for the requested trip. Do not trust trip or user IDs submitted by the browser.

# 12. SOURCE DATA AND DEMO CONTENT

Use `TripPack.docx` as the source of truth.

### Destinations

Use the six destinations:

1. Chorten Kora (Trashiyangtse).
2. Bumdeling Wildlife Sanctuary (Trashiyangtse).
3. Merak Village (Trashigang).
4. Sakteng Village (Trashigang).
5. Dangling Tsho (Trashigang; trek).
6. Takila / Guru Nangsa Zelnen statue (Lhuentse).

For each, load every field from the source document:

- Description.
- Best season.
- Transport.
- Estimated transport cost range per student.
- Entry fee wording.
- Distance from Sherubtse.
- Drive time.
- Trek time, separately from drive time.
- Road-access notes.
- Practical tip.

Use "No standard entry fee listed" where the source says no standard fee is listed.

Show the source document's caution that transport costs are preliminary estimates.

Show seasonal warnings where supported by the document. For example, Dangling Tsho is traditionally closed December to March, and Bumdeling cranes are present in winter.

### Five source sample trips

Use the five trips exactly as provided in `TripPack.docx`:

1. Eastern Bhutan Cultural and Nature Tour: Chorten Kora and Bumdeling, 12–13 March 2027, 6:30 AM, Nu. 1,800, limit 20.
2. Merak Highland Cultural Adventure: 9–11 April 2027, 5:30 AM, Nu. 3,500, limit 15.
3. Sakteng Highland Adventure: 23–25 April 2027, 5:00 AM, Nu. 4,000, limit 12.
4. Dangling Tsho Sacred Lake Trek: 7–10 May 2027, 5:30 AM, Nu. 5,000, limit 10. Clearly note that the trek plan is a proposal, not a confirmed route.
5. Takila Spiritual and Cultural Journey: 26–28 March 2027, 5:00 AM, Nu. 4,500, limit 20.

All are from Sherubtse College main entrance.

Trip 1 links to Chorten Kora. Include Bumdeling in its itinerary and description. Its card may show both destination photographs.

Set registration deadlines for these sample trips to 14 days before the start date.

Mark them `is_sample = true` and show a small "Sample trip" label.

The source document provides only a total estimated cost per trip. Do not invent a cost breakdown or create artificial `trip_cost_items` for these five trips.

Show the source-provided total estimated cost and this note:

"Detailed cost breakdown not provided in the source material."

An active lead Trip Coordinator may add a genuine estimated breakdown to a sample trip later. If this is a material change after approval, the DSA reapproval rule applies.

### Additional demonstration trips

Because the fixed source sample dates may be in the past, create two additional clearly labelled demonstration trips with dates calculated relative to the seed date:

1. "Sample: registration closed": deadline passed yesterday, start date 10 days ahead and several pending requests.
2. "Sample: completed": ended 14 days ago with approved students, attendance records, contributions and actual expenses, so the feedback flow can be demonstrated.

Reuse Chorten Kora for these demonstrations.

### Demo users

Use the twelve fictional demo users from the source document.

The two users originally designated as Coordinators must now be ordinary Student accounts used to demonstrate trip-specific assignments:

- Karma Wangchuk, `07240001.sherubtse@rub.edu.bt`, programme DSDA.
- Pema Choden, `07240002.sherubtse@rub.edu.bt`, programme Economics, IDs TC-001 and TC-002.

Preserve their names, emails, programmes and supplied student IDs exactly. Do not give either user a permanent Coordinator account role. Create Student accounts for all twelve source demo users, including Karma and Pema.

Use the ten other students from the document with their original programmes, IDs and emails.

Create sample `trip_coordinators` assignments so the demo clearly shows:

- One of these students as lead Trip Coordinator for an approved sample trip.
- The other as an assistant for that same trip, demonstrating multiple Coordinators on one trip.
- At least one of them as lead for another approved sample trip, demonstrating that one Student can coordinate multiple trips with the same account.
- Ended assignment history for the sample completed trip, demonstrating that completion ends the assignment but does not deactivate the Student account.

All demo users must have:

- `role = 'student'`
- `is_demo = true`
- `is_verified = true`
- Fictional avatars.
- A shared password supplied through `DEMO_PASSWORD`, hashed with bcrypt.
- No emails sent to their addresses.

Create one Superadmin from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

Create one separate demo DSA account from `SEED_DSA_EMAIL` and `SEED_DSA_PASSWORD`.

The DSA account is additional to the twelve source demo users and Superadmin.

Never invent credentials or print real passwords in logs or documentation.

Spread join requests across trips so dashboards demonstrate pending, approved, rejected and withdrawn states. Include examples where the lead or assistant reviewed a join request, and record the acting Student user ID.

Show pending requests separately from confirmed approved participants; both occupy registration slots, but only approved participants count as confirmed travellers.

### Other content

Include the four testimonials, clearly labelled "Sample testimonial" and never attributed to real students.

Include the eight FAQs, five trip rules, safety guidelines and emergency numbers from the source document.

The emergency numbers listed are Police 113, Ambulance 112 and Fire and rescue 110. Include a README note to verify these before publishing.

# 13. AUTHENTICATION, EMAIL VERIFICATION AND PASSWORD MANAGEMENT

Implement a complete account lifecycle, with real functional EJS pages/forms, Express routes, validation, database operations, email delivery and automated tests:

- One public Student signup flow.
- Email verification through a one-time expiring verification link.
- Resend verification email for unverified accounts (including expired links).
- One shared login form for Student, DSA and Superadmin.
- Logout.
- Forgot password (request reset link).
- Reset password (new password with a one-time token).
- Change password from the logged-in profile/account-security page.
- Secure session management with PostgreSQL-backed sessions and account-role-based redirects.

**Signup and role rules:** Public signup creates only a Student account and validates the exact college email suffix on both frontend and backend. Do not display any Student/Coordinator choice or role selector. Set `role = 'student'` server-side regardless of form fields. DSA and Superadmin accounts are provisioned only through authorised administration/seed configuration, never public signup. A Student becomes a Trip Coordinator only through an active assignment for a particular trip in `trip_coordinators`; there is no permanent Coordinator account role, signup option or approval queue.

After login, redirect based on the account's stored role to `/student/dashboard`, `/dsa/dashboard`, or `/admin/dashboard` (labelled **Superadmin** in the UI). A Student with active trip assignments remains a Student, with a **My Coordinating Trips** link on their dashboard. Students without active assignments must not access Coordinator-only pages.

**Login:** Use the same generic error, `Incorrect email or password`, for invalid credentials; do not leak account existence. Reject unverified or inactive accounts with safe, actionable messages that do not expose sensitive information. Regenerate the session on successful login, use secure session cookies and rate-limit authentication routes. Support logout via a CSRF-protected POST that destroys the session and clears the cookie.

**Verification and resend:** Normal public Student accounts must verify their email before login. Use random cryptographically secure, single-use, expiring verification tokens; store only token hashes and invalidate older tokens when new ones are issued. Provide a `Resend verification email` option on the verification-pending/login experience. Return a generic result whether an address is unknown, already verified or awaiting verification; rate-limit requests and add a resend cooldown to prevent abuse. Never auto-verify genuine public signups, including on public production deployments.

**Forgot password:** Use a `Forgot password?` link on the login page. Accept an email and always show the same neutral confirmation whether an account exists or not. Apply rate limiting. Allow valid, active Student, DSA and Superadmin accounts to recover access using their email address; never create accounts or change account roles through password recovery.

**Reset password:** Send a reset link using the configured `sendMail()` function, containing a strong random single-use token with a one-hour expiry. Store only a hash of the token in PostgreSQL, and validate expiration and prior use on the server. The reset form must ask for `New password` and `Confirm new password`, validate the password policy and their match, hash the new password with bcrypt, clear the reset token, and invalidate all existing login sessions for that account after success. Expired, malformed or previously used links must fail safely and offer another reset request. Do not include passwords or full reset tokens in production logs.

**Change password while logged in:** Add `Account Settings → Security → Change Password` for Student, DSA and Superadmin. Require current password, new password and confirmation; verify the current password using bcrypt, enforce the same password policy, reject reuse of the current password, hash and save the new password, and invalidate other active sessions (or all sessions with a clear re-login message). Rate-limit attempts. Changing a password must not alter roles, trip assignments or any trip data.

**Password policy:** Choose and document one beginner-friendly, reasonable minimum-length policy, consistently enforced in signup, reset and change password. Avoid excessive complexity rules. Use generic error messages that do not reveal sensitive account state and never expose plaintext passwords.

**Email delivery:** Use the existing three email modes (`smtp` local, HTTPS `api` for deployment, `log` for controlled local demos). All verification, resend and recovery emails must use `config/mailer.js` and the shared `sendMail()` function. Send links using validated `APP_URL`; do not let browser-supplied hosts or redirects become email-link destinations. Show an informative status if sending fails without misleading the user about delivery.

**Testing and documentation:** Test successful and denied flows for all three roles, wrong/expired/reused tokens, invalid current password, mismatch of new passwords, resend cooldown, email-enumeration-resistant responses, session invalidation, auth rate limits, and unverified-account access. Explain account setup, email verification, resend, forgot/reset and change-password steps in the README and Word guide. Never commit real credentials or tokens.

# 14. SECURITY AND AUTHORIZATION

Implement middleware and permission helpers:

- `requireAuth`
- `requireStudent`
- `requireDsa`
- `requireSuperadmin`
- `requireTripCoordinator` (requires an active assignment for the specific trip ID)
- `requireLeadTripCoordinator` (requires the active lead assignment for the specific trip)
- `requireProposalOwner` (allows the Student who created a draft or changes-requested proposal to manage that proposal only)
- `requireApprovedParticipant`
- A read-only historical-trip access check for former Trip Coordinators where appropriate.

Use the database role `admin` for Superadmin. The only account roles are `student`, `dsa` and `admin`. Do not create a global Coordinator account role or account-role middleware for Coordinator permissions; use only the trip-scoped assignment checks defined above.

Apply permissions to:

- Page routes.
- API routes.
- File uploads.
- File downloads.
- CSV exports.
- Proposal attachments.
- Final reports.
- Direct URLs.

Do not trust IDs, assignment roles or permissions submitted by the browser. The authenticated account role comes from the session/database. Trip Coordinator permissions must be confirmed by querying an active `trip_coordinators` assignment for the requested trip and verifying that the Student account is still active and email-verified. The acting user ID for an approval, expense, attendance or announcement must come from the authenticated session.

Only DSA can manually create, change, reassign or end Trip Coordinator assignments. The system may automatically end all active assignments as part of the final-report archival transaction. Only DSA can make institutional trip approval decisions. Superadmin cannot bypass DSA approval or grant Coordinator assignments.

A Student can manage only their own draft or changes-requested proposal before approval. A Student with an active lead/assistant assignment can manage only the trip or trips named in those active assignments. A Student cannot manage another student's trips or access unrelated proposal attachments.

When a Trip Coordinator assignment ends, deny all write operations for that trip. If the student had an assignment history for that trip, allow only the read-only historical pages explicitly permitted by this specification. A completed trip is read-only even for its former lead and assistants. If Superadmin deactivates a Student who has active trip assignments, immediately deny that account access, automatically close registration on affected trips and flag them for DSA review/reassignment. Do not automatically grant another Student Coordinator permissions; DSA must decide the replacement.

A Student can access only their own private packing items, contributions and attendance. A student who is not an approved participant must not access restricted trip details, including through direct URLs or API requests.

Use parameterised SQL queries only.

Use `db.tx` for operations involving multiple writes that must succeed together.

Add Helmet, rate limiting and CSRF protection.

Use secure session cookies:

- `httpOnly`.
- `sameSite = lax`.
- `secure` in production.
- PostgreSQL session storage.
- Regenerate the session on login.
- Set `trust proxy` appropriately in production.

Escape user-generated text in EJS.

Never expose secrets, passwords, reset tokens, session IDs or cookies in logs.

# 15. FILE UPLOADS AND STORAGE

Use Multer.

Keep different upload types separate.

### A. Public image uploads

For trip cover photographs and destination photographs:

- Allow JPG, PNG and WEBP.
- Maximum 2 MB per image.
- Validate actual file type.
- Use random file names.
- Never use the original filename as the storage path.
- Store images locally during development.
- Use Cloudinary or another clearly documented cloud object-storage provider in production.

### B. Proposal supporting documents

For supporting documents uploaded by the Student who prepares a trip proposal:

- Allow PDF, DOC, DOCX, JPG, JPEG and PNG.
- Use a reasonable configurable file-size limit, with a default of 10 MB per file.
- Allow multiple attachments, with a reasonable configurable maximum.
- Validate actual file type on the server.
- Generate random storage names.
- Keep files private.
- Provide authorised viewing and downloading for DSA and, after approval, the active lead/assistant Trip Coordinators assigned to that trip. Before approval, the proposal submitter may access their own draft files.
- Preserve submitted versions.
- Do not expose attachments through public URLs.

### C. Parent/guardian consent letters and finalized DSA packages

- The request-to-join form must accept exactly one current consent letter per applicant, with corrected versions retained in private history. Accepted formats: PDF, JPG/JPEG and PNG. Use a configurable default maximum of 10 MB per letter; validate file signatures and PDF structure, not just extension or browser MIME type.
- Require the letter with every new join request before reserving a capacity slot; where seeded demonstration records lack real letters, mark them explicitly as demo-only and ineligible for real departure clearance.
- Only the student who uploaded a letter, the active assigned lead/assistant Coordinator for that trip, and authorised DSA reviewers may view it; after trip archive, apply documented read-only/historical permissions. Superadmin platform maintenance is not blanket authority to read consent contents.
- Coordinator can mark a letter verified or request correction with a reason; approval of the student's participation requires the current letter to be verified. A student may replace a rejected/unreadable letter, keeping prior versions for audit.
- Keep consent letters separate from the Student Travel Form and from proposal supporting documents; consent documents and final namelist packages use private persistent storage, time-limited authorised downloads, and careful log/export redaction.
- Generate the combined PDF server-side from verified consent versions for `approved` participants only, with the namelist first. If a source cannot be safely incorporated, block package submission and show exactly which letter requires correction. Provide a preview and downloadable copy only to authorised users; avoid new heavy dependencies unless essential and document why.

Do not silently fall back to Render's temporary filesystem for production files.

Keep the storage interface simple and reusable.

# 16. EMAIL MODES AND ENVIRONMENT VARIABLES

I will enter all real emails, passwords and keys myself.

Never invent or hardcode real-looking credentials.

Everything secret or environment-specific must come from `.env`.

Include and document:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `DB_SSL`
- `MONGO_URI`
- `SESSION_SECRET`
- `APP_URL`
- `NODE_ENV`
- `EMAIL_MODE`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_PROVIDER`
- `EMAIL_API_KEY`
- `EMAIL_FROM`
- `DEMO_MODE`
- `ALLOWED_EMAIL_SUFFIX`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_DSA_EMAIL`
- `SEED_DSA_PASSWORD`
- `DEMO_PASSWORD`
- `STORAGE_MODE`
- Cloud storage credentials required by the chosen provider.

Default `ALLOWED_EMAIL_SUFFIX` to `.sherubtse@rub.edu.bt`.

Commit `.env.example` and `.env.test` with clearly fake placeholders and comments.

Put `.env` and uploads in `.gitignore`.

In production, stop with a clear error if a required variable is missing or still a placeholder.

The seed script must never run in production.

Validate production storage variables at startup.

### Email modes

Use three modes:

- `smtp`: Gmail through Nodemailer for local development.
- `api`: HTTPS email service for deployment, using Resend or Brevo and Node's built-in fetch.
- `log`: no email is sent; verification and reset links are printed in development logs and a banner says "Demo mode: email is off".

Do not allow `log` mode or automatic email verification on a publicly accessible production deployment, even when `DEMO_MODE=true`. If a controlled non-public demo environment uses `log`, state that clearly, restrict access and never auto-verify real public signups.

Use `config/mailer.js` to select the mode. Other code should call one `sendMail()` function.

Ask me which HTTPS email provider I prefer during Step 0 and explain any sender-verification requirements in simple language.

Document all modes in the setup guide.

# 17. FOLDER STRUCTURE AND MVC

Follow the structure and conventions of Campus Eats.

Use a clean MVC structure similar to:

```text
sherubtse-triphub/
├── config/
│   ├── db.js
│   ├── mongo.js
│   ├── mailer.js
│   └── storage.js
├── controllers/
├── middleware/
│   ├── auth.js
│   ├── upload.js
│   ├── tripAccess.js
│   └── csrf.js
├── models/
├── routes/
│   ├── index.js
│   └── api.js
├── views/
│   └── partials/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── uploads/
├── db/
│   ├── schema.sql
│   ├── seed.js
│   └── seed-data.json
├── scripts/
│   └── extract-photos.js
├── tests/
├── docs/
├── app.js
├── server.js
├── Dockerfile
├── .env.example
└── README.md
```

Add model files for all relevant PostgreSQL tables, including `TripApproval.js` for submissions and DSA decisions, `TripCoordinator.js` for trip-specific lead/assistant assignments and handovers, `TripFinalReport.js` for final reports and archival, and a model for proposal attachments and submission versions.

Every model file owns the queries for its table or collection and exports plain functions.

Controllers must never write SQL or MongoDB queries.

Keep `app.js` thin.

Do not create unnecessary abstractions or duplicate functionality.

# 18. DESIGN AND USER EXPERIENCE

The website must look like a professionally designed college trip platform.

Do not create a generic AI-generated dashboard.

Use a consistent design system.

The visual direction should combine:

- A professional public travel website.
- Clean and functional management dashboards.
- A modern college-oriented visual identity.
- A calm, organised and trustworthy interface.

### Public website

Include:

- Professional landing page.
- Attractive hero section.
- Destination photography.
- Clear navigation.
- Upcoming approved trips.
- Destination cards.
- Useful information sections.
- College identity.
- Footer with useful links.

### Dashboards and role-aware navigation

**Student dashboard — available to every student account**
- My Trips.
- Join Requests.
- Upcoming Trips.
- Packing Checklist.
- Announcements.
- Organise a Trip.
- My Proposals and DSA Review Status.
- My Coordinating Trips, shown when the student has active trip assignments.

**Trip Coordinator workspace — a trip-specific view inside the Student experience**
- Only show trips for which the student has an active lead or assistant assignment.
- Show the student's assignment type for each trip.
- Trip Proposals and DSA Review Status where the student is authorised.
- Supporting Documents.
- Join Requests.
- Attendance.
- Expenses.
- Contributions.
- Official Travel Form.
- Feedback.
- Final Report for the lead Trip Coordinator.
- Handover request.

Do not create a separate permanent Coordinator account dashboard or global Coordinator role. A Student may enter the workspace for one assigned trip and have no Coordinator access to another trip.

**DSA dashboard**
- Pending Proposals.
- Approved Trips.
- Changes Requested.
- Rejected Proposals.
- Upcoming Approved Trips.
- Review History.
- Active Trip Coordinator Assignments.
- Handover and Reassignment.
- Completed Trip Reports.

**Superadmin dashboard**
- Users.
- DSA Accounts.
- Destinations.
- Programmes.
- Trips.
- Trip Assignment Oversight and History (view only; DSA remains responsible for assignments).
- Content Management.

### Design rules

- Use a consistent colour palette.
- Use clear typography.
- Use a proper spacing system.
- Use CSS Grid and Flexbox appropriately.
- Use responsive layouts.
- Use consistent buttons and form controls.
- Use clear status indicators.
- Use readable tables.
- Use meaningful empty states.
- Use loading indicators.
- Use useful error messages.
- Use confirmation dialogs for destructive actions.
- Use toast messages for successful actions.
- Maintain consistent navigation.
- Make all forms easy to understand.
- Keep important actions visible.
- Avoid unnecessary decoration.
- Avoid excessive shadows and gradients.
- Avoid overcrowded dashboards.
- Avoid unnecessarily large cards.
- Avoid inconsistent spacing.

Use a grid-based layout system. Do not simply place elements randomly using margins. Use proper alignment, spacing, columns and visual hierarchy.

### Colour palette

Use CSS variables in `public/css/styles.css`:

- Warm off-white: `#FBF7EF`
- Deep maroon: `#7A1F2B`
- Saffron/gold: `#D9A21B`
- Forest green: `#2F6B4F`
- Sky blue: `#4A90B8`
- Dark ink: `#2B2320`
- Stone grey for borders.

Maintain WCAG AA contrast.

Use a thin traditional-pattern border inspired by Bhutanese textiles and dzong woodwork. Do not use the national flag, royal emblem, Druk or any official state symbol.

Use system fonts with one serif accent for headings and a Dzongkha-capable fallback font.

Show "Kuzuzangpo la" on dashboards.

### Responsiveness and accessibility

The application must work on desktop, laptop, tablet and mobile.

Test at a minimum width of 360px.

On mobile:

- Navigation must work.
- Tables must remain usable.
- Cards must stack properly.
- Forms must fit the screen.
- Buttons must be easy to tap.
- No horizontal overflow should occur.

Use semantic HTML, labelled controls, appropriate contrast, keyboard navigation, alt text, visible focus states and accessible dialogs and notifications.

Every visible button, link, form, dropdown and interactive control must work. Do not leave decorative controls pretending to be functional.

# 19. PUBLIC WEBSITE FEATURES

### Landing page

Include:

- Hero section using the Sakteng destination photograph.
- Sherubtse TripHub tagline.
- Three-step "How it works".
- Six destination photo cards.
- Upcoming DSA-approved trips.
- Seat counters based only on approved participants.
- Trip comparison table.
- Sample testimonials, clearly labelled.
- Short FAQ preview.
- Sign-up buttons.

### Destinations

Create a Destinations gallery and individual destination detail pages.

Display:

- Photograph with lightbox.
- Dzongkhag.
- Description.
- Best season.
- Seasonal warnings.
- Transport.
- Estimated transport cost range.
- Entry fee wording.
- Distance.
- Drive time.
- Trek time separately.
- Practical tip.
- Travel note.
- Upcoming trips to that destination.

Show transport cost ranges as preliminary estimates that should be confirmed locally.

Include a comparison table for all six destinations and a compare-by-budget sort.

### Trip discovery

Create:

- Search box.
- Filter by destination.
- Filter by Dzongkhag.
- Filter by month.
- Filter by cost range.
- Filter by status.

Statuses may include open, closing soon, closed, fully booked, ongoing and completed.

Trip cards should show:

- Cover photograph.
- Title.
- Destination and Dzongkhag.
- Dates.
- Estimated cost per student.
- Approved participant count.
- Available slots, counting pending and approved requests as occupied; show the approved count separately.
- Meeting point and time.
- Registration status.
- Register for Trip action where permitted.

Only DSA-approved trips may appear publicly.

Show pending requests separately from approved participants. Both occupy registration slots, but only approved students are confirmed travellers.

### Help Centre

Include:

- FAQ accordion.
- Trip rules and safety guidelines.
- Emergency numbers.
- Sherubtse TripHub support contact.
- About page.
- Photo credits.
- Friendly 404 and 500 pages.
- Favicon.
- Proper page title on every page.

# 20. COORDINATOR FEATURES

Create a **trip-specific Trip Coordinator workspace** that is available to a Student only when that student has an active assignment for the selected trip. Do not create a permanent Coordinator account type or a separate public Coordinator registration process.

### Student proposal management

Every verified Student can select **Organise a Trip** and prepare a proposal. Before DSA approval, the student is the proposal submitter, not an active Trip Coordinator. The submitter can:

- Create a trip proposal.
- Edit their own draft or changes-requested proposal.
- Select a destination.
- Prefill relevant destination information where appropriate.
- Upload a cover photograph.
- Enter trip details.
- Enter estimated costs.
- Enter estimated cost breakdown items.
- Set participant limits.
- Set registration deadlines.
- Enter emergency contact information.
- Create the proposed itinerary.
- Preview the proposal.
- Upload multiple supporting documents.
- Add a title and description to each attachment.
- Review and download their own draft attachments.
- Submit the proposal and attachments to DSA.
- View DSA remarks and decision history.
- Update the proposal after changes are requested.
- Add, replace or remove attachments before resubmission.
- Resubmit the proposal.

The proposal submitter cannot approve their own proposal, open registration before DSA approval, approve student join requests or access active Coordinator operations merely because they created the proposal.

### Assignment activation

When DSA approves a proposal, DSA assigns one lead Trip Coordinator and may assign one or more assistants. By default, the submitter is suggested as lead, but DSA may assign another eligible verified Student. Create assignment rows only after DSA's approval and assignment decision succeed.

A Student may coordinate several trips using the same account. The workspace must list only the trips with active assignments for that student. Display `Lead` or `Assistant` for each trip. DSA alone can create or change these assignments.

### Trip Coordinator dashboard/workspace

Show useful statistics for the trips assigned to the signed-in Student:

- Active assigned trips.
- Pending join requests holding slots for those trips.
- Approved participants.
- Money collected versus estimated cost where applicable.
- Each assigned trip, seats filled, registration status and departure countdown.
- DSA approval status and remarks.

Do not include statistics or records for trips to which the student is not assigned.

### Join Requests

Create a dedicated page scoped to an assigned trip. Show each applicant's consent upload, verification status, correction request, and protected download. Add a private Final Participant Namelist section for the active lead with package preview, generation, submission, DSA status and resubmission history. Include pending slot-holders, approved travellers, rejected/withdrawn history, the acting reviewer, and a "Reopen Available Slot" action only when a vacancy exists and the deadline/DSA rules permit it.

Active lead and assistant Trip Coordinators can approve or reject pending requests immediately upon receipt, including while registration is still open; they do not have to wait for the deadline or manually close registration. Show withdrawn requests with a "Withdrawn" label.

Approving or rejecting a request sends an email, subject to the selected email mode. Enforce capacity inside a transaction. Record the acting Trip Coordinator and decision timestamp.

### Other Trip Coordinator features

Active assigned Trip Coordinators can manage only their assigned trip's:

- Itineraries.
- Packing suggestions.
- Announcements.
- Important announcements.
- Actual expenses.
- Student contributions.
- Attendance.
- Official Student Travel Form.
- Permitted CSV exports.
- Feedback view.

Provide "Mark all present" for attendance.

Export attendance and expenses as CSV only for trips with an active assignment. Former Trip Coordinators may view historical exports only if the application explicitly offers a read-only historical download; they must not alter completed-trip data.

### Final trip report and assignment end

When the end date passes, close registration and show the trip as awaiting its final report. Allow active Trip Coordinators to finish recording final attendance, expenses and contributions.

The lead Trip Coordinator must submit a final report with:

- Final attendance summary.
- Actual expense total and summary.
- Student contribution total and summary.
- Incidents or an explicit "none reported" statement.
- Feedback summary based on feedback received at submission time; clearly state if no feedback has been received.
- Additional closing notes, if any.

After successful submission, archive the trip as completed, make ordinary trip-management functions read-only and end all active lead/assistant assignments for that trip. Keep the Student accounts active. Former Trip Coordinators may view historical records for their trips but cannot edit them.

### Handover

A lead or assistant may submit a handover request with a reason. DSA reviews and performs the reassignment. DSA can assign a replacement, promote an existing assistant to lead or end an assignment. Preserve all old assignment rows and create new rows; never let a student directly transfer Coordinator permissions. The lead remains accountable for the final report unless DSA appoints a replacement lead.

### Official Student Travel Form

Provide a dedicated section to preview, generate, download and print the official form. Use the official PDF as the source of truth. Only include approved participants. Clearly identify missing information. Do not generate fake signatures or claim that the form has been officially submitted. Completed-trip forms are historical and read-only.

# 21. STUDENT FEATURES

Create a Student dashboard for every student account with:

- Trips joined.
- Pending join requests.
- Packing progress.
- Amount contributed.
- Next-trip countdown.
- Announcements.
- Organise a Trip.
- My Proposals and DSA decision status.
- My Coordinating Trips when active trip assignments exist.

Students can request to join a trip by providing a required reason, confirming availability for the trip dates and acknowledging the published trip rules, safety information and estimated cost. Their name, verified email, student ID and programme come from their profile; avoid collecting unnecessary sensitive information.

Before final confirmation, display:

- Safety rules.
- Total estimated cost.
- Available estimated cost breakdown.
- Registration status.
- Relevant trip information.

If a source-based sample trip has no cost breakdown, show its total estimated cost and the note that no detailed breakdown was provided. Do not invent line items.

"My Trips" should show:

- Pending.
- Approved.
- Rejected.
- Withdrawn.

Provide a self-service "Withdraw my request" action for pending or approved requests until the trip starts. Require a short reason and confirmation, preserve financial/history records, notify Coordinators and show that a replacement slot requires explicit Coordinator reopening.

For approved trips, provide tabs:

- Overview.
- Itinerary.
- Packing.
- Expenses.
- Announcements.
- Attendance.

Include:

- Personal packing checklist.
- Copy suggested items action.
- Progress bar.
- Own contributions and balance due.
- Own attendance.
- Printable itinerary.
- Emergency numbers.

After the trip end date has passed, allow eligible approved participants to submit feedback with a rating from 1 to 5 and an optional comment, including while the trip is awaiting its final report and after it is completed.

Students can edit their profile:

- Name.
- Programme.
- Academic year.
- Residence hall.
- Phone.

### Organise a Trip

Provide a clear **Organise a Trip** action on the Student dashboard. It opens the proposal workflow in Section 5 and Section 20. Any verified Student may start a proposal; no separate Coordinator registration or Superadmin approval is required.

The student can see their own proposals and their statuses: draft, pending DSA, changes requested, approved, or rejected. The student can edit a draft or changes-requested proposal and resubmit it. They cannot make DSA decisions.

### My Coordinating Trips

When DSA assigns the Student as lead or assistant for one or more trips, show a **My Coordinating Trips** area. Each trip card must show its assignment type and status. Opening a trip exposes Coordinator functions only for that specific trip and only while the assignment is active.

A Student with no active assignments sees no Coordinator management controls. A Student whose assignment has ended retains their normal Student dashboard and account. They may see completed trips they previously coordinated in a read-only history area, but cannot manage them.

# 22. DSA DASHBOARD

Create a dedicated DSA dashboard.

Include:

- Pending proposals.
- Approved trips.
- Changes requested.
- Rejected proposals.
- Upcoming approved trips.
- Review history.
- Active Trip Coordinator assignments.
- Handover/reassignment requests.
- Completed trips and final reports.

Add a DSA-reviewed **Replacement Deadline Extension Requests** queue showing trip, original deadline, proposed extended deadline, number of vacancies, Coordinator reason, and DSA's approve/reject action with immutable history. An approved extension does not itself reopen slots; the assigned Coordinator must take that action afterward.

Add a separate **Final Namelist Review** queue to the DSA dashboard. It must show each submitted package version, approved traveller list, verified consent documents, missing/corrected letters and any change since the previous version. DSA formally approves, requests corrections, or rejects the final namelist package. Only approval of the latest matching participant/consent snapshot clears the trip for departure in Sherubtse TripHub. This must not be confused with initial proposal approval or official form signatures.

The proposal review page must display:

- Student submitter name.
- Proposed lead, if one has been suggested.
- Destination.
- Trip purpose.
- Description.
- Dates.
- Meeting point.
- Meeting time.
- Transport.
- Participant limit.
- Registration deadline.
- Total estimated cost.
- Estimated cost breakdown.
- Proposed itinerary.
- Safety information.
- Emergency contacts.
- Supporting documents and their descriptions.
- Relevant submission history.

Provide three proposal actions:

**APPROVE**

**REQUEST CHANGES**

**REJECT**

Require remarks for changes requested and rejection. Display a confirmation dialog before final decisions. Record every decision in `trip_approval_history`.

### Assign Trip Coordinators

When approving a proposal, require DSA to assign one lead Student. Suggest the proposal submitter by default, but allow DSA to select another eligible active, verified Student. Allow DSA to add one or more assistant Students. The approval and initial assignment creation must succeed or fail together in one database transaction.

Provide an assignment management page for DSA to:

- View each trip's active lead and assistants.
- View the full assignment history.
- Review handover requests.
- End an assignment.
- Assign a replacement lead or assistant.
- Promote an assistant to lead when appropriate.
- Record a reason for reassignment.

Only DSA can make these assignment changes. Superadmin may view assignment history for platform oversight but cannot create or change assignments.

DSA must be able to view and download the exact attachments included in the submission being reviewed.

Provide read-only access to completed trip reports and historical trip records. Do not allow DSA to access unrelated Superadmin functions.

# 23. SUPERADMIN DASHBOARD

Create a dedicated Superadmin dashboard.

Include:

- Overview.
- Users.
- DSA Accounts.
- Destinations.
- Programmes.
- Trips.
- Trip Coordinator Assignment Oversight and History (read-only).
- Content Management.

Allow Superadmin to:

- View users.
- Activate or deactivate accounts.
- Manage DSA accounts.
- Manage destinations.
- Manage destination photographs.
- Manage programmes.
- Manage content.
- View trip approval statuses.
- View trip Coordinator assignments and assignment history.
- Soft-delete trips when appropriate, subject to preserving approval, assignment and final-report history.

Do not create any account-level Coordinator approval queue. Do not allow Superadmin to approve a student for a permanent Coordinator role, assign or reassign Trip Coordinators, or make DSA approval decisions.

Do not allow Superadmin to make DSA approval decisions or bypass the institutional workflow.

# 24. TRIP REGISTRATION AND CAPACITY

Implement reliable server-side registration rules.

A student may request to join only if:

- The trip is approved by DSA.
- Registration is explicitly open.
- The deadline has not passed.
- The trip is active and not completed or cancelled.
- Capacity remains available.

Prevent duplicate active requests.

Use a transaction when approving participants. Prevent race conditions.

**Pending and approved requests both occupy slots, with one slot per active request.** A full trip with any pending applications shows "Slots Full"; a trip with every slot approved shows "Fully Booked".

The interface must distinguish:

- Approved and confirmed participants.
- Pending applications holding a slot.
- Vacant slots.
- Whether registration is explicitly open or closed.

Do not rely on frontend validation. The server must validate every condition again. Concurrent submissions and approvals must never exceed capacity.

### Who can review join requests?

Only a Student with an active lead or assistant assignment for that specific trip may review and approve/reject its join requests. Record the acting user ID from the authenticated session. A Student without an active assignment cannot access those actions. DSA and Superadmin do not approve individual join requests; that responsibility belongs to the active assigned Student Trip Coordinators.

### Withdrawal

Registration deadline expiration must not disable the withdrawal button before the trip starts.

A student can withdraw their own pending or approved request without Coordinator approval at any time before the trip starts, **including after the registration deadline**; the deadline restricts new/replacement applications, not the student's right to withdraw before departure. Require confirmation and a short withdrawal reason (for example urgent academic work or a personal commitment). Store `withdrawal_reason`, `withdrawn_at` and the acting student ID; preserve the request, approval, attendance and financial history. Withdrawal immediately releases the occupied slot, removes approved-participant-only access and notifies the assigned Coordinators. Do not automatically reopen registration to new students.

An assigned lead or assistant sees the vacancy and can explicitly click "Reopen Available Slot" while registration is eligible and before the original deadline; the system must recheck all rules server-side, preserve FCFS ordering and log the reopening action. If the deadline has passed, the Coordinator must **request DSA permission for a replacement-registration deadline extension**, with a reason, the requested new deadline and the number of vacant places. DSA may approve or reject the request and must record its reason/decision, reviewer and time. **Until DSA approves and the new deadline is effective, do not accept any replacement application or permit reopening.** After approval, the assigned Coordinator must still explicitly click `Reopen Available Slot`; DSA permission does not reopen it automatically. Store the DSA decision and new deadline in an immutable audit record. Any extension or material change that requires institutional reapproval must follow the existing DSA review rules. If the trip has started, do not allow self-service withdrawal; use a Coordinator-assisted incident/attendance record rather than silently freeing a seat.

Keep recorded contributions and refunds/adjustments as separately recorded bookkeeping entries if appropriate; Sherubtse TripHub never transfers or refunds money online. A former participant who withdrew may re-request only while an eligible vacancy is explicitly open and before the authorised deadline.

### Capacity status and reopening audit

When a Coordinator requests DSA approval to extend an expired registration deadline for replacement participants, the request must include a reason, proposed deadline, available seat count, requester and timestamps. DSA alone approves or rejects it. No automatic extension, no automatic slot reopening and no acceptance of new join requests before both the approved extension and the Coordinator's separate reopening action. Keep original and new deadlines and every decision in immutable history.

Use the original maximum participant limit as the hard cap. Occupied slots = count of participant rows with status `pending` or `approved`; confirmed seats = count with status `approved`. Compute these from PostgreSQL within locked transactions rather than trusting a browser counter. Never create a second active participant row for the same trip and student. When all slots are occupied, block requests regardless of whether the `registration_open` flag is still true; display `Slots Full` for pending-or-mixed occupancy and `Fully Booked` when all occupied slots have been approved.

After a rejection or withdrawal from a previously full trip, the vacant slot is **not** made available for new registration automatically. Add a trip-level `vacancies_held_closed` or equivalent simple state: set it to true transactionally when a rejection/withdrawal creates a vacancy after full capacity, and clear it only after an authorised Coordinator explicitly reopens those vacant slots. This gate must be checked on every join and re-request operation. A new trip that has never filled up may continue accepting ordinary requests while `registration_open=true`. Only the assigned lead/assistant may click `Reopen Available Slot`, which must be logged with the actor and timestamp. The action can permit at most the number of current vacancies, cannot override registration deadlines or DSA status and must not raise `max_participants`. If the Coordinator had manually closed registration for another reason, require an explicit Open Registration action as well; clearing the vacancy gate alone must never override `registration_open=false`. Do not implement a public waitlist or lottery. If an approved participant withdraws, send a notification to the assigned Coordinator and retain all past financial and participation records.

The frontend must explain that a pending slot is temporarily held but participation is not confirmed until the Coordinator approves it. Show withdrawal and rejection messages without exposing private reasons publicly. Student withdrawal requires a reason and a confirmation step; after trip start use Coordinator-assisted incident records instead. A Coordinator may approve a pending request while registrations are open; approval does not consume an additional slot. Use server-side transactional locks for the full lifecycle (new request, re-request after withdrawal, rejection, approval, withdrawal and vacancy reopening).

### Approved-trip cancellation

Add a `trip_cancellation_requests` table (requester, trip, reason, status, DSA reviewer, decision reason, requested/decided timestamps) and an append-only cancellation event history or equivalent immutable audit records. Only authorised actors can see private reasons. Do not overwrite prior requests or decisions.

Implement a straightforward cancellation-request workflow, separate from trip proposal rejection. An assigned lead or assistant may request cancellation, supplying a reason, but only DSA may authorise cancellation of an already-approved trip. Record the requester, DSA reviewer, decision/reason, timestamps and immutable event history. On authorised cancellation, set `operational_status = 'cancelled'`, close registration, block new join requests and ordinary management, preserve all approvals, participant records, expenses, contributions, documents and assignment history, and notify affected students. End active trip Coordinator assignments transactionally, retaining historical read-only access. Sherubtse TripHub only records any refund decisions or adjustments; no payment or refund is processed online. Do not invent an official college cancellation policy: flag the proposed approval rule for DSA confirmation in Step 0.

### Privacy, identity and demo safety

Normalise student emails to lowercase and trim spaces; enforce unique email and unique student ID in PostgreSQL. Require active, verified accounts for proposals, join requests and Coordinator assignment. Private proposal attachments, official travel PDFs, attendance, contributions and personal exports must have server-side authorisation checks and must not be publicly accessible through guessed URLs or object-storage paths. Never expose sensitive personal data in logs. Ensure seed scripts are idempotent and cannot overwrite real people, submitted proposals, DSA decisions, attachments or accounting records. Use explicit sample labels throughout the UI.

### Post-approval changes with existing participants

On a material change to an approved trip, preserve pending/approved/withdrawn participant records and financial history. Close registration and require DSA reapproval without silently rejecting or deleting applications. Notify affected students that the trip is undergoing re-review. Do not let ordinary trip management or registration silently proceed on the previous approval. Any substantial change to an approved trip's original registration deadline must have DSA authorisation before it takes effect.

### Reliable date-driven state transitions

All deadline and trip-end checks must be enforced at request time even if no scheduled job has run. Centralise the transitions in one idempotent service and document a production schedule/cron mechanism so expired registration and awaiting-final-report statuses are reconciled even without visitor traffic. Preserve audit history and do not automatically mark a trip completed without the lead's final report.

# 24A. PARENT/GUARDIAN CONSENT AND FINAL PARTICIPANT NAMELIST

This is a **mandatory two-stage DSA workflow**:

1. DSA initially approves the trip proposal and appoints its lead/assistant Coordinators. Only then may the Coordinator open registration.
2. Before travel begins, DSA must independently approve the **final named participants and their consent letters**. Initial proposal approval is never sufficient for final participant clearance.

**Application:** The Student Request to Join form pre-fills verified name, student ID, programme and college email, asks for a short reason, availability and rules/cost acknowledgement, and requires a PDF/JPG/JPEG/PNG parent/guardian consent letter. The file must be received and safely stored before the FCFS slot transaction commits. A pending request occupies a slot; incomplete or invalid uploads do not. Do not collect unnecessary guardian ID numbers or other intrusive details. Show downloadable instructions rather than inventing an official consent form template or policy; if the institution supplies a standard letter/template later, follow it.

**Coordinator verification and immediate confirmation:** The lead or assistant views only applicants for their assigned trip. They verify that the uploaded letter is readable and appropriately completed, or request correction with a note. Only then may they immediately approve that student. A letter requiring correction leaves the student `pending` and keeps their FCFS slot held until they withdraw or are rejected; notify them to reupload. If the student never provides an acceptable correction, the Coordinator can reject the request, with a short recorded reason and notification to the student. Do not auto-expire pending consent corrections or invent a mandatory response period. Rejection releases the occupied slot; it becomes open to new requests only when the assigned Coordinator manually reopens a vacancy under the deadline and DSA rules. Decisions record actor, time and document version. Coordinators cannot deem parental consent or official signatures legally verified merely by pressing a button.

**Final list creation and capacity:** DSA may approve the actual confirmed list even when it contains fewer students than the advertised maximum. For example, a 10-seat trip with 8 approved students may submit an 8-person final namelist for DSA approval. Do not require all seats to be filled; the limit is a maximum, not a minimum. Once approved participants are ready, the lead clicks **Generate Final Namelist & Consent Package**. Use current `approved` participants only, numbered in an explicit stable order; include name, student ID and programme, plus only other fields that are required by the verified official institutional reference. Add trip title, destination, dates, number of confirmed participants and lead contact. Merge the same approved participants' most recently verified letters behind the list into one PDF. Keep original files and a versioned package snapshot. Do not include pending, withdrawn or rejected applicants.

**Formal DSA decision:** The lead selects **Submit Final Namelist to DSA**. DSA gets a separate review inbox and sees the generated list and all letters. DSA actions are **Approve Final Namelist**, **Request Corrections**, or **Reject Final Namelist**, with mandatory reasons for the latter two. Record reviewer and timestamp with immutable history. Approval yields `Final namelist approved by DSA`; until then display `Not cleared for departure`. Only the lead submits/revises the package; assistants may help verify letters and prepare records.

**Change after clearance:** If an approved participant withdraws or is replaced, or their verified letter is replaced, the approved package becomes `superseded`/invalid for departure clearance. Even if the withdrawn student is not replaced and the list becomes smaller, the lead must regenerate and resubmit the accurate current roster for a fresh DSA decision. Recalculate slots under the original FCFS and manual reopen rules. The lead regenerates and submits an updated package for DSA approval. Do not automatically transfer the previous DSA decision to a changed list; notify DSA and affected Coordinators. A change solely to a pending, unapproved applicant must not invalidate an already-approved package. If reopening after the deadline requires authorisation, follow the existing DSA deadline-extension and proposal-reapproval rules.

**Departure gate and closeout:** Before trip departure/start, require the current DSA-approved final participant package to match the current approved roster and consent document versions. If not, block the in-app **Mark Trip as Departed / Start Trip** action and show the reason; do not claim the website can physically prevent travel. Never treat this workflow as a replacement for the signed official Student Travel Form or any separate college approval. If the scheduled start passes without an approved package, flag the trip to DSA and prevent a normal automatic transition to `ongoing` until authorised resolution; do not automatically cancel it or fabricate approval. If necessary, DSA must record an explicit decision to postpone/cancel or resolve the discrepancy under the documented institutional process. Preserve all prior versions for audit.

**Notifications and security:** Notify the student of missing/invalid letter and approval/rejection; notify lead and assistants of a submitted/withdrawn request or invalidation; notify DSA on final-list submission and resubmission; notify the lead on DSA decision. Store documents in private persistent storage with authenticated, scoped download endpoints, strict server-side file checks, least-privilege permissions and audit logs. Do not send sensitive documents as email attachments by default; send a protected link instead. Do not display guardian information in public trip cards.

**Below-capacity approval:** A valid final package can have fewer confirmed participants than the trip's `max_participants`. DSA reviews the actual named participants and verified documents; the system must not block review or approval solely because some seats are unused.

**Demo data exception:** Synthetic demo join requests may display illustrative consent status, but do not fabricate letters, signatures or official DSA clearance. Real trip departure clearance requires actual uploaded/verified letters and a DSA-reviewed list. The seed script must never produce a falsely cleared real trip.

# 25. ITINERARY AND ANNOUNCEMENTS

Active Trip Coordinators assigned to the trip can create and edit itineraries for their own trips.

Itinerary fields:

- Day number.
- Time.
- Title.
- Description.

The DSA reviewer must be able to inspect the complete proposed itinerary before approving a trip.

The Student who submits the proposal must complete the proposed itinerary before proposal submission. After DSA approval, active Trip Coordinators may manage the operational itinerary; any material itinerary change triggers the DSA reapproval rule.

Students can view the detailed itinerary only when they are approved participants.

Active Trip Coordinators assigned to the trip can create announcements and mark them important.

Approved participants can view announcements for their trip.


All itinerary and announcement write operations require an active trip-specific assignment. Once the final report is submitted and the trip is completed, these records are read-only.

# 26. PACKING CHECKLIST

Implement:

- Destination packing suggestions.
- Trip-specific packing suggestions.
- Personal packing items.
- Quantity.
- Packed/unpacked status.
- Progress indicator.

Allow students to copy suggested items into their personal checklist.

Use Fetch API for checklist updates.

Provide feedback when an item is updated.

If an update fails, restore the previous state and display an error.


Packing suggestions for a trip may be changed only by an active assigned Trip Coordinator. A completed trip is read-only; students may still view their own historical checklist.

# 27. EXPENSES AND CONTRIBUTIONS

Active Trip Coordinators assigned to the trip can record actual expenses:

- Expense category.
- Description.
- Amount.
- Date.

Student contributions can be recorded.

Show:

- Total actual expenses.
- Total contributions.
- Student contribution records.
- Balance due where applicable.

Use Nu. formatting.

Enforce ownership and privacy.

Keep these financial concepts separate:

- **Estimated cost:** entered during trip proposal preparation.
- **Estimated cost breakdown:** planned allocation of the estimated cost.
- **Actual expenses:** money actually spent during or after the trip.
- **Student contributions:** money recorded as contributed by students.

Do not call an estimated cost breakdown an actual expense breakdown.

Do not invent source-based cost breakdowns.

Do not implement online payment processing.


Only active assigned Trip Coordinators may add or edit expense and contribution records. After final-report submission, financial records are read-only. The final report stores a snapshot of totals at submission.

# 28. ATTENDANCE

Active Trip Coordinators assigned to the trip can record attendance for approved participants.

Include:

- Attendance date.
- Present.
- Absent.
- Late.
- Excused.

Validate attendance dates against the trip dates.

Provide "Mark all present".

Allow CSV export for the trips to which the Student has an active assignment only.

Students can view only their own attendance records.


Only active assigned Trip Coordinators may record or edit attendance. After final-report submission, attendance is read-only. The final report stores the final attendance summary.

# 29. FEEDBACK

Use MongoDB for feedback only.

Only an authenticated Student with approved participation in a trip whose end date has passed and whose operational status is `awaiting_final_report` or `completed` can submit feedback.

Allow:

- Rating from 1 to 5.
- Optional comment.

Only one feedback entry per eligible student per trip.

A lead or assistant Trip Coordinator may view feedback only for a trip to which that Student has an active or historical assignment. After the trip is completed, this access is read-only. DSA may view feedback for institutional oversight as permitted by its role.

Do not allow arbitrary trip or Coordinator IDs to be submitted from the browser. Look up trip assignment history from PostgreSQL and use it to authorise access. Feedback belongs to the trip, not to one Coordinator, because a trip may have multiple assigned students.

# 30. IMPLEMENTATION QUALITY AND BUSINESS RULES

Enforce all business rules on the server.

- Every ordinary student registers as a Student account using a verified Sherubtse college email.
- The only account roles are `student`, `dsa` and `admin` (Superadmin). There is no global Coordinator role.
- There is no public Coordinator signup, Coordinator-access request or Coordinator approval queue.
- A Student may submit a proposal through Organise a Trip.
- The proposal submitter may manage only their own draft or changes-requested proposal before approval.
- Only DSA can approve, request changes to or reject trip proposals.
- DSA approval is mandatory before public visibility.
- On approval, DSA assigns one lead Student and may assign assistant Students in `trip_coordinators`.
- The proposal submitter is the default suggested lead, but DSA may assign another eligible verified Student.
- Trip Coordinator permissions are trip-specific and require an active assignment for the requested trip.
- A Student may coordinate multiple trips using the same account.
- Ending an assignment never deactivates or changes the Student account.
- If Superadmin deactivates a Student with active assignments, deny their access, close registration on affected trips and flag the trips for DSA reassignment. Do not auto-assign a replacement.
- Only DSA can manually create, change, reassign or end trip Coordinator assignments; the system automatically ends active assignments when a final report is successfully submitted and the trip is archived.
- Superadmin cannot grant Coordinator assignments or bypass DSA approval.
- A trip may have only one active lead and may have multiple active assistants.
- A Trip Coordinator can manage only trips to which they have an active assignment.
- Former Trip Coordinators may view permitted historical records but cannot edit or manage a completed trip.
- Registration requires explicit opening by an active assigned Trip Coordinator after DSA approval.
- Registration closes after its deadline and automatically closes when the trip ends. An occupied-capacity trip also blocks further requests even if registration was previously opened; vacancies do not reopen for replacement requests without an assigned-Coordinator action.
- Pending requests with valid uploaded consent letters and approved join requests each occupy a registration slot; only approved requests with Coordinator-verified letters count as confirmed participants.
- The first eligible valid requests receive slots in first-come, first-served order; accepting a request must check capacity within a transaction with appropriate locking.
- An active assigned Coordinator can approve or reject requests immediately, while registration is open or closed, subject to trip and assignment rules.
- When the last slot is occupied, show "Slots Full" if any requests remain pending, otherwise "Fully Booked".
- Rejected or self-withdrawn requests free occupied slots but do not automatically reopen registration to new applicants. An active assigned Coordinator must explicitly reopen vacancies before the valid deadline; after the deadline DSA must authorise any extension.
- Participant status changes, reopening, and withdrawals must be transactional and preserve an audit history.
- Withdrawn students may re-request before the deadline according to the existing participant record rules.
- A Student can see only their own personal records.
- Only approved participants can access detailed trip information.
- A material edit to an approved proposal resets approval and closes registration.
- Submitted proposal attachments must be versioned and preserved.
- Private proposal attachments must never become public.
- A DSA-approved trip must have an assigned lead before it becomes publicly visible.
- A handover/reassignment must be performed by DSA, with the previous assignment retained in history.
- When the end date passes, the trip enters `awaiting_final_report`; the assigned team can finish final operational records and prepare the report.
- The lead Trip Coordinator must submit the final trip report, including final attendance, actual expenses, contributions, incidents or an explicit none-reported statement, and feedback received to date.
- After final-report submission, the trip is archived as completed, all active assignments for that trip end, and ordinary trip management becomes read-only.
- Completed-trip reports and historical records must not be deleted when an assignment ends.
- Official travel-form generation must not imply official submission or acceptance.
- Actual expenses must remain separate from estimated proposal costs.
- Validate all input on the server.
- Validate file types and sizes.
- Use transactions for multi-write operations.
- Use database constraints and indexes.
- Make seed operations safe to rerun.
- Never run destructive seed operations against production.
- Test denied access as well as successful access.
- Preserve form values when validation fails.
- Provide useful loading, success, validation-error, server-error and empty states.
- Never report success before the server confirms it.
- Every visible button, link, form, filter, tab, upload control, export and menu item must perform its stated action.
- Keep the application usable on small screens.
- Test keyboard navigation, focus states, accessible labels and reduced-motion behaviour.

# 31. TESTING REQUIREMENTS

Use Jest and Supertest with a separate PostgreSQL test database named `sherubtse_triphub_test`.

Test all major workflows.

### Authentication

- Student signup creates only `role = 'student'`.
- Exact college email suffix validation.
- Invalid email rejection.
- Signup request cannot set `dsa`, `admin` or any Coordinator role.
- Login.
- Logout.
- Email verification and resend verification.
- Forgot password.
- Reset password and session invalidation.
- Logged-in change password for Student, DSA and Superadmin.
- Expired reset token.
- One-time token use.

### Account roles and trip-specific permissions

Test that:

- Student cannot access DSA pages.
- Student cannot access Superadmin pages.
- Student cannot access Coordinator management for a trip without an active assignment.
- A Student with an active lead assignment can access only that assigned trip's Coordinator functions.
- A Student with an active assistant assignment can access the permitted operational functions for that assigned trip.
- A Student cannot manage another trip for which they have no assignment.
- A Student can be assigned to multiple trips using the same account.
- A Student can be lead for one trip and assistant for another.
- Coordinator permissions do not change the user's account role from `student`.
- Ending one assignment removes write access to that trip but does not deactivate the Student account or remove other assignments.
- A former Trip Coordinator can access only permitted read-only history for a completed trip.
- A completed trip cannot be edited by a former lead or assistant.
- DSA can access proposal review and assignment management.
- DSA cannot access Superadmin-only functions.
- Superadmin cannot perform DSA approval actions.
- Superadmin cannot create, change or end trip Coordinator assignments.
- Unapproved users cannot access restricted trip details.
- Unapproved users cannot download proposal attachments.
- Public visitors cannot access private attachments.

### Trip Coordinator assignments and handover

Test:

- DSA approval creates one lead assignment.
- Proposal submitter is suggested as the default lead.
- DSA can assign a different eligible verified Student as lead.
- DSA can assign one or more assistants.
- A trip cannot have two active leads.
- A Student cannot have duplicate active assignment rows for the same trip.
- A Student can coordinate multiple trips.
- A non-DSA user cannot assign or reassign a Trip Coordinator.
- A lead or assistant can request a handover but cannot directly transfer permissions.
- DSA can end an assignment and appoint a replacement.
- Assignment history, actor, reason and timestamps are retained.
- Reassignment does not change the user's Student account role.
- Completed-trip archival ends all active assignments.

### DSA approval

Test:

- Student creates a draft proposal.
- Student can edit only their own draft.
- Incomplete proposal cannot be submitted.
- Proposal cannot be submitted without a completed required itinerary.
- Student uploads supporting documents.
- Invalid file type is rejected.
- Oversized attachment is rejected.
- DSA can view submitted attachments.
- DSA can download submitted attachments.
- Another Student cannot view the private proposal.
- Student cannot view pending proposals submitted by someone else.
- DSA approves a proposal and assigns a lead.
- DSA requests changes.
- Submitter edits and resubmits.
- Updated attachments are associated with the new submission.
- Previous submitted attachments remain preserved.
- DSA rejects a proposal.
- Non-DSA users cannot approve.
- Proposal submitter cannot approve their own proposal.
- Approval history is retained.
- Material edits reset approval.
- Material edits automatically close registration.
- Reapproval is required.
- A trip is not publicly visible until both DSA approval and a lead assignment exist.

### Public visibility

Test:

- Approved trips with an assigned lead are visible.
- Draft trips are not visible.
- Pending proposals are not visible.
- Rejected trips are not visible.
- Changes-requested proposals are not visible.
- Direct URL access to unapproved trips is blocked.
- Supporting documents are never publicly accessible.

### Registration

Test:

- Approved trip with registration closed rejects join requests.
- Registration can be opened only by an active assigned lead or assistant for that trip.
- Registration cannot open before DSA approval.
- Registration cannot open without an active lead assignment.
- Registration cannot open with incomplete required information.
- Registration closes after the deadline and when the trip ends.
- Registration rejects duplicate active requests.
- Capacity is enforced.
- Pending and approved requests each occupy one slot; confirmed traveller counts include only approved participants.
- The 10th concurrent valid request for a 10-slot trip succeeds and the 11th fails; overbooking is impossible.
- Coordinators can confirm pending applications immediately without consuming a second slot.
- Rejection/withdrawal creates a vacancy, but reopening applications requires an explicit authorised Coordinator action.
- Concurrent submissions, withdrawals, approvals and reopenings cannot exceed capacity.
- Students can withdraw according to the rules.
- A withdrawn student can re-request only before the authorised deadline and once an assigned Coordinator has explicitly reopened an available slot.
- A Student without a trip assignment cannot approve or reject join requests.
- An assigned Coordinator can reject a still-invalid consent-letter request after asking for correction; the rejection reason and student notification are recorded, the held seat is released and new applications remain blocked until a manual reopen when required.
- A correction request never auto-expires after an arbitrary time limit; the student may reupload and seek review while the request remains pending.

### Parent/guardian consent and DSA-approved final namelist

Test:

- Request to Join rejects missing, unsupported, oversized, corrupt or spoofed consent-letter files without reserving a slot.
- An accepted application retains a privately stored consent-letter version; pending holds exactly one FCFS seat.
- Coordinator can request a corrected consent letter while retaining a pending seat; cannot approve without verifying the current valid document.
- A student can view or replace only their own letter; an unrelated student, unassigned Coordinator or unauthorized DSA/Superadmin request cannot download private letters or generated packages.
- Final list includes only current approved participants, with exactly their current verified consent-letter versions, and combines PDF/images correctly without fabricated signatures.
- Only active lead may submit/finalize a package; assistant may review letters but cannot submit on behalf of lead.
- Only DSA can approve final package; approval is independent from initial trip approval.
- DSA changes-requested/rejected decisions include reasons and maintain immutable version history.
- Any approved-participant withdrawal, replacement, or verified consent version change invalidates earlier clearance and requires resubmission and DSA reapproval; pending-only changes do not unnecessarily invalidate it.
- Withdrawing an approved participant after DSA final-list approval invalidates clearance even if nobody replaces that student; the new smaller namelist requires a fresh DSA decision.
- DSA can approve the current legitimate final list with fewer confirmed students than the trip's maximum capacity (for example 8 approved participants for a limit of 10).
- New requests after a withdrawal still require explicit Coordinator reopening and remain within deadline/DSA controls.
- Trip cannot be marked departed/ongoing through the normal application workflow without a current DSA-approved final package; original official travel form remains a separate requirement.
- Concurrency tests for approval, withdrawal and final-list approval enforce snapshot consistency.
- Demo seed never fabricates consent letters or institutional final-list approval.

### First-come, first-served, withdrawals and cancellation

Test:

- Ten simultaneous requests for a ten-slot trip reserve at most ten slots; the eleventh fails.
- Pending applications hold slots, but are not confirmed participants.
- Coordinator can approve a pending slot-holder immediately before the registration deadline.
- Approving a pending request does not consume a second slot.
- Exactly ten occupied slots show "Slots Full" if some are pending; all ten approved show "Fully Booked".
- Rejection or student self-withdrawal releases a slot but does not automatically reopen it for new requests.
- Withdrawals require a reason and are permitted without Coordinator approval only before the trip starts.
- Active assigned Coordinator can manually reopen available slots while the deadline is valid; another student then requests the place.
- Reopening and concurrent requests never exceed max_participants.
- After deadline, Coordinator cannot unilaterally extend it; DSA authorisation and appropriate reapproval checks are required.
- A student can self-withdraw after the deadline but before the trip starts; this does not itself authorise accepting replacement applicants.
- The Coordinator requests a replacement-specific deadline extension from DSA, which can approve or reject with an audited decision; only after approval and a manual `Reopen Available Slot` action may replacement requests be accepted.
- Student can only withdraw their own request; original financial history is preserved.
- Material trip edits preserve participant records and close registration until DSA reapproval.
- Coordinator can request cancellation but cannot unilaterally cancel a DSA-approved trip; only DSA can authorise it.
- A cancelled trip blocks registration and preserves all historical records.
- Status transitions are idempotent and are enforced on requests even without a scheduled job.

### Trip management and completion

Test:

- Itinerary ownership and trip assignment checks.
- Announcement permissions.
- Estimated cost breakdown validation.
- Actual expense totals.
- Contribution totals.
- Attendance validation.
- CSV access permissions.
- Packing checklist ownership.
- Official travel-form generation.
- Only approved participants appear in the generated form.
- Missing official-form fields are identified.
- Generated form does not falsely claim to be signed or submitted.
- Trip changes are blocked after final-report submission.
- Final report requires final attendance, expense/contribution summaries, incident status and feedback summary/status.
- Final report can be submitted only by the active lead Trip Coordinator (or a replacement appointed by DSA).
- Final report submission archives the trip, closes registration and ends active assignments transactionally.
- The Student accounts of former Trip Coordinators remain active.
- Historical trip data remains readable to authorised users.
- Feedback received after report submission does not silently change the stored report snapshot.

### Feedback

Test:

- Eligible Student can submit feedback after the trip end date, including while it is `awaiting_final_report` and after it is `completed`.
- A Student cannot submit feedback before the trip end date or without approved participation.
- Duplicate feedback is rejected.
- Active or former Trip Coordinator sees feedback only for trips they were assigned to.
- A Student cannot see feedback for unrelated trips.

### Security

Test:

- CSRF rejection.
- Invalid session rejection.
- Rate limiting where configured.
- Parameterised database operations.
- Unauthorised API requests.
- Role-based API restrictions.
- Trip assignment checks on APIs.
- File upload validation.
- Private attachment access control.
- Read-only restrictions after completion.

### API

Test:

- Expected HTTP status.
- Response structure.
- Validation errors.
- Past-date rejection where applicable.
- 401 response for a request without a session.
- DSA approval restrictions.
- Trip assignment restrictions.
- Registration-open restrictions.
- Private attachment restrictions.
- Completed-trip read-only restrictions.

Document actual test results, HTTP statuses and execution dates in the test log.

Never store passwords, cookies, session IDs or tokens in test logs.

# 32. REST API

Implement at minimum:

- `GET /api/trips`
- `GET /api/trips/:id`
- `GET /api/destinations`

Use the same models and permission rules as the web application.

Ensure API endpoints enforce:

- DSA approval.
- Registration-open status.
- Proposal submitter ownership where relevant.
- Active trip-specific Coordinator assignment for management actions.
- DSA-only assignment and approval actions.
- Approved-participant access.
- Capacity rules where relevant.
- Read-only restrictions after final-report submission.

Do not expose proposal attachments through public API endpoints.

Test the endpoints using Postman.

# 33. DEPLOYMENT

Prepare the project for deployment using:

- Neon PostgreSQL.
- MongoDB Atlas.
- Render.
- Docker.
- GitHub Actions.

Create:

- Dockerfile.
- GitHub Actions workflow.
- Production environment configuration.
- Deployment instructions.

Ensure the application uses environment variables.

Use persistent cloud storage for production uploads and proposal attachments.

Do not assume Render's local filesystem is permanent.

Use the HTTPS email API mode for Render deployment.

Test the production build as far as the available environment permits.

Do not claim successful deployment without actually verifying it.

# 34. DOCUMENTATION AND PRESENTATION FILES

Create:

- `README.md`
- `AGENTS.md`
- `REFERENCE_NOTES.md`
- `docs/Sherubtse_TripHub_Setup_and_Deployment_Guide.docx`
- `docs/SETUP_GUIDE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/CODE_TOUR.md`

The Word setup and deployment guide must be professional and easy to follow.

Write for a college student new to deployment. Use simple words, short sentences, numbered steps, one action per step, exact file names and environment-variable names, expected-result notes and troubleshooting explanations.

Include:

- Project introduction.
- Technologies.
- Prerequisites.
- Installation.
- Environment variables.
- Database setup.
- PostgreSQL schema execution.
- MongoDB setup.
- Seed data.
- Running locally.
- Demo account setup.
- Student account workflow.
- Trip-specific Coordinator assignment workflow.
- DSA trip approval and assignment workflow.
- Supporting-document upload and review workflow.
- Separate registration-opening workflow.
- Student join-request and Coordinator review workflow.
- DSA-supervised handover/reassignment workflow.
- Final trip report and archive workflow.
- Official Student Travel Form generation workflow.
- Testing.
- Deployment.
- Troubleshooting.
- Security reminders.
- Photo credits and permissions.

The Word guide must be opened and checked after generating it. The documentation must match the actual code. Do not document routes or features that do not exist.

### Demo script

Create `docs/DEMO_SCRIPT.md`.

Write a 5-minute walkthrough showing the four user experiences:

- Student.
- Student acting as lead Trip Coordinator for an assigned trip.
- DSA reviewer.
- Superadmin.

Use the same Student account for normal student activities and trip-specific Coordinator activities. If demonstrating an assistant, use another Student account with an assistant assignment. Do not create or demonstrate a separate Coordinator account or an account-level Coordinator approval workflow.

Demonstrate:

- Student registration and verified Student account.
- Student selecting Organise a Trip.
- Student creating a trip proposal.
- Student uploading supporting documents.
- Student submitting the proposal to DSA.
- DSA reviewing the proposal and attachments.
- DSA approving the proposal and assigning a lead and optional assistant.
- The same Student account seeing the trip-specific Coordinator workspace while remaining a Student.
- The trip becoming publicly visible.
- Registration remaining closed until an assigned Trip Coordinator explicitly opens it.
- Another Student submitting a join request.
- Lead or assistant Trip Coordinator reviewing the join request.
- Official travel-form generation.
- Trip completion, final report submission, archive and end of assignments.
- The former Trip Coordinator account remaining active as a Student.

Include exact clicks, what to say and what should appear on screen.

Clearly state that demo DSA approval is simulated and is not actual college authorisation.

### Code tour

Create `docs/CODE_TOUR.md`.

Include:

- Simple tour of every folder and file.
- How a request flows from route to controller to model to view.
- How PostgreSQL and MongoDB are used.
- How proposal attachments are stored and accessed.
- How DSA approval works.
- How trip-specific Coordinator assignments and handovers work.
- How final reports archive trips and end assignments without deleting Student accounts.
- How the official travel form is generated.
- Fifteen likely viva questions with simple answers.

# 35. BUILD ORDER — FOLLOW EXACTLY

Work one step at a time. Stop after each step and wait for me to say "next". Complete Step 0 first and wait for "go" before writing application code.

### Step 0 — Reference review and planning

Before writing application code:

1. Confirm that every named reference file physically exists in the Codex workspace.
2. Report each filename, file type and whether its contents were actually read.
3. Read Campus Eats and inspect its MVC structure and conventions.
4. Read all lab notes.
5. Read `TripPack.docx` fully.
6. Read `trippack_photos.docx` and identify which figure matches each destination.
7. Read the entire `Sherubtse_Student_Travel_Form.pdf`.
8. Confirm the PostgreSQL data model, including trip-specific assignments and final reports.
9. Confirm the MongoDB data model.
10. Confirm the supporting-document storage and versioning design.
11. Confirm the official travel-form generation approach.
12. Confirm the proposed folder structure.
13. Explain how source content maps into `db/seed-data.json`.
14. Identify missing information, contradictions and assumptions, including the manual FCFS slot-reopening rules, mandatory parent/guardian consent letter and formal DSA final-namelist approval, and the proposed DSA cancellation/extension policy that requires institutional confirmation. Distinguish website-imposed pre-departure clearance from confirmed college policy.
15. Ask which HTTPS email provider I prefer: Resend or Brevo.
16. Confirm the cloud image/document storage provider and required variables.
17. Record the ambiguous travel-time instruction from the official PDF in `REFERENCE_NOTES.md`.
18. Explain the Student-only signup and trip-specific Coordinator assignment model, including lead/assistant roles, DSA assignment, handover and completion.
19. Write `REFERENCE_NOTES.md`.
20. Write `AGENTS.md` with this specification and the revised build checklist.

Do not write application code in Step 0.

Preserve all supplied content and terminology. Do not invent missing facts. List every file that could not be opened.

Then STOP and wait for my **"go"**.

### Step 1 — Project foundation

Create the project structure, package scripts, `.env.example`, `.env.test`, `.gitignore`, environment validation, PostgreSQL connection and a temporary database test route.

Set up the local/cloud storage adapter and configuration interface without requiring cloud credentials for local development.

### Step 2 — Database and source content

Create `db/schema.sql` for pgAdmin, including all PostgreSQL tables, constraints, indexes, session table, `trip_coordinators`, trip approval history, trip attachments, submission versions, participant consent-document versions, finalized participant submission/review history and `trip_final_reports`. Do not create a Coordinator access-request table or a global Coordinator role.

Create the photo extraction script.

Map source content into `seed-data.json`.

Build an idempotent seed script.

Seed:

- Destinations.
- Photos.
- Programmes.
- Editable content.
- Twelve source demo users, all with Student account roles.
- Superadmin account.
- Separate demo DSA account.
- Five source-based sample trips.
- Two relative-date demonstration trips.
- Trip-specific lead/assistant assignments for the two source demo users originally designated as Coordinators.
- Ended assignment history for the sample completed trip.
- Sample join requests.
- Simulated DSA approval and assignment history.
- A sample final trip report for the completed demonstration trip.

Do not create invented cost breakdowns for the five source trips.

Rerunning the seed must not duplicate sample records, overwrite user-created content or delete real records. Never run the seed in production.

### Step 3 — Authentication and email

Implement PostgreSQL sessions, all three email modes, Student-only signup, exact college-email validation, secure expiring email verification and resend-verification links, login, logout, CSRF protection and rate limits. Provide profile/account-security navigation for all three account roles.

Public signup must always create `role = 'student'`. Do not show a Coordinator signup choice. Do not allow public DSA or Superadmin signup. Do not create any account-level Coordinator approval queue.

### Step 4 — Password recovery

Implement forgot-password and reset-password flows with one-hour, one-time hashed tokens, safe generic responses, and session invalidation. Also implement logged-in Change Password for Student, DSA and Superadmin using current-password verification and new-password confirmation. Test expired/reused tokens, resend-verification throttling, password mismatches and security protections.

### Step 5 — Authorization and account security

Implement:

- `requireAuth`
- `requireStudent`
- `requireDsa`
- `requireSuperadmin`
- `requireTripCoordinator`
- `requireLeadTripCoordinator`
- `requireProposalOwner`
- `requireApprovedParticipant`
- Read-only historical-trip access checks.

Implement account-role-based redirects and navigation. Trip Coordinator access must be checked against an active assignment for the requested trip, not a user role. Ensure every restricted page, API endpoint, export, attachment and direct URL applies the same server-side permissions.

Add the Superadmin account setup instructions and exact SQL for promoting an existing account to Superadmin only when authorised. Do not provide SQL for a permanent Coordinator role.

### Step 6 — Shared design system and public shell

Build the responsive header, footer, logo, CSS variables, typography, grid/layout rules, buttons, forms, status badges, toasts, dialogs, loading states, empty states, error states and mobile navigation.

Establish the public and role-based visual patterns before building individual dashboards. Include Student navigation for Organise a Trip and My Coordinating Trips when assignments exist.

### Step 7 — Public destinations

Build the landing page, Destinations gallery and destination detail pages.

Include extracted photos or placeholders, photo credits, lightbox, seasonal warnings, transport and cost information, comparison table and upcoming trips for each destination.

### Step 8 — Student proposal preparation and itinerary

Implement the Student's Organise a Trip workflow and proposal editor. A verified Student can create a draft, select a destination, enter:

- Purpose.
- Destination.
- Dates.
- Meeting point and time.
- Transport.
- Participant limit.
- Registration deadline.
- Total estimated cost.
- Estimated cost breakdown.
- Safety information.
- Emergency details.
- Proposed itinerary.

A proposal cannot be submitted to DSA until its required details and itinerary are complete. Include validation and preview so the Student can check the proposal before submission. The submitter receives proposal-editing access only; no active Coordinator assignment exists yet.

### Step 9 — Supporting-document uploads, DSA approval and assignment

Implement the Student's multiple-file supporting-document upload section. Allow the submitter to add a title and description for each attachment.

Implement secure validation, storage, ownership checks and attachment versioning. Allow the submitter to manage attachments before initial submission and while responding to a DSA changes-requested decision. Preserve submitted attachment versions.

Build proposal submission and resubmission. Build the DSA dashboard and proposal review page. Allow DSA to view and download submitted attachments.

Implement:

- Approve.
- Request changes.
- Reject.
- Required decision remarks where applicable.
- Immutable approval history.
- Submission version history.
- Attachment history.
- Changes-requested and resubmission flow.
- Reapproval after material edits.
- DSA assignment of one lead Student and optional assistant Students on approval.
- DSA-supervised handover and reassignment.

Create initial assignment rows in the same transaction as approval. Enforce DSA approval before public publication. Reset `registration_open` to false after material changes. Build the Student's My Coordinating Trips workspace, showing only active assignments and the student's lead/assistant status.

### Step 10 — Public trip discovery

Build trip browsing, search and filters, trip cards, status badges, seat counters, cost display and trip comparison table.

Public visitors can view only DSA-approved trips that have an assigned lead. Show descriptions, total estimated costs, estimated cost breakdowns where provided and safety information before registration.

Show whether registration is not yet open, open, closed, "Slots Full" (any pending among occupied slots) or "Fully Booked" (all slots approved). Show both occupied slots (pending plus approved) and confirmed participants (approved only).

### Step 11 — Registration opening, consent upload and student trip registration

Implement separate Open Registration/Close Registration and Reopen Available Slot actions for an active assigned lead or assistant after DSA approval. Reopening a freed vacancy is manual and must not bypass deadlines.

Enforce required fields, estimated cost-breakdown rules, deadline, active status and capacity before opening. Build student registration with reason, pre-registration safety/cost review, mandatory protected parent/guardian consent letter upload (PDF/JPG/JPEG/PNG), My Trips, consent status, status display and withdrawal with confirmation. Reject malformed/missing uploads before reserving a slot.

A join request is accepted only while registration is explicitly open and all server-side conditions pass. A valid pending request immediately reserves one slot until approved, rejected or withdrawn. Once the limit is reached, accept no more requests until an assigned Coordinator manually reopens a vacant slot.

### Step 12 — Join-request management

Build the trip-scoped Join Requests page for active lead and assistant Trip Coordinators. Implement consent-letter verification/correction and secure versioned downloads, FCFS pending slot reservations, immediate confirmation only after letter verification, self-withdrawal reason/history, notifications, manual vacancy reopening and cancellation-request visibility. Add `Reject Invalid Consent Request` after correction has been requested: require a decision note, free the reserved slot, notify the student and retain consent-document history; do not auto-reject on a timer. When a student withdraws after the deadline, allow self-withdrawal but require a Coordinator-to-DSA extension request, DSA decision and an explicit Coordinator reopening before accepting a replacement.

Implement immediate approve/reject actions as valid requests arrive, including before the deadline while registration is open. Enforce capacity in a transaction. Send email notifications. Retain withdrawn-request history. Record the acting assigned Student and decision time.

Add concurrency protection so simultaneous approvals cannot exceed the trip limit. A Student without an active assignment for the trip must not approve or reject requests.

### Step 12A — Final namelist and DSA pre-departure approval

Build the lead Coordinator's **Generate Final Namelist & Consent Package** action: a printable namelist of approved participants followed by a server-generated PDF combining their verified parent/guardian consent letters. Include protected preview/download, versioned snapshots, submit/resubmit and event history.

Build DSA's dedicated Final Namelist Review queue with Approve / Request Corrections / Reject decisions, reviewer identity, dated remarks and private download. Explicitly allow DSA approval of a final list with fewer approved students than the capacity limit (e.g., 8 of 10), provided every included student has the required verified letter and other departure rules pass. Separate this from proposal approval. Invalidate clearance on withdrawal, replacement or consent-version changes, and require new DSA approval of the current snapshot before the normal in-app departure/start action. Prevent a silent ongoing transition when departure clearance is missing. Test storage permissions, PDF conversion/merge, participant selection, deadline/reopen rules, concurrency, audit history and all DSA decisions, including approving a list below capacity and resubmitting a smaller list after a post-approval withdrawal. Never fabricate official signatures or pretend institutional travel paperwork has been completed.

### Step 13 — Itinerary viewing and announcements

Implement approved-student itinerary viewing, announcement creation and important flags, plus printable itinerary pages.

Keep draft/proposed itineraries visible to DSA reviewers and the proposal submitter only. After approval, allow active assigned Trip Coordinators to manage permitted itinerary and announcement information. Do not expose detailed trip information to ordinary students before they are approved participants.

### Step 13A — Official Student Travel Form

Use `Sherubtse_Student_Travel_Form.pdf` as the authoritative reference.

Implement the official travel-form generation workflow for active assigned Trip Coordinators. Inspect and reproduce all relevant fields and structure from the PDF. Populate available information from trip records, lead Student profile and approved participants.

Identify missing information clearly. Allow the assigned Trip Coordinator to complete missing fields where appropriate. Include only approved participants. Provide preview, PDF download and print.

Do not generate fake signatures. Do not mark the form as officially submitted, signed or accepted. Do not automatically enforce the ambiguous travel-time instruction. Record it for DSA confirmation. After trip completion, generated forms are historical and read-only.

Test form generation, field mapping, participant selection, missing fields, PDF output and permissions.

### Step 14 — Packing

Implement destination/trip suggestions, personal packing lists, copy-suggested-items action, Fetch-based toggles, optimistic updates with rollback and progress indicators. Only an active assigned Trip Coordinator may change trip-level packing suggestions; each Student may manage only their own personal packing items.

### Step 15 — Expenses and contributions

Implement actual expense recording, student contributions, totals, balance due and correct Nu. formatting.

Only active assigned Trip Coordinators may add or edit trip financial records. Keep estimated proposal costs separate from actual expenses. Enforce ownership and privacy.

### Step 16 — Attendance and exports

Implement date-based attendance for approved participants, mark-all-present, date validation and CSV exports restricted to trips for which the Student has an active assignment. Students can view only their own attendance. Completed trips become read-only after final-report submission.

### Step 17 — MongoDB feedback

Set up MongoDB, `config/mongo.js`, connection reuse and the temporary `/mongo-test` route. Remove the temporary route after verification.

Implement `models/Feedback.js`, Student feedback submission and the feedback view for active/former Trip Coordinators of the relevant trip. Enforce one feedback entry per eligible Student after the trip end date, including while it is awaiting its final report and after it is completed. Do not store one Coordinator ID as the owner of feedback; feedback belongs to the trip.

### Step 18 — Trip completion, final report and archive

Implement operational status transitions: planned, ongoing, awaiting final report, completed and cancelled. The normal transition to ongoing must require valid DSA final-namelist clearance matching the approved roster and consent versions; if approval is missing at the scheduled start, flag the trip to DSA rather than automatically marking it ongoing. Implement DSA-authorised cancellation of approved trips with history and notifications; ensure status transitions are idempotent and compatible with request-time checks and an optional production scheduler. When the trip end date passes, close registration and move it to `awaiting_final_report`.

Allow active assigned Trip Coordinators to finish final attendance, expenses and contributions. Require the lead Trip Coordinator (or a replacement lead assigned by DSA) to submit the final report containing final attendance, actual expense summary, contribution summary, incidents or an explicit none-reported statement, and feedback received to date. Store a stable report snapshot.

On successful submission, set the trip to completed, close registration, archive the trip, make ordinary trip-management actions read-only and end all active lead/assistant assignment rows. Preserve assignment history and all Student accounts. Test that a former Coordinator remains a Student and cannot edit the completed trip.

### Step 19 — Help and administration

Build FAQ, rules, emergency information, About, photo credits, 404/500 pages and the dashboards.

Complete:

- DSA review history.
- DSA lead/assistant assignment management.
- DSA handover and reassignment.
- DSA completed-trip report review.
- Superadmin user management.
- DSA account management.
- Destination management.
- Programme management.
- Content management.
- Read-only Superadmin trip-assignment oversight.

Do not build Coordinator access-request approval/rejection. Complete responsive and accessibility polish.

### Step 20 — REST API

Implement `/api/trips`, `/api/trips/:id` and `/api/destinations` using the same models and permission rules.

Include DSA approval, trip assignment and registration-open checks. Do not expose private proposal attachments. Enforce read-only restrictions for completed trips. Test endpoints in Postman.

### Step 21 — Automated testing and deployment files

Use Jest, Supertest and `sherubtse_triphub_test`.

Test all requirements in Section 31, including Student-only signup, trip-specific Coordinator assignments, DSA-only assignment/reassignment, capacity, final report submission and assignment termination on completion.

Add GitHub Actions and a Dockerfile in Campus Eats' style. Run the full suite and fix failures.

### Step 22 — Documentation and handover

Create:

- README.
- `AGENTS.md`.
- `REFERENCE_NOTES.md`.
- `docs/Sherubtse_TripHub_Setup_and_Deployment_Guide.docx`.
- `docs/SETUP_GUIDE.md`.
- `docs/DEMO_SCRIPT.md`.
- `docs/CODE_TOUR.md`.

Reopen and check the Word file. Verify every guide command, route, environment variable and filename against the finished code.

Finish with a complete manual test of Student signup, Organise a Trip, proposal submission, DSA review and approval, lead/assistant assignment, public visibility, separate registration opening, parent/guardian consent upload and correction, student join requests, Coordinator operations, finalized namelist generation and DSA pre-departure approval, roster changes triggering renewed approval, handover/reassignment, official travel-form generation, final report submission, archive, read-only history and the fact that former Trip Coordinator accounts remain active Students.

# FINAL INSTRUCTIONS

Do not add features beyond this specification.

Keep the code simple and basic, with short comments, and explain each step in plain language.

Ask before changing scope. Otherwise, make reasonable assumptions and list them in the README under "Assumptions".

List every placeholder, including photo credits and unverified details, in the README.

Do not invent institutional procedures or claim that Sherubtse TripHub is officially authorised by Sherubtse College.

Do not treat Sherubtse TripHub DSA approval as a replacement for the official Student Travel Form or other required institutional permissions.

Preserve the agreed registration and institutional workflows: an assigned Coordinator can reject a pending request with an uncorrected invalid consent letter (with reason and manual vacancy reopening); student self-withdrawal remains possible after the registration deadline but before departure; an expired-deadline replacement requires a Coordinator request and DSA authorisation followed by manual reopening; any approved-student withdrawal after final namelist clearance requires an updated list and renewed DSA approval even without a replacement; DSA may approve an actual final roster below the trip's maximum capacity; first-come-first-served slot reservation by pending plus approved join requests; immediate Coordinator confirmation only after reviewing the mandatory parent/guardian consent letter; student self-withdrawal before the trip begins; Coordinator-controlled manual reopening of vacant slots; DSA-authorised deadline extension; DSA-authorised cancellation of approved trips; and DSA's separate formal approval of the final namelist and combined consent package before departure. Do not accidentally restore the earlier rule that pending requests do not occupy slots.

Most importantly, follow the build order. Complete Step 0 first, report your findings and proposed plan, and wait for my **"go"** before writing application code.

## Step 2 implementation notes (2026-11-08)

- [x] PostgreSQL schema, constraints, session, assignments, consent and final-list versioning tables authored.
- [x] Source data extracted to db/seed-data.json and six supplied photos extracted.
- [x] Guarded idempotent demo seed implemented with two relative-date demos and one synthetic archived trip.
- [x] Source fixture assertions and JavaScript syntax checked.
- [ ] Execute schema on live PostgreSQL and run npm/Jest suite (runtime dependencies unavailable in this container).
- [ ] Official Student Travel Form PDF still missing.
- [ ] Verify photo reuse rights before public deployment.

Resend chosen as production email provider; Cloudflare R2 chosen as private production object storage.
Do not proceed to Step 3 until the user says next.


## Implementation progress (2026-11-08)
Step 4 password recovery and change-password code has been added. Full integration requires installed dependencies, PostgreSQL and provider credentials. Stop before Step 5 until the user says next.

## Step 6 implementation note (2026-11-08)

- [x] Shared responsive header/footer and original Sherubtse TripHub project logo SVG.
- [x] Buttons, form controls, status badges, toasts, modal dialog, loading/empty/error states and mobile menu.
- [x] Student-only navigation with Organise a Trip anchor and conditional My Coordinating Trips link.
- [x] Demo-only public design-system route for UI verification; does not write backend data.
- [x] JS syntax validation and static inspection.
- [ ] Run Jest/Supertest and live browser/DB checks once npm dependencies and PostgreSQL are available.
- [ ] Do not proceed to Step 7 until the user says "next".


## Build progress (2026-11-08)
- [x] Step 7 — Public destinations: gallery, detail, photos, lightbox, seasonal notices, comparison and public eligible-trip lookup.
- [ ] Step 8 — Student proposal editor; do not start without user saying next.


## Step 8 implementation (2026-11-08)
- [x] Student-owned private draft list, editor, and strict submission-readiness preview.
- [x] Transactional trip details, cost items, and itinerary creation/update.
- [x] Do not submit to DSA or grant Coordinator permissions (Step 9).
- [x] JavaScript syntax checks and proposal-validation tests authored.
- [ ] Run all Jest/Supertest suites and PostgreSQL integration tests when dependencies and database are available.
- [ ] Stop and wait for user 'next' before Step 9.


## STEP 9 IMPLEMENTATION NOTE
Supporting attachments, versioned submission and DSA reviews are implemented in `routes/review.js`, `controllers/reviewController.js`, `models/ProposalReview.js` and `db/step9-proposals-migration.sql`. See `docs/STEP9_REVIEW.md`. Integration test execution is still blocked by unavailable npm dependencies and a live PostgreSQL service. Do not proceed to Step 10 without user instruction.


## Step 11 implementation record (2026-11-08)

- [x] Created Coordinator `open`, `close`, and `reopen` registration actions behind active trip-scoped authorization and database row locking.
- [x] Added protected Student consent upload, multipart CSRF handling, actual file-content validation, and private storage.
- [x] Added pending-slot reservations, Student My Trips, withdrawal reason, closed vacancy gate and invalidation of approved final-list snapshots on approved-student withdrawal.
- [x] Added `registration_events` audit table to fresh schema and Step 11 migration for existing databases.
- [x] Added Step 11 test source and testing guide.
- [ ] Run Jest/Supertest and live PostgreSQL/R2/browser concurrency tests in the user's configured environment.
- [ ] Step 12 Coordinator review, consent correction, approval/rejection and deadline-extension decisions remain unimplemented.
- [ ] Stop here; do not proceed to Step 12 before the user says `next`.

<!-- IMPLEMENTATION TRACKING (2026-11-08): Step 12 source files added; consent review, corrected upload, individual participant decisions and replacement-deadline DSA queue. Step 12A final namelist PDF/clearance is not yet implemented. Live npm/Jest/DB/R2/email integration tests are outstanding. Stop and wait for user to say 'next'. -->

<!-- IMPLEMENTATION TRACKING (2026-11-08): Step 12A PDF construction, immutable submission history, DSA review UI, clearance guard and invalidation triggers implemented. npm/Jest/live PostgreSQL/R2 browser verification remains outstanding. STOP until next. -->

<!-- Step 13 (2026-11-08): private itinerary/announcements routes, print layout, new immutable DSA resubmission on material edits, input tests. Stop until user next for Step 13A. Live npm/DB tests outstanding. -->

<!-- Step 13A: original two-page PDF supplied and preserved as private_templates/Student-Travel-Form.pdf; official unsigned form generator, private storage, immutable snapshots, guarded routes, migration, tests and docs added. Stop before Step 14. Live integration tests pending. -->


## Step 14 implementation note
Packing lists implemented with destination/trip suggestions, user-owned items, Fetch API updates, optimistic rollback and progress indicators. Step 14 is source-complete but npm/Jest and live PostgreSQL tests remain unverified. STOP before Step 15 until user says next.

## Step 15 implementation note
Financial page, Coordinator-only actual expense/contribution writes, approved-Student own-contributions view, Nu. summaries, indicative balances, tests and manual guide added. Existing schema reused. Static and direct pure checks passed; npm/Jest and live DB tests are outstanding. STOP before Step 16 until user says next.


## Implementation checkpoint — Step 16
Step 16 source files: `models/Attendance.js`, `controllers/attendanceController.js`, `routes/attendance.js`, `views/trips/attendance.ejs`, `tests/step16-attendance.test.js`. Do not begin Step 17 until explicitly instructed.


### Step 17 completion note
MongoDB feedback implementation added: reusable `config/mongo.js`, trip-scoped `models/Feedback.js`, Student and Coordinator views/routes, and database uniqueness indexes. Run the Step 17 tests with MongoDB and PostgreSQL before declaring runtime verification. Stop before Step 18 until user says next.


## Progress note — Step 18
Trip completion, immutable final report, audit events, DSA cancellation and a repeatable lifecycle reconciliation command were implemented. Integration tests require running PostgreSQL, MongoDB and npm dependencies. Do not begin Step 19 without user permission.

## Progress note — Step 19
Help and administration source added: public About/FAQs/rules/emergency guidance/credits and sample testimonials; Superadmin overview and platform record management (including DSA account provisioning and destination photos); read-only trip Coordinator oversight; DSA proposal/final-list/completion history; maintained pre-existing DSA assignment/handover routes. Existing 404/500 pages retained. JavaScript syntax and dependency-isolated checks passed. Full Jest, browser, database and R2 runtime verification remain pending. Stop before Step 20 until user says next.


## Progress note — Step 20

Added read-only `GET /api/trips`, `GET /api/trips/:id`, and `GET /api/destinations`; all reuse existing public models and projected JSON fields. Trip publication requires DSA-approved, active, planned/upcoming trips with active lead assignment. Registration state uses explicit opening, deadlines, pending+approved capacity, and manual reopening rules. Added JSON error handling, Jest unit/controller tests, a Postman collection, and `docs/STEP20_REST_API.md`. JavaScript/static checks and isolated controller smoke checks passed; full Jest, real PostgreSQL and Postman tests remain outstanding until dependencies and databases are installed. Stop before Step 21 until user says next.


## Step 21 implementation status
Dockerfile, .dockerignore, GitHub Actions workflow, release preflight and release invariant tests have been added. Execute npm run check:release and npm test. Full integrated tests have NOT passed in the authoring environment because npm dependencies and databases are unavailable. Only proceed to Step 22 after explicit user instruction.
