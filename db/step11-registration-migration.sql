-- Step 11: auditable registration opening/closing/reopening and withdrawal.
-- Apply once to existing Step 10 database through pgAdmin; no existing tables are dropped.
BEGIN;
CREATE TABLE IF NOT EXISTS registration_events (
 id BIGSERIAL PRIMARY KEY,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 participant_id BIGINT REFERENCES participants(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('open','close','reopen','withdraw')),
 reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registration_events_trip ON registration_events(trip_id,created_at DESC);
COMMIT;
