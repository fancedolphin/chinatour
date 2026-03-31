ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
  ADD COLUMN IF NOT EXISTS menu_image_url TEXT;

CREATE TABLE IF NOT EXISTS public.restaurant_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description TEXT,
  image_url TEXT,
  allergens TEXT[] NOT NULL DEFAULT '{}'::text[],
  recommend_count INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_dishes_restaurant_name
  ON public.restaurant_dishes(restaurant_id, name);

CREATE INDEX IF NOT EXISTS idx_restaurant_dishes_restaurant
  ON public.restaurant_dishes(restaurant_id);

ALTER TABLE public.restaurant_dishes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'restaurant_dishes'
      AND policyname = 'Anyone can view restaurant dishes'
  ) THEN
    CREATE POLICY "Anyone can view restaurant dishes"
      ON public.restaurant_dishes FOR SELECT
      USING (true);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_restaurant_dishes_updated_at ON public.restaurant_dishes;

CREATE TRIGGER update_restaurant_dishes_updated_at
  BEFORE UPDATE ON public.restaurant_dishes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
