# Supabase Client 配置文档

## 📋 概述

本文档说明如何在 Nodb 旅行规划应用中使用已配置好的 Supabase 客户端。

## 📁 文件结构

```
src/
├── types/
│   └── database.ts          # 数据库类型定义（自动生成）
└── utils/
    └── supabase/
        ├── info.ts           # 项目配置信息
        ├── client.ts         # Supabase 客户端实例
        └── test-connection.ts # 连接测试工具

.env.local                    # 环境变量配置（已添加到 .gitignore）
.env.example                  # 环境变量示例文件
```

## 🚀 快速开始

### 1. 环境变量配置

环境变量已经在 `.env.local` 文件中配置好了：

```env
VITE_SUPABASE_URL=https://ogodnvjaiwelqmjqkvda.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**注意**: `.env.local` 已添加到 `.gitignore`，不会被提交到版本控制。

### 2. 基本使用

#### 导入客户端

```typescript
import { supabase } from '@/utils/supabase/client';
```

#### 查询数据

```typescript
// 查询行程列表
const { data: trips, error } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', userId);

if (error) {
  console.error('Error fetching trips:', error);
} else {
  console.log('Trips:', trips);
}
```

#### 插入数据

```typescript
// 创建新行程
const { data, error } = await supabase
  .from('trips')
  .insert({
    user_id: userId,
    destination: '东京',
    start_date: '2025-12-20',
    end_date: '2025-12-27',
    budget: '¥8000-10000',
  })
  .select()
  .single();
```

#### 更新数据

```typescript
// 更新行程状态
const { data, error } = await supabase
  .from('trips')
  .update({ status: 'completed' })
  .eq('id', tripId);
```

#### 删除数据

```typescript
// 删除行程
const { error } = await supabase
  .from('trips')
  .delete()
  .eq('id', tripId);
```

### 3. 使用类型安全

所有表都有完整的 TypeScript 类型支持：

```typescript
import type { Database, Tables } from '@/types/database';

// 获取表的 Row 类型
type Trip = Tables<'trips'>;

// 获取插入类型
type NewTrip = Database['public']['Tables']['trips']['Insert'];

// 类型安全的查询
const { data } = await supabase
  .from('trips')
  .select('id, destination, start_date, end_date')
  .returns<Pick<Trip, 'id' | 'destination' | 'start_date' | 'end_date'>[]>();
```

### 4. 向量搜索功能

使用 RAG 向量搜索功能查找相关景点、餐厅等：

```typescript
// 搜索景点（需要提供 768 维向量）
const { data, error } = await supabase.rpc('match_attractions', {
  query_embedding: yourEmbeddingVector, // 768维向量
  match_threshold: 0.7,
  match_count: 10,
  destination_filter: '东京',
});

// 搜索餐厅
const { data, error } = await supabase.rpc('match_restaurants', {
  query_embedding: yourEmbeddingVector,
  match_threshold: 0.7,
  match_count: 5,
  destination_filter: '东京',
});

// 搜索行程案例
const { data, error } = await supabase.rpc('match_trip_examples', {
  query_embedding: yourEmbeddingVector,
  match_threshold: 0.75,
  match_count: 3,
});

// 搜索旅行建议
const { data, error } = await supabase.rpc('match_travel_tips', {
  query_embedding: yourEmbeddingVector,
  match_threshold: 0.7,
  match_count: 5,
});
```

### 5. 用户认证

#### 登录

```typescript
import { supabase } from '@/utils/supabase/client';

// 邮箱密码登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// OAuth 登录（例如 Google）
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
});
```

#### 注册

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      username: 'cooluser',
      display_name: 'Cool User',
    },
  },
});
```

#### 登出

```typescript
const { error } = await supabase.auth.signOut();
```

#### 获取当前用户

```typescript
import { getCurrentUser, isAuthenticated } from '@/utils/supabase/client';

// 方法1：使用辅助函数
const user = await getCurrentUser();

// 方法2：直接调用
const { data: { user } } = await supabase.auth.getUser();

// 检查是否已登录
const loggedIn = await isAuthenticated();
```

### 6. 实时订阅

```typescript
// 订阅行程变化
const channel = supabase
  .channel('trips-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'trips',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// 取消订阅
channel.unsubscribe();
```

## 🧪 测试连接

运行测试文件验证 Supabase 配置：

```typescript
import { testConnection } from '@/utils/supabase/test-connection';

// 在你的代码中调用
await testConnection();
```

测试将检查：
- ✅ 基本连接
- ✅ 所有 13 个表的访问权限
- ✅ 4 个向量搜索函数
- ✅ 认证状态

## 📊 数据库表结构

### 核心业务表 (6)

1. **users** - 用户扩展信息
2. **trips** - 行程表
3. **trip_itineraries** - 每日行程
4. **activities** - 具体活动
5. **shared_trips** - 分享的行程
6. **user_interactions** - 用户互动（点赞/收藏）

### RAG 知识库表 (7)

1. **destinations** - 目的地知识库
2. **attractions** - 景点知识库
3. **restaurants** - 餐厅知识库
4. **transportation** - 交通信息
5. **travel_tips** - 旅行建议
6. **trip_examples** - 真实行程案例
7. **user_preferences** - 用户偏好学习

## 🔒 行级安全 (RLS)

所有表都已启用 RLS 策略：

- **用户数据**: 用户只能访问自己的数据
- **知识库表**: 所有人可读
- **分享行程**: 激活的行程公开可见
- **用户偏好**: 仅本人可访问

## 🎯 常见用例

### 创建完整行程

```typescript
// 1. 创建行程
const { data: trip, error: tripError } = await supabase
  .from('trips')
  .insert({
    user_id: userId,
    destination: '京都',
    start_date: '2025-12-20',
    end_date: '2025-12-23',
  })
  .select()
  .single();

if (tripError) throw tripError;

// 2. 创建每日行程
const { data: itinerary, error: itineraryError } = await supabase
  .from('trip_itineraries')
  .insert({
    trip_id: trip.id,
    day_number: 1,
    theme: '古寺探访',
  })
  .select()
  .single();

// 3. 添加活动
const { error: activityError } = await supabase
  .from('activities')
  .insert({
    itinerary_id: itinerary.id,
    type: 'attraction',
    name: '清水寺',
    time: '09:00',
    duration: '2小时',
  });
```

### 查询用户的所有行程（包含详情）

```typescript
const { data: trips, error } = await supabase
  .from('trips')
  .select(`
    *,
    trip_itineraries (
      *,
      activities (*)
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### 分享行程

```typescript
const { data, error } = await supabase
  .from('shared_trips')
  .insert({
    trip_id: tripId,
    user_id: userId,
    description: '超赞的京都3日游',
    tags: ['文化', '历史', '美食'],
    highlights: ['清水寺', '伏见稻荷', '锦市场'],
  });
```

### 点赞行程

```typescript
const { data, error } = await supabase
  .from('user_interactions')
  .upsert({
    user_id: userId,
    shared_trip_id: sharedTripId,
    liked: true,
    liked_at: new Date().toISOString(),
  });

// 触发器会自动更新 shared_trips 表的 likes_count
```

## 🧭 写入前端 mock 行程数据

将 MyTripsPage/TripDetailPage 的示例数据同步到数据库：

1. 确保 `.env.local` 或终端环境里有 `SUPABASE_SERVICE_ROLE_KEY`（仅供本地脚本使用，勿在前端暴露），可选变量：`SEED_USER_ID`（默认使用测试用户）、`SEED_OVERWRITE=false` 可保留已有数据。
2. 运行 `npm run seed:trips`（脚本位于 `scripts/seed-mock-trips.mjs`，默认连接 `https://ogodnvjaiwelqmjqkvda.supabase.co`）。
3. 脚本会校验用户存在，清理旧的 mock 行程，并写入 trips、trip_itineraries、activities 三张表。

## ⚙️ 配置说明

### 客户端选项

客户端已配置以下选项（`src/utils/supabase/client.ts:15`）：

```typescript
{
  auth: {
    persistSession: true,      // 持久化会话到 localStorage
    autoRefreshToken: true,    // 自动刷新过期令牌
    detectSessionInUrl: true,  // 从 URL 检测会话（OAuth 回调）
    flowType: 'pkce',          // 使用 PKCE 流程增强安全性
  },
  global: {
    headers: {
      'x-application-name': 'Nodb-Travel-App',
    },
  },
}
```

## 🔗 相关文档

- [SUPABASE_DESIGN.md](src/docs/SUPABASE_DESIGN.md) - 数据库设计文档
- [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) - 数据库实施报告
- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)

## 📝 注意事项

1. **环境变量**: 确保 `.env.local` 文件已正确配置，且不要提交到 Git
2. **类型安全**: 充分利用 TypeScript 类型定义，避免运行时错误
3. **RLS 策略**: 理解并遵守 RLS 策略，不要尝试绕过安全限制
4. **向量维度**: 所有向量嵌入必须是 768 维（对应 Gemini text-embedding-004）
5. **错误处理**: 总是检查并处理 `error` 对象

## 🐛 故障排查

### 连接失败

1. 检查 `.env.local` 文件是否存在并包含正确的配置
2. 确认 Supabase 项目是否正常运行
3. 检查网络连接

### 类型错误

1. 确保 `src/types/database.ts` 文件存在
2. 检查 `vite.config.ts` 中的 `@` 别名配置
3. 重启开发服务器

### RLS 权限错误

1. 确认用户已登录
2. 检查是否尝试访问其他用户的数据
3. 查看 RLS 策略配置（在迁移文件中）

---

**更新日期**: 2025-12-06
**版本**: 1.0.0
