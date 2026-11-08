-- Step 14: destination-level suggestions derived solely from supplied source sample trip packing lists.
-- Apply AFTER db/schema.sql and the demonstration seed (`npm run seed`). Safe to re-run.
BEGIN;
CREATE TABLE IF NOT EXISTS destination_packing_suggestions (
 id BIGSERIAL PRIMARY KEY,
 destination_id BIGINT NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
 name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 quantity TEXT,
 UNIQUE(destination_id,name)
);
-- Sample Trip 1 visits both Chorten Kora and Bumdeling; link both without inventing new items.
INSERT INTO destination_packing_suggestions(destination_id,name,quantity)
SELECT DISTINCT d.id,p.name,p.quantity
FROM destinations d
JOIN trips t ON t.is_sample=true AND (
 t.destination_id=d.id OR
 (d.name ILIKE 'Bumdeling%' AND t.title='Eastern Bhutan Cultural and Nature Tour')
)
JOIN packing_suggestions p ON p.trip_id=t.id
ON CONFLICT(destination_id,name) DO NOTHING;
COMMIT;
