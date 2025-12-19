# 🏗️ DDD Architecture Documentation

## 📋 目录结构

```
├── domain/                          # 领域层 (Domain Layer)
│   ├── entities/                   # 实体
│   │   ├── Trip.ts                # 行程实体
│   │   ├── User.ts                # 用户实体
│   │   ├── FeedItem.ts            # 信息流实体
│   │   └── EmergencyInfo.ts       # 应急信息实体
│   ├── repositories/               # 仓储接口
│   │   ├── ITripRepository.ts
│   │   ├── IUserRepository.ts
│   │   ├── IFeedRepository.ts
│   │   └── IEmergencyRepository.ts
│   └── services/                   # 领域服务
│       └── TripPlanningService.ts
│
├── application/                     # 应用层 (Application Layer)
│   └── use-cases/                  # 用例
│       ├── CreateTripUseCase.ts
│       ├── ShareTripUseCase.ts
│       ├── GetEmergencyInfoUseCase.ts
│       └── GetMyTripsUseCase.ts
│
├── infrastructure/                  # 基础设施层 (Infrastructure Layer)
│   ├── repositories/               # 仓储实现
│   │   ├── TripRepository.ts
│   │   └── EmergencyRepository.ts
│   ├── services/                   # 外部服务
│   │   └── ShareService.ts
│   └── di/                        # 依赖注入
│       └── Container.ts
│
├── presentation/                    # 表现层 (Presentation Layer)
│   ├── hooks/                     # React Hooks
│   │   ├── useTrips.ts
│   │   └── useEmergency.ts
│   ├── pages/                     # 页面组件 (待迁移)
│   └── components/                # UI组件 (待迁移)
│
└── components/                      # 现有组件 (将逐步迁移到presentation/)
```

## 🎯 DDD分层架构原则

### 依赖规则 (Dependency Rules)

```
┌─────────────────────────────────────────────┐
│          Presentation Layer                 │
│  (UI Components, React Hooks, Pages)        │
│                    ↓                         │
│          Application Layer                   │
│      (Use Cases, Application Services)      │
│                    ↓                         │
│          Domain Layer                        │
│   (Entities, Domain Services, Interfaces)   │
│                    ↑                         │
│       Infrastructure Layer                   │
│  (Repositories Impl, External Services)     │
└─────────────────────────────────────────────┘
```

### ✅ 允许的依赖关系

- **Infrastructure → Domain**: 基础设施层可以依赖领域层（实现接口）
- **Application → Infrastructure**: 应用层可以使用基础设施层（通过依赖注入）
- **Application → Domain**: 应用层可以协调领域层
- **Presentation → Application**: 表现层调用应用层（Use Cases）

### ❌ 禁止的依赖关系

- **Infrastructure → Application**: 基础设施层不能依赖应用层
- **Domain → Infrastructure**: 领域层不能依赖基础设施层（通过接口反转）
- **Domain → Application**: 领域层不能依赖应用层
- **Domain → Presentation**: 领域层不能依赖表现层

## 📦 各层职责

### 1. Domain Layer (领域层)

**职责**: 核心业务逻辑和规则

**包含**:
- **Entities (实体)**: 业务对象，包含业务规则和不变量
  ```typescript
  // 示例: Trip实体
  class Trip {
    isActive(): boolean { /* 业务规则 */ }
    canBeShared(): boolean { /* 业务规则 */ }
    static validate(trip): ValidationResult { /* 验证规则 */ }
  }
  ```

- **Value Objects (值对象)**: 不可变的值对象
  
- **Domain Services (领域服务)**: 跨实体的业务逻辑
  ```typescript
  // 示例: TripPlanningService
  class TripPlanningService {
    calculateFeasibilityScore(trip: Trip): number
    optimizeActivitySchedule(day: TripDay): TripDay
  }
  ```

- **Repository Interfaces (仓储接口)**: 定义数据访问契约
  ```typescript
  interface ITripRepository {
    findById(id: string): Promise<Trip | null>
    save(trip: Trip): Promise<Trip>
  }
  ```

**依赖**: 无外部依赖（纯业务逻辑）

---

### 2. Application Layer (应用层)

**职责**: 用例编排和应用服务

**包含**:
- **Use Cases (用例)**: 具体的业务场景
  ```typescript
  // 示例: CreateTripUseCase
  class CreateTripUseCase {
    constructor(
      private tripRepository: ITripRepository,
      private planningService: TripPlanningService
    ) {}
    
    async execute(input: CreateTripInput): Promise<CreateTripOutput>
  }
  ```

- **DTOs (数据传输对象)**: 用例的输入输出
  ```typescript
  interface CreateTripInput {
    userId: string
    title: string
    destination: string
    startDate: Date
    endDate: Date
  }
  ```

- **Application Services**: 应用级服务

**依赖**: Domain Layer, Infrastructure Layer (通过依赖注入)

---

### 3. Infrastructure Layer (基础设施层)

**职责**: 技术实现和外部服务对接

**包含**:
- **Repository Implementations (仓储实现)**: 实现领域层定义的接口
  ```typescript
  class TripRepository implements ITripRepository {
    async findById(id: string): Promise<Trip | null> {
      // LocalStorage / API 实现
    }
  }
  ```

- **External Services (外部服务)**: API客户端、第三方服务
  ```typescript
  class ShareService implements IShareService {
    shareToSocialMedia(platform, url, trip): Promise<boolean>
  }
  ```

- **Dependency Injection (依赖注入)**: 管理依赖关系
  ```typescript
  class DIContainer {
    getCreateTripUseCase(): CreateTripUseCase {
      return new CreateTripUseCase(
        this.tripRepository,
        this.planningService
      )
    }
  }
  ```

**依赖**: Domain Layer (实现接口)

---

### 4. Presentation Layer (表现层)

**职责**: UI展示和用户交互

**包含**:
- **React Components (组件)**: UI组件
- **React Hooks (Hooks)**: 封装业务逻辑调用
  ```typescript
  function useTrips(userId: string) {
    const getMyTripsUseCase = container.getGetMyTripsUseCase()
    
    const loadTrips = async () => {
      const result = await getMyTripsUseCase.execute({ userId })
      // 更新UI状态
    }
    
    return { trips, loading, error, loadTrips }
  }
  ```

- **Pages (页面)**: 页面级组件

**依赖**: Application Layer (通过Hooks调用Use Cases)

---

## 🔄 数据流动

```
User Interaction (UI)
        ↓
React Component
        ↓
Custom Hook (useTrips)
        ↓
Use Case (CreateTripUseCase)
        ↓
Domain Service (TripPlanningService)
        ↓
Repository Interface (ITripRepository)
        ↓
Repository Implementation (TripRepository)
        ↓
Data Storage (LocalStorage / API)
```

---

## 💉 依赖注入示例

```typescript
// 1. 在Infrastructure层配置依赖
const container = DIContainer.getInstance()

// 2. 在Presentation层使用
function MyTripsPage() {
  const userId = 'user-123'
  
  // Hook自动获取依赖
  const { trips, loading, createTrip } = useTrips(userId)
  
  const handleCreateTrip = async () => {
    await createTrip({
      title: 'Tokyo Trip',
      destination: 'Tokyo',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-10')
    })
  }
  
  return <div>...</div>
}
```

---

## 📝 使用示例

### 示例1: 创建行程

```typescript
// Presentation Layer
function CreateTripForm() {
  const { createTrip } = useTrips(userId)
  
  const handleSubmit = async (formData) => {
    const result = await createTrip({
      title: formData.title,
      destination: formData.destination,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate)
    })
    
    if (result.success) {
      // 成功处理
    }
  }
}
```

### 示例2: 分享行程

```typescript
// Presentation Layer
function ShareButton({ tripId }) {
  const { shareTrip } = useTrips(userId)
  
  const handleShare = async () => {
    const result = await shareTrip(
      tripId,
      'instagram',
      'modern'
    )
    
    if (result.success) {
      // 显示分享URL或图片
    }
  }
}
```

### 示例3: 获取应急信息

```typescript
// Presentation Layer
function EmergencyCard({ countryCode }) {
  const { 
    emergencyInfo, 
    loading 
  } = useEmergency(countryCode)
  
  if (loading) return <Spinner />
  
  return (
    <div>
      <p>Police: {emergencyInfo?.emergencyNumbers.police}</p>
      <p>Ambulance: {emergencyInfo?.emergencyNumbers.ambulance}</p>
    </div>
  )
}
```

---

## 🧪 测试策略

### Domain Layer 测试
```typescript
describe('Trip Entity', () => {
  it('should validate trip data', () => {
    const validation = Trip.validate({
      title: '',
      destination: 'Tokyo'
    })
    
    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Trip title is required')
  })
})
```

### Application Layer 测试
```typescript
describe('CreateTripUseCase', () => {
  it('should create a trip', async () => {
    const mockRepository = createMockRepository()
    const useCase = new CreateTripUseCase(mockRepository, planningService)
    
    const result = await useCase.execute({
      userId: '123',
      title: 'Tokyo Trip',
      // ...
    })
    
    expect(result.success).toBe(true)
  })
})
```

---

## 🚀 迁移计划

### 阶段1: 核心领域层 ✅
- [x] 创建实体（Trip, User, FeedItem, EmergencyInfo）
- [x] 定义仓储接口
- [x] 实现领域服务

### 阶段2: 应用层 ✅
- [x] 实现核心Use Cases
- [x] 定义DTOs

### 阶段3: 基础设施层 ✅
- [x] 实现仓储（LocalStorage）
- [x] 实现外部服务
- [x] 配置依赖注入

### 阶段4: 表现层 🚧
- [x] 创建React Hooks
- [ ] 迁移现有组件到presentation/
- [ ] 更新组件使用新的Hooks

### 阶段5: 完善和优化
- [ ] 添加错误处理
- [ ] 添加日志
- [ ] 性能优化
- [ ] 完善测试覆盖

---

## 🎯 最佳实践

1. **保持领域层纯净**: 领域层不依赖任何外部框架或库
2. **依赖注入**: 通过构造函数注入依赖
3. **接口隔离**: 每个接口只定义必要的方法
4. **单一职责**: 每个类只负责一件事
5. **不可变性**: 尽可能使用不可变数据结构
6. **命名清晰**: 使用业务语言命名（Ubiquitous Language）

---

## 📚 参考资料

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)

---

**更新日期**: 2025-01-11
**维护者**: Development Team
