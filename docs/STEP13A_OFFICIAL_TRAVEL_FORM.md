# Step 13A — Official Sherubtse Student Travel Form

Source: the **actual supplied** `Student-Travel-Form.pdf` (two A4 pages, original 2025 college form). A copy is in `private_templates/Student-Travel-Form.pdf` and must remain unchanged. **Do not use** the unrelated passport signature form.

## Fields, from the official PDF

Page one: organiser name, programme, year, contact number, date and time of travel, destination, via, vehicle type/number, driver name and licence number. The student table contains rows 1–24 and columns SI, Name, Programme, Year, Hall, Destination. Page two continues rows 25–30. The safety undertaking and the organiser signature section are on page two. Original logos, contact information, headings, and blank signatures stay intact.

Meeting/gathering time **is not automatically assumed to be departure time**. Coordinator enters the actual travel time. Source document says: “Travel organizers shall not plan the time of travel before 05:00 AM and after 12:00 PM.” The intended interpretation of “after 12:00 PM” is ambiguous; show the exact instruction and request confirmation from DSA rather than validating it automatically.

## Deploy and test

1. Apply `db/step13a-student-travel-form-migration.sql` in pgAdmin.
2. Confirm the PDF template exists in `private_templates/` in both local development and Docker image. It is a fixed reference, not a private uploaded object.
3. Sign in as a Student with an active lead/assistant assignment for a live approved trip and visit `/workspace/trips/:tripId/student-travel-form`.
4. Complete missing driving, vehicle, actual travel time and approved-student details. Click Generate unsigned PDF.
5. Use Preview / print to open the protected PDF in a browser or download it. Inspect both A4 pages: all 30 possible rows, the two original logos and footer, original safety statement, no synthetic signatures or authorizations.
6. Try 0, 8, 24, 25, 30, and 31 approved students. The original form has 30 places; the app must never omit a 31st student.
7. Test a pending/rejected/withdrawn student: none may appear in generated records. Test direct PDF access as a stranger, previous Coordinator, DSA, and Superadmin (platform oversight does not grant access to personal form PDFs).
8. After completion, previously generated PDFs remain downloadable by former Coordinators or DSA; new generation is blocked.
9. Verify database audit snapshots and R2/private local storage; ensure no public direct object URL is returned.

The generation feature does **not** establish that the official form has been signed, submitted, endorsed or accepted. The trip's separate DSA final-consent-package clearance remains a different process.

## Verification limitations

Full Jest, PostgreSQL, protected browser session, and R2 integration checks must run in a configured environment. Do not mark those as passed based only on syntax checks.
