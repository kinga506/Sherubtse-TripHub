# Step 15 — Expenses and Student Contributions

## Purpose
This step records **actual expenses** and **manually collected contributions** in Nu. It does not handle online payments. The `trips.estimated_cost` figure remains the *estimated cost per student* and is never overwritten by actual expense entries.

## Pages
- `GET /workspace/trips/:tripId/finance`: active Coordinator sees all trip records; approved Student sees only their own contributions.
- `POST /workspace/trips/:tripId/finance/expenses`: add an expense (Coordinator only).
- `POST /workspace/trips/:tripId/finance/expenses/:recordId`: edit an expense (Coordinator only).
- `POST /workspace/trips/:tripId/finance/contributions`: record contribution (Coordinator only).
- `POST /workspace/trips/:tripId/finance/contributions/:recordId`: edit contribution for the same student (Coordinator only).

All mutations require CSRF checks, database-side active-assignment checks, a trip row lock, parameterised SQL, and an approved (noncompleted, noncancelled) trip. `awaiting_final_report` is writable so final expenses can be entered before archival.

## Calculations
- Total actual expenses: `SUM(expenses.amount)` for the trip.
- Total recorded contributions: `SUM(contributions.amount)` for the trip.
- Student estimated balance due: `MAX(estimated_cost - student_contributions, 0)`.
- Excess recorded: `MAX(student_contributions - estimated_cost, 0)`.
- Difference: recorded contributions less actual expenses, **not** a verified bank balance.

Student balances are *indicative comparisons*, not official fees or payment demands. They are unaffected by other students' records.

## Manual local verification
1. Apply the existing `db/schema.sql` and previous migrations to PostgreSQL; **Step 15 needs no schema migration**.
2. `npm install`, `npm test`, `npm run dev`.
3. Log in as an active assigned Coordinator on a DSA-approved trip; open `/workspace/trips/1/finance`, substituting its actual ID.
4. Create and edit expenses and contributions for approved participants, verifying totals and Nu. precision.
5. Log in as an approved participant: see only personal contribution history and their estimated balance. Try an unrelated user's trip ID and confirm 403.
6. Try a Student POST to an expense endpoint, a Coordinator POST for another trip, and a contribution for a nonparticipant. All must be denied.
7. After a final report archives the trip, confirm expense/contribution POSTs fail and history is read-only.
8. Verify CSRF protection, invalid dates, negative values and excess decimal places.

## Outstanding verification
The Jest suite, PostgreSQL integration, role-based browser checks and concurrent write checks must be run in an environment with installed npm packages and a running test database. No claim of payment or bank reconciliation is made.
