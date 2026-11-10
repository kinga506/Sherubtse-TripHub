
BEGIN;
CREATE TABLE IF NOT EXISTS programmes (id BIGSERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','dsa','admin')),
 student_id TEXT UNIQUE, programme_id BIGINT REFERENCES programmes(id) ON DELETE RESTRICT,
 academic_year SMALLINT CHECK(academic_year BETWEEN 1 AND 8), residence_hall TEXT, phone TEXT, avatar TEXT,
 is_verified BOOLEAN NOT NULL DEFAULT FALSE, verification_token TEXT, reset_token TEXT,
 pending_email TEXT, pending_email_token TEXT, pending_email_expires TIMESTAMPTZ,
 reset_token_expires TIMESTAMPTZ, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 is_demo BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK (role <> 'student' OR email ~ '^[0-9]+\.sherubtse@rub\.edu\.bt$')
);
CREATE TABLE IF NOT EXISTS destinations (
 id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, dzongkhag TEXT NOT NULL,
 description TEXT NOT NULL, best_season TEXT, transport TEXT, transport_cost_min NUMERIC(12,2) CHECK(transport_cost_min >= 0),
 transport_cost_max NUMERIC(12,2) CHECK(transport_cost_max >= 0), entry_fee_note TEXT,
 distance_text TEXT, drive_time_text TEXT, trek_time_text TEXT, travel_note TEXT, practical_tip TEXT,
 is_trek BOOLEAN NOT NULL DEFAULT FALSE, guide_content JSONB, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(transport_cost_max IS NULL OR transport_cost_min IS NULL OR transport_cost_max >= transport_cost_min)
);
CREATE TABLE IF NOT EXISTS destination_photos (
 id BIGSERIAL PRIMARY KEY, destination_id BIGINT NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
 file_path TEXT NOT NULL UNIQUE, alt_text TEXT NOT NULL, photo_credit TEXT, sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS trips (
 id BIGSERIAL PRIMARY KEY, seed_key TEXT UNIQUE, proposed_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 destination_id BIGINT NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
 title TEXT NOT NULL, purpose TEXT, description TEXT, meeting_point TEXT, meeting_time TIME,
 start_date DATE NOT NULL, end_date DATE NOT NULL, registration_deadline TIMESTAMPTZ NOT NULL,
 registration_open BOOLEAN NOT NULL DEFAULT FALSE, vacancies_held_closed BOOLEAN NOT NULL DEFAULT FALSE,
 max_participants INT NOT NULL CHECK(max_participants > 0), estimated_cost NUMERIC(12,2) NOT NULL CHECK(estimated_cost >= 0),
 estimated_budget_note TEXT, cover_photo TEXT, transport_information TEXT, safety_information TEXT,
 emergency_contact_name TEXT, emergency_contact_phone TEXT,
 approval_status TEXT NOT NULL DEFAULT 'draft' CHECK(approval_status IN ('draft','pending_dsa','approved','changes_requested','rejected')),
 operational_status TEXT NOT NULL DEFAULT 'planned' CHECK(operational_status IN ('planned','ongoing','awaiting_final_report','completed','cancelled')),
 dsa_reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, dsa_reviewed_at TIMESTAMPTZ,
 dsa_remarks TEXT, is_sample BOOLEAN NOT NULL DEFAULT FALSE, is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 completed_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, cancellation_reason TEXT,
 CHECK(end_date >= start_date), CHECK(NOT registration_open OR (approval_status='approved' AND is_active AND operational_status IN ('planned','ongoing')))
);
CREATE TABLE IF NOT EXISTS trip_coordinators (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 assignment_role TEXT NOT NULL CHECK(assignment_role IN ('lead','assistant')),
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')),
 assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 ended_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, ended_at TIMESTAMPTZ, end_reason TEXT,
 CHECK((status='active' AND ended_at IS NULL) OR (status='ended' AND ended_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_active_lead ON trip_coordinators(trip_id) WHERE status='active' AND assignment_role='lead';
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_active_coordinator ON trip_coordinators(trip_id,user_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS trip_cost_items (id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, label TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK(amount>=0), sort_order INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS trip_submissions (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 submitted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, submission_number INT NOT NULL CHECK(submission_number>0),
 submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), proposal_snapshot JSONB NOT NULL, UNIQUE(trip_id,submission_number)
);
CREATE TABLE IF NOT EXISTS trip_attachments (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 submission_id BIGINT REFERENCES trip_submissions(id) ON DELETE RESTRICT, uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 original_filename TEXT NOT NULL, document_title TEXT NOT NULL, description TEXT,
 storage_key TEXT NOT NULL UNIQUE, detected_mime_type TEXT NOT NULL, file_size BIGINT NOT NULL CHECK(file_size>0),
 uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), is_active BOOLEAN NOT NULL DEFAULT TRUE, superseded_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS trip_approval_history (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 submission_id BIGINT REFERENCES trip_submissions(id) ON DELETE RESTRICT,
 submitted_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('submitted','approved','changes_requested','rejected','resubmitted','approval_reset','seeded_demo')),
 changed_fields JSONB, remarks TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS participants (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, reason TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
 requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), withdrawn_at TIMESTAMPTZ, withdrawal_reason TEXT,
 reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, reviewed_at TIMESTAMPTZ, decision_note TEXT,
 UNIQUE(trip_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_capacity ON participants(trip_id,status) WHERE status IN ('pending','approved');
CREATE TABLE IF NOT EXISTS registration_events (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 participant_id BIGINT REFERENCES participants(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('open','close','reopen','withdraw')),
 reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registration_events_trip ON registration_events(trip_id,created_at DESC);
CREATE TABLE IF NOT EXISTS participant_consent_documents (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
 student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 original_filename TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, detected_mime_type TEXT NOT NULL,
 file_size BIGINT NOT NULL CHECK(file_size>0), uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 version_number INT NOT NULL CHECK(version_number>0), uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 verification_status TEXT NOT NULL DEFAULT 'pending_review' CHECK(verification_status IN ('pending_review','verified','correction_requested')),
 reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, reviewed_at TIMESTAMPTZ, reviewer_note TEXT,
 is_current BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE(participant_id,version_number)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_current_consent ON participant_consent_documents(participant_id) WHERE is_current;
CREATE TABLE IF NOT EXISTS final_participant_submissions (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 submitted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 submission_number INT NOT NULL CHECK(submission_number>0), submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 participant_snapshot JSONB NOT NULL, combined_pdf_storage_key TEXT NOT NULL UNIQUE,
 content_hash TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'pending_dsa'
 CHECK(review_status IN ('pending_dsa','approved','changes_requested','rejected','superseded')),
 reviewed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT, reviewed_at TIMESTAMPTZ, review_remarks TEXT,
 invalidated_at TIMESTAMPTZ, invalidation_reason TEXT, UNIQUE(trip_id,submission_number)
);
CREATE TABLE IF NOT EXISTS final_participant_review_history (
 id BIGSERIAL PRIMARY KEY, submission_id BIGINT NOT NULL REFERENCES final_participant_submissions(id) ON DELETE RESTRICT,
 trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 actor_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
 action TEXT NOT NULL CHECK(action IN ('submitted','approved','changes_requested','rejected','superseded')),
 remarks TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS itineraries (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 day_number INT NOT NULL CHECK(day_number>0), start_time TIME, title TEXT NOT NULL, description TEXT,
 is_completed BOOLEAN NOT NULL DEFAULT FALSE, sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS expenses (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 category TEXT NOT NULL CHECK(category IN ('transport','accommodation','food','activities','other')),
 description TEXT, amount NUMERIC(12,2) NOT NULL CHECK(amount>=0), spent_on DATE NOT NULL,
 recorded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS contributions (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, amount NUMERIC(12,2) NOT NULL CHECK(amount>=0),
 paid_on DATE NOT NULL, note TEXT, recorded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS packing_suggestions (id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, name TEXT NOT NULL, quantity TEXT, UNIQUE(trip_id,name));
CREATE TABLE IF NOT EXISTS packing_items (id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, name TEXT NOT NULL, quantity TEXT, is_packed BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(trip_id,user_id,name));
CREATE TABLE IF NOT EXISTS attendance (id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, attendance_date DATE NOT NULL, status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')), recorded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, UNIQUE(trip_id,user_id,attendance_date));
CREATE TABLE IF NOT EXISTS announcements (id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE RESTRICT, author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, title TEXT NOT NULL, body TEXT NOT NULL, is_important BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS trip_final_reports (
 id BIGSERIAL PRIMARY KEY, trip_id BIGINT NOT NULL UNIQUE REFERENCES trips(id) ON DELETE RESTRICT,
 submitted_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 final_attendance_summary JSONB NOT NULL, total_actual_expenses NUMERIC(12,2) NOT NULL CHECK(total_actual_expenses>=0),
 expense_summary JSONB NOT NULL, total_student_contributions NUMERIC(12,2) NOT NULL CHECK(total_student_contributions>=0),
 contribution_summary JSONB NOT NULL, incident_report TEXT NOT NULL,
 feedback_count_at_submission INT NOT NULL DEFAULT 0 CHECK(feedback_count_at_submission>=0),
 feedback_summary_at_submission TEXT NOT NULL, additional_notes TEXT, archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS faqs (id BIGSERIAL PRIMARY KEY, seed_key TEXT UNIQUE, question TEXT NOT NULL, answer TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS trip_rules (id BIGSERIAL PRIMARY KEY, seed_key TEXT UNIQUE, title TEXT NOT NULL, body TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS testimonials (id BIGSERIAL PRIMARY KEY, seed_key TEXT UNIQUE, title TEXT NOT NULL, quote TEXT NOT NULL, attribution TEXT, is_sample BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS admin_audit_logs (id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES users(id) ON DELETE RESTRICT, action TEXT NOT NULL CHECK(length(action) BETWEEN 1 AND 80), target_type TEXT NOT NULL CHECK(length(target_type) BETWEEN 1 AND 60), target_id TEXT, context JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS session (sid VARCHAR NOT NULL PRIMARY KEY, sess JSON NOT NULL, expire TIMESTAMP(6) NOT NULL);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
CREATE INDEX IF NOT EXISTS idx_trip_dates ON trips(start_date,end_date);
CREATE INDEX IF NOT EXISTS idx_trip_visibility ON trips(approval_status,operational_status) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_trip_assignments ON trip_coordinators(user_id,status);
CREATE INDEX IF NOT EXISTS idx_trip_attachments ON trip_attachments(trip_id,submission_id);
CREATE INDEX IF NOT EXISTS idx_trip_approval ON trip_approval_history(trip_id,created_at);
CREATE INDEX IF NOT EXISTS idx_final_roster ON final_participant_submissions(trip_id,submission_number DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_unique ON users(LOWER(pending_email)) WHERE pending_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_token_unique ON users(pending_email_token) WHERE pending_email_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action,created_at DESC);
-- Database-level guardrails for multi-table role/state invariants. Transaction-level capacity and clearance checks still required.
CREATE OR REPLACE FUNCTION enforce_coordinator_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r TEXT; active_user BOOLEAN; verified BOOLEAN; dsa_role TEXT; trip_state TEXT;
BEGIN
 SELECT role,is_active,is_verified INTO r,active_user,verified FROM users WHERE id=NEW.user_id;
 IF r IS DISTINCT FROM 'student' OR NOT active_user OR NOT verified THEN RAISE EXCEPTION 'Coordinator must be an active, verified Student'; END IF;
 SELECT role INTO dsa_role FROM users WHERE id=NEW.assigned_by;
 IF dsa_role IS DISTINCT FROM 'dsa' THEN RAISE EXCEPTION 'Coordinator assignment must come from DSA'; END IF;
 SELECT operational_status INTO trip_state FROM trips WHERE id=NEW.trip_id;
 IF NEW.status='active' AND trip_state IN ('completed','cancelled') THEN RAISE EXCEPTION 'Cannot assign coordinator to ended trip'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_coordinator_integrity ON trip_coordinators;
CREATE TRIGGER trg_coordinator_integrity BEFORE INSERT OR UPDATE ON trip_coordinators FOR EACH ROW EXECUTE FUNCTION enforce_coordinator_integrity();
CREATE OR REPLACE FUNCTION enforce_student_proposer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (SELECT role FROM users WHERE id=NEW.proposed_by_user_id) IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Trip proposer must be Student'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_student_proposer ON trips;
CREATE TRIGGER trg_student_proposer BEFORE INSERT OR UPDATE OF proposed_by_user_id ON trips FOR EACH ROW EXECUTE FUNCTION enforce_student_proposer();
CREATE OR REPLACE FUNCTION enforce_unique_email_reservations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(71342,2);
 IF NEW.pending_email IS NOT NULL AND LOWER(NEW.pending_email)=LOWER(NEW.email) THEN
  RAISE EXCEPTION 'Pending email must differ from the current email' USING ERRCODE='23505';
 END IF;
 IF EXISTS (SELECT 1 FROM users existing WHERE existing.id IS DISTINCT FROM NEW.id AND
  (LOWER(existing.email)=LOWER(NEW.email) OR
   (NEW.pending_email IS NOT NULL AND LOWER(existing.email)=LOWER(NEW.pending_email)) OR
   (NEW.pending_email IS NOT NULL AND existing.pending_email IS NOT NULL AND LOWER(existing.pending_email)=LOWER(NEW.pending_email)) OR
   (existing.pending_email IS NOT NULL AND LOWER(existing.pending_email)=LOWER(NEW.email)))) THEN
  RAISE EXCEPTION 'Email address is already in use or pending verification' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_users_unique_email_reservations ON users;
CREATE TRIGGER trg_users_unique_email_reservations BEFORE INSERT OR UPDATE OF email,pending_email ON users FOR EACH ROW EXECUTE FUNCTION enforce_unique_email_reservations();
-- Prevent historical audit records from being overwritten or removed by application operations.
CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit history is append only'; END; $$;
CREATE OR REPLACE FUNCTION reject_admin_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Administrative audit history is append only'; END; $$;
DROP TRIGGER IF EXISTS trg_admin_audit_immutable ON admin_audit_logs;
CREATE TRIGGER trg_admin_audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_logs FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
DROP TRIGGER IF EXISTS trg_approval_history_immutable ON trip_approval_history;
CREATE TRIGGER trg_approval_history_immutable BEFORE UPDATE OR DELETE ON trip_approval_history FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
DROP TRIGGER IF EXISTS trg_final_review_immutable ON final_participant_review_history;
CREATE TRIGGER trg_final_review_immutable BEFORE UPDATE OR DELETE ON final_participant_review_history FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
COMMIT;

-- Step 3 authentication additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_unique ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Step 4: one-use password reset token lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_token_unique ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expires) WHERE reset_token IS NOT NULL;
