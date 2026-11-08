# Step 9 — Supporting documents and DSA review

## Setup

1. Start from the Step 8 database (`db/schema.sql` already applied).
2. In pgAdmin, apply `db/step9-proposals-migration.sql` **once**; it creates the version-to-attachment mapping and adds audited handover actions.
3. Run `npm install` (adds Multer and JSZip), `npm test`, then `npm run dev`.
4. Use `STORAGE_MODE=local` for local development. Production remains `STORAGE_MODE=r2` with private Cloudflare R2 credentials. Never make the bucket public.
5. Create and verify two student accounts and a provisioned DSA account before trying assignments.

## Test in browser

- Student: `/workspace/proposals/new` → save complete draft → `/workspace/proposals/:tripId/attachments` → upload PDF, DOC/DOCX, JPG/JPEG, PNG with title → preview → **Submit to DSA**. The draft disappears from public lists and becomes pending.
- DSA: `/workspace/dsa/proposals` → open the submitted proposal, inspect and download exact attached versions → choose lead Student (verified and active), optional assistants → Approve, Request Changes, or Reject. Request Changes/Reject require remarks.
- Request Changes: Student edits original draft, supersedes the old supporting document and uploads a replacement; resubmission produces a new numbered, immutable snapshot. DSA can inspect earlier submitted versions via version links.
- Approved trip: newly assigned Student sees `/workspace/coordinating-trips` but still signs in with a Student role. The lead/assistant may request DSA handover. DSA may reassign with a required reason. No Coordinator may directly appoint a successor.
- Material revision: Active Coordinator uses `/workspace/trips/:tripId/revise`. Saving resets approval to `pending_dsa`, closes registration, creates a reviewable submission, and preserves existing assignment history. DSA reapproves before public publication or new registration.

## Security checks

- Another Student cannot edit/download an unrelated draft or submit another student's proposal.
- DSA cannot see unsubmitted draft files, but can download historical versions submitted for review.
- Public visitors cannot see private documents. R2 object keys are never exposed in the UI.
- Invalid file magic and filenames/extensions are rejected; files are limited to 10 MB and 12 active attachments per proposal.
- Double-approval races are prevented by locking the trip row. Assignment writes and approval status changes happen in one PostgreSQL transaction.
- Submitted historical files are retained when superseded, and `trip_approval_history` remains append-only.
- On upload transaction failure, the new private object is deleted where possible; orphan cleanup should be monitored.

## Verification limitation

The artifact environment did not successfully install npm dependencies, so the Jest/Supertest suite, live database constraints, upload, and R2 delivery are not verified. Run and pass all integration tests against a dedicated test database before deployment. Step 9 does not implement join requests, consent letters, or final roster approval (later steps).
