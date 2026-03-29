-- =====================================================================
-- 社交功能：关注关系 + 共享行程公开读取策略
-- 对应 CHI-76 / CHI-77 / CHI-78 / CHI-81
-- =====================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows (following_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    UPDATE public.users
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;

    UPDATE public.users
    SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_follow_counts ON public.user_follows;
CREATE TRIGGER trg_update_follow_counts
  AFTER INSERT OR DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.user_follows;
CREATE POLICY "Authenticated users can view follows"
  ON public.user_follows FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create own follows" ON public.user_follows;
CREATE POLICY "Users can create own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON public.user_follows;
CREATE POLICY "Users can delete own follows"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

UPDATE public.users u
SET followers_count = sub.followers_count
FROM (
  SELECT following_id AS user_id, COUNT(*)::INTEGER AS followers_count
  FROM public.user_follows
  GROUP BY following_id
) sub
WHERE u.id = sub.user_id;

UPDATE public.users
SET followers_count = 0
WHERE id NOT IN (SELECT DISTINCT following_id FROM public.user_follows);

UPDATE public.users u
SET following_count = sub.following_count
FROM (
  SELECT follower_id AS user_id, COUNT(*)::INTEGER AS following_count
  FROM public.user_follows
  GROUP BY follower_id
) sub
WHERE u.id = sub.user_id;

UPDATE public.users
SET following_count = 0
WHERE id NOT IN (SELECT DISTINCT follower_id FROM public.user_follows);

DROP POLICY IF EXISTS "Users can view shared or own trips" ON public.trips;
CREATE POLICY "Users can view shared or own trips"
  ON public.trips FOR SELECT
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.shared_trips
      WHERE shared_trips.trip_id = trips.id
        AND shared_trips.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view shared or own itineraries" ON public.trip_itineraries;
CREATE POLICY "Users can view shared or own itineraries"
  ON public.trip_itineraries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itineraries.trip_id
        AND trips.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.shared_trips
      WHERE shared_trips.trip_id = trip_itineraries.trip_id
        AND shared_trips.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view shared or own activities" ON public.activities;
CREATE POLICY "Users can view shared or own activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND t.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.shared_trips st ON st.trip_id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND st.is_active = true
    )
  );
