DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'map_location_type'
  ) THEN
    CREATE TYPE public.map_location_type AS ENUM ('restaurant', 'attraction', 'hotel');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'video_platform'
  ) THEN
    CREATE TYPE public.video_platform AS ENUM ('douyin', 'xiaohongshu');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.trip_map_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type public.map_location_type NOT NULL DEFAULT 'attraction',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.location_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.trip_map_locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover TEXT,
  author_avatar TEXT,
  author_name TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.location_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.trip_map_locations(id) ON DELETE CASCADE,
  thumbnail TEXT,
  author_avatar TEXT,
  author_name TEXT,
  date DATE,
  platform public.video_platform NOT NULL DEFAULT 'douyin',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_map_locations_trip_id
  ON public.trip_map_locations (trip_id, order_index);

CREATE INDEX IF NOT EXISTS idx_trip_map_locations_city
  ON public.trip_map_locations (city);

CREATE INDEX IF NOT EXISTS idx_location_articles_location_id
  ON public.location_articles (location_id);

CREATE INDEX IF NOT EXISTS idx_location_videos_location_id
  ON public.location_videos (location_id);

ALTER TABLE public.trip_map_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_map_locations_select_own_trip ON public.trip_map_locations;
CREATE POLICY trip_map_locations_select_own_trip
  ON public.trip_map_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips trip
      WHERE trip.id = trip_map_locations.trip_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trip_map_locations_insert_own_trip ON public.trip_map_locations;
CREATE POLICY trip_map_locations_insert_own_trip
  ON public.trip_map_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trips trip
      WHERE trip.id = trip_map_locations.trip_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trip_map_locations_update_own_trip ON public.trip_map_locations;
CREATE POLICY trip_map_locations_update_own_trip
  ON public.trip_map_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips trip
      WHERE trip.id = trip_map_locations.trip_id
        AND trip.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trips trip
      WHERE trip.id = trip_map_locations.trip_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trip_map_locations_delete_own_trip ON public.trip_map_locations;
CREATE POLICY trip_map_locations_delete_own_trip
  ON public.trip_map_locations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips trip
      WHERE trip.id = trip_map_locations.trip_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_articles_select_own_trip ON public.location_articles;
CREATE POLICY location_articles_select_own_trip
  ON public.location_articles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_articles.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_articles_insert_own_trip ON public.location_articles;
CREATE POLICY location_articles_insert_own_trip
  ON public.location_articles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_articles.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_articles_update_own_trip ON public.location_articles;
CREATE POLICY location_articles_update_own_trip
  ON public.location_articles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_articles.location_id
        AND trip.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_articles.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_articles_delete_own_trip ON public.location_articles;
CREATE POLICY location_articles_delete_own_trip
  ON public.location_articles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_articles.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_videos_select_own_trip ON public.location_videos;
CREATE POLICY location_videos_select_own_trip
  ON public.location_videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_videos.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_videos_insert_own_trip ON public.location_videos;
CREATE POLICY location_videos_insert_own_trip
  ON public.location_videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_videos.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_videos_update_own_trip ON public.location_videos;
CREATE POLICY location_videos_update_own_trip
  ON public.location_videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_videos.location_id
        AND trip.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_videos.location_id
        AND trip.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS location_videos_delete_own_trip ON public.location_videos;
CREATE POLICY location_videos_delete_own_trip
  ON public.location_videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.trip_map_locations location
      JOIN public.trips trip ON trip.id = location.trip_id
      WHERE location.id = location_videos.location_id
        AND trip.user_id = auth.uid()
    )
  );
