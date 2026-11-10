-- Additive Superadmin audit history. Apply manually to the intended database.
BEGIN;
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 80),
  target_type TEXT NOT NULL CHECK (length(target_type) BETWEEN 1 AND 60),
  target_id TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_logs(action, created_at DESC);
CREATE OR REPLACE FUNCTION reject_admin_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Administrative audit history is append only'; END;
$$;
DROP TRIGGER IF EXISTS trg_admin_audit_immutable ON admin_audit_logs;
CREATE TRIGGER trg_admin_audit_immutable BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_admin_audit_mutation();
COMMIT;

-- Verification after applying:
-- SELECT to_regclass('public.admin_audit_logs');
-- SELECT indexname FROM pg_indexes WHERE tablename='admin_audit_logs';
-- SELECT tgname FROM pg_trigger WHERE tgrelid='admin_audit_logs'::regclass AND NOT tgisinternal;
