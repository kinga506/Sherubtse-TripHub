-- Step 13A: generated copies of the original unsigned Student Travel Form.
-- Apply after Step 12A. These records do NOT certify institutional submission or approval.
BEGIN;
CREATE TABLE IF NOT EXISTS student_travel_forms (
 id BIGSERIAL PRIMARY KEY,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 generated_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 form_version INT NOT NULL CHECK(form_version>0),
 fields_snapshot JSONB NOT NULL,
 participant_snapshot JSONB NOT NULL,
 pdf_storage_key TEXT NOT NULL UNIQUE,
 pdf_sha256 TEXT NOT NULL CHECK(length(pdf_sha256)=64),
 generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(trip_id,form_version)
);
CREATE INDEX IF NOT EXISTS idx_student_travel_forms_trip ON student_travel_forms(trip_id,form_version DESC);
COMMIT;
