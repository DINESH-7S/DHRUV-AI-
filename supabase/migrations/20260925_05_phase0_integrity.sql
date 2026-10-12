-- ============================================================
-- Phase 0 integrity fixes (PRODUCTION_PLAN.md C3, H10)
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- C3: covers are archive photos (credited, licensed), never free-floating stock URLs.
ALTER TABLE expeditions ADD COLUMN IF NOT EXISTS cover_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE stations    ADD COLUMN IF NOT EXISTS cover_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE stations    ALTER COLUMN image DROP NOT NULL;

-- Station covers: the photo of the station itself where one exists in the archive.
UPDATE stations SET cover_asset_id = 'ce384735-df38-476d-b989-c7bbd651884d' WHERE name = 'Dakshin Gangotri'; -- Dakshin Gangotri station, 1984
UPDATE stations SET cover_asset_id = '86d5306e-3e1f-4e24-9853-f5ee6d2ebf4b' WHERE name = 'Maitri';           -- Maitri, 2017
UPDATE stations SET cover_asset_id = '9b67a551-33a8-4af3-af07-8328f5694186' WHERE name = 'Bharati';          -- Bharati, 2020
UPDATE stations SET cover_asset_id = '17a9f165-93dc-4083-9273-7604db53c0d2' WHERE name = 'Himadri';          -- Ny-Ålesund village (Himadri is here)
UPDATE stations SET cover_asset_id = '0dd849c5-4171-4111-b7aa-755115ab2daa' WHERE name = 'Himansh';          -- Chandra basin at Batal (not the station)

-- Expedition covers. ISEA-01 (1981-82) intentionally has none: the archive holds no photo from it.
UPDATE expeditions SET cover_asset_id = 'bf348448-9dbc-4488-a3b9-67a7b4fc30c2' WHERE code = 'ISEA-03';     -- Dakshin Gangotri under construction, 1984
UPDATE expeditions SET cover_asset_id = '86d5306e-3e1f-4e24-9853-f5ee6d2ebf4b' WHERE code = 'ISEA-43';     -- Maitri station, 2017
UPDATE expeditions SET cover_asset_id = '9b67a551-33a8-4af3-af07-8328f5694186' WHERE code = 'ISEA-44';     -- Bharati station, 2020
UPDATE expeditions SET cover_asset_id = '17a9f165-93dc-4083-9273-7604db53c0d2' WHERE code = 'ARCTIC-2024'; -- Ny-Ålesund, 2003
UPDATE expeditions SET cover_asset_id = '0dd849c5-4171-4111-b7aa-755115ab2daa' WHERE code = 'HIM-2024';    -- Chandra river at Batal, 2021
UPDATE expeditions SET cover_image = NULL WHERE cover_image LIKE '%unsplash%';

-- H10: no silent open licence. Uploads must state their licence explicitly.
ALTER TABLE assets ALTER COLUMN license DROP DEFAULT;
