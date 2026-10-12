-- DHRUV — Hindi names/descriptions for stations and expeditions (run after 03). Safe to re-run.
ALTER TABLE stations ADD COLUMN IF NOT EXISTS name_hi TEXT;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS description_hi TEXT;
ALTER TABLE expeditions ADD COLUMN IF NOT EXISTS name_hi TEXT;
ALTER TABLE expeditions ADD COLUMN IF NOT EXISTS summary_hi TEXT;
