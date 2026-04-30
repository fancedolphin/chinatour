ALTER TABLE public.attractions
  ADD COLUMN IF NOT EXISTS indoor_outdoor VARCHAR(20) DEFAULT 'outdoor',
  ADD COLUMN IF NOT EXISTS reservation_notes TEXT,
  ADD COLUMN IF NOT EXISTS crowd_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS physical_intensity VARCHAR(20),
  ADD COLUMN IF NOT EXISTS signature_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS foreigner_friendly_features JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.cultural_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  attraction_id UUID REFERENCES public.attractions(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  duration_text VARCHAR(50),
  price_range VARCHAR(50),
  booking_required BOOLEAN DEFAULT false,
  best_time_to_visit VARCHAR(100),
  signature_items JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  popularity_score DECIMAL(3, 2) DEFAULT 0,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  attraction_id UUID REFERENCES public.attractions(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  description TEXT,
  month_start SMALLINT NOT NULL CHECK (month_start BETWEEN 1 AND 12),
  month_end SMALLINT NOT NULL CHECK (month_end BETWEEN 1 AND 12),
  location_name VARCHAR(200),
  address TEXT,
  booking_required BOOLEAN DEFAULT false,
  is_indoor BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.markets_and_shopping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  opening_hours JSONB,
  best_time_to_visit VARCHAR(100),
  signature_items JSONB DEFAULT '[]'::jsonb,
  bargain_tip TEXT,
  is_night_market BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  popularity_score DECIMAL(3, 2) DEFAULT 0,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.industrial_tourism (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES public.destinations(id) ON DELETE CASCADE,
  attraction_id UUID REFERENCES public.attractions(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  experience_description TEXT,
  products_available TEXT[] DEFAULT ARRAY[]::TEXT[],
  duration_text VARCHAR(50),
  price_range VARCHAR(50),
  booking_required BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attractions_indoor_outdoor ON public.attractions(indoor_outdoor);
CREATE INDEX IF NOT EXISTS idx_cultural_experiences_embedding ON public.cultural_experiences USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_cultural_experiences_destination ON public.cultural_experiences(destination_id);
CREATE INDEX IF NOT EXISTS idx_cultural_experiences_tags ON public.cultural_experiences USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_events_embedding ON public.events USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_events_destination ON public.events(destination_id);
CREATE INDEX IF NOT EXISTS idx_events_months ON public.events(month_start, month_end);
CREATE INDEX IF NOT EXISTS idx_markets_and_shopping_embedding ON public.markets_and_shopping USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_markets_and_shopping_destination ON public.markets_and_shopping(destination_id);
CREATE INDEX IF NOT EXISTS idx_markets_and_shopping_tags ON public.markets_and_shopping USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_industrial_tourism_embedding ON public.industrial_tourism USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_industrial_tourism_destination ON public.industrial_tourism(destination_id);
CREATE INDEX IF NOT EXISTS idx_industrial_tourism_tags ON public.industrial_tourism USING gin(tags);

CREATE OR REPLACE FUNCTION public.match_indoor_attractions(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  destination_filter text DEFAULT NULL
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
    a.indoor_outdoor::text,
    1 - (a.embedding <=> query_embedding) as similarity
  FROM public.attractions a
  LEFT JOIN public.destinations d ON a.destination_id = d.id
  WHERE
    a.indoor_outdoor IN ('indoor', 'both')
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_cultural_experiences(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 6,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  description text,
  address text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.name,
    ce.category,
    ce.description,
    ce.address,
    ce.tags,
    1 - (ce.embedding <=> query_embedding) as similarity
  FROM public.cultural_experiences ce
  LEFT JOIN public.destinations d ON ce.destination_id = d.id
  WHERE
    1 - (ce.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_events(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 6,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  description text,
  month_start smallint,
  month_end smallint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.category,
    e.description,
    e.month_start,
    e.month_end,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM public.events e
  LEFT JOIN public.destinations d ON e.destination_id = d.id
  WHERE
    1 - (e.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_markets_and_shopping(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 6,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  description text,
  address text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.name,
    ms.category,
    ms.description,
    ms.address,
    ms.tags,
    1 - (ms.embedding <=> query_embedding) as similarity
  FROM public.markets_and_shopping ms
  LEFT JOIN public.destinations d ON ms.destination_id = d.id
  WHERE
    1 - (ms.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY ms.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_industrial_tourism(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 6,
  destination_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  description text,
  address text,
  experience_description text,
  products_available text[],
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    it.id,
    it.name::text,
    it.category::text,
    it.description,
    it.address,
    it.experience_description,
    it.products_available,
    it.tags,
    1 - (it.embedding <=> query_embedding) as similarity
  FROM public.industrial_tourism it
  LEFT JOIN public.destinations d ON it.destination_id = d.id
  WHERE
    1 - (it.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY it.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

DROP TRIGGER IF EXISTS update_cultural_experiences_updated_at ON public.cultural_experiences;
CREATE TRIGGER update_cultural_experiences_updated_at
  BEFORE UPDATE ON public.cultural_experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_markets_and_shopping_updated_at ON public.markets_and_shopping;
CREATE TRIGGER update_markets_and_shopping_updated_at
  BEFORE UPDATE ON public.markets_and_shopping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_industrial_tourism_updated_at ON public.industrial_tourism;
CREATE TRIGGER update_industrial_tourism_updated_at
  BEFORE UPDATE ON public.industrial_tourism
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cultural_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets_and_shopping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industrial_tourism ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cultural_experiences' AND policyname = 'Anyone can view cultural experiences'
  ) THEN
    CREATE POLICY "Anyone can view cultural experiences"
      ON public.cultural_experiences FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Anyone can view events'
  ) THEN
    CREATE POLICY "Anyone can view events"
      ON public.events FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'markets_and_shopping' AND policyname = 'Anyone can view markets and shopping'
  ) THEN
    CREATE POLICY "Anyone can view markets and shopping"
      ON public.markets_and_shopping FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'industrial_tourism' AND policyname = 'Anyone can view industrial tourism'
  ) THEN
    CREATE POLICY "Anyone can view industrial tourism"
      ON public.industrial_tourism FOR SELECT
      USING (true);
  END IF;
END
$$;
