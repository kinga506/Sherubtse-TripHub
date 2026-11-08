# Step 20 — Public REST API

The public read-only endpoints return JSON and reuse the existing `PublicTrip` and `Destination` PostgreSQL models.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/trips` | Up to 100 published upcoming trips, with search and filters |
| GET | `/api/trips/:id` | One published upcoming trip and its estimated cost items |
| GET | `/api/destinations` | Active destinations and their public photographs |

Trip filters: `q` (title or destination), `dzongkhag`, `registration` (`all`, `open`, `closed`), and `sort` (`soonest`, `cost_low`, `cost_high`). Invalid choices fall back to safe defaults.

## Privacy and permissions

- Trip listings use the same `PublicTrip` visibility predicate as `/trips`: DSA-approved, active, planned/upcoming trips with an active lead Coordinator.
- No draft, pending-DSA, rejected, changes-requested, completed, or cancelled trip is exposed by these endpoints.
- `registration.open` is true only if the approved trip has been explicitly opened by an assigned Coordinator, has free capacity, is not held closed, and has an unexpired deadline.
- Pending and approved requests BOTH occupy seats. `approved_participants` counts only approved requests.
- No proposal documents, consent letters, personal student data, Coordinator assignments, DSA remarks, financial contributions, or private report fields are returned.
- The API includes no mutation methods. Completed trips remain unavailable from this public upcoming-trips API; read-only history is handled through separate authorized workspaces.
- Unknown or non-public trip IDs receive HTTP 404 with `{"error":"Trip not found"}`. Internal errors use the existing central server error handler; replace it with JSON for API errors if running API requests (added in Step 20).

## Local test commands

1. Apply database schema and prior migrations and seed the test dataset.
2. Run `npm install`, `npm test`, then `npm run dev`.
3. Import `docs/postman/Sherubtse_TripHub_Public_API.postman_collection.json` into Postman. The collection uses `baseUrl = http://localhost:3000`.
4. Verify a published approved trip appears in `GET /api/trips`, while a draft ID returns 404 from `GET /api/trips/:id`.
5. Compare open/closed/status counters against `/trips` in the browser, especially pending reservations that occupy seats.
6. Try POST to `/api/trips` and confirm it fails rather than changing the database.

The optional estimated breakdown contains source-based items only. Source sample trips may have an empty array with an explanatory `estimated_budget_note`.

## Testing limitations

Run integration tests on a real local PostgreSQL test database and verify a Postman session manually. These have not been verified in this packaging environment.
