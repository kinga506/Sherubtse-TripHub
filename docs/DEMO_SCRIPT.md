# Sherubtse TripHub — Student-friendly demo script

**Suggested use:** Academic demonstration with fictional accounts and seeded sample records only. Never present sample approvals as actual college decisions. The timings below are illustrative rather than measured runtime durations.

## Opening

“Sherubtse TripHub is our academic web application for organizing college group trips. Students can explore destinations, prepare proposals, request to join with parent or guardian consent, and follow an organized approval process. DSA reviews proposals and final participant lists, while assigned student Coordinators manage only their own trips.”

## Part 1 — Public visitor and Student

Open `/`, `/destinations`, `/trips` and `/api/destinations`. Explain that destinations and travel budgets come from the supplied TripPack reference. Public trip pages show only eligible DSA-approved trips; they do not show private consent letters. Visit `/auth/signup`, explain Student-only email signup and verification, then log in using a prepared verified nonproduction Student account.

Go to `/workspace/proposals/new`. Explain trip details, itinerary, estimated cost and supporting-document upload. Open `/workspace/proposals`, select a preprepared draft, and demonstrate preview and submission. **Avoid submitting real personal documents during a classroom presentation.**

## Part 2 — DSA approves the proposal

Switch to a separate demo DSA account. Open `/workspace/dsa/proposals` and show its proposed destination, budget, itinerary and private supporting files. Explain “request changes”, “reject” and “approve”. Show the requirement to assign a lead student and optional assistants. Emphasize: “The student remains a Student; Coordinator access belongs to one particular trip.” DSA approval does **not** automatically open registration.

## Part 3 — Registration, consent and pre-departure clearance

As the assigned Coordinator, open the trip registration page. As a different Student, visit `/trips/:id/join` and demonstrate a test consent-letter request. Explain that pending requests use a seat, corrections preserve the seat, uncorrected invalid consent can be rejected, and reopening a vacancy is always a Coordinator action. Show the Coordinator request-management workspace.

As lead Coordinator, open `/workspace/trips/:tripId/final-namelist` and explain the combined namelist/consent PDF. Switch back to DSA to review it. Highlight that an 8-of-10 roster can be approved; a later withdrawal invalidates clearance until the updated roster is approved again.

## Part 4 — Running and closing the trip

Show itinerary/announcements at `/workspace/trips/:tripId/updates`, packing at `/workspace/trips/:tripId/packing`, finance at `/workspace/trips/:tripId/finance`, attendance at `/workspace/trips/:tripId/attendance`, and the unsigned official form at `/workspace/trips/:tripId/student-travel-form`. Explain that finance only records external payments, and official paperwork still needs the proper real-world signatures and authorizations.

Finish at `/workspace/trips/:tripId/final-report`: explain that final report submission archives the trip and terminates its lead/assistant assignments without deactivating Student accounts. Point out that MongoDB stores post-trip ratings, while PostgreSQL manages structured trip data.

## Possible tutor questions

**Why MVC?** The route accepts a request, controller validates/coordinates it, model queries PostgreSQL, EJS renders the response.

**Why PostgreSQL and MongoDB?** Structured users, trips, approvals and payments *records* require relational constraints; MongoDB stores feedback documents. No online payment processing is built.

**Why are pending requests counted?** A pending student has reserved a place while consent is reviewed; counting pending and approved requests prevents overbooking.

**Can a Coordinator approve their own proposal?** No. Only DSA approves the proposal, assigns lead/assistants and formally clears the final roster.

**Is this website live?** Say “The code and deployment configuration are prepared, but full end-to-end testing and deployment have not yet been verified.” Do not claim a live site without a confirmed running URL.
