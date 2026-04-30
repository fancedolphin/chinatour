-- 地图详情扩展：餐馆大众点评链接 + 餐馆-视频-up主 三张目录表
-- 读路径：TripMapPage → tripMapService → 按 (name, destinations.name) 联表拿 dianping_url / restaurant_media

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS dianping_url TEXT;

CREATE TABLE IF NOT EXISTS public.influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  header_pic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id INTEGER UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('douyin', 'bilibili')),
  link_url TEXT NOT NULL,
  thumbnail TEXT,
  title TEXT,
  upload_date DATE,
  alt_platform TEXT CHECK (alt_platform IS NULL OR alt_platform IN ('douyin', 'bilibili')),
  alt_link_url TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_media_restaurant_sort
  ON public.restaurant_media (restaurant_id, sort);

CREATE TABLE IF NOT EXISTS public.restaurant_media_influencers (
  media_id UUID NOT NULL REFERENCES public.restaurant_media(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, influencer_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_media_influencers_influencer
  ON public.restaurant_media_influencers (influencer_id);

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_media_influencers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'influencers' AND policyname = 'Anyone can view influencers'
  ) THEN
    CREATE POLICY "Anyone can view influencers"
      ON public.influencers FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurant_media' AND policyname = 'Anyone can view restaurant media'
  ) THEN
    CREATE POLICY "Anyone can view restaurant media"
      ON public.restaurant_media FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurant_media_influencers' AND policyname = 'Anyone can view restaurant media influencers'
  ) THEN
    CREATE POLICY "Anyone can view restaurant media influencers"
      ON public.restaurant_media_influencers FOR SELECT USING (true);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_influencers_updated_at ON public.influencers;
CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_restaurant_media_updated_at ON public.restaurant_media;
CREATE TRIGGER update_restaurant_media_updated_at
  BEFORE UPDATE ON public.restaurant_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
