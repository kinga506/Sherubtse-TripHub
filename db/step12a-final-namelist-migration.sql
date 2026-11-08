-- Step 12A: database-backed clearance and invalidation guardrails.
-- Run only after db/schema.sql and prior migrations.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_final_package
 ON final_participant_submissions(trip_id) WHERE review_status='pending_dsa' AND invalidated_at IS NULL;

CREATE OR REPLACE FUNCTION invalidate_final_clearance(p_trip_id BIGINT,p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE changed RECORD;
BEGIN
 -- Caller must hold the parent trip row lock to serialize changes and DSA decisions.
 FOR changed IN UPDATE final_participant_submissions
   SET review_status='superseded',invalidated_at=NOW(),invalidation_reason=p_reason
   WHERE trip_id=p_trip_id AND review_status IN ('approved','pending_dsa') AND invalidated_at IS NULL
   RETURNING id LOOP
  INSERT INTO final_participant_review_history(submission_id,trip_id,actor_id,action,remarks)
   VALUES(changed.id,p_trip_id,NULL,'superseded',p_reason);
 END LOOP;
END $$;

-- Invalidate an approved/pending roster if an application's approved membership changes.
CREATE OR REPLACE FUNCTION invalidate_on_roster_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE affected BIGINT;
BEGIN
 affected:=COALESCE(NEW.trip_id,OLD.trip_id);
 IF (TG_OP='INSERT' AND NEW.status='approved')
 OR (TG_OP='DELETE' AND OLD.status='approved')
 OR (TG_OP='UPDATE' AND (OLD.status='approved' OR NEW.status='approved')
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.user_id IS DISTINCT FROM NEW.user_id)) THEN
  PERFORM invalidate_final_clearance(affected,'Approved participant roster changed');
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_invalidate_on_roster_edit ON participants;
CREATE TRIGGER trg_invalidate_on_roster_edit AFTER INSERT OR UPDATE OR DELETE ON participants
 FOR EACH ROW EXECUTE FUNCTION invalidate_on_roster_edit();

CREATE OR REPLACE FUNCTION invalidate_on_consent_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM participants WHERE id=COALESCE(NEW.participant_id,OLD.participant_id) AND status='approved') THEN
  IF TG_OP='INSERT' OR TG_OP='DELETE' OR
    (TG_OP='UPDATE' AND (OLD.is_current IS DISTINCT FROM NEW.is_current
      OR OLD.verification_status IS DISTINCT FROM NEW.verification_status
      OR OLD.storage_key IS DISTINCT FROM NEW.storage_key)) THEN
   PERFORM invalidate_final_clearance(COALESCE(NEW.trip_id,OLD.trip_id),'Verified consent document changed');
  END IF;
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_invalidate_on_consent_edit ON participant_consent_documents;
CREATE TRIGGER trg_invalidate_on_consent_edit AFTER INSERT OR UPDATE OR DELETE ON participant_consent_documents
 FOR EACH ROW EXECUTE FUNCTION invalidate_on_consent_edit();

-- The normal start/ongoing transition cannot bypass the latest approval.
CREATE OR REPLACE FUNCTION enforce_departure_clearance()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE latest RECORD; current_roster JSONB;
BEGIN
 IF NEW.operational_status='ongoing' AND OLD.operational_status IS DISTINCT FROM 'ongoing' THEN
  SELECT * INTO latest FROM final_participant_submissions WHERE trip_id=NEW.id ORDER BY submission_number DESC LIMIT 1;
  IF latest.id IS NULL OR latest.review_status<>'approved' OR latest.invalidated_at IS NOT NULL THEN
   RAISE EXCEPTION 'Not cleared for departure: final namelist needs DSA approval';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participantId',p.id,'studentUserId',p.user_id,'name',u.name,
    'studentId',COALESCE(u.student_id,''),'programme',COALESCE(pr.name,''),
    'academicYear',COALESCE(u.academic_year::text,''),
    'consentDocumentId',c.id,'consentVersion',c.version_number) ORDER BY u.name,p.id),'[]'::jsonb)
   INTO current_roster FROM participants p JOIN users u ON u.id=p.user_id
   LEFT JOIN programmes pr ON pr.id=u.programme_id
   LEFT JOIN participant_consent_documents c ON c.participant_id=p.id AND c.is_current=TRUE AND c.verification_status='verified'
   WHERE p.trip_id=NEW.id AND p.status='approved';
  IF current_roster<>latest.participant_snapshot THEN
   RAISE EXCEPTION 'Not cleared for departure: approved participant or consent versions changed';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_departure_clearance ON trips;
CREATE TRIGGER trg_enforce_departure_clearance BEFORE UPDATE OF operational_status ON trips
 FOR EACH ROW EXECUTE FUNCTION enforce_departure_clearance();
COMMIT;
