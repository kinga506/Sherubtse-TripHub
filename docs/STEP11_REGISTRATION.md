# Step 11 — Registration and Consent Uploads

This stage adds Student join requests and the Coordinator-controlled registration gate. **It does not yet implement review, consent correction, approval/rejection, or final namelist preparation**; those are Steps 12 and 12A.

## Database

Existing Step 10 installations: execute `db/step11-registration-migration.sql` once in pgAdmin. Fresh installations can run the updated `db/schema.sql` instead. Never recreate or drop the database containing previous records.

## Routes

- `GET /workspace/trips/:tripId/registration`: active trip-specific lead/assistant Coordinator only.
- `POST /workspace/trips/:tripId/registration`: CSRF-protected action `open`, `close`, or `reopen`.
- `GET /trips/:id/join`: signed-in verified Student only; only DSA-approved public trip detail can be used.
- `POST /trips/:id/join`: multipart Student request, required cost/safety/availability confirmations and actual PDF/JPG/PNG consent bytes.
- `GET /workspace/my-trips`: only the signed-in Student's requests.
- `POST /trips/:id/withdraw`: Student may withdraw their own pending/approved request before the trip starts.

## Storage and concurrency

Local development uses private local storage. On Render, configure Cloudflare R2; do not use a publicly accessible bucket. No direct public file routes are provided. The uploaded object is written before the transactional participant+consent inserts; failed transactions trigger best-effort object deletion. The `trips` row is locked `FOR UPDATE` before checking counts or changing capacity, so two requests cannot simultaneously claim the final seat. Pending and approved requests both count as occupied. Withdrawal always closes the vacancy gate; only an active Coordinator may explicitly reopen it while the deadline and all opening requirements are valid.

Consent letters are stored with `pending_review` status. Upload alone does not constitute verified consent, a confirmed participant, final namelist clearance, or official institutional travel-form approval.

Withdrawal of an approved participant invalidates any formerly approved final namelist snapshot. After the registration deadline, a student may withdraw, but no replacement may register without the DSA-authorized extension workflow scheduled for Step 12.

## Local verification

1. Apply Step 11 migration to an existing project database.
2. Run `npm install`, then `npm test` and `npm run dev`.
3. Use an approved future trip with active lead assignment. Sign in as that lead, open `/workspace/trips/ID/registration`, and open registration.
4. Sign in as a separate Student. On `/trips/ID`, select Request to join; upload a real signed/unsigned sample PDF or JPEG for testing (it stays unverified), enter reason and confirm all boxes.
5. Check `/workspace/my-trips` for pending status and pending consent review; verify counters show one more occupied place but no more confirmed participants.
6. Test a missing or malformed file, a duplicate request, full capacity, and a different student's request. None should reserve an additional place.
7. Withdraw with a reason. The vacancy should remain inaccessible until the assigned Coordinator explicitly reopens it. Test reopening after the deadline; it must fail.

Security and concurrency tests involving a real PostgreSQL instance remain necessary before a production release.
