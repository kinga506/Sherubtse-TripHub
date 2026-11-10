# Step 17 — MongoDB trip feedback

Feedback uses the **native MongoDB driver** in `config/mongo.js`. PostgreSQL remains the source of truth for approved participation and trip-specific Coordinator history; MongoDB stores feedback only. MongoDB `tripId` and `studentId` are numbers copied from PostgreSQL, not cross-database foreign keys.

## Setup

1. MongoDB feedback is enabled by default. Install or start MongoDB Community Server locally, or use a private MongoDB Atlas cluster. Run `npm install` to add the native `mongodb` package.
2. Set `ENABLE_MONGODB=true` and `MONGO_URI=mongodb://127.0.0.1:27017/sherubtse_triphub_feedback` in `.env` for local development. In Atlas, store the private `mongodb+srv://...` URI in the environment; never commit credentials.
3. When enabled, the application starts **one reusable connection** before listening for HTTP traffic. Startup creates a unique index on `(tripId, studentId)` and a trip/date index. If MongoDB is enabled but unreachable, startup logs a safe diagnostic and continues with feedback disabled for that process. Restore Atlas connectivity and restart to enable it again. To intentionally run without MongoDB, set `ENABLE_MONGODB=false` and omit `MONGO_URI`; feedback routes return HTTP 503 with “Trip feedback is temporarily unavailable,” while PostgreSQL features and final reports remain available.
4. Run `npm test` and `npm run dev`. The temporary `/mongo-test` route was **not retained**: connection success at startup plus application tests are the verification path. `GET /health` is a basic app health route, not proof that MongoDB is healthy later.

## Manual verification

- Use a verified Student account with **approved participation** on a trip whose end date has passed and whose operational status is `awaiting_final_report` or `completed`.
- Open `/workspace/trips/TRIP_ID/feedback` and submit rating 1–5 plus a comment. Reopen the page: the stored feedback should appear, and the form should disappear.
- Try submitting again: expect HTTP 409 (one review per student per trip).
- A pending, rejected, or unrelated Student cannot submit or access this feedback form (HTTP 403). A trip that has not ended cannot receive feedback.
- A Student with a past **lead or assistant** assignment can view `/workspace/trips/TRIP_ID/feedback/summary` even after the assignment has ended. An unrelated user must receive HTTP 403. Students cannot read another student's feedback through a general MongoDB query.
- Check that the `sherubtse_triphub_feedback.feedback` collection contains `{tripId, studentId, studentName, rating, comment, createdAt}`.

## Security and current limitations

- MongoDB is not publicly exposed by Express. GET and POST routes require an authenticated Student; PostgreSQL authorizes each trip and person before MongoDB is queried.
- Feedback is append-only in Step 17; edit/delete, moderation and online payments are outside this feature.
- The final report (Step 18) will use feedback available when submitted as a fixed snapshot. Feedback submitted afterward must not retroactively change the report.
- End-of-trip automatic operational transitions are implemented in Step 18. For Step 17 tests, use an actual ended trip in `awaiting_final_report` or `completed`.
- Test feedback with fictional demo identities; do not seed fabricated real feedback or claims about actual trips.
