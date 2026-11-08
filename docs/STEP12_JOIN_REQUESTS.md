# Step 12 — Join Requests, Consent Review, DSA Deadline Extensions

## Apply migration
Open pgAdmin for the existing TripHub database and execute `db/step12-join-review-migration.sql` after Step 11. If creating a new database, execute `db/schema.sql` first, then migrations in numbered order.

## Coordinator testing
1. Sign in as an active assigned lead/assistant for an approved trip, go to `/workspace/trips/:tripId/registration`, then **Review join requests**.
2. Open each student's private consent download. Select **Request correction**, with a note. The student stays pending and retains their held place.
3. As that student, visit `/workspace/my-trips` and upload a corrected PDF/JPG/PNG. A new consent version is stored; the old one remains retained.
4. Return as Coordinator, download the current letter, mark it reviewed, and approve immediately. Approval must fail if the current letter is not verified.
5. If a corrected letter is not supplied, the Coordinator can reject the pending request with a reason. The place is freed but held closed until a Coordinator manually reopens it. No auto-rejection timer exists.
6. Confirm Student B cannot inspect Student A's consent file by manipulating its ID. DSA can inspect files for institutional review, but cannot approve individual join requests.
7. After the original registration deadline, have a student withdraw. The student must still be able to withdraw before the start. The Coordinator requests a future replacement deadline through the join requests page. DSA reviews it at `/workspace/dsa/deadline-extensions`; an approval updates the effective trip deadline, but leaves both registration and the held vacancy closed. A Coordinator must explicitly reopen the held vacancy, then open registration if it was manually closed.
8. Verify original/new dates, actors, reasons, decisions and consent-review history in `registration_deadline_extensions`, `registration_events` and `participant_review_events`.

## Security and limitations
- No real consent authenticity or official signature is certified by a review button.
- No persistent queue/retry mechanism for email delivery: notification delivery is best effort and failures are logged. Status and review records remain authoritative.
- The UI is for the active trip Coordinators only. Configure the selected email provider (`google-apps-script`, Resend, or local log simulation) for notifications.
- Full production readiness requires npm dependencies, PostgreSQL migration, Jest/Supertest runs, live concurrency tests, and a configured R2 bucket.
- Formal combined consent package and departure clearance are intentionally **Step 12A**, not implemented in Step 12.

## Testing status at packaging time
JavaScript syntax validation succeeded. Three isolated Node.js model smoke cases passed (unverified-consent approval refused, rejected pending request accepted with decision reason, malformed deadline refused). The complete Jest, database, R2 and browser tests could not run because npm dependencies are not installed in this runtime.
