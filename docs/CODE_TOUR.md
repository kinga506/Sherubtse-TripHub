# Sherubtse TripHub — Beginner-friendly code tour

## Architecture in one sentence

**Browser → Express route → middleware → controller → model → PostgreSQL/MongoDB → EJS or JSON response.**

## Startup

`server.js` loads environment settings with `dotenv`, establishes the MongoDB connection and starts the Express app from `app.js`. `app.js` configures middleware, views, static assets and route modules. `config/env.js` checks settings and forbids unsafe production choices such as log-only email or local-only private file storage.

## Routes and controllers

A route describes the URL and HTTP method (for example `GET /api/destinations`); a controller receives the request, checks data and chooses what to return. See `routes/api.js` with `controllers/publicApiController.js`. Student proposal routes are under `routes/proposals.js`; DSA submission/review uses `routes/review.js`; consent review is in `routes/joinReview.js`; financial operations use `routes/finance.js`.

## Models and databases

PostgreSQL via pg-promise holds users, destinations, proposals, assignments, registrations, consent metadata, attendance, expenses and final reports; see `config/db.js`, `models/` and `db/schema.sql`. MongoDB holds only trip feedback; see `config/mongo.js` and `models/Feedback.js`. Feedback references PostgreSQL numeric IDs, which are not enforced as cross-database foreign keys; eligibility is checked in the application.

## Views and frontend

`views/` contains EJS page templates; `public/` holds CSS, images and browser JavaScript. Shared headers, footers and responsive styles are used across pages. `Fetch` updates checklists without requiring a full page refresh. JSON API routes return data for clients such as Postman.

## Security

`middleware/` and database checks enforce Student/DSA/Superadmin access and per-trip assignments. A Coordinator is **not** a permanent user role. Authentication uses PostgreSQL-backed sessions, bcrypt and email verification. Uploaded consent letters and proposals are kept in private storage; production targets Cloudflare R2. Never place private files in the public assets directory.

## Example: Student joining a trip

1. Student opens `/trips/:id/join`.
2. Authorization confirms a verified Student account.
3. Controller validates the reason and uploaded consent file.
4. Model locks the trip's capacity row in a transaction and counts **pending plus approved** requests.
5. If eligible, it stores the request with status `pending` and a versioned private consent document.
6. An assigned Coordinator can verify, request correction, approve or reject; all decisions are audited.
7. The lead later submits a separate combined consent package to DSA for formal pre-departure TripHub clearance.

## Tests and delivery

`tests/` includes Jest/Supertest tests. `npm run check:release` verifies file presence and JavaScript syntax but does **not** exercise database or browser behavior. `docs/SETUP_GUIDE.md` explains testing, environment variables and deployment. `.github/workflows/test.yml` defines CI, but requires a real successful GitHub run before it can be called passing.
