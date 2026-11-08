# Step 12A: Final namelist and DSA pre-departure clearance

## What is implemented

- Active lead Coordinator builds an immutable, numbered final approved-participant snapshot.
- Only **approved** participants with **current, verified** consent files are included. An 8-person list is valid for a 10-place trip.
- A privately stored, SHA-256 checked PDF contains a cover/namelist, each participant's label page, and their original PDF pages or image converted to a PDF page.
- DSA has a separate queue to approve, request corrections, or reject a package, and every decision has an append-only event.
- Withdrawals, newly approved participants, and current consent modifications supersede clearance. A new submission, even with a smaller list, is required.
- A PostgreSQL trigger refuses an `operational_status` transition to `ongoing` unless the **latest** version is approved and matches the current roster and verified document IDs/versions.
- The package is **not** the official Student Travel Form or a replacement for institutional signatures/authorization.

## Setup

1. Keep all previous database migrations applied, including Step 12.
2. Run `db/step12a-final-namelist-migration.sql` in pgAdmin.
3. Run `npm install` to add `pdf-lib` and then `npm test`.
4. Start `npm run dev` with a configured PostgreSQL database, session secret, and private local storage (`STORAGE_MODE=local`) or Cloudflare R2.
5. With an approved trip and active lead assignment, approve at least one participant after verifying their current consent letter.
6. Open `/workspace/trips/TRIP_ID/final-namelist` as the lead. Submit a final package.
7. Log in as DSA; visit `/workspace/dsa/final-namelists` and inspect the exact PDF and the roster. Approve it.
8. Withdraw a participant. The trip should become **Not cleared for departure**. The lead must submit a new smaller roster and DSA must approve it again.

## Security and concurrency manual checks

- Assistant may view but cannot submit a final package. An unrelated Student receives 403.
- Unauthenticated PDF download redirects to login; unrelated Students receive 403.
- DSA sees only submitted files, not private public URLs; the PDF is fetched through protected server routes.
- DSA cannot approve an outdated/superseded version. A rejection or correction must have remarks.
- Two concurrent lead submissions cannot create two pending versions; the database locks the trip and enforces a unique pending index.
- A full trip cannot accept additional requests; final submissions do not change capacity or deadlines.
- Database manual attempt: `UPDATE trips SET operational_status='ongoing' WHERE id=TRIP_ID;` must fail without valid current DSA clearance.
- Review multi-page PDFs and image attachments visually in the PDF preview; damaged/encrypted files are refused by the PDF assembly process.

## Not yet verified here

Runtime `npm test`, PostgreSQL transactions/triggers, private R2 object downloads, and browser flows require dependencies and working external services, which are not available in this runtime. Do not treat source-level implementation as production verification.
