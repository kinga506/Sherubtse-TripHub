-- Additive fields for verified Superadmin email changes. Apply after step23.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email_expires TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_unique ON users(LOWER(pending_email)) WHERE pending_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_token_unique ON users(pending_email_token) WHERE pending_email_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Serialize email reservations with signups and other email changes so a
-- concurrent signup cannot claim an address while it is pending verification.
CREATE OR REPLACE FUNCTION enforce_unique_email_reservations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(71342, 2);
  IF NEW.pending_email IS NOT NULL AND LOWER(NEW.pending_email)=LOWER(NEW.email) THEN
    RAISE EXCEPTION 'Pending email must differ from the current email' USING ERRCODE='23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM users existing
    WHERE existing.id IS DISTINCT FROM NEW.id
      AND (
        LOWER(existing.email)=LOWER(NEW.email)
        OR (NEW.pending_email IS NOT NULL AND LOWER(existing.email)=LOWER(NEW.pending_email))
        OR (NEW.pending_email IS NOT NULL AND existing.pending_email IS NOT NULL
            AND LOWER(existing.pending_email)=LOWER(NEW.pending_email))
        OR (existing.pending_email IS NOT NULL AND LOWER(existing.pending_email)=LOWER(NEW.email))
      )
  ) THEN
    RAISE EXCEPTION 'Email address is already in use or pending verification' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_users_unique_email_reservations ON users;
CREATE TRIGGER trg_users_unique_email_reservations
BEFORE INSERT OR UPDATE OF email, pending_email ON users
FOR EACH ROW EXECUTE FUNCTION enforce_unique_email_reservations();
COMMIT;

-- Verification:
-- SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name LIKE 'pending_email%';
-- SELECT indexname FROM pg_indexes WHERE tablename='users' AND indexname LIKE 'idx_users_pending_email%';
-- SELECT tgname FROM pg_trigger WHERE tgrelid='users'::regclass AND tgname='trg_users_unique_email_reservations';
