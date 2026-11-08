# Step 14 — Packing checklist

## Installation / migration

1. Complete Steps 1–13A and configure `.env` and PostgreSQL.
2. If it has not yet been applied, run `db/schema.sql` and seed the reference trips with `npm run seed` (development only).
3. In pgAdmin, execute `db/step14-packing-migration.sql` **after** the source trips are seeded. It adds `destination_packing_suggestions` and copies the original sample-trip packing suggestions to matching destinations. Since the cultural/nature sample visits both Chorten Kora and Bumdeling, its packing suggestions populate both destinations.
4. Run `npm install`, `npm test`, then `npm run dev`.

## Test the UI

1. Log in as an **approved participant** and open My Trips → My packing checklist.
2. Add an item; reload, check ownership and persistence. Toggle its checkbox and observe progress change.
3. Copy destination and trip suggestions; clicking copy again should not create duplicates.
4. Disconnect the browser from the network, toggle an item and confirm the checkbox reverts and shows an error.
5. Use a different Student account and try the original participant's item ID: the request must fail; nobody may change another student's checklist.
6. Log in as an **active assigned Coordinator**; add and remove a trip-level suggestion. An unrelated student, DSA account or inactive Coordinator must not be able to alter suggestions.
7. Archive a test trip and confirm the checklist remains visible to approved participants while all changes are rejected by the server.
8. Attempt a POST without a valid `x-csrf-token` to confirm 403. Attempt malformed IDs to confirm 400.

## Architecture

`models/Packing.js` owns PostgreSQL reads/writes. All mutations use parameterized queries, a transaction, a trip row lock and ownership/role rechecks. `controllers/packingController.js` handles requests; `routes/packing.js` protects all endpoints, and `/public/js/packing.js` uses Fetch with optimistic checkbox updates and rollback. Source suggestions are derived from `TripPack.docx`; no new packing advice was invented. Participants' personal items are never shared with Coordinators or other participants.

## Unverified

Jest and live PostgreSQL/browser execution are not verified in this environment because npm packages and PostgreSQL are unavailable. Do not regard the implementation as production-ready until the checks above pass.
