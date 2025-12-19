# 🚀 Getting Started with DDD Architecture

## 快速上手指南

欢迎使用我们的DDD架构的智能旅行应用！本指南将帮助你快速理解和使用新架构。

---

## 📖 5分钟快速入门

### 1. 理解基本概念

```
用户操作 → React组件 → Hook → Use Case → Domain Service/Repository → 数据存储
```

**你只需要关心前三层：React组件 + Hook + Use Case**

### 2. 创建你的第一个功能

假设你要创建一个"收藏行程"功能：

#### Step 1: 在Domain层添加方法（如果需要）

```typescript
// domain/entities/Trip.ts
export class Trip {
  // 添加新方法
  canBeFavorited(): boolean {
    return this.status !== TripStatus.CANCELLED;
  }
}
```

#### Step 2: 创建Use Case

```typescript
// application/use-cases/FavoriteTripUseCase.ts
export class FavoriteTripUseCase {
  constructor(private tripRepository: ITripRepository) {}
  
  async execute(input: { userId: string; tripId: string }) {
    const trip = await this.tripRepository.findById(input.tripId);
    
    if (!trip || !trip.canBeFavorited()) {
      return { success: false, error: 'Cannot favorite this trip' };
    }
    
    // 保存收藏逻辑
    return { success: true };
  }
}
```

#### Step 3: 在DI Container注册

```typescript
// infrastructure/di/Container.ts
getFavoriteTripUseCase(): FavoriteTripUseCase {
  return new FavoriteTripUseCase(this.tripRepository);
}
```

#### Step 4: 在Hook中使用

```typescript
// presentation/hooks/useTrips.ts
export function useTrips(userId: string) {
  // ... existing code
  
  const favoriteTrip = async (tripId: string) => {
    const useCase = container.getFavoriteTripUseCase();
    const result = await useCase.execute({ userId, tripId });
    
    if (result.success) {
      await loadTrips(); // 刷新列表
    }
    
    return result;
  };
  
  return {
    // ... existing returns
    favoriteTrip
  };
}
```

#### Step 5: 在组件中使用

```typescript
// presentation/components/TripCard.tsx
function TripCard({ trip }) {
  const { favoriteTrip } = useTrips(userId);
  
  const handleFavorite = async () => {
    const result = await favoriteTrip(trip.id);
    if (result.success) {
      toast.success('收藏成功！');
    }
  };
  
  return <button onClick={handleFavorite}>收藏</button>;
}
```

**完成！** 🎉

---

## 🎯 常见场景示例

### 场景1: 获取数据并显示

```typescript
function MyComponent() {
  const userId = 'user-123';
  const { trips, loading, error } = useTrips(userId);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

### 场景2: 创建新数据

```typescript
function CreateTripForm() {
  const { createTrip } = useTrips(userId);
  const [formData, setFormData] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await createTrip({
      title: formData.title,
      destination: formData.destination,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate)
    });
    
    if (result.success) {
      toast.success('创建成功！');
      navigate('/trips');
    } else {
      toast.error(result.errors?.join(', '));
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 场景3: 认证相关

```typescript
function LoginForm() {
  const { login, loading } = useAuthContext();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    const result = await login(username, password);
    
    if (result.success) {
      toast.success('登录成功！');
    } else {
      toast.error(result.error);
    }
  };
  
  return <form onSubmit={handleLogin}>...</form>;
}
```

### 场景4: 多语言

```typescript
function MyComponent() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div>
      <h1>{t('nav.home')}</h1>
      <button onClick={() => setLanguage('en')}>
        English
      </button>
    </div>
  );
}
```

---

## 📚 可用的Hooks

### useAuth() - 认证管理

```typescript
const {
  currentUser,      // 当前用户对象
  loading,          // 加载状态
  error,            // 错误信息
  isAuthenticated,  // 是否已登录
  login,            // 登录方法
  register,         // 注册方法
  logout,           // 登出方法
  updateProfile,    // 更新资料
  refresh           // 刷新用户信息
} = useAuth();
```

### useTrips(userId) - 行程管理

```typescript
const {
  trips,            // 行程列表
  loading,          // 加载状态
  error,            // 错误信息
  createTrip,       // 创建行程
  shareTrip,        // 分享行程
  loadTrips,        // 加载行程
  refresh           // 刷新列表
} = useTrips(userId);
```

### useFeed(userId, options) - 信息流

```typescript
const {
  items,            // 信息流项目
  loading,          // 加载状态
  error,            // 错误信息
  hasMore,          // 是否有更多
  loadMore,         // 加载更多
  refresh,          // 刷新
  search,           // 搜索
  likeItem,         // 点赞
  saveItem          // 收藏
} = useFeed(userId, {
  feedType: 'recommended',  // 或 'following'
  autoLoad: true
});
```

### useEmergency(countryCode) - 应急信息

```typescript
const {
  emergencyInfo,       // 应急信息对象
  loading,             // 加载状态
  error,               // 错误信息
  supportedCountries,  // 支持的国家列表
  loadEmergencyInfo,   // 加载应急信息
  preCacheCountries    // 预缓存国家
} = useEmergency('GB');
```

### useLanguage() - 多语言

```typescript
const {
  language,         // 当前语言 'zh' | 'en'
  setLanguage,      // 设置语言
  t                 // 翻译函数
} = useLanguage();
```

---

## 🎨 Context Providers

### 全局上下文使用

```typescript
// App.tsx - 已配置
function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <YourApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
```

### 在任何组件中使用

```typescript
import { useAuthContext } from './presentation/context/AuthContext';
import { useLanguage } from './presentation/context/LanguageContext';

function MyComponent() {
  const { currentUser } = useAuthContext();
  const { t } = useLanguage();
  
  return <div>{t('welcome')}, {currentUser?.displayName}</div>;
}
```

---

## 🔧 开发工作流

### 日常开发流程

1. **查看需求**: 明确要实现什么功能
2. **检查现有**: 看看是否已有对应的Use Case和Hook
3. **使用Hook**: 在组件中使用相应的Hook
4. **处理状态**: 处理loading、error、success状态
5. **测试功能**: 确保功能正常工作

### 添加新功能流程

1. **Domain**: 在entities中添加业务规则
2. **Application**: 创建Use Case
3. **Infrastructure**: 实现Repository或Service（如需要）
4. **DI**: 在Container中注册
5. **Hook**: 创建或更新Hook
6. **Component**: 在组件中使用

---

## 🐛 调试技巧

### 查看数据

```typescript
// 在控制台查看所有行程
const { trips } = useTrips(userId);
console.log('Trips:', trips);

// 查看当前用户
const { currentUser } = useAuthContext();
console.log('Current User:', currentUser);
```

### 清除数据

```javascript
// 在浏览器控制台运行
localStorage.clear();
location.reload();
```

### 查看存储的数据

```javascript
// 查看行程数据
console.log(JSON.parse(localStorage.getItem('trips') || '[]'));

// 查看用户数据
console.log(JSON.parse(localStorage.getItem('users') || '[]'));

// 查看信息流数据
console.log(JSON.parse(localStorage.getItem('feed_items') || '[]'));
```

---

## ⚠️ 常见错误

### 错误1: "useAuthContext must be used within an AuthProvider"

**原因**: 组件没有被AuthProvider包裹

**解决**: 确保App.tsx中有Provider配置

```typescript
// ❌ 错误
function MyComponent() {
  const { currentUser } = useAuthContext(); // 错误！
}

// ✅ 正确
<AuthProvider>
  <MyComponent />
</AuthProvider>
```

### 错误2: Hook返回空数据

**原因**: userId未正确传递

**解决**: 确保传递有效的userId

```typescript
// ❌ 错误
const { trips } = useTrips(undefined);

// ✅ 正确
const { currentUser } = useAuthContext();
const { trips } = useTrips(currentUser?.id || 'guest');
```

### 错误3: 数据不刷新

**原因**: 需要手动刷新

**解决**: 调用refresh方法

```typescript
const { trips, refresh } = useTrips(userId);

// 在创建后刷新
const handleCreate = async () => {
  await createTrip(data);
  await refresh(); // 刷新列表
};
```

---

## 📖 学习路径

### 第1天: 了解架构
- 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md)
- 查看 [DDD_QUICK_REFERENCE.md](./DDD_QUICK_REFERENCE.md)

### 第2天: 实践基础
- 使用现有Hooks获取数据
- 在组件中显示数据
- 处理loading和error状态

### 第3天: 创建数据
- 使用createTrip创建行程
- 使用login/register实现认证
- 理解数据流动

### 第4天: 添加功能
- 参考 [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 创建自己的Use Case
- 在Hook中暴露功能

### 第5天: 高级主题
- 理解依赖注入
- 优化性能
- 编写测试

---

## 🎓 最佳实践

### ✅ DO (推荐做法)

```typescript
// ✅ 使用Hook获取数据
const { trips } = useTrips(userId);

// ✅ 处理所有状态
if (loading) return <Loader />;
if (error) return <Error message={error} />;

// ✅ 使用领域实体的方法
if (trip.canBeShared()) {
  // 分享逻辑
}

// ✅ 通过Use Case执行操作
const result = await createTrip(data);
if (result.success) {
  // 成功处理
}
```

### ❌ DON'T (避免做法)

```typescript
// ❌ 直接访问localStorage
const trips = JSON.parse(localStorage.getItem('trips'));

// ❌ 在组件中写业务逻辑
const duration = Math.ceil(
  (endDate - startDate) / (1000 * 60 * 60 * 24)
);

// ❌ 不处理错误状态
const { trips } = useTrips(userId);
return <div>{trips.map(...)}</div>; // 可能为null!

// ❌ 绕过Use Case直接调用Repository
const trip = await tripRepository.save(trip);
```

---

## 🔗 快速链接

- [完整架构文档](./ARCHITECTURE.md)
- [迁移指南](./MIGRATION_GUIDE.md)
- [快速参考](./DDD_QUICK_REFERENCE.md)
- [实施状态](./DDD_IMPLEMENTATION_STATUS.md)
- [架构图表](./ARCHITECTURE_DIAGRAM.md)

---

## 💡 示例代码仓库

查看 [ExampleDDDPage.tsx](./presentation/pages/ExampleDDDPage.tsx) 获取完整示例！

---

**现在你已经准备好开始使用DDD架构开发了！** 🚀

如果遇到问题，请参考文档或询问团队成员。Happy Coding! 💻
