-- 020_add_map_english_fields.sql
-- Adds optional English-name fields to trip_map_locations so the EN site
-- can render Latin/Pinyin labels with graceful fallback to the Chinese name.

ALTER TABLE public.trip_map_locations
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS address_en TEXT,
  ADD COLUMN IF NOT EXISTS city_en TEXT,
  ADD COLUMN IF NOT EXISTS district_en TEXT;

COMMENT ON COLUMN public.trip_map_locations.name_en
  IS 'Optional English / Pinyin display name. Falls back to name when null.';
