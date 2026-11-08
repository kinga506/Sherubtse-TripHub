-- Step 18 lifecycle audit and DSA cancellation notifications.
-- Apply after schema.sql and the Step 12A migration.
BEGIN;
CREATE TABLE IF NOT EXISTS trip_lifecycle_events (
 id BIGSERIAL PRIMARY KEY,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 actor_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('started','departure_blocked','awaiting_final_report','completed','cancelled')),
 reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trip_lifecycle_events ON trip_lifecycle_events(trip_id,created_at DESC,id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_lifecycle_once ON trip_lifecycle_events(trip_id,action)
 WHERE action IN ('started','departure_blocked','awaiting_final_report','completed','cancelled');
CREATE TABLE IF NOT EXISTS trip_lifecycle_notifications (
 id BIGSERIAL PRIMARY KEY,
 event_id BIGINT NOT NULL REFERENCES trip_lifecycle_events(id) ON DELETE RESTRICT,
 recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 subject TEXT NOT NULL,
 message TEXT NOT NULL,
 sent_at TIMESTAMPTZ,
 last_error TEXT,
 UNIQUE(event_id,recipient_user_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_unsent ON trip_lifecycle_notifications(sent_at) WHERE sent_at IS NULL;
COMMIT;
