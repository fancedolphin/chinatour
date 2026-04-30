-- =====================================================================
-- 019: 为知识库表与 RPC 函数添加 locale 字段
--
-- 目的：让中文站 / 英文站读取各自语言的 RAG 数据，避免内容串站。
-- 默认值 'zh'：保留所有现存行的中文行为，英文站需走 CHI-123 seed 后才有数据。
-- =====================================================================

-- 1. 表结构：添加 locale 字段（默认 'zh'，NOT NULL）
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';
ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';
ALTER TABLE public.transportation
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';
ALTER TABLE public.travel_tips
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';
ALTER TABLE public.trip_examples
  ADD COLUMN IF NOT EXISTS locale VARCHAR(5) NOT NULL DEFAULT 'zh';

-- CHECK 约束：仅允许 'zh' / 'en'
ALTER TABLE public.destinations
  DROP CONSTRAINT IF EXISTS destinations_locale_check;
ALTER TABLE public.destinations
  ADD CONSTRAINT destinations_locale_check CHECK (locale IN ('zh', 'en'));
ALTER TABLE public.attractions
  DROP CONSTRAINT IF EXISTS attractions_locale_check;
ALTER TABLE public.attractions
  ADD CONSTRAINT attractions_locale_check CHECK (locale IN ('zh', 'en'));
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_locale_check;
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_locale_check CHECK (locale IN ('zh', 'en'));
ALTER TABLE public.transportation
  DROP CONSTRAINT IF EXISTS transportation_locale_check;
ALTER TABLE public.transportation
  ADD CONSTRAINT transportation_locale_check CHECK (locale IN ('zh', 'en'));
ALTER TABLE public.travel_tips
  DROP CONSTRAINT IF EXISTS travel_tips_locale_check;
ALTER TABLE public.travel_tips
  ADD CONSTRAINT travel_tips_locale_check CHECK (locale IN ('zh', 'en'));
ALTER TABLE public.trip_examples
  DROP CONSTRAINT IF EXISTS trip_examples_locale_check;
ALTER TABLE public.trip_examples
  ADD CONSTRAINT trip_examples_locale_check CHECK (locale IN ('zh', 'en'));

-- 2. 索引：locale 单列 + 与 destination 联合
CREATE INDEX IF NOT EXISTS idx_destinations_locale ON public.destinations(locale);
CREATE INDEX IF NOT EXISTS idx_attractions_locale ON public.attractions(locale);
CREATE INDEX IF NOT EXISTS idx_attractions_destination_locale
  ON public.attractions(destination_id, locale);
CREATE INDEX IF NOT EXISTS idx_restaurants_locale ON public.restaurants(locale);
CREATE INDEX IF NOT EXISTS idx_restaurants_destination_locale
  ON public.restaurants(destination_id, locale);
CREATE INDEX IF NOT EXISTS idx_transportation_locale ON public.transportation(locale);
CREATE INDEX IF NOT EXISTS idx_travel_tips_locale ON public.travel_tips(locale);
CREATE INDEX IF NOT EXISTS idx_trip_examples_locale ON public.trip_examples(locale);

-- 3. RPC 函数：DROP + CREATE，附带 locale_filter 参数
--    locale_filter = NULL 时不过滤（保留向后兼容；建议调用方始终传值）
DROP FUNCTION IF EXISTS public.match_attractions(vector, float, int, text);
DROP FUNCTION IF EXISTS public.match_attractions(vector, float, int, text, text);

CREATE FUNCTION public.match_attractions(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  destination_filter text DEFAULT NULL,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  location_lat decimal,
  location_lng decimal,
  ticket_price text,
  recommended_duration text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.description,
    a.location_lat,
    a.location_lng,
    a.ticket_price,
    a.recommended_duration,
    a.tags,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM attractions a
  LEFT JOIN destinations d ON a.destination_id = d.id
  WHERE
    1 - (a.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
    AND (locale_filter IS NULL OR a.locale = locale_filter)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_restaurants(vector, float, int, text);
DROP FUNCTION IF EXISTS public.match_restaurants(vector, float, int, text, text);

CREATE FUNCTION public.match_restaurants(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  destination_filter text DEFAULT NULL,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  cuisine_type text,
  description text,
  location_lat decimal,
  location_lng decimal,
  price_range text,
  specialties text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.cuisine_type,
    r.description,
    r.location_lat,
    r.location_lng,
    r.price_range,
    r.specialties,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM restaurants r
  LEFT JOIN destinations d ON r.destination_id = d.id
  WHERE
    1 - (r.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
    AND (locale_filter IS NULL OR r.locale = locale_filter)
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_travel_tips(vector, float, int, text);
DROP FUNCTION IF EXISTS public.match_travel_tips(vector, float, int, text, text);

CREATE FUNCTION public.match_travel_tips(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  destination_filter text DEFAULT NULL,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  is_important boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tt.id,
    tt.title,
    tt.content,
    tt.category,
    tt.is_important,
    1 - (tt.embedding <=> query_embedding) AS similarity
  FROM travel_tips tt
  LEFT JOIN destinations d ON tt.destination_id = d.id
  WHERE
    1 - (tt.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
    AND (locale_filter IS NULL OR tt.locale = locale_filter)
  ORDER BY tt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_trip_examples(vector, float, int);
DROP FUNCTION IF EXISTS public.match_trip_examples(vector, float, int, text);

CREATE FUNCTION public.match_trip_examples(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 3,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  destination text,
  duration_days integer,
  budget_range text,
  highlights text[],
  likes_count integer,
  saves_count integer,
  quality_score decimal,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.destination,
    te.duration_days,
    te.budget_range,
    te.highlights,
    te.likes_count,
    te.saves_count,
    te.quality_score,
    1 - (te.embedding <=> query_embedding) AS similarity
  FROM trip_examples te
  WHERE
    1 - (te.embedding <=> query_embedding) > match_threshold
    AND (locale_filter IS NULL OR te.locale = locale_filter)
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_indoor_attractions(vector, float, int, text);
DROP FUNCTION IF EXISTS public.match_indoor_attractions(vector, float, int, text, text);

CREATE FUNCTION public.match_indoor_attractions(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  destination_filter text DEFAULT NULL,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  location_lat decimal,
  location_lng decimal,
  ticket_price text,
  recommended_duration text,
  tags text[],
  indoor_outdoor text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.name::text,
    a.description,
    a.location_lat,
    a.location_lng,
    a.ticket_price::text,
    a.recommended_duration::text,
    a.tags,
    a.indoor_outdoor::text,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.attractions a
  LEFT JOIN public.destinations d ON a.destination_id = d.id
  WHERE a.indoor_outdoor IN ('indoor', 'both')
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
    AND (locale_filter IS NULL OR a.locale = locale_filter)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

DROP FUNCTION IF EXISTS public.match_restaurants_near(
  vector, double precision, double precision, integer, float, integer, text
);
DROP FUNCTION IF EXISTS public.match_restaurants_near(
  vector, double precision, double precision, integer, float, integer, text, text
);

CREATE FUNCTION public.match_restaurants_near(
  query_embedding vector(768),
  center_lat double precision,
  center_lng double precision,
  radius_meters integer DEFAULT 1500,
  match_threshold float DEFAULT 0.4,
  match_count integer DEFAULT 6,
  destination_filter text DEFAULT NULL,
  locale_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  cuisine_type text,
  description text,
  location_lat decimal,
  location_lng decimal,
  address text,
  price_range text,
  specialties text[],
  similarity float
)
LANGUAGE sql
AS $$
  WITH candidates AS (
    SELECT
      r.id,
      r.name,
      r.cuisine_type,
      r.description,
      r.location_lat,
      r.location_lng,
      r.address,
      r.price_range,
      r.specialties,
      1 - (r.embedding <=> query_embedding) AS semantic_similarity,
      6371000 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS((r.location_lat::double precision - center_lat) / 2)), 2) +
          COS(RADIANS(center_lat)) *
          COS(RADIANS(r.location_lat::double precision)) *
          POWER(SIN(RADIANS((r.location_lng::double precision - center_lng) / 2)), 2)
        )
      ) AS distance_meters
    FROM public.restaurants r
    LEFT JOIN public.destinations d ON r.destination_id = d.id
    WHERE
      r.location_lat IS NOT NULL
      AND r.location_lng IS NOT NULL
      AND 1 - (r.embedding <=> query_embedding) > match_threshold
      AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
      AND (locale_filter IS NULL OR r.locale = locale_filter)
  )
  SELECT
    candidates.id,
    candidates.name,
    candidates.cuisine_type,
    candidates.description,
    candidates.location_lat,
    candidates.location_lng,
    candidates.address,
    candidates.price_range,
    candidates.specialties,
    candidates.semantic_similarity AS similarity
  FROM candidates
  WHERE candidates.distance_meters <= GREATEST(radius_meters, 1)
  ORDER BY
    (candidates.semantic_similarity * 0.6) +
    (GREATEST(0, 1 - (candidates.distance_meters / GREATEST(radius_meters, 1)::double precision)) * 0.4) DESC,
    candidates.semantic_similarity DESC
  LIMIT match_count;
$$;
