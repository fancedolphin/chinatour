ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.travel_tips
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.industrial_tourism
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.cultural_experiences
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS language_available TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS min_participants INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_participants INT,
  ADD COLUMN IF NOT EXISTS duration_minutes INT,
  ADD COLUMN IF NOT EXISTS price_per_person TEXT,
  ADD COLUMN IF NOT EXISTS schedule TEXT,
  ADD COLUMN IF NOT EXISTS booking_method TEXT,
  ADD COLUMN IF NOT EXISTS take_home_item BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suitable_for TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS indoor_outdoor TEXT DEFAULT 'indoor';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS lunar_calendar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS typical_duration_days INT,
  ADD COLUMN IF NOT EXISTS crowd_level TEXT,
  ADD COLUMN IF NOT EXISTS price TEXT,
  ADD COLUMN IF NOT EXISTS foreigner_friendly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS english_info_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS practical_tips TEXT;

ALTER TABLE public.markets_and_shopping
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS landmark_note TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT,
  ADD COLUMN IF NOT EXISTS operating_days TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS peak_season TEXT,
  ADD COLUMN IF NOT EXISTS must_try_foods TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS food_stalls_overview TEXT,
  ADD COLUMN IF NOT EXISTS bargaining_expected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cash_preferred BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_level TEXT DEFAULT 'budget',
  ADD COLUMN IF NOT EXISTS authenticity_note TEXT,
  ADD COLUMN IF NOT EXISTS foreigner_friendly BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS english_spoken BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS crowd_level TEXT,
  ADD COLUMN IF NOT EXISTS safety_note TEXT,
  ADD COLUMN IF NOT EXISTS atmosphere TEXT,
  ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE public.destinations
SET verified_at = COALESCE(verified_at, updated_at, created_at, NOW())
WHERE verified_at IS NULL;

UPDATE public.restaurants
SET verified_at = COALESCE(verified_at, updated_at, created_at, NOW())
WHERE verified_at IS NULL;

UPDATE public.attractions
SET verified_at = COALESCE(verified_at, updated_at, created_at, NOW())
WHERE verified_at IS NULL;

UPDATE public.travel_tips
SET verified_at = COALESCE(verified_at, created_at, NOW())
WHERE verified_at IS NULL;

UPDATE public.industrial_tourism
SET verified_at = COALESCE(verified_at, updated_at, created_at, NOW())
WHERE verified_at IS NULL;

UPDATE public.cultural_experiences
SET
  verified_at = COALESCE(verified_at, updated_at, created_at, NOW()),
  type = COALESCE(type, category, 'performance'),
  duration_minutes = COALESCE(duration_minutes, NULLIF(regexp_replace(duration_text, '[^0-9]', '', 'g'), '')::INT),
  price_per_person = COALESCE(price_per_person, price_range),
  suitable_for = CASE
    WHEN cardinality(COALESCE(suitable_for, ARRAY[]::TEXT[])) = 0 THEN ARRAY['solo', 'couple', 'group']::TEXT[]
    ELSE suitable_for
  END,
  indoor_outdoor = COALESCE(indoor_outdoor, 'indoor')
WHERE verified_at IS NULL
   OR type IS NULL
   OR duration_minutes IS NULL
   OR price_per_person IS NULL
   OR suitable_for IS NULL
   OR indoor_outdoor IS NULL;

UPDATE public.events
SET
  verified_at = COALESCE(verified_at, updated_at, created_at, NOW()),
  type = COALESCE(type, category, 'cultural_show'),
  recurrence = COALESCE(recurrence, 'annual'),
  foreigner_friendly = COALESCE(foreigner_friendly, true),
  english_info_available = COALESCE(english_info_available, false),
  highlights = CASE
    WHEN cardinality(COALESCE(highlights, ARRAY[]::TEXT[])) = 0 AND description IS NOT NULL
      THEN ARRAY[LEFT(description, 80)]::TEXT[]
    ELSE highlights
  END
WHERE verified_at IS NULL
   OR type IS NULL
   OR recurrence IS NULL
   OR highlights IS NULL;

UPDATE public.markets_and_shopping
SET
  verified_at = COALESCE(verified_at, updated_at, created_at, NOW()),
  type = COALESCE(type, category, CASE WHEN is_night_market THEN 'night_market' ELSE 'specialty_street' END),
  bargaining_expected = COALESCE(bargaining_expected, bargain_tip IS NOT NULL),
  foreigner_friendly = COALESCE(foreigner_friendly, true),
  price_level = COALESCE(price_level, 'budget')
WHERE verified_at IS NULL
   OR type IS NULL
   OR bargaining_expected IS NULL
   OR foreigner_friendly IS NULL
   OR price_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_destinations_verified_at ON public.destinations(verified_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_verified_at ON public.restaurants(verified_at);
CREATE INDEX IF NOT EXISTS idx_attractions_verified_at ON public.attractions(verified_at);
CREATE INDEX IF NOT EXISTS idx_travel_tips_verified_at ON public.travel_tips(verified_at);
CREATE INDEX IF NOT EXISTS idx_cultural_experiences_verified_at ON public.cultural_experiences(verified_at);
CREATE INDEX IF NOT EXISTS idx_events_verified_at ON public.events(verified_at);
CREATE INDEX IF NOT EXISTS idx_markets_and_shopping_verified_at ON public.markets_and_shopping(verified_at);
CREATE INDEX IF NOT EXISTS idx_industrial_tourism_verified_at ON public.industrial_tourism(verified_at);

DROP FUNCTION IF EXISTS public.match_cultural_experiences(vector(768), float, int, text);

CREATE OR REPLACE FUNCTION public.match_cultural_experiences(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.68,
  match_count int DEFAULT 4,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  name_en text,
  type text,
  language_available text[],
  duration_minutes int,
  price_per_person text,
  schedule text,
  booking_required boolean,
  booking_method text,
  take_home_item boolean,
  suitable_for text[],
  indoor_outdoor text,
  description text,
  tags text[],
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ce.id,
    ce.name,
    ce.name_en,
    COALESCE(ce.type, ce.category),
    ce.language_available,
    ce.duration_minutes,
    COALESCE(ce.price_per_person, ce.price_range),
    ce.schedule,
    ce.booking_required,
    ce.booking_method,
    ce.take_home_item,
    ce.suitable_for,
    ce.indoor_outdoor,
    ce.description,
    ce.tags,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM public.cultural_experiences ce
  LEFT JOIN public.destinations d ON ce.destination_id = d.id
  WHERE ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$;

DROP FUNCTION IF EXISTS public.match_events(vector(768), float, int, text);

CREATE OR REPLACE FUNCTION public.match_events(
  query_embedding vector(768),
  month_filter int DEFAULT NULL,
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 4,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  name_en text,
  type text,
  recurrence text,
  month_start int,
  month_end int,
  lunar_calendar boolean,
  crowd_level text,
  booking_required boolean,
  price text,
  foreigner_friendly boolean,
  highlights text[],
  practical_tips text,
  description text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.name,
    e.name_en,
    COALESCE(e.type, e.category),
    e.recurrence,
    e.month_start::int,
    e.month_end::int,
    e.lunar_calendar,
    e.crowd_level,
    e.booking_required,
    e.price,
    e.foreigner_friendly,
    e.highlights,
    e.practical_tips,
    e.description,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.events e
  LEFT JOIN public.destinations d ON e.destination_id = d.id
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
    AND (
      month_filter IS NULL
      OR e.month_start IS NULL
      OR (
        e.month_start <= e.month_end
        AND month_filter BETWEEN e.month_start AND e.month_end
      )
      OR (
        e.month_start > e.month_end
        AND (month_filter >= e.month_start OR month_filter <= e.month_end)
      )
    )
  ORDER BY
    CASE
      WHEN month_filter IS NOT NULL
        AND e.month_start IS NOT NULL
        AND (
          (e.month_start <= e.month_end AND month_filter BETWEEN e.month_start AND e.month_end)
          OR (e.month_start > e.month_end AND (month_filter >= e.month_start OR month_filter <= e.month_end))
        )
      THEN 0
      ELSE 1
    END,
    e.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_markets(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.68,
  match_count int DEFAULT 4,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  name_en text,
  type text,
  address text,
  location_lat numeric,
  location_lng numeric,
  landmark_note text,
  operating_hours text,
  operating_days text[],
  signature_items jsonb,
  must_try_foods text[],
  bargaining_expected boolean,
  cash_preferred boolean,
  price_level text,
  authenticity_note text,
  foreigner_friendly boolean,
  crowd_level text,
  atmosphere text,
  highlights text[],
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ms.id,
    ms.name,
    ms.name_en,
    COALESCE(ms.type, ms.category),
    ms.address,
    ms.location_lat,
    ms.location_lng,
    ms.landmark_note,
    ms.operating_hours,
    ms.operating_days,
    ms.signature_items,
    ms.must_try_foods,
    ms.bargaining_expected,
    ms.cash_preferred,
    ms.price_level,
    ms.authenticity_note,
    ms.foreigner_friendly,
    ms.crowd_level,
    ms.atmosphere,
    ms.highlights,
    1 - (ms.embedding <=> query_embedding) AS similarity
  FROM public.markets_and_shopping ms
  LEFT JOIN public.destinations d ON ms.destination_id = d.id
  WHERE ms.embedding IS NOT NULL
    AND 1 - (ms.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY ms.embedding <=> query_embedding
  LIMIT match_count;
$$;

DROP FUNCTION IF EXISTS public.match_markets_and_shopping(vector(768), float, int, text);

CREATE OR REPLACE FUNCTION public.match_markets_and_shopping(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.68,
  match_count int DEFAULT 4,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  name_en text,
  type text,
  address text,
  location_lat numeric,
  location_lng numeric,
  landmark_note text,
  operating_hours text,
  operating_days text[],
  signature_items jsonb,
  must_try_foods text[],
  bargaining_expected boolean,
  cash_preferred boolean,
  price_level text,
  authenticity_note text,
  foreigner_friendly boolean,
  crowd_level text,
  atmosphere text,
  highlights text[],
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.match_markets(
    query_embedding => query_embedding,
    match_threshold => match_threshold,
    match_count => match_count,
    destination_filter => destination_filter
  );
$$;
