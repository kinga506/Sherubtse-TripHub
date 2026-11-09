-- Additive destination content field. Apply with npm run migrate:destination-guides.
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS guide_content JSONB;
