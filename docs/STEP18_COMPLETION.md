# Step 18 — Trip completion, final report and archive

## Migration and runtime
1. In pgAdmin apply `db/step18-lifecycle-migration.sql` after the base schema and previous migrations (especially Step 12A).
2. Ensure PostgreSQL, MongoDB and session credentials are configured. Run `npm install`, `npm test` and `npm run dev`.
3. Schedule `npm run reconcile:trips` periodically (for example every 15 minutes in an external scheduler). This command is also safe to run repeatedly. Relevant trip-specific HTTP requests reconcile a trip at request time. All date comparisons use Bhutan local calendar dates.
4. Production notifications use the selected API provider. Google Apps Script uses `EMAIL_MODE=api`, `EMAIL_PROVIDER=google-apps-script`, `GOOGLE_SCRIPT_URL` and `GOOGLE_SCRIPT_SECRET`; Resend remains an alternative. The database outbox preserves unsent cancellation and departure-block notices for retry.

## Manual verification checklist
- Approved future trip remains planned. When start date arrives, a current DSA-approved final roster is required before ongoing; missing clearance records `departure_blocked` and queues a DSA notification. Check migration trigger also blocks a direct SQL transition.
- After end date, the status becomes `awaiting_final_report`, registration closes, and attendance, expenses and contributions can be finalized by assigned Coordinators. Other ordinary trip-management actions should remain read-only.
- The active lead may open `/workspace/trips/:tripId/final-report`. An assistant must receive HTTP 403 on report submission. The lead must enter an explicit incident statement, even when no incident occurred.
- Submit after recording attendance. Verify `trip_final_reports` contains frozen JSON attendance/category totals, expense and contribution totals, an explicit incident statement and a feedback count/summary from MongoDB at submission time.
- Confirm the transaction makes the trip `completed`, closes registration, records `completed_at`, and ends *all* active Coordinator assignments with `ended_at`. Accounts in `users` remain unchanged.
- A former Coordinator and DSA may view the archived report, but may not edit ordinary management data or submit a second report. Feedback submitted later does not rewrite the stored snapshot.
- DSA may cancel a non-completed approved trip at `/workspace/dsa/trip-lifecycle` with a required reason. Cancellation preserves history, ends assignments, closes registration and queues notifications. Student/Coordinator/Superadmin cannot use the DSA cancellation endpoint.
- Repeat reconciliation and cancellation attempts to check idempotency and rejection of invalid transitions.

## Verification limits
Source syntax and isolated rule checks are not database integration tests. Test live transaction atomicity, concurrent submissions, MongoDB snapshots, and mail delivery in a configured environment before deployment.
