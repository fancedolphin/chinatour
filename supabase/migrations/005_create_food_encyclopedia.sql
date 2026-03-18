-- =====================================================================
-- 中国传统美食百科表
-- 对应 CHI-64 / CHI-66 / CHI-67
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.food_encyclopedia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_zh TEXT NOT NULL,
  name_pinyin TEXT,
  name_en TEXT,
  cuisine TEXT NOT NULL,
  category TEXT NOT NULL,
  spice_level SMALLINT DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 3),
  flavor_md TEXT,
  foreign_analogies JSONB DEFAULT '[]'::jsonb,
  allergens TEXT[] DEFAULT '{}'::text[],
  allergen_note TEXT,
  traveler_tips TEXT,
  ordering_tips TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_cuisine ON public.food_encyclopedia(cuisine);
CREATE INDEX IF NOT EXISTS idx_food_spice ON public.food_encyclopedia(spice_level);
CREATE INDEX IF NOT EXISTS idx_food_allergens ON public.food_encyclopedia USING GIN(allergens);

ALTER TABLE public.food_encyclopedia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food encyclopedia public read" ON public.food_encyclopedia;
CREATE POLICY "food encyclopedia public read"
  ON public.food_encyclopedia
  FOR SELECT
  USING (is_published = true);

DROP TRIGGER IF EXISTS trg_food_encyclopedia_updated_at ON public.food_encyclopedia;
CREATE TRIGGER trg_food_encyclopedia_updated_at
  BEFORE UPDATE ON public.food_encyclopedia
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.food_encyclopedia TO anon, authenticated;
