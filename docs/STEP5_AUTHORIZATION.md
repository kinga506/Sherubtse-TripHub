# Step 5 — Authorization and account security

- `middleware/authorization.js` checks authenticated sessions, roles and database-backed trip assignments. All trip checks use the canonical `:tripId` route parameter and `req.currentUser.id` from the verified server session.
- `models/Access.js` contains parameterized SQL access queries. A Student has no permanent Coordinator role. DSA alone creates assignments in the later DSA workflow; Superadmin has no Coordinator assignment bypass.
- `/workspace/student`, `/workspace/dsa`, `/workspace/superadmin` are role-gated placeholder dashboards. `/workspace/trips/:tripId/coordinator`, `/lead`, `/proposal/edit`, `/participant`, `/history` and `/workspace/api/trips/:tripId/coordinator` are guarded demonstrations. Dashboard business functionality is reserved for later steps.
- **Protected routes must never be created without the relevant middleware.** For any future routes serving private files, exports, thumbnails, PDFs, participant records, or JSON, apply the same check before retrieving data or issuing a signed R2 URL. Never use `express.static` for these files.
- A former Trip Coordinator may read historical records only when the trip is completed/cancelled/awaiting-final-report. History routes expose no mutation actions. Student record privacy must additionally be enforced by the relevant content controller before returning individual data.
- Default authentication response: browser redirects to login, APIs return 401; wrong role or permission returns 403; invalid trip IDs return 400, missing trips return 404. Never disclose private content before permission checks.

## Superadmin setup (authorised administrator only)

Public signup cannot create a Superadmin. Run this **only when an authorised administrator has independently confirmed the intended user, after checking their identity**. It does not create a Coordinator account.

```sql
BEGIN;
-- Replace the example address; execute only for an existing verified, active account.
UPDATE users
SET role='admin'
WHERE LOWER(email)=LOWER('AUTHORIZED_EXISTING_ACCOUNT_EMAIL')
  AND is_active=TRUE AND is_verified=TRUE AND role='student'
RETURNING id,email,role;
-- Verify exactly one intended row was returned before issuing COMMIT.
COMMIT;
```

Important: the database's Student-email CHECK constraint applies only to Student accounts. For institution-specific provisioned DSA accounts, follow approved administration procedures and never publicly expose elevated-role provisioning endpoints. In production, granting admin rights also requires auditing, revoking existing sessions and careful account recovery policies; do not treat this sample SQL as a complete operational provisioning system.

## Test this step

1. Apply the Step 2 schema and Step 3/4 migrations and seed the non-production demo database.
2. `npm install && npm test && npm run dev`.
3. Log in as a verified Student, DSA and Superadmin; verify each can open only the matching `/workspace/...` route.
4. For a demo Student assigned to trip ID `X`, try `/workspace/trips/X/coordinator`. Another Student should get HTTP 403. An active assistant must get 403 at `/workspace/trips/X/lead`.
5. Try the protected API directly without login (401) and with a Student lacking assignment (403). Check historical read access after assignment ending.
6. Confirm private uploads are not accessible using `/public/` or guessed URLs.

## Not yet implemented

Full dashboards, actual export/attachment routes, proposal changes, DSA approvals and participant management are later steps. Middleware exists now; it cannot protect routes that have not yet been built. Production database authorization and real HTTP integration need testing with a configured PostgreSQL instance.
