-- Step 12. Run in pgAdmin after Step 11. No existing records are removed.
BEGIN;
ALTER TABLE registration_events DROP CONSTRAINT IF EXISTS registration_events_action_check;
ALTER TABLE registration_events ADD CONSTRAINT registration_events_action_check CHECK (action IN ('open','close','reopen','withdraw','consent_verified','consent_correction','consent_replaced','participant_approved','participant_rejected','deadline_extension_requested','deadline_extension_approved','deadline_extension_rejected'));
CREATE TABLE IF NOT EXISTS registration_deadline_extensions (
 id BIGSERIAL PRIMARY KEY,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 original_deadline TIMESTAMPTZ NOT NULL,
 proposed_deadline TIMESTAMPTZ NOT NULL,
 vacancies_at_request INT NOT NULL CHECK (vacancies_at_request>0),
 reason TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
 reviewed_at TIMESTAMPTZ,
 review_note TEXT,
 requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(proposed_deadline>original_deadline)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_deadline_extension ON registration_deadline_extensions(trip_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS idx_extension_trip ON registration_deadline_extensions(trip_id,requested_at DESC);
CREATE TABLE IF NOT EXISTS participant_review_events (
 id BIGSERIAL PRIMARY KEY,
 participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 consent_document_id BIGINT REFERENCES participant_consent_documents(id) ON DELETE RESTRICT,
 actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('verified','correction_requested','replaced','approved','rejected')),
 note TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_events_participant ON participant_review_events(participant_id,created_at DESC);
COMMIT;
