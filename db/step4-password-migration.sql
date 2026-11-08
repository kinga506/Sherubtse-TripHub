-- Password reset already uses reset_token/reset_token_expires columns from Step 2.
-- Safe to run on an existing Step 2/3 database.
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_token_unique ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token_expiry ON users(reset_token_expires) WHERE reset_token IS NOT NULL;
-- The session table must be the connect-pg-simple session table from db/schema.sql.
