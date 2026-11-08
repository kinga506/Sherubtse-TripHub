-- Run after db/schema.sql. Historical submitted attachments remain immutable.
BEGIN;
ALTER TABLE trip_approval_history DROP CONSTRAINT IF EXISTS trip_approval_history_action_check;
ALTER TABLE trip_approval_history ADD CONSTRAINT trip_approval_history_action_check CHECK (action IN ('submitted','approved','changes_requested','rejected','resubmitted','approval_reset','seeded_demo','assignment_changed','handover_requested'));
CREATE TABLE IF NOT EXISTS trip_submission_attachments (
 submission_id BIGINT NOT NULL REFERENCES trip_submissions(id) ON DELETE RESTRICT,
 attachment_id BIGINT NOT NULL REFERENCES trip_attachments(id) ON DELETE RESTRICT,
 PRIMARY KEY (submission_id, attachment_id)
);
CREATE INDEX IF NOT EXISTS idx_submission_attachments_attachment ON trip_submission_attachments(attachment_id);
CREATE INDEX IF NOT EXISTS idx_trip_submissions_latest ON trip_submissions(trip_id,submission_number DESC);
-- Preserve assignment history even if an assigned student later becomes inactive.
CREATE OR REPLACE FUNCTION enforce_coordinator_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r TEXT; active_user BOOLEAN; verified BOOLEAN; dsa_role TEXT; trip_state TEXT;
BEGIN
 IF NEW.status='ended' THEN RETURN NEW; END IF;
 SELECT role,is_active,is_verified INTO r,active_user,verified FROM users WHERE id=NEW.user_id;
 IF r IS DISTINCT FROM 'student' OR NOT active_user OR NOT verified THEN RAISE EXCEPTION 'Coordinator must be an active, verified Student'; END IF;
 SELECT role INTO dsa_role FROM users WHERE id=NEW.assigned_by;
 IF dsa_role IS DISTINCT FROM 'dsa' THEN RAISE EXCEPTION 'Coordinator assignment must come from DSA'; END IF;
 SELECT operational_status INTO trip_state FROM trips WHERE id=NEW.trip_id;
 IF trip_state IN ('completed','cancelled') THEN RAISE EXCEPTION 'Cannot assign coordinator to ended trip'; END IF;
 RETURN NEW;
END; $$;

COMMIT;
