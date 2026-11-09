# Step 19 — Public trip visibility

Public trip discovery uses a shared SQL predicate in `models/PublicTrip.js`. A trip is listed only when DSA approved it, it is active and not a sample, its operational state is planned or ongoing, it has an active lead, the destination is active, it is not coordinator-hidden, and its end date has not passed in the Asia/Thimphu calendar.

The public `public_stage` is `upcoming` before the Bhutan-local start date and `ongoing` from that date through the end date. The SQL predicate evaluates the Bhutan-local date on each request, so ended trips disappear without a scheduled task. Public details and destination trip cards use the same predicate. Join pages use the same public detail lookup, and join submissions recheck the hidden/sample/operational/date conditions after locking the trip row. Private My Trips links use a participant-owned workspace view so existing requests are not lost when public visibility changes.

Only the active lead Coordinator can change visibility. The server checks the assignment again while holding a row lock on the trip. A hide/show event is written in the same transaction as the `is_publicly_hidden` update. The DSA trip-lifecycle view displays visibility state and the complete event history. Visibility updates do not update registration state, participants, consent documents, namelist submissions, or assignments.

## Additive migration

Filename: `db/step19-trip-visibility-migration.sql`

Run it once after `db/step18-lifecycle-migration.sql` against a reviewed, nonproduction database before deploying this source. For an existing production database, review the SQL and take the normal database backup first; this project does not automatically apply migrations on Render. Never run the full `db/schema.sql` over an existing production database.

The migration adds `trips.is_publicly_hidden BOOLEAN NOT NULL DEFAULT FALSE` and the append-only `trip_public_visibility_events` audit table. It does not alter or delete trip or participant records.

## Checks

- In My Coordinating Trips, a lead sees the visibility status and Hide/Show control; an assistant sees the status but cannot change it.
- Hiding an eligible trip removes it from `/trips`, `/trips/:id`, the join page, destination trip cards, and the public API. The trip remains in internal participant and Coordinator workspaces.
- If registration was open when hidden, the confirmation dialog warns that discovery ends while registration remains open. Direct join submissions are blocked until the lead restores visibility.
- Restoring a trip rechecks its current approval, active state, sample status, operation state, active lead and Bhutan-local end date under the database transaction. An ended, completed, cancelled, inactive, or otherwise ineligible trip cannot be restored.
- DSA can inspect each approved trip's status and all visibility events, including the actor, timestamp, and optional reason.
