# Step 16 — Attendance and CSV exports

## Features
- Per-date attendance for approved participants: present, absent, late, excused.
- Mark one person or all approved participants present for a selected day.
- Attendance dates must be valid ISO calendar dates within the trip period and cannot be marked in the future.
- Only active assigned Coordinators can change records and download attendance/expense CSVs.
- Approved participants can view only their own attendance (no roster or export access).
- After final-report archival, ordinary attendance is read-only; historical records are retained.
- Existing `attendance` and `expenses` tables suffice; **no migration is required**.
- Exports use RFC-style quoted CSV fields and prevent common spreadsheet formula injection.

## Test locally
1. Apply all previous migrations in order and start PostgreSQL.
2. `npm install && npm test && npm run dev`.
3. Sign in as an assigned Coordinator. Open `/workspace/trips/ID/attendance`.
4. With a trip currently underway, select a trip date on or before today; change one participant's status, refresh, and verify persistence.
5. Use **Mark all present**; confirm only approved participants appear and all their selected-date statuses change to `present`.
6. Download `/workspace/trips/ID/exports/attendance.csv` and `/workspace/trips/ID/exports/expenses.csv` and verify headers/values. Do not share these personal records publicly.
7. Sign in as an approved participant without Coordinator assignment. Verify they see only their own records, cannot POST changes, and cannot download CSVs.
8. Try invalid trip dates, future dates, withdrawn/non-approved participants, unauthorized account roles, and a completed trip.

## Deferred verification
Jest + PostgreSQL integration, actual browser rendering, parallel updates and CSV downloads must be tested against a running deployment before production use. If there is no active ongoing trip, use a controlled development test trip with appropriate dates.
