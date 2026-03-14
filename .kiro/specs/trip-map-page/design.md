# Design Document: TripMapPage 真实数据集成

## Overview

本设计文档描述了将 TripMapPage 从 Mock 数据版本升级为真实数据库集成的完整方案。核心目标是新建三张数据库表存储地图位置、文章、视频数据，提供 tripMapService 服务层，并改造 TripMapPage 组件以加载真实数据。

### 设计目标

1. 新建三张表（trip_map_locations / location_articles / location_videos）支撑地图内容
2. 提供 tripMapService 服务层，屏蔽数据库细节
3. 改造 TripMapPage 删除 MOCK_LOCATIONS，改为 useEffect + tripMapService 异步加载
4. 保持 AMap 渲染逻辑、城市聚合、路线连线、详情面板的现有功能不变

## Architecture

```mermaid
flowchart TB
    subgraph UI Layer
        TMP[TripMapPage]
    end

    subgraph Service Layer
        TMS[tripMapService]
    end

    subgraph Data Layer
        DB[(Supabase PostgreSQL)]
        TML[trip_map_locations]
        LA[location_articles]
        LV[location_videos]
    end

    TMP -->|getLocationsByTripId(tripId)| TMS
    TMS -->|SELECT + order_index| TML
    TMS -->|SELECT + location_id IN| LA
    TMS -->|SELECT + location_id IN| LV
    TML --> DB
    LA --> DB
    LV --> DB
```

### 数据流

1. TripMapPage 挂载，useEffect 触发 tripMapService.getLocationsByTripId(tripId)
2. tripMapService 并行查询 location_articles 和 location_videos
3. 组装 LocationPoint[] 返回，包含嵌套 articles[] 和 videos[]
4. TripMapPage 将 locations 存入 state，驱动地图标记和路线渲染

## Components and Interfaces

### 1. 新增数据库表

#### trip_map_locations

```sql
CREATE TABLE public.trip_map_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  address TEXT,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  type map_location_type NOT NULL DEFAULT 'attraction',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### location_articles

```sql
CREATE TABLE public.location_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.trip_map_locations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover TEXT,
  author_avatar TEXT,
  author_name TEXT,
  likes INTEGER DEFAULT 0,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### location_videos

```sql
CREATE TABLE public.location_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.trip_map_locations(id) ON DELETE CASCADE,
  thumbnail TEXT,
  author_avatar TEXT,
  author_name TEXT,
  date DATE,
  platform video_platform NOT NULL DEFAULT 'douyin',
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 枚举类型

```sql
CREATE TYPE map_location_type AS ENUM ('restaurant', 'attraction', 'hotel');
CREATE TYPE video_platform AS ENUM ('douyin', 'xiaohongshu');
```

### 2. tripMapService (新增)

```typescript
// src/services/tripMapService.ts
import { supabase } from '../utils/supabase/client';
import type { Article, Video, LocationPoint } from '../components/TripMapPage';

export const tripMapService = {
  async getLocationsByTripId(tripId: string): Promise<LocationPoint[]> {
    const { data: locations, error } = await supabase
      .from('trip_map_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index');

    if (error) throw new Error(`[tripMapService] 加载地点失败: ${error.message}`);
    if (!locations || locations.length === 0) return [];

    const locationIds = locations.map(l => l.id);

    const [{ data: articles }, { data: videos }] = await Promise.all([
      supabase.from('location_articles').select('*').in('location_id', locationIds),
      supabase.from('location_videos').select('*').in('location_id', locationIds),
    ]);

    return locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      city: loc.city,
      district: loc.district ?? '',
      address: loc.address ?? '',
      lat: loc.lat,
      lng: loc.lng,
      distance: '0', // 前端根据用户位置动态计算
      type: loc.type,
      order: loc.order_index,
      articles: (articles ?? [])
        .filter(a => a.location_id === loc.id)
        .map(a => ({
          title: a.title,
          cover: a.cover ?? '',
          authorAvatar: a.author_avatar ?? '',
          authorName: a.author_name ?? '',
          likes: a.likes ?? 0,
          url: a.url ?? '',
        })),
      videos: (videos ?? [])
        .filter(v => v.location_id === loc.id)
        .map(v => ({
          thumbnail: v.thumbnail ?? '',
          authorAvatar: v.author_avatar ?? '',
          authorName: v.author_name ?? '',
          date: v.date ?? '',
          platform: v.platform,
          title: v.title ?? '',
        })),
    }));
  },
};
```

### 3. TripMapPage 改造

替换现有 TripMapPage.tsx 为新版本，核心改造点：

```typescript
// 删除：const MOCK_LOCATIONS: LocationPoint[] = [...];

// 新增状态
const [locations, setLocations] = useState<LocationPoint[]>([]);
const [locationsLoading, setLocationsLoading] = useState(true);
const [locationsError, setLocationsError] = useState<string | null>(null);

// 新增 useEffect
useEffect(() => {
  setLocationsLoading(true);
  tripMapService.getLocationsByTripId(tripId)
    .then(data => {
      setLocations(data);
      setLocationsError(null);
    })
    .catch(err => setLocationsError(err.message))
    .finally(() => setLocationsLoading(false));
}, [tripId]);

// buildClusters 从 locations state 动态计算
const CITY_CLUSTERS = buildClusters(locations);

// 所有使用 MOCK_LOCATIONS 的地方替换为 locations
```

## Data Models

### 数据库表关系

```mermaid
erDiagram
    trips ||--o{ trip_map_locations : has
    trip_map_locations ||--o{ location_articles : has
    trip_map_locations ||--o{ location_videos : has

    trips {
        uuid id PK
        uuid user_id FK
        string destination
    }

    trip_map_locations {
        uuid id PK
        uuid trip_id FK
        string name
        string city
        string district
        string address
        float8 lat
        float8 lng
        map_location_type type
        int order_index
        timestamp created_at
    }

    location_articles {
        uuid id PK
        uuid location_id FK
        string title
        string cover
        string author_avatar
        string author_name
        int likes
        string url
        timestamp created_at
    }

    location_videos {
        uuid id PK
        uuid location_id FK
        string thumbnail
        string author_avatar
        string author_name
        date date
        video_platform platform
        string title
        timestamp created_at
    }
```

### 类型映射

| LocationPoint 字段 | DB 字段 | 说明 |
|-------------------|---------|------|
| id | trip_map_locations.id | 直接映射 |
| name | trip_map_locations.name | 直接映射 |
| city | trip_map_locations.city | 直接映射 |
| district | trip_map_locations.district | 直接映射 |
| address | trip_map_locations.address | 直接映射 |
| lat | trip_map_locations.lat | 直接映射 |
| lng | trip_map_locations.lng | 直接映射 |
| type | trip_map_locations.type | 枚举映射 |
| order | trip_map_locations.order_index | 字段名不同 |
| distance | — | 前端计算，不存 DB |
| articles[] | location_articles | 嵌套查询 |
| videos[] | location_videos | 嵌套查询 |

## Correctness Properties

### Property 1: Data Completeness

*For any* trip with N locations, calling getLocationsByTripId SHALL return exactly N LocationPoint objects, each containing all associated articles and videos from the database.

**Validates: Requirements 1.1, 6.1, 6.2, 6.3, 6.4**

### Property 2: Order Preservation

*For any* set of LocationPoints loaded from the database, their order in the returned array SHALL match their order_index values in ascending order.

**Validates: Requirements 3.1, 6.2**

### Property 3: Cluster Consistency

*For any* set of locations with cities C1, C2, ..., Cn, buildClusters SHALL produce exactly |C| clusters where each cluster's count equals the number of locations in that city.

**Validates: Requirements 2.1, 2.4**

### Property 4: RLS Isolation

*For any* two users A and B where B has a different trip, user A's request to getLocationsByTripId SHALL never return locations belonging to user B's trip.

**Validates: Requirements 1.1**

## Error Handling

| 错误场景 | 错误类型 | 处理策略 | 用户提示 |
|---------|---------|---------|---------|
| DB 查询失败 | DatabaseError | 设置 locationsError state | "加载地点失败，请重试" |
| 无地点数据 | EmptyResult | 显示空状态 UI | "此行程暂无地图地点" |
| AMap 配置失败 | ConfigError | 显示地图错误状态 | "地图配置错误" |
| AMap 脚本加载失败 | ScriptError | toast 提示 | "地图加载失败" |

## Testing Strategy

### 单元测试

1. **tripMapService 测试**
   - getLocationsByTripId 返回正确数量的 LocationPoint
   - articles 和 videos 正确嵌套在各自的 location 下
   - DB 错误时抛出描述性错误

### 集成测试

1. **Seed 数据验证**
   - 运行 seed 脚本后，getLocationsByTripId("22222222-...") 返回 7 条记录
   - 宫宴包含 2 篇文章和 2 个视频
   - 三河古镇包含 1 篇文章和 1 个视频

### 端到端验证

1. 打开北京测试行程地图 → 看到3个城市气泡
2. 放大 zoom ≥ 11 → 看到7个地点标记和虚线路线
3. 点击地点 → 看到文章和视频列表
