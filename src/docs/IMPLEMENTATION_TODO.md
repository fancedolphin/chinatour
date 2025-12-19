# 实施 Todolist - PostgreSQL版本

## 📌 总体规划

**预计时间**: 10个工作日（相比KV Store减少2天）
**优先级**: P0 (必须) > P1 (重要) > P2 (优化)
**数据库**: Supabase PostgreSQL + Supabase Auth

---

## 阶段1：数据库Schema和基础设施 (2天)

### Day 1: 数据库Schema创建

#### ✅ 任务1.1: 创建数据库迁移文件
**优先级**: P0
**预计时间**: 3小时
**文件**: `/supabase/migrations/001_initial_schema.sql`

- [ ] 创建 `users` 表及其触发器
- [ ] 创建 `trips` 表及其索引和触发器
- [ ] 创建 `trip_itineraries` 表
- [ ] 创建 `activities` 表
- [ ] 创建 `shared_trips` 表及其索引
- [ ] 创建 `user_interactions` 表
- [ ] 创建 `trip_comments` 表

**SQL模板**:
```sql
-- 用户表
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  theme VARCHAR(10) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'zh',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更多表结构见SUPABASE_DESIGN.md
```

**验收标准**:
- 所有表成功创建
- 外键关系正确
- 索引全部创建

---

#### ✅ 任务1.2: 创建触发器和函数
**优先级**: P0
**预计时间**: 2小时

- [ ] 创建 `update_updated_at_column()` 函数
- [ ] 创建 `handle_new_user()` 函数和触发器
- [ ] 创建 `calculate_duration()` 函数和触发器
- [ ] 创建 `update_likes_count()` 函数和触发器
- [ ] 创建 `update_saves_count()` 函数和触发器
- [ ] 创建 `update_comments_count()` 函数和触发器

**验收标准**:
- 所有触发器正常工作
- 统计数据自动更新
- 新用户注册自动创建public.users记录

---

#### ✅ 任务1.3: 配置Row Level Security (RLS)
**优先级**: P0
**预计时间**: 2小时
**文件**: `/supabase/migrations/002_rls_policies.sql`

- [ ] 为所有表启用RLS
- [ ] 创建 `users` 表策略
- [ ] 创建 `trips` 表策略（CRUD权限）
- [ ] 创建 `trip_itineraries` 表策略
- [ ] 创建 `activities` 表策略
- [ ] 创建 `shared_trips` 表策略
- [ ] 创建 `user_interactions` 表策略
- [ ] 创建 `trip_comments` 表策略

**验收标准**:
- 用户只能访问自己的数据
- 公开数据（shared_trips）所有人可查看
- RLS策略测试通过

---

### Day 2: TypeScript类型和Supabase Client配置

#### ✅ 任务1.4: 创建TypeScript类型定义
**优先级**: P0
**预计时间**: 2小时
**文件**: `/types/database.ts`

- [ ] 定义 `User` 接口
- [ ] 定义 `Trip` 接口
- [ ] 定义 `TripItinerary` 接口
- [ ] 定义 `Activity` 接口
- [ ] 定义 `SharedTrip` 接口
- [ ] 定义 `UserInteraction` 接口
- [ ] 定义 `TripComment` 接口
- [ ] 导出Database类型（Supabase自动生成）

**代码示例**:
```typescript
// /types/database.ts
export interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration: string;
  budget: string | null;
  image_url: string | null;
  status: 'planning' | 'upcoming' | 'completed';
  source: 'ai' | 'manual';
  ai_prompt: string | null;
  created_at: string;
  updated_at: string;
}

// ... 其他接口
```

**验收标准**:
- 所有类型与数据库表结构一致
- 包含完整的字段注释
- 支持TypeScript严格模式

---

#### ✅ 任务1.5: 配置Supabase Client
**优先级**: P0
**预计时间**: 1.5小时
**文件**: `/utils/supabase/client.ts`

- [ ] 创建Supabase客户端单例
- [ ] 配置环境变量
- [ ] 导出类型化的客户端
- [ ] 测试连接

**代码示例**:
```typescript
// /utils/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient<Database>(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

**验收标准**:
- 客户端可以正常连接
- 类型提示正确
- 环境变量配置正确

---

#### ✅ 任务1.6: 创建AuthContext
**优先级**: P0
**预计时间**: 2小时
**文件**: `/presentation/context/AuthContext.tsx`

- [ ] 创建AuthContext
- [ ] 实现AuthProvider
- [ ] 监听认证状态变化
- [ ] 创建useAuth hook
- [ ] 在App.tsx中集成

**代码示例**:
```typescript
// /presentation/context/AuthContext.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**验收标准**:
- 认证状态正确同步
- useAuth hook可用
- 登录/登出功能正常

---

## 阶段2：认证功能 (1天)

### Day 3: 登录和注册页面

#### ✅ 任务2.1: 更新登录页面
**优先级**: P0
**预计时间**: 2小时
**文件**: `/components/LoginPage.tsx`

- [ ] 移除原有的自定义认证逻辑
- [ ] 使用 `supabase.auth.signInWithPassword()`
- [ ] 添加错误处理
- [ ] 添加loading状态
- [ ] 登录成功后重定向

**代码示例**:
```typescript
const handleLogin = async (email: string, password: string) => {
  setLoading(true);
  setError(null);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }
  
  // 登录成功，AuthContext会自动更新
  // 可以重定向到首页
};
```

**验收标准**:
- 用户可以成功登录
- 错误提示友好
- loading状态显示正确

---

#### ✅ 任务2.2: 更新注册页面
**优先级**: P0
**预计时间**: 2小时
**文件**: `/components/LoginPage.tsx`（注册表单）

- [ ] 使用 `supabase.auth.signUp()`
- [ ] 传递username和display_name到metadata
- [ ] 添加邮箱验证提示
- [ ] 添加错误处理

**代码示例**:
```typescript
const handleRegister = async (
  email: string,
  password: string,
  username: string,
  displayName: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName
      }
    }
  });
  
  if (error) {
    setError(error.message);
    return;
  }
  
  // 显示邮箱验证提示
  toast.success('注册成功！请查收验证邮件。');
};
```

**验收标准**:
- 注册成功
- public.users记录自动创建
- 邮箱验证流程正常

---

#### ✅ 任务2.3: 测试完整认证流程
**优先级**: P0
**预计时间**: 2小时

- [ ] 测试注册流程
- [ ] 测试邮箱验证
- [ ] 测试登录流程
- [ ] 测试登出流程
- [ ] 测试会话持久化
- [ ] 测试RLS权限

**验收标准**:
- 所有认证流程正常
- RLS正确控制数据访问
- 会话自动刷新

---

## 阶段3：行程核心功能 (2天)

### Day 4: 数据服务层

#### ✅ 任务3.1: 创建行程服务
**优先级**: P0
**预计时间**: 3小时
**文件**: `/services/tripService.ts`

- [ ] `getUserTrips()` - 获取用户行程列表
- [ ] `getTripDetail()` - 获取行程详情（含每日行程）
- [ ] `createTrip()` - 创建行程
- [ ] `updateTrip()` - 更新行程
- [ ] `deleteTrip()` - 删除行程

**代码示例**:
```typescript
// /services/tripService.ts
import { supabase } from '@/utils/supabase/client';
import type { Trip, TripItinerary, Activity } from '@/types/database';

export const tripService = {
  async getUserTrips(userId: string): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getTripDetail(tripId: string) {
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
    
    if (error) throw error;
    return data;
  },

  async createTrip(trip: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert(trip)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ... 其他方法
};
```

**验收标准**:
- 所有方法正常工作
- 错误处理完善
- TypeScript类型正确

---

#### ✅ 任务3.2: 创建行程详情服务
**优先级**: P0
**预计时间**: 2小时
**文件**: `/services/itineraryService.ts`

- [ ] `createItinerary()` - 创建每日行程
- [ ] `updateItinerary()` - 更新每日行程
- [ ] `deleteItinerary()` - 删除每日行程
- [ ] `addActivity()` - 添加活动
- [ ] `updateActivity()` - 更新活动
- [ ] `deleteActivity()` - 删除活动
- [ ] `reorderActivities()` - 重排活动顺序

**验收标准**:
- 支持批量创建每日行程
- 活动排序功能正常
- 级联删除正确

---

#### ✅ 任务3.3: 错误处理和日志
**优先级**: P1
**预计时间**: 1小时

- [ ] 创建统一的错误处理函数
- [ ] 添加友好的错误提示
- [ ] 添加日志记录
- [ ] 创建错误边界组件

**验收标准**:
- 所有错误都有友好提示
- 错误日志完整
- 不会因错误导致应用崩溃

---

### Day 5: 前端集成 - 行程页面

#### ✅ 任务3.4: 更新MyTripsPage
**优先级**: P0
**预计时间**: 3小时
**文件**: `/components/MyTripsPage.tsx`

- [ ] 移除mock数据
- [ ] 使用 `useAuth()` 获取当前用户
- [ ] 调用 `tripService.getUserTrips()`
- [ ] 添加loading和error状态
- [ ] 实现创建行程功能
- [ ] 实现删除行程功能

**代码示例**:
```typescript
export function MyTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await tripService.getUserTrips(user!.id);
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // ... 渲染逻辑
}
```

**验收标准**:
- 正确显示用户行程
- 加载状态清晰
- 创建和删除功能正常

---

#### ✅ 任务3.5: 更新TripDetailPage
**优先级**: P0
**预计时间**: 3小时
**文件**: `/components/TripDetailPage.tsx`

- [ ] 移除mock数据
- [ ] 调用 `tripService.getTripDetail()`
- [ ] 渲染每日行程
- [ ] 渲染活动列表
- [ ] 保持现有交互功能

**验收标准**:
- 正确显示行程详情
- 每日行程展开/收起正常
- 活动项点击功能正常

---

## 阶段4：分享功能 (2天)

### Day 6: 分享功能服务层

#### ✅ 任务4.1: 创建分享服务
**优先级**: P0
**预计时间**: 2小时
**文件**: `/services/sharedTripService.ts`

- [ ] `getAllSharedTrips()` - 获取所有分享
- [ ] `getSharedTripById()` - 获取单个分享
- [ ] `shareTrip()` - 分享行程
- [ ] `updateSharedTrip()` - 更新分享
- [ ] `deleteSharedTrip()` - 取消分享

**代码示例**:
```typescript
export const sharedTripService = {
  async getAllSharedTrips(options?: {
    sort?: 'latest' | 'hot' | 'recommend';
    tags?: string[];
  }) {
    let query = supabase
      .from('shared_trips')
      .select(`
        *,
        trips (*),
        users (username, display_name, avatar_url)
      `)
      .eq('is_active', true);

    // 排序
    if (options?.sort === 'hot') {
      query = query.order('likes_count', { ascending: false });
    } else if (options?.sort === 'latest') {
      query = query.order('shared_at', { ascending: false });
    }

    // 标签筛选
    if (options?.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // ... 其他方法
};
```

**验收标准**:
- 支持多种排序方式
- 标签筛选正常
- 统计数据正确

---

#### ✅ 任务4.2: 创建用户互动服务
**优先级**: P0
**预计时间**: 2小时
**文件**: `/services/userInteractionService.ts`

- [ ] `getUserInteractions()` - 获取用户互动
- [ ] `toggleLike()` - 切换点赞
- [ ] `toggleSave()` - 切换收藏
- [ ] `recordView()` - 记录浏览

**代码示例**:
```typescript
export const userInteractionService = {
  async toggleLike(userId: string, sharedTripId: string) {
    // 先查询现有记录
    const { data: existing } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('shared_trip_id', sharedTripId)
      .single();

    const newLikedState = !existing?.liked;

    const { data, error } = await supabase
      .from('user_interactions')
      .upsert({
        user_id: userId,
        shared_trip_id: sharedTripId,
        liked: newLikedState,
        liked_at: newLikedState ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,shared_trip_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ... 其他方法
};
```

**验收标准**:
- 点赞/取消点赞正常
- 收藏/取消收藏正常
- 统计数据通过触发器自动更新

---

### Day 7: 分享功能前端集成

#### ✅ 任务4.3: 更新DestinationExplorePage
**优先级**: P0
**预计时间**: 3小时
**文件**: `/components/DestinationExplorePage.tsx`

- [ ] 移除mock数据
- [ ] 调用 `sharedTripService.getAllSharedTrips()`
- [ ] 实现排序切换
- [ ] 实现标签筛选
- [ ] 加载用户互动状态
- [ ] 实现点赞功能
- [ ] 实现收藏功能

**验收标准**:
- 正确显示分享行程
- 排序功能正常
- 点赞和收藏实时更新

---

#### ✅ 任务4.4: 更新ShareTripModal
**优先级**: P0
**预计时间**: 3小时
**文件**: `/components/ShareTripModal.tsx`

- [ ] 添加"分享到发现"功能
- [ ] 收集用户输入（描述、标签、亮点）
- [ ] 调用 `sharedTripService.shareTrip()`
- [ ] 显示分享成功提示
- [ ] 保留原有的社交分享功能

**验收标准**:
- 分享功能正常
- 数据正确保存
- UI体验流畅

---

## 阶段5：数据初始化和优化 (2天)

### Day 8: 示例数据初始化

#### ✅ 任务5.1: 创建示例数据SQL
**优先级**: P0
**预计时间**: 3小时
**文件**: `/supabase/migrations/003_seed_data.sql`

- [ ] 创建测试用户
- [ ] 创建示例行程（2个）
  - [ ] 伦敦·爱丁堡（含完整每日行程）
  - [ ] 北京探店
- [ ] 创建示例分享行程（6个）
- [ ] 创建示例互动数据

**SQL示例**:
```sql
-- 插入示例用户（需要先通过Supabase Auth创建）
-- 假设已有用户ID: 'user-uuid-123'

-- 插入行程
INSERT INTO trips (id, user_id, destination, start_date, end_date, budget, image_url, status)
VALUES 
  ('trip-1', 'user-uuid-123', '伦敦 · 爱丁堡', '2024-10-01', '2024-10-07', '£3,500', 'https://...', 'upcoming'),
  ('trip-2', 'user-uuid-123', '北京办事处探店', '2024-11-15', '2024-11-17', '¥2000', 'https://...', 'planning');

-- 插入每日行程
INSERT INTO trip_itineraries (trip_id, day_number, date, theme)
VALUES
  ('trip-1', 1, '10月1日 周二', '抵达伦敦 · 市中心初探'),
  ('trip-1', 2, '10月2日 周三', '伦敦博物馆日');

-- 插入活动
-- ...
```

**验收标准**:
- 示例数据完整
- 与前端mock数据一致
- 关系数据正确关联

---

#### ✅ 任务5.2: 创建数据初始化工具
**优先级**: P1
**预计时间**: 2小时
**文件**: `/utils/initializeData.ts`

- [ ] 创建初始化函数
- [ ] 检测是否已有数据
- [ ] 在首次加载时自动初始化
- [ ] 添加重置数据功能（开发用）

**验收标准**:
- 首次登录自动初始化示例数据
- 避免重复初始化
- 开发环境可重置数据

---

### Day 9: 性能优化和测试

#### ✅ 任务5.3: 性能优化
**优先级**: P1
**预计时间**: 3小时

- [ ] 添加React.memo优化渲染
- [ ] 使用useMemo缓存计算结果
- [ ] 使用useCallback缓存函数
- [ ] 优化Supabase查询（减少嵌套查询）
- [ ] 添加图片懒加载
- [ ] 添加骨架屏

**验收标准**:
- 首屏加载 < 2秒
- 列表滚动流畅
- 无不必要的重渲染

---

#### ✅ 任务5.4: 端到端测试
**优先级**: P1
**预计时间**: 3小时

- [ ] 测试完整注册登录流程
- [ ] 测试创建行程流程
- [ ] 测试编辑行程详情
- [ ] 测试分享行程流程
- [ ] 测试点赞收藏功能
- [ ] 测试RLS权限（无法访问他人数据）
- [ ] 测试边界情况

**验收标准**:
- 所有核心流程正常
- RLS正确限制权限
- 边界情况处理正确

---

### Day 10: 文档和收尾

#### ✅ 任务5.5: 更新文档
**优先级**: P1
**预计时间**: 2小时

- [ ] 更新API文档
- [ ] 更新数据库Schema文档
- [ ] 编写部署指南
- [ ] 编写故障排查指南

**验收标准**:
- 文档完整清晰
- 包含示例代码
- 易于理解

---

#### ✅ 任务5.6: 最终检查和部署准备
**优先级**: P0
**预计时间**: 2小时

- [ ] 检查所有环境变量
- [ ] 清理console.log
- [ ] 检查TypeScript错误
- [ ] 运行ESLint
- [ ] 测试生产构建
- [ ] 准备部署checklist

**验收标准**:
- 无TypeScript错误
- 无console警告
- 生产构建成功

---

## 附加功能（可选）

### 🎯 任务6.1: 评论功能
**优先级**: P2
**预计时间**: 3小时

- [ ] 实现评论API
- [ ] 创建评论组件
- [ ] 集成到分享行程详情
- [ ] 支持点赞评论

---

### 🎯 任务6.2: 实时更新
**优先级**: P2
**预计时间**: 3小时

- [ ] 使用Supabase Realtime订阅
- [ ] 实时更新点赞数
- [ ] 实时显示新评论
- [ ] 优化性能

---

### 🎯 任务6.3: 图片上传到Storage
**优先级**: P2
**预计时间**: 4小时

- [ ] 配置Supabase Storage
- [ ] 实现图片上传功能
- [ ] 图片压缩和优化
- [ ] 生成缩略图

---

## 验收清单

### ✅ 数据库
- [ ] 所有表创建成功
- [ ] 触发器正常工作
- [ ] RLS策略生效
- [ ] 索引优化完成

### ✅ 认证
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] 会话持久化
- [ ] RLS识别用户

### ✅ 功能完整性
- [ ] 行程CRUD功能
- [ ] 行程详情管理
- [ ] 分享功能
- [ ] 点赞收藏功能
- [ ] 统计数据正确

### ✅ 用户体验
- [ ] 加载状态清晰
- [ ] 错误提示友好
- [ ] 交互流畅
- [ ] 响应式设计

### ✅ 性能
- [ ] 首屏加载 < 2秒
- [ ] 查询响应快速
- [ ] 无明显卡顿

### ✅ 代码质量
- [ ] TypeScript类型完整
- [ ] 代码注释充分
- [ ] 无console警告
- [ ] 遵循最佳实践

---

## PostgreSQL vs KV Store 对比

### ✅ PostgreSQL 优势
1. **开发效率提升 20%**: 减少了2天开发时间
2. **数据完整性**: 外键约束自动保证
3. **复杂查询**: 支持JOIN，无需手动组装数据
4. **自动统计**: 触发器自动更新计数
5. **RLS安全**: 数据库级别权限控制
6. **实时功能**: Supabase Realtime支持
7. **全文搜索**: 内置GIN索引
8. **易于维护**: SQL标准，易于调试

### 🔄 迁移简化
- 无需实现KV Store键管理
- 无需手动维护关联数据
- 无需实现复杂的查询逻辑
- 无需手动更新统计数据

---

**最后更新**: 2024-12-05
**数据库架构**: PostgreSQL + Supabase Auth
**预计完成时间**: 10个工作日
