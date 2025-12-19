-- =====================================================================
-- 核心数据表与安全策略初始化
-- 包含：基础函数、核心表、索引、触发器、RLS 设置与策略
-- =====================================================================

-- =============================================================
-- 2. 函数定义（含基础扩展）
-- =============================================================

-- 确保可用的随机 UUID 生成函数
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 通用的 updated_at 更新函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auth.users 插入时自动创建 public.users 记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 用户互动后更新点赞数
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.liked = true AND (OLD IS NULL OR OLD.liked = false) THEN
      UPDATE shared_trips SET likes_count = likes_count + 1 WHERE id = NEW.shared_trip_id;
    ELSIF NEW.liked = false AND OLD.liked = true THEN
      UPDATE shared_trips SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = NEW.shared_trip_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.liked = true THEN
      UPDATE shared_trips SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.shared_trip_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 用户互动后更新收藏数
CREATE OR REPLACE FUNCTION public.update_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.saved = true AND (OLD IS NULL OR OLD.saved = false) THEN
      UPDATE shared_trips SET saves_count = saves_count + 1 WHERE id = NEW.shared_trip_id;
    ELSIF NEW.saved = false AND OLD.saved = true THEN
      UPDATE shared_trips SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = NEW.shared_trip_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.saved = true THEN
      UPDATE shared_trips SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.shared_trip_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 自动计算行程天数
CREATE OR REPLACE FUNCTION public.calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration := (NEW.end_date - NEW.start_date + 1) || '天';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- 3. 表结构创建（按依赖顺序）
-- =============================================================

-- 3.1 users（扩展用户信息）
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'zh' CHECK (language IN ('zh', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 trips（行程）
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  destination VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration VARCHAR(50),
  budget VARCHAR(100),
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'completed')),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('ai', 'manual')),
  ai_prompt TEXT,
  ai_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 trip_itineraries（每日行程）
CREATE TABLE public.trip_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date VARCHAR(50),
  theme VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, day_number)
);

-- 3.4 activities（具体活动）
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.trip_itineraries(id) ON DELETE CASCADE,
  time VARCHAR(20),
  type VARCHAR(20) NOT NULL CHECK (type IN ('attraction', 'meal', 'transport', 'accommodation', 'other')),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  duration VARCHAR(50),
  price VARCHAR(50),
  image_url TEXT,
  address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 shared_trips（分享的行程）
CREATE TABLE public.shared_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  description TEXT,
  highlights TEXT[],
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id)
);

-- 3.6 user_interactions（用户互动）
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shared_trip_id UUID NOT NULL REFERENCES public.shared_trips(id) ON DELETE CASCADE,
  liked BOOLEAN DEFAULT false,
  saved BOOLEAN DEFAULT false,
  viewed BOOLEAN DEFAULT false,
  liked_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shared_trip_id)
);


-- =============================================================
-- 4. 索引创建
-- =============================================================

-- users
CREATE INDEX idx_users_username ON public.users (username);

-- trips
CREATE INDEX idx_trips_user_id ON public.trips (user_id);
CREATE INDEX idx_trips_status ON public.trips (status);
CREATE INDEX idx_trips_created_at ON public.trips (created_at DESC);
CREATE INDEX idx_trips_destination_search ON public.trips USING gin (to_tsvector('english', destination));

-- trip_itineraries
CREATE INDEX idx_itineraries_trip_id ON public.trip_itineraries (trip_id);
CREATE INDEX idx_itineraries_day ON public.trip_itineraries (trip_id, day_number);

-- activities
CREATE INDEX idx_activities_itinerary_id ON public.activities (itinerary_id);
CREATE INDEX idx_activities_order ON public.activities (itinerary_id, order_index);
CREATE INDEX idx_activities_location ON public.activities (location_lat, location_lng);

-- shared_trips
CREATE INDEX idx_shared_trips_user_id ON public.shared_trips (user_id);
CREATE INDEX idx_shared_trips_trip_id ON public.shared_trips (trip_id);
CREATE INDEX idx_shared_trips_active ON public.shared_trips (is_active) WHERE is_active = true;
CREATE INDEX idx_shared_trips_likes ON public.shared_trips (likes_count DESC);
CREATE INDEX idx_shared_trips_shared_at ON public.shared_trips (shared_at DESC);
CREATE INDEX idx_shared_trips_tags ON public.shared_trips USING gin (tags);
CREATE INDEX idx_shared_trips_search ON public.shared_trips USING gin (to_tsvector('english', coalesce(description, '')));

-- user_interactions
CREATE INDEX idx_interactions_user_id ON public.user_interactions (user_id);
CREATE INDEX idx_interactions_shared_trip_id ON public.user_interactions (shared_trip_id);
CREATE INDEX idx_interactions_liked ON public.user_interactions (user_id, liked) WHERE liked = true;
CREATE INDEX idx_interactions_saved ON public.user_interactions (user_id, saved) WHERE saved = true;


-- =============================================================
-- 5. 触发器创建
-- =============================================================

-- 更新更新时间戳
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_trip_itineraries_updated_at
  BEFORE UPDATE ON public.trip_itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_shared_trips_updated_at
  BEFORE UPDATE ON public.shared_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_interactions_updated_at
  BEFORE UPDATE ON public.user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 计算行程天数
CREATE TRIGGER trg_calculate_duration
  BEFORE INSERT OR UPDATE OF start_date, end_date ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_duration();

-- 统计点赞与收藏
CREATE TRIGGER trg_update_likes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_likes_count();

CREATE TRIGGER trg_update_saves_count
  AFTER INSERT OR UPDATE OR DELETE ON public.user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saves_count();

-- auth.users 新增用户时自动补充 public.users
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================
-- 6. RLS 启用与策略
-- =============================================================

-- 启用 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- users 策略
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- trips 策略
CREATE POLICY "Users can view own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- trip_itineraries 策略
CREATE POLICY "Users can view own itineraries"
  ON public.trip_itineraries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itineraries.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own itineraries"
  ON public.trip_itineraries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itineraries.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own itineraries"
  ON public.trip_itineraries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itineraries.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own itineraries"
  ON public.trip_itineraries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_itineraries.trip_id
        AND trips.user_id = auth.uid()
    )
  );

-- activities 策略
CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_itineraries ti
      JOIN public.trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id
        AND t.user_id = auth.uid()
    )
  );

-- shared_trips 策略
CREATE POLICY "Anyone can view active shared trips"
  ON public.shared_trips FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can share own trips"
  ON public.shared_trips FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = shared_trips.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shares"
  ON public.shared_trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares"
  ON public.shared_trips FOR DELETE
  USING (auth.uid() = user_id);

-- user_interactions 策略
CREATE POLICY "Users can view own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON public.user_interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON public.user_interactions FOR DELETE
  USING (auth.uid() = user_id);
