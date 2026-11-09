# Step 19: Help and administration

This step uses the existing schema (`faqs`, `trip_rules`, `testimonials`, `destinations`, `destination_photos`, `programmes`, `users`, and history tables); no migration is needed.

1. The former shared public Help/FAQ/safety/photo-credit page has been removed. `/about` is a separate project About page; requests to `/help` use the standard 404 page.
2. Log in as a normal Student. `/workspace/superadmin` and its POST actions must return 403. A DSA account must likewise be forbidden from Superadmin changes.
3. Log in as Superadmin. Open `/workspace/superadmin`. Review counts and read-only Coordinator assignments. Update FAQ text, add a programme, deactivate a destination, and verify public destination filters reflect the change. Reactivate the destination.
4. Upload an 8 MB-or-smaller JPEG/PNG photo to an existing destination ID. Confirm it renders in the destination gallery. Try an invalid binary disguised as JPG; expect 422. Confirm uploads persist after restart in a configured persistent storage backend.
5. Create a test DSA account with a strong initial password. Log in using that account; confirm it can access `/workspace/dsa/history` but not Superadmin pages.
6. Confirm DSA alone can perform trip proposal decisions and handover through existing `/workspace/dsa/proposals/:tripId` workflows. A Superadmin must not gain Coordinator assignment write access.
7. Request an unknown URL (404) and intentionally trigger an error in a local test (500). Confirm neither page leaks stack traces or secrets.
8. Run `npm test` and verify CSRF protection on every management POST, including multipart photo uploads.

**Outstanding:** End-to-end DSA assignments, R2 uploads, role separation, and 404/500 behavior require a working PostgreSQL database and npm dependencies. This stage does not guarantee deployment readiness.
