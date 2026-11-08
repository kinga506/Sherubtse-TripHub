-- Run once after Step 2 schema. Compatible with existing accounts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_verification_token_unique ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_verification_token_lookup ON users(verification_token) WHERE verification_token IS NOT NULL;
