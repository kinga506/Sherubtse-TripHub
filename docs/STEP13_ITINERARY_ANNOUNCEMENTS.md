# Step 13 — Itinerary and announcements

No schema migration is required. Uses existing `itineraries`, `announcements`, `trip_submissions`, `trip_approval_history`, and `trip_submission_attachments` tables.

## URLs

- GET `/workspace/trips/:tripId/updates`: approved participants, active assigned Coordinators, or DSA. A Coordinator may view while their trip is under re-review, but cannot publish until approval is restored.
- POST `/workspace/trips/:tripId/updates/activities`: add itinerary activity (assigned Coordinator).
- POST `/workspace/trips/:tripId/updates/activities/:activityId`: edit itinerary activity (assigned Coordinator).
- POST `/workspace/trips/:tripId/updates/activities/:activityId/delete`: remove activity (assigned Coordinator; cannot remove final activity).
- POST `/workspace/trips/:tripId/updates/announcements`: post an optional important announcement (assigned Coordinator).

## Approval protection

A material itinerary edit is wrapped in the same DB transaction as a new immutable proposal snapshot. It changes approval to `pending_dsa`, closes registration, and creates an `approval_reset` audit event. DSA must review the **new** version, and a Coordinator must separately reopen registration after approval. While waiting, ordinary writes are blocked. Small formatting-only edits are not automatically distinguished from material textual changes; this conservative implementation resets approval for any text change.

## Local checks

1. Apply existing schema and earlier migrations and seed data; configure `.env`.
2. Run `npm install`, `npm test`, and `npm run dev`.
3. With a DSA-approved trip, approve one participant. Verify a different Student receives HTTP 403 on its private updates URL. Verify the approved Student can read but cannot POST.
4. As an assigned Coordinator, post an important announcement and verify its badge. Test HTML escaping for titles and messages.
5. Edit an itinerary item; confirm registration closes, proposal enters DSA queue, submission number increments, and previous snapshot remains intact. Confirm further writes are denied while pending.
6. Approve the new proposal as DSA; check Coordinator can resume editing and manually reopen registration.
7. Test completed/cancelled trip updates are not editable. Print the page and confirm private controls and announcements are excluded.

## Verification limitations

Run real database transaction, role-scoped HTTP, print-preview, and regression tests locally. The provided execution environment may lack npm dependencies or a live PostgreSQL service. Do not treat syntax checks alone as production readiness.
