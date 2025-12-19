# 快速开始指南 - PostgreSQL版本

## 📚 文档导航

- **[SUPABASE_DESIGN.md](./SUPABASE_DESIGN.md)** - 完整的PostgreSQL数据库设计
- **[IMPLEMENTATION_TODO.md](./IMPLEMENTATION_TODO.md)** - 详细的实施计划和任务列表
- **[ROADMAP.md](./ROADMAP.md)** - 可视化路线图
- **本文档** - 快速开始和常见问题

---

## 🚀 快速概览

### 技术栈

- **前端**: React + TypeScript
- **数据库**: Supabase PostgreSQL
- **认证**: Supabase Auth（自动密码加密、JWT Token）
- **权限**: Row Level Security (RLS)
- **实时**: Supabase Realtime（可选）

### 项目结构

```
├── /types
│   └── database.ts              # 数据类型定义（与数据库表一致）
├── /services
│   ├── tripService.ts           # 行程服务
│   ├── sharedTripService.ts     # 分享服务
│   └── userInteractionService.ts # 互动服务
├── /utils
│   ├── supabase/client.ts       # Supabase客户端
│   └── initializeData.ts        # 示例数据初始化
├── /supabase/migrations
│   ├── 001_initial_schema.sql   # 数据库Schema
│   ├── 002_rls_policies.sql     # RLS策略
│   └── 003_seed_data.sql        # 示例数据
├── /presentation/context
│   └── AuthContext.tsx          # 认证上下文
├── /components
│   ├── MyTripsPage.tsx          # 我的行程页面
│   ├── TripDetailPage.tsx      # 行程详情页面
│   ├── DestinationExplorePage.tsx  # 发现页面
│   └── ShareTripModal.tsx      # 分享模态框
└── /docs
    ├── SUPABASE_DESIGN.md       # 数据库设计
    ├── IMPLEMENTATION_TODO.md   # 实施计划
    ├── ROADMAP.md               # 路线图
    └── QUICK_START.md           # 本文档
```

---

## 📊 数据模型速览

### PostgreSQL表结构

```sql
users                    -- 用户信息（关联auth.users）
  ↓ 1:N
trips                    -- 行程基本信息
  ↓ 1:N
trip_itineraries        -- 每日行程
  ↓ 1:N
activities              -- 活动

trips → shared_trips    -- 分享（1:1）
  ↓ N:M
user_interactions       -- 用户互动（点赞、收藏）

shared_trips
```

### 核心特性

✅ **外键约束**: 自动保证数据完整性
✅ **触发器**: 自动更新统计数据（likes_count, saves_count）
✅ **RLS策略**: 数据库级别权限控制
✅ **索引优化**: GIN（全文搜索）、BTREE（排序）
✅ **自动字段**: created_at, updated_at自动管理

---

## 🎯 实施优先级

### Phase 1: 数据库Schema (Day 1-2) ⭐⭐⭐
```
✓ 创建PostgreSQL表
✓ 创建触发器和函数
✓ 配置RLS策略
✓ TypeScript类型定义
✓ Supabase Client配置
✓ AuthContext集成
```

### Phase 2: 认证功能 (Day 3) ⭐⭐⭐
```
✓ 使用Supabase Auth
✓ 注册/登录/登出
✓ 邮箱验证
✓ 会话管理
```

### Phase 3: 行程核心功能 (Day 4-5) ⭐⭐⭐
```
✓ 数据服务层
✓ MyTripsPage集成
✓ TripDetailPage集成
✓ 行程CRUD操作
```

### Phase 4: 分享功能 (Day 6-7) ⭐⭐
```
✓ 分享服务层
✓ DestinationExplorePage集成
✓ 点赞和收藏功能
```

### Phase 5: 优化和测试 (Day 8-10) ⭐
```
✓ 示例数据初始化
✓ 性能优化
✓ 测试和文档
```

---

## 🛠️ 开发流程

### Step 1: 准备环境

```bash
# 1. 确认Supabase配置
# 检查 /utils/supabase/info.tsx
# 确保有正确的 projectId 和 publicAnonKey

# 2. 测试KV Store连接
# 访问: https://{projectId}.supabase.co/functions/v1/make-server-83c6f2d6/health
```

### Step 2: 开始开发

```typescript
// 1. 创建类型定义 (Day 1)
// /types/database.ts
export interface Trip {
  id: string;
  userId: string;
  destination: string;
  // ...
}

// 2. 实现服务器API (Day 2-4)
// /supabase/functions/server/index.tsx
app.post("/make-server-83c6f2d6/api/trips", async (c) => {
  // 实现逻辑
});

// 3. 创建前端服务 (Day 2-4)
// /services/tripService.ts
export const tripService = {
  async createTrip(trip: Trip) {
    // 调用API
  }
};

// 4. 更新UI组件 (Day 5)
// /components/MyTripsPage.tsx
const [trips, setTrips] = useState<Trip[]>([]);

useEffect(() => {
  loadTrips();
}, []);

const loadTrips = async () => {
  const data = await tripService.getUserTrips(userId);
  setTrips(data);
};
```

---

## 🔍 常见问题

### Q1: 如何测试API？

```bash
# 使用curl测试健康检查
curl https://{projectId}.supabase.co/functions/v1/make-server-83c6f2d6/health

# 测试创建行程
curl -X POST \
  https://{projectId}.supabase.co/functions/v1/make-server-83c6f2d6/api/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {publicAnonKey}" \
  -d '{
    "userId": "user-1",
    "destination": "测试目的地",
    "startDate": "2024-10-01",
    "endDate": "2024-10-07",
    "duration": "7天",
    "status": "planning",
    "image": "https://example.com/image.jpg",
    "budget": "¥5000"
  }'
```

### Q2: 如何初始化示例数据？

```typescript
// 在 /utils/initializeData.ts 中实现
import { tripService, sharedTripService } from '../services/tripService';

export async function initializeAllData(userId: string) {
  // 1. 创建行程
  await tripService.createTrip({
    id: 'trip-1',
    userId,
    destination: '伦敦 · 爱丁堡',
    // ...
  });
  
  // 2. 创建分享行程
  await sharedTripService.shareTrip({
    // ...
  });
}

// 在组件中调用
useEffect(() => {
  const init = async () => {
    const trips = await tripService.getUserTrips(userId);
    if (trips.length === 0) {
      await initializeAllData(userId);
    }
  };
  init();
}, []);
```

### Q3: 如何处理错误？

```typescript
// 统一的错误处理模式
const loadTrips = async () => {
  try {
    setLoading(true);
    setError(null);
    const trips = await tripService.getUserTrips(userId);
    setTrips(trips);
  } catch (err) {
    console.error('加载行程失败:', err);
    setError(err instanceof Error ? err.message : '加载失败');
    toast.error('加载行程失败，请重试');
  } finally {
    setLoading(false);
  }
};
```

### Q4: 如何实现乐观更新？

```typescript
// 点赞功能的乐观更新示例
const handleToggleLike = async (tripId: string) => {
  // 1. 立即更新UI（乐观更新）
  const wasLiked = likedTrips.includes(tripId);
  setLikedTrips(prev => 
    wasLiked ? prev.filter(id => id !== tripId) : [...prev, tripId]
  );
  
  try {
    // 2. 调用API
    const result = await userInteractionService.toggleLike(userId, tripId);
    
    // 3. 如果API返回的状态与预期不符，回滚
    if (result.liked !== !wasLiked) {
      setLikedTrips(prev => 
        wasLiked ? [...prev, tripId] : prev.filter(id => id !== tripId)
      );
    }
  } catch (error) {
    // 4. 错误时回滚
    setLikedTrips(prev => 
      wasLiked ? [...prev, tripId] : prev.filter(id => id !== tripId)
    );
    toast.error('操作失败，请重试');
  }
};
```

### Q5: 如何优化性能？

```typescript
// 1. 使用React.memo避免不必要的重渲染
const TripCard = React.memo(({ trip, onSelect }) => {
  return (
    <div onClick={() => onSelect(trip.id)}>
      {trip.destination}
    </div>
  );
});

// 2. 使用useMemo缓存计算结果
const sortedTrips = useMemo(() => {
  return trips.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [trips]);

// 3. 使用useCallback缓存函数
const handleSelect = useCallback((tripId: string) => {
  setSelectedTripId(tripId);
}, []);

// 4. 延迟加载图片
<img 
  src={trip.image} 
  loading="lazy"
  alt={trip.destination}
/>
```

---

## 📝 代码模板

### API端点模板

```typescript
// /supabase/functions/server/index.tsx

// GET 端点
app.get("/make-server-83c6f2d6/api/resource/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const data = await kv.get(`resource:${id}`);
    
    if (!data) {
      return c.json({ error: "Resource not found" }, 404);
    }
    
    return c.json({ data });
  } catch (error) {
    console.error("Get resource error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST 端点
app.post("/make-server-83c6f2d6/api/resources", async (c) => {
  try {
    const body = await c.req.json();
    
    // 验证
    if (!body.requiredField) {
      return c.json({ error: "Missing required field" }, 400);
    }
    
    // 创建对象
    const resource = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 保存
    await kv.set(`resource:${resource.id}`, resource);
    
    return c.json({ success: true, data: resource });
  } catch (error) {
    console.error("Create resource error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
```

### 服务层模板

```typescript
// /services/resourceService.ts

import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-83c6f2d6/api`;

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const resourceService = {
  async getAll(): Promise<Resource[]> {
    const data = await apiRequest<{ data: Resource[] }>('/resources');
    return data.data;
  },

  async getById(id: string): Promise<Resource> {
    const data = await apiRequest<{ data: Resource }>(`/resource/${id}`);
    return data.data;
  },

  async create(resource: Partial<Resource>): Promise<Resource> {
    const data = await apiRequest<{ data: Resource }>('/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
    return data.data;
  },
};
```

### 组件模板

```typescript
// /components/ResourcePage.tsx

import { useState, useEffect } from 'react';
import { resourceService } from '../services/resourceService';
import type { Resource } from '../types/database';

export function ResourcePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await resourceService.getAll();
      setResources(data);
    } catch (err) {
      console.error('Load resources failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={loadResources}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {resources.map(resource => (
        <div key={resource.id}>{resource.name}</div>
      ))}
    </div>
  );
}
```

---

## 🎓 最佳实践

### 1. 数据验证
```typescript
// 在保存前验证数据
function validateTrip(trip: Partial<Trip>): string[] {
  const errors: string[] = [];
  
  if (!trip.destination) errors.push('目的地不能为空');
  if (!trip.startDate) errors.push('开始日期不能为空');
  if (!trip.endDate) errors.push('结束日期不能为空');
  
  if (trip.startDate && trip.endDate) {
    if (new Date(trip.startDate) > new Date(trip.endDate)) {
      errors.push('开始日期不能晚于结束日期');
    }
  }
  
  return errors;
}
```

### 2. 类型安全
```typescript
// 使用泛型确保类型安全
async function kvGet<T>(key: string): Promise<T | null> {
  const value = await kv.get(key);
  return value as T | null;
}

// 使用类型守卫
function isTrip(obj: any): obj is Trip {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.destination === 'string' &&
    typeof obj.startDate === 'string';
}
```

### 3. 错误处理
```typescript
// 使用自定义错误类
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// 统一的错误处理
try {
  // API调用
} catch (error) {
  if (error instanceof APIError) {
    // 处理API错误
  } else if (error instanceof NetworkError) {
    // 处理网络错误
  } else {
    // 处理其他错误
  }
}
```

### 4. 日志记录
```typescript
// 结构化日志
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
};

// 使用
logger.info('Loading trips', { userId });
logger.error('Failed to load trips', error);
```

---

## 🔗 相关资源

- [Supabase文档](https://supabase.com/docs)
- [Hono文档](https://hono.dev/)
- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/docs/)

---

## 📞 获取帮助

如果遇到问题：

1. **检查文档**: 先查看 SUPABASE_DESIGN.md 和 IMPLEMENTATION_TODO.md
2. **查看日志**: 检查浏览器控制台和服务器日志
3. **测试API**: 使用curl或Postman测试API端点
4. **参考模板**: 使用本文档中的代码模板
5. **提问**: 在团队中讨论或提出issue

---

**祝开发顺利！** 🎉