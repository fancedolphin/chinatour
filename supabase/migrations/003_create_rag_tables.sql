-- =====================================================================
-- RAG (Retrieval-Augmented Generation) 知识库表
-- 包含：向量扩展、知识库表、向量索引、搜索函数、RLS 策略
-- =====================================================================

-- ============================================================================
-- 1. 启用 pgvector 扩展
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. 创建知识库表（按依赖顺序）
-- ============================================================================

-- 2.1 目的地知识库
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  country VARCHAR(100),
  description TEXT,
  best_season VARCHAR(100),
  average_budget_daily VARCHAR(50),
  currency VARCHAR(10),
  timezone VARCHAR(50),

  -- 向量嵌入（768维，对应 Gemini text-embedding-004）
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 景点知识库
CREATE TABLE public.attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  description TEXT,

  -- 地理位置
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,

  -- 实用信息
  opening_hours JSONB,
  ticket_price VARCHAR(100),
  recommended_duration VARCHAR(50),
  best_time_to_visit VARCHAR(100),

  -- 标签和评价
  tags TEXT[],
  popularity_score DECIMAL(3, 2) DEFAULT 0,
  avg_rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,

  -- 向量嵌入
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 餐厅知识库
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  name VARCHAR(200) NOT NULL,
  cuisine_type VARCHAR(100),
  description TEXT,

  -- 地理位置
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,

  -- 餐厅信息
  price_range VARCHAR(50),
  meal_type VARCHAR(50),
  specialties TEXT[],
  dietary_options TEXT[],
  opening_hours JSONB,
  reservation_required BOOLEAN DEFAULT false,

  -- 评价
  popularity_score DECIMAL(3, 2) DEFAULT 0,
  avg_rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,

  -- 向量嵌入
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 交通信息
CREATE TABLE public.transportation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  type VARCHAR(50),
  name VARCHAR(200),
  description TEXT,
  price_info JSONB,
  operating_hours VARCHAR(100),
  tips TEXT,

  -- 向量嵌入
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 旅行建议库
CREATE TABLE public.travel_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  category VARCHAR(50),
  title VARCHAR(200),
  content TEXT,
  is_important BOOLEAN DEFAULT false,
  season_specific VARCHAR(50),

  -- 向量嵌入
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 真实行程案例库
CREATE TABLE public.trip_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_trip_id UUID REFERENCES shared_trips(id) ON DELETE CASCADE,

  destination VARCHAR(200),
  duration_days INTEGER,
  budget_range VARCHAR(50),
  highlights TEXT[],
  daily_structure JSONB,

  -- 用户反馈指标
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  quality_score DECIMAL(3, 2) DEFAULT 0,

  -- 向量嵌入（整个行程的语义）
  embedding vector(768),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 用户偏好学习
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- 从用户行为中学习
  favorite_categories TEXT[],
  preferred_pace VARCHAR(20),
  budget_level VARCHAR(20),
  dietary_restrictions TEXT[],
  preferred_destinations TEXT[],

  -- 偏好数据
  interaction_history JSONB,

  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. 创建索引
-- ============================================================================

-- 3.1 目的地索引
CREATE INDEX idx_destinations_embedding ON destinations USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_destinations_name ON destinations(name);

-- 3.2 景点索引
CREATE INDEX idx_attractions_embedding ON attractions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_attractions_destination ON attractions(destination_id);
CREATE INDEX idx_attractions_category ON attractions(category);
CREATE INDEX idx_attractions_tags ON attractions USING gin(tags);
CREATE INDEX idx_attractions_popularity ON attractions(popularity_score DESC);

-- 3.3 餐厅索引
CREATE INDEX idx_restaurants_embedding ON restaurants USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_restaurants_destination ON restaurants(destination_id);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_price ON restaurants(price_range);

-- 3.4 交通索引
CREATE INDEX idx_transportation_embedding ON transportation USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_transportation_destination ON transportation(destination_id);

-- 3.5 旅行建议索引
CREATE INDEX idx_travel_tips_embedding ON travel_tips USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_travel_tips_destination ON travel_tips(destination_id);
CREATE INDEX idx_travel_tips_category ON travel_tips(category);

-- 3.6 行程案例索引
CREATE INDEX idx_trip_examples_embedding ON trip_examples USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_trip_examples_destination ON trip_examples(destination);
CREATE INDEX idx_trip_examples_duration ON trip_examples(duration_days);
CREATE INDEX idx_trip_examples_quality ON trip_examples(quality_score DESC);

-- 3.7 用户偏好索引
CREATE INDEX idx_user_preferences_budget ON user_preferences(budget_level);
CREATE INDEX idx_user_preferences_pace ON user_preferences(preferred_pace);

-- ============================================================================
-- 4. 创建向量搜索函数
-- ============================================================================

-- 4.1 搜索景点
CREATE OR REPLACE FUNCTION match_attractions(
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
    1 - (a.embedding <=> query_embedding) as similarity
  FROM attractions a
  LEFT JOIN destinations d ON a.destination_id = d.id
  WHERE
    1 - (a.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4.2 搜索餐厅
CREATE OR REPLACE FUNCTION match_restaurants(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  destination_filter text DEFAULT NULL
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
    1 - (r.embedding <=> query_embedding) as similarity
  FROM restaurants r
  LEFT JOIN destinations d ON r.destination_id = d.id
  WHERE
    1 - (r.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4.3 搜索行程案例
CREATE OR REPLACE FUNCTION match_trip_examples(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 3
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
    1 - (te.embedding <=> query_embedding) as similarity
  FROM trip_examples te
  WHERE 1 - (te.embedding <=> query_embedding) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4.4 搜索旅行建议
CREATE OR REPLACE FUNCTION match_travel_tips(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  destination_filter text DEFAULT NULL
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
    1 - (tt.embedding <=> query_embedding) as similarity
  FROM travel_tips tt
  LEFT JOIN destinations d ON tt.destination_id = d.id
  WHERE
    1 - (tt.embedding <=> query_embedding) > match_threshold
    AND (destination_filter IS NULL OR d.name ILIKE '%' || destination_filter || '%')
  ORDER BY tt.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 5. 创建触发器
-- ============================================================================

-- 5.1 目的地表
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.2 景点表
CREATE TRIGGER update_attractions_updated_at
  BEFORE UPDATE ON attractions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.3 餐厅表
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. 启用 RLS 并创建策略
-- ============================================================================

-- 6.1 启用 RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportation ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 6.2 知识库表策略（所有人可读）
CREATE POLICY "Anyone can view destinations"
  ON destinations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view attractions"
  ON attractions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view transportation"
  ON transportation FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view travel tips"
  ON travel_tips FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view trip examples"
  ON trip_examples FOR SELECT
  USING (true);

-- 6.3 用户偏好策略（仅用户本人可访问）
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
