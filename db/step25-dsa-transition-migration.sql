-- Additive DSA transition history and concurrency guards. Apply after step24.
BEGIN;

CREATE TABLE IF NOT EXISTS dsa_transitions (
  id BIGSERIAL PRIMARY KEY,
  outgoing_dsa_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  incoming_dsa_id BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  initiated_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  completed_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  effective_date DATE NOT NULL,
  appointment_reference TEXT CHECK (appointment_reference IS NULL OR length(appointment_reference)<=200),
  transition_type TEXT NOT NULL CHECK (transition_type IN ('normal','emergency')),
  status TEXT NOT NULL CHECK (status IN ('awaiting_activation','ready_to_complete','completed','emergency_revoked','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (outgoing_dsa_id <> incoming_dsa_id),
  CHECK ((transition_type='normal' AND incoming_dsa_id IS NOT NULL) OR (transition_type='emergency' AND incoming_dsa_id IS NULL)),
  CHECK ((status IN ('completed','emergency_revoked') AND completed_at IS NOT NULL) OR (status NOT IN ('completed','emergency_revoked') AND completed_at IS NULL)),
  CHECK (status<>'emergency_revoked' OR transition_type='emergency'),
  CHECK (status NOT IN ('awaiting_activation','ready_to_complete') OR transition_type='normal')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsa_transition_open_outgoing
  ON dsa_transitions(outgoing_dsa_id) WHERE status IN ('awaiting_activation','ready_to_complete');
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsa_transition_open_incoming
  ON dsa_transitions(incoming_dsa_id) WHERE incoming_dsa_id IS NOT NULL AND status IN ('awaiting_activation','ready_to_complete');
CREATE INDEX IF NOT EXISTS idx_dsa_transition_history ON dsa_transitions(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_dsa_transition_status ON dsa_transitions(status,created_at DESC);

COMMIT;

-- Verification:
-- SELECT to_regclass('public.dsa_transitions');
-- SELECT indexname FROM pg_indexes WHERE tablename='dsa_transitions';
