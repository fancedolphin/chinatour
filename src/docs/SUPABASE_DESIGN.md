# Supabase PostgreSQL 数据库设计规划

## 📋 目录
1. [数据库架构概览](#数据库架构概览)
2. [表结构设计](#表结构设计)
3. [Row Level Security (RLS) 策略](#row-level-security-rls-策略)
4. [触发器和函数](#触发器和函数)
5. [API 端点设计](#api-端点设计)
6. [认证流程](#认证流程)
7. [实施计划](#实施计划)

---

## 1. 数据库架构概览

### 1.1 技术选型

✅ **使用 Supabase PostgreSQL** 而不是 KV Store
- 关系型数据库，支持复杂查询
- 内置 Row Level Security (RLS)
- 支持触发器、函数、索引
- 实时订阅功能
- 强大的数据完整性保证

✅ **使用 Supabase Auth** 而不是自己实现
- 自动密码加密（bcrypt）
- JWT Token 管理
- 邮箱验证
- 社交登录支持
- 会话管理

### 1.2 核心实体关系图

```
auth.users (Supabase 系统表)
    ↓ 1:1
public.users (用户扩展信息)
    ↓ 1:N
trips (行程)
    ↓ 1:N
trip_itineraries (每日行程)
    ↓ 1:N
activities (活动)

trips → shared_trips (分享) 1:1
    ↓ N:M
user_interactions (用户互动)

shared_trips
```

---

## 2. 表结构设计

### 2.1 用户表 (users)

**作用**: 存储用户的公开信息和个性化设置

```sql
-- ✅ 使用 Supabase Auth
-- auth.users 表由 Supabase 自动管理（存储邮箱、密码哈希等敏感信息）
-- public.users 表存储用户的公开信息

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  
  -- 设置
  theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'zh' CHECK (language IN ('zh', 'en')),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_username ON users(username);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 触发器：auth.users 新用户时自动创建 public.users
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**TypeScript 接口**:
```typescript
interface User {
  id: string;                    // UUID
  username: string;              // 用户名
  display_name: string | null;   // 显示名称
  avatar_url: string | null;     // 头像URL
  bio: string | null;            // 个人简介
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

---

### 2.2 行程表 (trips)

**作用**: 存储行程的基本信息

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 基本信息
  destination VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration VARCHAR(50),      -- "7天"（计算得出，也可存储）
  budget VARCHAR(100),       -- "£3,500"
  image_url TEXT,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'planning' 
    CHECK (status IN ('planning', 'upcoming', 'completed')),
  
  -- 来源信息（AI生成 vs 手动创建）
  source VARCHAR(20) DEFAULT 'manual' 
    CHECK (source IN ('ai', 'manual')),
  ai_prompt TEXT,            -- AI提示词
  ai_generated_at TIMESTAMPTZ,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- 全文搜索索引
CREATE INDEX idx_trips_destination_search 
  ON trips USING gin(to_tsvector('english', destination));

-- 更新触发器
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**TypeScript 接口**:
```typescript
interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;        // YYYY-MM-DD
  end_date: string;          // YYYY-MM-DD
  duration: string;          // "7天"
  budget: string | null;     // "£3,500"
  image_url: string | null;
  status: 'planning' | 'upcoming' | 'completed';
  source: 'ai' | 'manual';
  ai_prompt: string | null;
  ai_generated_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### 2.3 行程详情表 (trip_itineraries)

**作用**: 存储每日行程安排

```sql
CREATE TABLE trip_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  
  day_number INTEGER NOT NULL,  -- 第几天
  date VARCHAR(50),             -- "10月1日 周二"（显示用）
  theme VARCHAR(200),           -- 当天主题
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id, day_number)   -- 一个行程的每一天唯一
);

-- 索引
CREATE INDEX idx_itineraries_trip_id ON trip_itineraries(trip_id);
CREATE INDEX idx_itineraries_day ON trip_itineraries(trip_id, day_number);

-- 更新触发器
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON trip_itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**TypeScript 接口**:
```typescript
interface TripItinerary {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;       // "10月1日 周二"
  theme: string | null;      // "抵达伦敦 · 市中心初探"
  created_at: string;
  updated_at: string;
}
```

---

### 2.4 活动表 (activities)

**作用**: 存储每日行程中的具体活动

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES trip_itineraries(id) ON DELETE CASCADE,
  
  -- 基本信息
  time VARCHAR(20),             -- "09:00"
  type VARCHAR(20) NOT NULL 
    CHECK (type IN ('attraction', 'meal', 'transport', 'accommodation', 'other')),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  duration VARCHAR(50),         -- "3小时"
  price VARCHAR(50),            -- "£20-30"
  
  -- 媒体
  image_url TEXT,
  
  -- 地理位置
  address TEXT,
  location_lat DECIMAL(10, 8),  -- 纬度
  location_lng DECIMAL(11, 8),  -- 经度
  
  -- 排序
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_activities_itinerary_id ON activities(itinerary_id);
CREATE INDEX idx_activities_order ON activities(itinerary_id, order_index);
CREATE INDEX idx_activities_location ON activities(location_lat, location_lng);
```

**TypeScript 接口**:
```typescript
interface Activity {
  id: string;
  itinerary_id: string;
  time: string | null;
  type: 'attraction' | 'meal' | 'transport' | 'accommodation' | 'other';
  name: string;
  description: string | null;
  duration: string | null;
  price: string | null;
  image_url: string | null;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  order_index: number;
  created_at: string;
}
```

---

### 2.5 分享行程表 (shared_trips)

**作用**: 存储分享到"发现"页面的行程

```sql
CREATE TABLE shared_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 分享信息
  description TEXT,
  highlights TEXT[],            -- PostgreSQL 数组类型
  tags TEXT[],                  -- ["历史文化", "博物馆", "美食"]
  
  -- 统计数据（通过触发器自动更新）
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,  -- 是否精选
  
  -- 时间戳
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id)  -- 一个行程只能分享一次
);

-- 索引
CREATE INDEX idx_shared_trips_user_id ON shared_trips(user_id);
CREATE INDEX idx_shared_trips_trip_id ON shared_trips(trip_id);
CREATE INDEX idx_shared_trips_active ON shared_trips(is_active) WHERE is_active = true;
CREATE INDEX idx_shared_trips_likes ON shared_trips(likes_count DESC);
CREATE INDEX idx_shared_trips_shared_at ON shared_trips(shared_at DESC);
CREATE INDEX idx_shared_trips_tags ON shared_trips USING gin(tags);

-- 全文搜索索引
CREATE INDEX idx_shared_trips_search 
  ON shared_trips USING gin(to_tsvector('english', coalesce(description, '')));

-- 更新触发器
CREATE TRIGGER update_shared_trips_updated_at
  BEFORE UPDATE ON shared_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**TypeScript 接口**:
```typescript
interface SharedTrip {
  id: string;
  trip_id: string;
  user_id: string;
  description: string | null;
  highlights: string[];
  tags: string[];
  likes_count: number;
  saves_count: number;
  comments_count: number;
  views_count: number;
  is_active: boolean;
  featured: boolean;
  shared_at: string;
  updated_at: string;
}
```

---

### 2.6 用户互动表 (user_interactions)

**作用**: 存储用户的点赞、收藏、浏览记录

```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_trip_id UUID NOT NULL REFERENCES shared_trips(id) ON DELETE CASCADE,
  
  -- 互动类型
  liked BOOLEAN DEFAULT false,
  saved BOOLEAN DEFAULT false,
  viewed BOOLEAN DEFAULT false,
  
  -- 时间戳
  liked_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, shared_trip_id)  -- 每个用户对每个分享行程只有一条记录
);

-- 索引
CREATE INDEX idx_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_interactions_shared_trip_id ON user_interactions(shared_trip_id);
CREATE INDEX idx_interactions_liked ON user_interactions(user_id, liked) WHERE liked = true;
CREATE INDEX idx_interactions_saved ON user_interactions(user_id, saved) WHERE saved = true;

-- 更新触发器
CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**TypeScript 接口**:
```typescript
interface UserInteraction {
  id: string;
  user_id: string;
  shared_trip_id: string;
  liked: boolean;
  saved: boolean;
  viewed: boolean;
  liked_at: string | null;
  saved_at: string | null;
  viewed_at: string | null;
  created_at: string;
  updated_at: string;
}
```

---

---

## 3. Row Level Security (RLS) 策略

### 3.1 RLS 概述

RLS（行级安全策略）在数据库层面控制数据访问权限，比应用层验证更安全。

### 3.2 启用 RLS

```sql
-- 为所有表启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_comments ENABLE ROW LEVEL SECURITY;
```

### 3.3 users 表策略

```sql
-- 任何人都可以查看用户的公开信息
CREATE POLICY "Users are viewable by everyone" 
  ON users FOR SELECT 
  USING (true);

-- 用户只能更新自己的信息
CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
```

### 3.4 trips 表策略

```sql
-- 用户可以查看自己的行程
CREATE POLICY "Users can view own trips" 
  ON trips FOR SELECT 
  USING (auth.uid() = user_id);

-- 用户可以创建行程
CREATE POLICY "Users can create trips" 
  ON trips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的行程
CREATE POLICY "Users can update own trips" 
  ON trips FOR UPDATE 
  USING (auth.uid() = user_id);

-- 用户可以删除自己的行程
CREATE POLICY "Users can delete own trips" 
  ON trips FOR DELETE 
  USING (auth.uid() = user_id);
```

### 3.5 trip_itineraries & activities 表策略

```sql
-- 用户可以查看自己行程的详情
CREATE POLICY "Users can view own itineraries" 
  ON trip_itineraries FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_itineraries.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- 用户可以创建/更新/删除自己行程的详情
CREATE POLICY "Users can insert own itineraries" 
  ON trip_itineraries FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_itineraries.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own itineraries" 
  ON trip_itineraries FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_itineraries.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own itineraries" 
  ON trip_itineraries FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_itineraries.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- activities 表策略类似
CREATE POLICY "Users can view own activities" 
  ON activities FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM trip_itineraries ti
      JOIN trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own activities" 
  ON activities FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_itineraries ti
      JOIN trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activities" 
  ON activities FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM trip_itineraries ti
      JOIN trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own activities" 
  ON activities FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM trip_itineraries ti
      JOIN trips t ON t.id = ti.trip_id
      WHERE ti.id = activities.itinerary_id 
      AND t.user_id = auth.uid()
    )
  );
```

### 3.6 shared_trips 表策略

```sql
-- 任何人都可以查看活跃的分享行程
CREATE POLICY "Anyone can view active shared trips" 
  ON shared_trips FOR SELECT 
  USING (is_active = true);

-- 用户可以分享自己的行程
CREATE POLICY "Users can share own trips" 
  ON shared_trips FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = shared_trips.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- 用户可以更新自己的分享
CREATE POLICY "Users can update own shares" 
  ON shared_trips FOR UPDATE 
  USING (auth.uid() = user_id);

-- 用户可以删除自己的分享
CREATE POLICY "Users can delete own shares" 
  ON shared_trips FOR DELETE 
  USING (auth.uid() = user_id);
```

### 3.7 user_interactions 表策略

```sql
-- 用户可以查看自己的互动记录
CREATE POLICY "Users can view own interactions" 
  ON user_interactions FOR SELECT 
  USING (auth.uid() = user_id);

-- 用户可以创建互动记录
CREATE POLICY "Users can create interactions" 
  ON user_interactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的互动记录
CREATE POLICY "Users can update own interactions" 
  ON user_interactions FOR UPDATE 
  USING (auth.uid() = user_id);

-- 用户可以删除自己的互动记录
CREATE POLICY "Users can delete own interactions" 
  ON user_interactions FOR DELETE 
  USING (auth.uid() = user_id);
```

---

## 4. 触发器和函数

### 4.1 自动更新统计数据

当用户点赞/收藏时，自动更新 shared_trips 的统计计数。

```sql
-- 更新点赞数
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.liked = true AND (OLD IS NULL OR OLD.liked = false) THEN
      UPDATE shared_trips 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.shared_trip_id;
    ELSIF NEW.liked = false AND OLD.liked = true THEN
      UPDATE shared_trips 
      SET likes_count = GREATEST(likes_count - 1, 0) 
      WHERE id = NEW.shared_trip_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.liked = true THEN
      UPDATE shared_trips 
      SET likes_count = GREATEST(likes_count - 1, 0) 
      WHERE id = OLD.shared_trip_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR UPDATE OR DELETE ON user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_likes_count();

-- 更新收藏数
CREATE OR REPLACE FUNCTION update_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.saved = true AND (OLD IS NULL OR OLD.saved = false) THEN
      UPDATE shared_trips 
      SET saves_count = saves_count + 1 
      WHERE id = NEW.shared_trip_id;
    ELSIF NEW.saved = false AND OLD.saved = true THEN
      UPDATE shared_trips 
      SET saves_count = GREATEST(saves_count - 1, 0) 
      WHERE id = NEW.shared_trip_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.saved = true THEN
      UPDATE shared_trips 
      SET saves_count = GREATEST(saves_count - 1, 0) 
      WHERE id = OLD.shared_trip_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saves_count
  AFTER INSERT OR UPDATE OR DELETE ON user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_saves_count();


```

### 4.2 自动计算行程天数

```sql
CREATE OR REPLACE FUNCTION calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration := (NEW.end_date - NEW.start_date + 1) || '天';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_duration
  BEFORE INSERT OR UPDATE OF start_date, end_date ON trips
  FOR EACH ROW
  EXECUTE FUNCTION calculate_duration();
```

---

## 5. API 端点设计

### 5.1 认证 API（使用 Supabase Client 直接调用）

```typescript
// 前端直接使用 Supabase Client，无需自定义API

// 注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      username: 'johndoe',
      display_name: 'John Doe'
    }
  }
});

// 登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// 登出
const { error } = await supabase.auth.signOut();

// 获取当前用户
const { data: { user } } = await supabase.auth.getUser();
```

### 5.2 用户 API

```typescript
// GET /api/users/:id - 获取用户信息
// 使用 Supabase Client 直接查询
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// PUT /api/users/:id - 更新用户信息
const { data, error } = await supabase
  .from('users')
  .update({
    display_name: 'New Name',
    bio: 'New bio',
    avatar_url: 'https://...'
  })
  .eq('id', userId)
  .select()
  .single();
```

### 5.3 行程 API

```typescript
// GET /api/trips - 获取当前用户的所有行程
const { data, error } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// GET /api/trips/:id - 获取单个行程（包含详情）
const { data, error } = await supabase
  .from('trips')
  .select(`
    *,
    trip_itineraries (
      *,
      activities (*)
    )
  `)
  .eq('id', tripId)
  .single();

// POST /api/trips - 创建行程
const { data, error } = await supabase
  .from('trips')
  .insert({
    user_id: userId,
    destination: '伦敦 · 爱丁堡',
    start_date: '2024-10-01',
    end_date: '2024-10-07',
    budget: '£3,500',
    image_url: 'https://...',
    status: 'planning'
  })
  .select()
  .single();

// PUT /api/trips/:id - 更新行程
const { data, error } = await supabase
  .from('trips')
  .update({
    destination: '新目的地',
    budget: '£4,000'
  })
  .eq('id', tripId)
  .select()
  .single();

// DELETE /api/trips/:id - 删除行程
const { error } = await supabase
  .from('trips')
  .delete()
  .eq('id', tripId);
```

### 5.4 行程详情 API

```typescript
// POST /api/trips/:tripId/itineraries - 批量创建每日行程
const { data, error } = await supabase
  .from('trip_itineraries')
  .insert([
    {
      trip_id: tripId,
      day_number: 1,
      date: '10月1日 周二',
      theme: '抵达伦敦 · 市中心初探'
    },
    {
      trip_id: tripId,
      day_number: 2,
      date: '10月2日 周三',
      theme: '伦敦博物馆日'
    }
  ])
  .select();

// POST /api/itineraries/:itineraryId/activities - 添加活动
const { data, error } = await supabase
  .from('activities')
  .insert({
    itinerary_id: itineraryId,
    time: '09:00',
    type: 'attraction',
    name: '大英博物馆',
    description: '世界四大博物馆之一',
    duration: '3小时',
    price: '免费',
    image_url: 'https://...',
    address: 'Great Russell St, London'
  })
  .select()
  .single();
```

### 5.5 分享行程 API

```typescript
// GET /api/shared-trips - 获取所有分享的行程
const { data, error } = await supabase
  .from('shared_trips')
  .select(`
    *,
    trips (*),
    users (username, display_name, avatar_url)
  `)
  .eq('is_active', true)
  .order('shared_at', { ascending: false });

// GET /api/shared-trips?sort=hot - 按热度排序
const { data, error } = await supabase
  .from('shared_trips')
  .select(`
    *,
    trips (*),
    users (username, display_name, avatar_url)
  `)
  .eq('is_active', true)
  .order('likes_count', { ascending: false });

// GET /api/shared-trips?tags=历史文化,美食 - 按标签筛选
const { data, error } = await supabase
  .from('shared_trips')
  .select(`
    *,
    trips (*),
    users (username, display_name, avatar_url)
  `)
  .eq('is_active', true)
  .contains('tags', ['历史文化', '美食']);

// POST /api/shared-trips - 分享行程
const { data, error } = await supabase
  .from('shared_trips')
  .insert({
    trip_id: tripId,
    user_id: userId,
    description: '7天深度游英伦...',
    highlights: ['大英博物馆', '白金汉宫', '爱丁堡城堡'],
    tags: ['历史文化', '博物馆', '美食']
  })
  .select()
  .single();

// DELETE /api/shared-trips/:id - 取消分享
const { error } = await supabase
  .from('shared_trips')
  .delete()
  .eq('id', sharedTripId);
```

### 5.6 用户互动 API

```typescript
// GET /api/user/interactions - 获取用户的互动记录
const { data, error } = await supabase
  .from('user_interactions')
  .select('*')
  .eq('user_id', userId);

// POST /api/shared-trips/:id/like - 点赞/取消点赞
const { data, error } = await supabase
  .from('user_interactions')
  .upsert({
    user_id: userId,
    shared_trip_id: sharedTripId,
    liked: true,
    liked_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,shared_trip_id'
  })
  .select()
  .single();

// POST /api/shared-trips/:id/save - 收藏/取消收藏
const { data, error } = await supabase
  .from('user_interactions')
  .upsert({
    user_id: userId,
    shared_trip_id: sharedTripId,
    saved: true,
    saved_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,shared_trip_id'
  })
  .select()
  .single();

// POST /api/shared-trips/:id/view - 记录浏览
const { data, error } = await supabase
  .from('user_interactions')
  .upsert({
    user_id: userId,
    shared_trip_id: sharedTripId,
    viewed: true,
    viewed_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,shared_trip_id'
  })
  .select()
  .single();

// 同时更新浏览量
const { error: updateError } = await supabase
  .from('shared_trips')
  .update({ views_count: supabase.sql`views_count + 1` })
  .eq('id', sharedTripId);
```

---

## 6. 认证流程

### 6.1 注册流程

```
用户填写注册表单
    ↓
前端调用 supabase.auth.signUp({
  email,
  password,
  options: { data: { username, display_name } }
})
    ↓
Supabase 后端自动：
├─ 验证邮箱格式
├─ 检查邮箱是否已存在
├─ 使用 bcrypt 加密密码
├─ 创建 auth.users 记录
├─ 触发 on_auth_user_created
│  └─ 创建 public.users 记录
└─ 发送验证邮件
    ↓
用户点击验证链接
    ↓
邮箱验证成功
    ↓
自动登录
```

### 6.2 登录流程

```
用户输入邮箱密码
    ↓
前端调用 supabase.auth.signInWithPassword({
  email,
  password
})
    ↓
Supabase 后端自动：
├─ 查找用户
├─ 使用 bcrypt 验证密码
├─ 生成 JWT access_token
├─ 生成 refresh_token
└─ 返回 session
    ↓
前端存储 session
    ↓
后续 API 请求自动带上 token
    ↓
RLS 策略验证 auth.uid()
```

### 6.3 前端认证状态管理

```typescript
// /presentation/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 7. 实施计划

### 阶段1: 数据库Schema创建 (1天)

**任务**:
1. 创建所有表结构
2. 添加索引
3. 创建触发器和函数
4. 启用RLS并创建策略
5. 测试数据库约束

**SQL脚本**: `/supabase/migrations/001_initial_schema.sql`

---

### 阶段2: Supabase Client配置 (0.5天)

**任务**:
1. 配置Supabase Client
2. 创建AuthContext
3. 更新App.tsx集成认证
4. 测试认证流程

**文件**:
- `/utils/supabase/client.ts`
- `/presentation/context/AuthContext.tsx`

---

### 阶段3: 数据服务层 (1天)

**任务**:
1. 创建类型定义
2. 创建数据服务函数
3. 封装Supabase查询
4. 添加错误处理

**文件**:
- `/types/database.ts`
- `/services/tripService.ts`
- `/services/sharedTripService.ts`
- `/services/userInteractionService.ts`

---

### 阶段4: 前端集成 (2-3天)

**任务**:
1. 更新LoginPage和RegisterPage
2. 更新MyTripsPage
3. 更新TripDetailPage
4. 更新DestinationExplorePage
5. 更新ShareTripModal
6. 测试所有功能

---

### 阶段5: 测试和优化 (1-2天)

**任务**:
1. 端到端测试
2. 性能优化
3. 添加示例数据
4. 文档更新

---

## 8. 优势总结

### ✅ 使用PostgreSQL的优势

1. **关系型数据完整性**: 外键约束保证数据一致性
2. **复杂查询**: 支持JOIN、聚合、子查询
3. **索引优化**: GIN、BTREE索引提升查询性能
4. **全文搜索**: 内置全文搜索功能
5. **触发器**: 自动更新统计数据
6. **RLS**: 数据库级别的权限控制
7. **实时订阅**: Supabase实时功能
8. **事务支持**: ACID保证

### ✅ 使用Supabase Auth的优势

1. **安全**: bcrypt密码加密，自动处理
2. **JWT**: 自动生成和验证Token
3. **会话管理**: 自动刷新Token
4. **邮箱验证**: 内置验证流程
5. **社交登录**: 支持Google、GitHub等
6. **简单集成**: 前端直接调用SDK
7. **RLS集成**: auth.uid()自动识别用户



# Supabase + Gemini + RAG 架构设计

基于您的需求，我将设计一个完整的 **RAG (Retrieval-Augmented Generation)** 系统，让 Gemini 能够基于您收集的真实旅行数据来生成更准确、更个性化的行程建议。

------

## 🏗️ 系统架构概览

```
用户输入
    ↓
前端 (AIPlannerChatPage)
    ↓
Gemini API (生成对话)
    ↓
Supabase Edge Function (RAG 中间层)
    ├─ 1. 向量搜索 (pgvector)
    ├─ 2. 检索相关数据
    ├─ 3. 构建增强 Prompt
    └─ 4. 返回给 Gemini
    ↓
Gemini (基于真实数据生成)
    ↓
返回结构化行程
```

------

## 📊 数据库设计（增强版）

### 1. 核心数据表（用于 RAG）

#### 目的地知识库 (destinations)

sql

```sql
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,              -- "伦敦", "上海"
  country VARCHAR(100),                     -- "英国", "中国"
  description TEXT,                         -- 目的地描述
  best_season VARCHAR(100),                 -- "春季 (3-5月)"
  average_budget_daily VARCHAR(50),         -- "£150-300"
  currency VARCHAR(10),                     -- "GBP"
  timezone VARCHAR(50),                     -- "Europe/London"
  
  -- 向量嵌入（用于语义搜索）
  embedding vector(768),                    -- 使用 Gemini Embedding API
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 向量索引（HNSW 算法，快速相似度搜索）
CREATE INDEX ON destinations USING hnsw (embedding vector_cosine_ops);
```

#### 景点知识库 (attractions)

sql

```sql
CREATE TABLE attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,              -- "大英博物馆"
  category VARCHAR(50),                     -- "博物馆", "景点", "购物"
  description TEXT,                         -- 详细描述
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  
  -- 实用信息
  opening_hours JSONB,                      -- {"mon": "10:00-17:00", ...}
  ticket_price VARCHAR(100),                -- "免费" 或 "£20"
  recommended_duration VARCHAR(50),         -- "2-3小时"
  best_time_to_visit VARCHAR(100),         -- "工作日上午"
  
  -- 标签
  tags TEXT[],                              -- ["免费", "室内", "亲子"]
  
  -- 用户反馈（从真实行程中收集）
  popularity_score DECIMAL(3, 2) DEFAULT 0, -- 0-1，基于收藏/点赞
  avg_rating DECIMAL(2, 1),                 -- 1-5
  review_count INTEGER DEFAULT 0,
  
  -- 向量嵌入
  embedding vector(768),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON attractions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_attractions_destination ON attractions(destination_id);
CREATE INDEX idx_attractions_category ON attractions(category);
CREATE INDEX idx_attractions_tags ON attractions USING gin(tags);
```

#### 餐厅知识库 (restaurants)

sql

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  cuisine_type VARCHAR(100),                -- "英式", "中餐", "意大利"
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  
  price_range VARCHAR(50),                  -- "£10-20", "£50+"
  meal_type VARCHAR(50),                    -- "早餐", "午餐", "晚餐", "下午茶"
  
  specialties TEXT[],                       -- ["炸鱼薯条", "牛排"]
  dietary_options TEXT[],                   -- ["素食", "清真", "无麸质"]
  
  opening_hours JSONB,
  reservation_required BOOLEAN DEFAULT false,
  
  popularity_score DECIMAL(3, 2) DEFAULT 0,
  avg_rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,
  
  embedding vector(768),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON restaurants USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_restaurants_destination ON restaurants(destination_id);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX idx_restaurants_price ON restaurants(price_range);
```

### 2.x 前端详情卡片数据映射（MyTripsPage / TripDetailPage）

> 将前端写死的餐厅 / 景点 / 交通详情写入数据库，并在活动点击时用外键拉取。

#### 1) 活动表新增关联字段

```sql
ALTER TABLE activities
  ADD COLUMN restaurant_id UUID REFERENCES restaurants(id),
  ADD COLUMN attraction_id UUID REFERENCES attractions(id),
  ADD COLUMN transport_route_id UUID REFERENCES transport_routes(id);

ALTER TABLE activities ADD CONSTRAINT chk_activity_ref
  CHECK (
    (restaurant_id IS NOT NULL)::int +
    (attraction_id IS NOT NULL)::int +
    (transport_route_id IS NOT NULL)::int <= 1
  );
```

前端约定：
- `type === 'meal'` → 读取 `restaurant_id`，加载 `RestaurantDetailCard`
- `type === 'attraction'` → 读取 `attraction_id`，加载 `AttractionDetailCard`
- `type === 'transport'` → 读取 `transport_route_id`，加载 `TransportDetailCard`

#### 2) 详情表（支撑三张卡片）

```sql
-- 餐厅招牌菜（支撑 RestaurantDetailCard.signature）
CREATE TABLE restaurant_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  image_url TEXT,
  allergens TEXT[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交通路线（支撑 TransportDetailCard.subway / taxi）
CREATE TABLE transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('subway', 'taxi')),
  line_name VARCHAR(100),
  stations TEXT[],
  duration VARCHAR(50),
  price_info VARCHAR(100),
  ticket_guide TEXT[],
  alipay_guide TEXT[],
  payment_methods TEXT[],
  apps JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> 景点/餐厅表需要补充卡片字段：`name_en`、`highlights TEXT[]`、`tips TEXT[]`、`gallery_urls TEXT[]`、`estimated_duration VARCHAR(50)`（景点）；`menu_image_url TEXT`（餐厅）。通过 `ALTER TABLE ... ADD COLUMN` 补齐。

#### 3) Mock 数据入库示例（与前端写死数据对齐）

```sql
-- 餐厅（RestaurantDetailCard）
INSERT INTO restaurants (id, destination_id, name, cuisine_type, price_range, address, opening_hours, menu_image_url)
VALUES
  ('rest-dishoom', NULL, 'Dishoom 餐厅', '印度风味', '£20-30', '12 Upper St Martin''s Lane, London WC2H 9FB', '周一至周日 8:00-23:00', 'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?...'),
  ('rest-ramsay', NULL, 'Gordon Ramsay 牛排馆', '英式牛排', '£50-80', '10-11 Heddon St, London W1B 4BX', '周一至周日 12:00-22:30', 'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?...');

INSERT INTO restaurant_dishes (restaurant_id, name, name_en, description, image_url, allergens, order_index)
VALUES
  ('rest-dishoom', '黑达尔咖喱', 'Black Daal', '慢煮24小时的黑扁豆', 'https://images.unsplash.com/photo-1567337710282-00832b415979?...', ARRAY['乳制品','黄油'], 0),
  ('rest-dishoom', '羊肉卷饼', 'Lamb Raan Roll', '慢烤羊腿肉配薄饼', 'https://images.unsplash.com/photo-1567337710282-00832b415979?...', ARRAY['面筋','芝麻'], 1),
  ('rest-dishoom', '印度奶茶', 'Masala Chai', '传统香料奶茶', 'https://images.unsplash.com/photo-1567337710282-00832b415979?...', ARRAY['乳制品'], 2),
  ('rest-ramsay', '战斧牛排', 'Tomahawk Steak', '1.2kg 战斧牛排', 'https://images.unsplash.com/photo-1695924274007-82018762e6bc?...', ARRAY[]::TEXT[], 0),
  ('rest-ramsay', '惠灵顿牛排', 'Beef Wellington', '招牌酥皮牛排', 'https://images.unsplash.com/photo-1695924274007-82018762e6bc?...', ARRAY['面筋','鸡蛋'], 1);

-- 景点（AttractionDetailCard）
ALTER TABLE attractions
  ADD COLUMN IF NOT EXISTS name_en VARCHAR(200),
  ADD COLUMN IF NOT EXISTS highlights TEXT[],
  ADD COLUMN IF NOT EXISTS tips TEXT[],
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[],
  ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50);

INSERT INTO attractions (id, name, name_en, address, opening_hours, ticket_price, description, highlights, tips, gallery_urls, estimated_duration, location_lat, location_lng)
VALUES
  ('attr-british-museum', '大英博物馆', 'The British Museum', 'Great Russell St, London WC1B 3DG', '每天 10:00-17:30', '免费', '世界四大博物馆之一', ARRAY['罗塞塔石碑','埃及馆','希腊罗马馆','中国馆','中央大厅'], ARRAY['至少预留3-4小时','下载地图','有中文讲解器','周五晚上人少','纪念品店值得逛'], ARRAY['https://images.unsplash.com/photo-1550573307-52b75c9b046e?...'], '3-4小时', 51.5194, -0.1270),
  ('attr-buckingham', '白金汉宫', 'Buckingham Palace', 'Westminster, London SW1A 1AA', '夏季 09:30-19:30', '£30', '英国君主办公地', ARRAY['卫兵换岗','国事厅','皇家花园','维多利亚女王纪念碑','皇家马厩'], ARRAY['提前占位看换岗','内部参观需预约','宫内禁拍','穿舒适鞋','圣詹姆斯公园拍照佳'], ARRAY['https://images.unsplash.com/photo-1647876761705-d0961f5aab21?...'], '2-3小时', 51.5014, -0.1419);

-- 交通（TransportDetailCard）
CREATE TABLE IF NOT EXISTS transport_routes (...如上定义...);

INSERT INTO transport_routes (id, from_location, to_location, mode, line_name, stations, duration, price_info, ticket_guide, alipay_guide, payment_methods, apps)
VALUES
  ('route-heathrow-center', '希思罗机场', '伦敦市中心', 'subway', 'Piccadilly Line',
   ARRAY['Heathrow Terminal 5','Heathrow Terminal 4','Hatton Cross','Hounslow West','Osterley','Boston Manor','Northfields','South Ealing','Acton Town','Hammersmith','Barons Court','Earl''s Court','Gloucester Road','South Kensington','Knightsbridge','Hyde Park Corner','Green Park','Piccadilly Circus','Leicester Square','Covent Garden','Holborn','Russell Square','King''s Cross St Pancras'],
   '约50分钟', '£5.50/£6.60',
   ARRAY['在地铁站售票机购买Oyster卡','可使用无接触银行卡','购买Day Travelcard可无限次搭乘'],
   ARRAY['打开支付宝搜索伦敦交通','点击乘车码生成二维码','出入站扫码自动扣款','首次使用需绑定支付方式'],
   ARRAY['现金','信用卡','支付宝','微信支付','Apple Pay'],
   '[{"name":"Uber","description":"国际打车软件","supportsAlipay":true},{"name":"高德地图（国际版）","description":"中文界面友好","supportsAlipay":true},{"name":"Bolt","description":"欧洲流行","supportsAlipay":false}]'::jsonb);

-- 活动绑定（示例）
UPDATE activities SET restaurant_id = 'rest-dishoom' WHERE name ILIKE 'Dishoom%';
UPDATE activities SET attraction_id = 'attr-british-museum' WHERE name ILIKE '大英博物馆%';
UPDATE activities SET transport_route_id = 'route-heathrow-center' WHERE type = 'transport' AND name ILIKE '希思罗机场%';
```

#### 4) 前端调用约定

- TripDetailPage：点击 `type === 'meal'` → 以 `restaurant_id` 查询餐厅 + dishes，组装成 `RestaurantDetailCard` props。
- TripDetailPage：点击 `type === 'attraction'` → 以 `attraction_id` 查询景点，组装 `AttractionDetailCard`。
- TripDetailPage：点击 `type === 'transport'` → 以 `transport_route_id` 查询路线，组装 `TransportDetailCard`。
- MapPage/列表页：仍可直接使用 activities 的基础信息（time/name/price），详情弹窗再补充 POI 数据。

#### 交通信息 (transportation)

sql

```sql
CREATE TABLE transportation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  type VARCHAR(50),                         -- "地铁", "公交", "出租车", "火车"
  name VARCHAR(200),                        -- "伦敦地铁"
  description TEXT,
  
  price_info JSONB,                         -- {"single": "£2.50", "day_pass": "£15"}
  operating_hours VARCHAR(100),
  tips TEXT,                                -- 使用建议
  
  embedding vector(768),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON transportation USING hnsw (embedding vector_cosine_ops);
```

#### 旅行建议库 (travel_tips)

sql

```sql
CREATE TABLE travel_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  
  category VARCHAR(50),                     -- "交通", "住宿", "安全", "文化"
  title VARCHAR(200),
  content TEXT,
  
  is_important BOOLEAN DEFAULT false,       -- 重要提示
  season_specific VARCHAR(50),              -- 季节特定建议
  
  embedding vector(768),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON travel_tips USING hnsw (embedding vector_cosine_ops);
```

#### 真实行程案例库 (trip_examples)

sql

```sql
CREATE TABLE trip_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联到真实分享的行程
  shared_trip_id UUID REFERENCES shared_trips(id) ON DELETE CASCADE,
  
  destination VARCHAR(200),
  duration_days INTEGER,
  budget_range VARCHAR(50),
  
  -- 提取的关键信息
  highlights TEXT[],                        -- 亮点总结
  daily_structure JSONB,                    -- 每日安排的结构化数据
  
  -- 用户反馈指标
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  quality_score DECIMAL(3, 2) DEFAULT 0,    -- 综合评分
  
  -- 向量嵌入（整个行程的语义）
  embedding vector(768),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON trip_examples USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_trip_examples_destination ON trip_examples(destination);
CREATE INDEX idx_trip_examples_duration ON trip_examples(duration_days);
```

------

## 🔧 启用 pgvector 扩展

sql

~~~sql
-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 创建辅助函数：计算余弦相似度
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    description as content,
    1 - (embedding <=> query_embedding) as similarity
  FROM attractions
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 🚀 Supabase Edge Function: RAG 中间层

### 文件结构
```
supabase/functions/
├── ai-planner/
│   ├── index.ts              # 主函数
│   ├── embeddings.ts         # 向量生成
│   ├── retrieval.ts          # 检索逻辑
│   └── prompt-builder.ts     # Prompt 构建
~~~

### 1. 主函数 (index.ts)

typescript

```typescript
// supabase/functions/ai-planner/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateEmbedding } from './embeddings.ts';
import { retrieveRelevantData } from './retrieval.ts';
import { buildEnhancedPrompt } from './prompt-builder.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userMessage, chatHistory, currentPlan, userId } = await req.json();

    // 1. 生成用户输入的向量嵌入
    const queryEmbedding = await generateEmbedding(userMessage);

    // 2. 检索相关数据（景点、餐厅、行程案例）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const relevantData = await retrieveRelevantData(
      supabase,
      queryEmbedding,
      userMessage,
      userId
    );


    // 4. 构建增强的 Prompt
    const enhancedPrompt = buildEnhancedPrompt({
      userMessage,
      currentPlan,
      relevantData,
      userPreferences: userPrefs,
    });

    // 5. 调用 Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            ...chatHistory,
            {
              role: 'user',
              parts: [{ text: enhancedPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: TRIP_PLAN_SCHEMA,
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        }),
      }
    );

    const result = await geminiResponse.json();
    const responseText = result.candidates[0].content.parts[0].text;
    const data = JSON.parse(responseText);

    // 6. 记录用户互动（用于学习偏好）
    if (data.tripPlan) {
      await logUserInteraction(supabase, userId, data.tripPlan);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 2. 向量嵌入生成 (embeddings.ts)

typescript

```typescript
// supabase/functions/ai-planner/embeddings.ts

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

/**
 * 使用 Gemini Embedding API 生成向量
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }],
        },
      }),
    }
  );

  const data = await response.json();
  return data.embedding.values; // 返回 768 维向量
}

/**
 * 批量生成嵌入
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}
```

### 3. 检索逻辑 (retrieval.ts)

typescript

```typescript
// supabase/functions/ai-planner/retrieval.ts
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RelevantData {
  attractions: any[];
  restaurants: any[];
  tripExamples: any[];
  tips: any[];
  transportation: any[];
}

/**
 * 检索相关数据
 */
export async function retrieveRelevantData(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  userMessage: string,
  userId?: string
): Promise<RelevantData> {
  
  // 1. 提取目的地（简单关键词匹配或 NER）
  const destination = extractDestination(userMessage);

  // 2. 向量搜索景点
  const { data: attractions } = await supabase.rpc('match_attractions', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 10,
    destination_filter: destination,
  });

  // 3. 向量搜索餐厅
  const { data: restaurants } = await supabase.rpc('match_restaurants', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
    destination_filter: destination,
  });

  // 4. 搜索相似的行程案例
  const { data: tripExamples } = await supabase.rpc('match_trip_examples', {
    query_embedding: queryEmbedding,
    match_threshold: 0.75,
    match_count: 3,
  });

  // 5. 搜索旅行建议
  const { data: tips } = await supabase.rpc('match_travel_tips', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
    destination_filter: destination,
  });

  // 6. 获取交通信息
  const { data: transportation } = await supabase
    .from('transportation')
    .select('*')
    .ilike('name', `%${destination}%`)
    .limit(5);

  return {
    attractions: attractions || [],
    restaurants: restaurants || [],
    tripExamples: tripExamples || [],
    tips: tips || [],
    transportation: transportation || [],
  };
}

/**
 * 从用户消息中提取目的地
 */
function extractDestination(message: string): string | null {
  // 简单的关键词匹配
  const destinations = ['伦敦', 'London', '上海', 'Shanghai', '北京', 'Beijing'];
  for (const dest of destinations) {
    if (message.includes(dest)) {
      return dest;
    }
  }
  return null;
}

/**
 * 创建向量搜索函数
 */
// 需要在数据库中创建这些函数：

/*
CREATE OR REPLACE FUNCTION match_attractions(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
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
*/
```

### 4. Prompt 构建器 (prompt-builder.ts)

typescript

```typescript
// supabase/functions/ai-planner/prompt-builder.ts

interface PromptData {
  userMessage: string;
  currentPlan: any;
  relevantData: any;
  userPreferences: any;
}

/**
 * 构建增强的 Prompt（注入检索到的真实数据）
 */
export function buildEnhancedPrompt(data: PromptData): string {
  const { userMessage, currentPlan, relevantData, userPreferences } = data;

  let prompt = `用户请求: ${userMessage}\n\n`;

  // 1. 当前行程上下文
  if (currentPlan) {
    prompt += `## 当前行程\n${JSON.stringify(currentPlan, null, 2)}\n\n`;
  }

  // 2. 用户偏好
  if (userPreferences) {
    prompt += `## 用户偏好\n`;
    prompt += `- 喜欢的类别: ${userPreferences.favorite_categories?.join(', ') || '未知'}\n`;
    prompt += `- 旅行节奏: ${userPreferences.preferred_pace || '适中'}\n`;
    prompt += `- 预算水平: ${userPreferences.budget_level || '中等'}\n`;
    if (userPreferences.dietary_restrictions?.length > 0) {
      prompt += `- 饮食限制: ${userPreferences.dietary_restrictions.join(', ')}\n`;
    }
    prompt += `\n`;
  }

  // 3. 相关景点（真实数据）
  if (relevantData.attractions.length > 0) {
    prompt += `## 推荐景点（基于真实数据）\n`;
    relevantData.attractions.slice(0, 5).forEach((attr: any, i: number) => {
      prompt += `${i + 1}. **${attr.name}**\n`;
      prompt += `   - 描述: ${attr.description}\n`;
      prompt += `   - 门票: ${attr.ticket_price}\n`;
      prompt += `   - 建议游览时长: ${attr.recommended_duration}\n`;
      prompt += `   - 坐标: ${attr.location_lat}, ${attr.location_lng}\n`;
      if (attr.tags) {
        prompt += `   - 标签: ${attr.tags.join(', ')}\n`;
      }
      prompt += `\n`;
    });
  }

  // 4. 相关餐厅
  if (relevantData.restaurants.length > 0) {
    prompt += `## 推荐餐厅\n`;
    relevantData.restaurants.slice(0, 3).forEach((rest: any, i: number) => {
      prompt += `${i + 1}. **${rest.name}** (${rest.cuisine_type})\n`;
      prompt += `   - 价格范围: ${rest.price_range}\n`;
      prompt += `   - 特色菜: ${rest.specialties?.join(', ') || '无'}\n`;
      prompt += `   - 坐标: ${rest.location_lat}, ${rest.location_lng}\n`;
      prompt += `\n`;
    });
  }

  // 5. 相似行程案例（供参考）
  if (relevantData.tripExamples.length > 0) {
    prompt += `## 相似行程参考（真实用户案例）\n`;
    relevantData.tripExamples.forEach((example: any, i: number) => {
      prompt += `${i + 1}. ${example.destination} - ${example.duration_days}天\n`;
      prompt += `   - 预算: ${example.budget_range}\n`;
      prompt += `   - 亮点: ${example.highlights?.join(', ')}\n`;
      prompt += `   - 用户评价: ${example.likes_count} 点赞, ${example.saves_count} 收藏\n`;
      prompt += `\n`;
    });
  }

  // 6. 旅行建议
  if (relevantData.tips.length > 0) {
    prompt += `## 实用建议\n`;
    relevantData.tips.forEach((tip: any) => {
      prompt += `- ${tip.title}: ${tip.content}\n`;
    });
    prompt += `\n`;
  }

  // 7. 交通信息
  if (relevantData.transportation.length > 0) {
    prompt += `## 交通信息\n`;
    relevantData.transportation.forEach((trans: any) => {
      prompt += `- ${trans.name} (${trans.type})\n`;
      prompt += `  价格: ${JSON.stringify(trans.price_info)}\n`;
      prompt += `  运营时间: ${trans.operating_hours}\n`;
    });
    prompt += `\n`;
  }

  prompt += `## 要求\n`;
  prompt += `请基于以上真实数据生成行程，确保：\n`;
  prompt += `1. 所有景点和餐厅都来自上面的推荐列表\n`;
  prompt += `2. 必须包含准确的 geoCoordinates（lat, lng）\n`;
  prompt += `3. 时间安排合理，考虑交通时间\n`;
  prompt += `4. 符合用户的预算和偏好\n`;
  prompt += `5. 如果修改现有行程，保持其他部分不变\n`;

  return prompt;
}
```

------

## 📝 前端调用修改

typescript

```typescript
// components/AIPlannerChatPage.tsx

const callGemini = async (userMessage: string) => {
  setIsTyping(true);
  try {
    // ✅ 不再直接调用 Gemini，而是调用 Supabase Edge Function
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke('ai-planner', {
      body: {
        userMessage,
        chatHistory: chatHistoryRef.current,
        currentPlan,
        userId: session?.user?.id,
      },
    });

    if (response.error) throw response.error;

    const data = response.data;
    
    // 更新UI
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: data.chatResponse, timestamp: new Date() }
    ]);

    if (data.tripPlan) {
      setCurrentPlan(data.tripPlan);
      setExpandedDays([1]);
    }

    // 更新历史
    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: JSON.stringify(data) }] }
    ];

  } catch (error) {
    console.error("AI Planner Error:", error);
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: "抱歉，服务暂时不可用，请稍后重试。", timestamp: new Date() }
    ]);
  } finally {
    setIsTyping(false);
  }
};
```

------

## 🔄 数据收集和学习

### 1. 从真实行程中提取数据

typescript

```typescript
// utils/extractTripData.ts

/**
 * 当用户分享行程时，自动提取数据到知识库
 */
export async function extractAndStoreKnowledge(sharedTrip: SharedTrip) {
  const supabase = createClient();
  
  // 1. 提取景点信息
  const attractions = extractAttractions(sharedTrip);
  for (const attr of attractions) {
    // 生成嵌入
    const embedding = await generateEmbedding(
      `${attr.name} ${attr.description}`
    );
    
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('attractions')
      .select('id')
      .eq('name', attr.name)
      .single();
    
    if (!existing) {
      await supabase.from('attractions').insert({
        ...attr,
        embedding,
      });
    } else {
      // 更新热度
      await supabase.rpc('increment_popularity', {
        attraction_id: existing.id,
      });
    }
  }
  
  // 2. 创建行程案例
  const exampleEmbedding = await generateEmbedding(
    `${sharedTrip.destination} ${sharedTrip.description} ${sharedTrip.highlights?.join(' ')}`
  );
  
  await supabase.from('trip_examples').insert({
    shared_trip_id: sharedTrip.id,
    destination: sharedTrip.destination,
    duration_days: calculateDays(sharedTrip.dates),
    budget_range: sharedTrip.budget,
    highlights: sharedTrip.highlights,
    daily_structure: extractDailyStructure(sharedTrip),
    embedding: exampleEmbedding,
  });
}
```

---

**最后更新**: 2024-12-05
**架构**: PostgreSQL + Supabase Auth + RLS
