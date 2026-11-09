-- Additive coordinator-controlled public visibility and DSA audit history.
-- Apply after db/step18-lifecycle-migration.sql; never rerun db/schema.sql on an existing database.
BEGIN;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS is_publicly_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS trip_public_visibility_events (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK(action IN ('hide','show')),
  reason TEXT CHECK(reason IS NULL OR length(reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_public_visibility_events_history
  ON trip_public_visibility_events(trip_id,created_at DESC,id DESC);

COMMIT;
