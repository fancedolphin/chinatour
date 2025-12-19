# 🌍 Smart Travel AI - 小红书风格智能旅行规划应用

> 采用DDD架构 + React + TypeScript + Shadcn/ui构建的现代化旅行规划应用

## ✨ 主要功能

### 🗺️ 规划模块
- **智能行程规划**: 基于AI的旅行路线生成
- **引导式问答**: 收集旅行偏好和参数
- **已有行程识别**: 上传或粘贴现有行程进行智能识别

### 📱 我的行程
- **行程管理**: 创建、编辑、删除行程
- **多状态支持**: 草稿、计划中、进行中、已完成
- **分享功能**: 
  - 支持分享到发现页面
  - 多种卡片样式选择
  - 一键下载为图片

### 🔍 发现页面
- **瀑布流展示**: 类似小红书的信息流设计
- **点赞与收藏**: 社交互动功能
- **热门目的地推荐**: 智能推荐系统

### 👤 个人中心
- **用户信息管理**: 头像、昵称、邮箱、个人简介
- **我的行程**: 查看所有创建的行程
- **历史记录**: 浏览过的行程
- **设置页面**: 
  - 账号信息编辑
  - 主题切换（浅色/深色）
  - 账号注销

## 📁 项目架构

### DDD分层架构

```
├── domain/                          # 🎯 领域层 (纯业务逻辑)
│   ├── entities/                   # 实体
│   │   ├── Trip.ts                # 行程实体
│   │   ├── User.ts                # 用户实体
│   │   ├── FeedItem.ts            # 信息流实体
│   │   ├── TravelTip.ts           # 旅行提示实体
│   │   └── EmergencyInfo.ts       # 应急信息实体
│   ├── repositories/               # 仓储接口
│   │   ├── ITripRepository.ts
│   │   ├── IUserRepository.ts
│   │   ├── IFeedRepository.ts
│   │   ├── ITravelTipRepository.ts
│   │   └── IEmergencyRepository.ts
│   └── services/                   # 领域服务
│       └── TripPlanningService.ts
│
├── application/                     # 🔧 应用层 (用例编排)
│   └── use-cases/                  # 用例
│       ├── CreateTripUseCase.ts
│       ├── ShareTripUseCase.ts
│       ├── GetMyTripsUseCase.ts
│       ├── GetFeedUseCase.ts
│       ├── GetTravelTipsUseCase.ts
│       ├── GetEmergencyInfoUseCase.ts
│       ├── LoginUseCase.ts
│       └── RegisterUseCase.ts
│
├── infrastructure/                  # ⚙️ 基础设施层 (技术实现)
│   ├── config/                    # 配置
│   │   └── api.config.ts         # API配置
│   ├── http/                      # HTTP客户端
│   │   └── HttpClient.ts         # 统一HTTP客户端
│   ├── api/                       # API服务
│   │   ├── AuthApi.ts            # 认证API
│   │   └── UserApi.ts            # 用户API
│   ├── repositories/               # 仓储实现
│   │   ├── TripRepository.ts
│   │   ├── UserRepository.ts
│   │   ├── FeedRepository.ts
│   │   ├── TravelTipRepository.ts
│   │   └── EmergencyRepository.ts
│   ├── services/                   # 外部服务
│   │   └── ShareService.ts
│   └── di/                        # 依赖注入
│       └── Container.ts
│
├── presentation/                    # 🎨 表现层 (UI)
│   ├── components/                # 展示组件
│   │   └── RouteGuard.tsx        # 路由守卫
│   ├── context/                   # React Context
│   │   ├── AuthContext.tsx       # 认证上下文
│   │   ├── LanguageContext.tsx   # 多语言上下文
│   │   └── ThemeContext.tsx      # 主题上下文
│   ├── hooks/                     # React Hooks
│   │   ├── useAuth.ts
│   │   ├── useTrips.ts
│   │   ├── useFeed.ts
│   │   ├── useTravelTips.ts
│   │   └── useEmergency.ts
│   └── pages/                     # 页面组件
│       └── TravelTipsPage.tsx
│
└── components/                      # 🎨 UI组件
    ├── PlanInputPage.tsx           # 规划输入页
    ├── GuidedQuestionPage.tsx      # 引导问答页
    ├── ExistingPlanPage.tsx        # 已有行程页
    ├── AIPlannerChatPage.tsx       # AI聊天页
    ├── MyTripsPage.tsx             # 我的行程页
    ├── TripDetailPage.tsx          # 行程详情页
    ├── TripMapPage.tsx             # 行程地图页
    ├── DestinationExplorePage.tsx  # 发现页
    ├── ProfilePage.tsx             # 个人中心页
    ├── SettingsPage.tsx            # 设置页
    ├── LoginPage.tsx               # 登录页
    ├── ShareTripModal.tsx          # 分享模态框
    └── ui/                        # Shadcn/ui组件库
```

## 🚀 核心技术栈

- **前端框架**: React 18 + TypeScript
- **架构模式**: DDD (领域驱动设计)
- **UI组件库**: Shadcn/ui
- **样式方案**: Tailwind CSS v4.0
- **图标库**: Lucide React
- **状态管理**: React Context + Custom Hooks
- **HTTP客户端**: 自研HTTP Client（支持拦截器、超时控制、自动重试）
- **安全功能**: JWT认证、Token管理、路由守卫、401自动处理
- **图表库**: Recharts
- **通知提示**: Sonner

## 🎨 设计特色

### 小红书风格UI
- 圆角卡片设计
- 渐变色彩运用
- 瀑布流布局
- 优雅的动画过渡
- 响应式设计

### 主题支持
- ☀️ 浅色模式：适合白天使用
- 🌙 深色模式：适合夜间使用
- 自动保存用户偏好

## 📖 快速开始

### 环境配置

项目已包含默认的环境配置文件`.env`，无需额外配置即可运行。

如需自定义配置：

1. **修改`.env`文件**
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_ENV=development
   ```

2. **环境变量说明**
   - `VITE_API_BASE_URL`: 后端API地址
   - `VITE_ENV`: 环境类型（development/production）

> **注意**: `.env.example`是环境配置模板，`.env`是实际使用的配置文件

### 基本使用

1. **登录/注册**
   - 首次访问会自动跳转到登录页
   - 使用邮箱和密码进行注册或登录
   - 登录成功后会自动保存Token

2. **规划行程**
   - 点击底部导航"规划"
   - 选择新建行程或上传已有行程
   - 跟随引导式问答完成规划

3. **管理行程**
   - 点击"我的"进入个人中心
   - 选择"我的行程"标签查看所有行程
   - 点击行程卡片查看详情或分享

4. **发现内容**
   - 点击"发现"浏览推荐内容
   - 点赞和收藏感兴趣的行程
   - 保存喜欢的目的地

5. **个性化设置**
   - 进入个人中心
   - 点击右上角设置图标
   - 编辑个人信息或切换主题

### 架构使用

详细的DDD架构使用指南，请参考：
- [DDD快速参考](./DDD_QUICK_REFERENCE.md) - 快速查找API和使用示例
- [DDD入门指南](./GETTING_STARTED_DDD.md) - 从零开始学习DDD架构
- [架构文档](./ARCHITECTURE.md) - 完整的架构说明
- [设置页面指南](./SETTINGS_GUIDE.md) - 用户设置功能说明

## 🎯 DDD架构原则

### 依赖规则
```
Presentation → Application → Domain ← Infrastructure
     ↓              ↓            ↑
     └──────────────┴────────────┘
```

- **Domain层**: 不依赖任何其他层，包含纯业务逻辑
- **Application层**: 依赖Domain层，编排业务用例
- **Infrastructure层**: 实现Domain层定义的接口
- **Presentation层**: 依赖Application和Domain层，负责UI交互

### 核心概念

#### 实体 (Entities)
包含业务规则和业务数据的领域对象
```typescript
import { Trip } from '../domain/entities/Trip';

const trip = Trip.create({
  destination: '东京',
  startDate: new Date('2024-03-01'),
  endDate: new Date('2024-03-07'),
  travelers: 2
});
```

#### 用例 (Use Cases)
封装特定业务场景的应用逻辑
```typescript
import { CreateTripUseCase } from '../application/use-cases/CreateTripUseCase';

const createTrip = new CreateTripUseCase(tripRepository);
const result = await createTrip.execute(tripData);
```

#### 仓储 (Repositories)
数据访问的抽象接口
```typescript
import { ITripRepository } from '../domain/repositories/ITripRepository';

// 使用接口，而非具体实现
class MyComponent {
  constructor(private tripRepo: ITripRepository) {}
}
```

#### Hooks
连接UI和业务逻辑的桥梁
```typescript
import { useTrips } from '../presentation/hooks/useTrips';

function MyComponent() {
  const { trips, createTrip, loading } = useTrips(userId);
  // 使用trips数据和createTrip方法
}
```

## 🌐 多语言支持

应用支持中英文切换：
- 点击顶部导航栏的语言切换按钮
- 支持的语言：简体中文 (zh) / English (en)
- 语言设置自动保存

## 🔐 安全与认证系统

### 核心功能
- **JWT认证**: 完整的JWT Token管理机制
- **路由守卫**: 自动保护未授权访问
- **401处理**: 自动清理过期Token并跳转登录
- **Token存储**: localStorage + Cookie双重存储
- **认证拦截器**: 自动为请求添加Token

### HTTP客户端特性
- **请求拦截器**: 自动添加认证头
- **响应拦截器**: 统一处理响应和错误
- **超时控制**: 可配置的请求超时时间
- **错误处理**: 标准化的错误响应格式
- **FormData支持**: 自动识别文件上传

### 使用示例

```typescript
import { httpClient } from './infrastructure/http/HttpClient';

// GET请求
const response = await httpClient.get('/api/users');

// POST请求
const response = await httpClient.post('/api/trips', {
  destination: '东京',
  startDate: '2024-03-01'
});

// 上传文件
const formData = new FormData();
formData.append('avatar', file);
const response = await httpClient.post('/api/upload', formData);
```

### 路由保护
- 未登录用户访问受保护页面 → 自动跳转到登录页
- 已登录用户访问登录页 → 自动跳转到首页
- Token过期或无效 → 自动清理并跳转登录页

## 📚 文档索引

- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - 文档导航
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 架构详细说明
- **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** - 架构图示
- **[DDD_QUICK_REFERENCE.md](./DDD_QUICK_REFERENCE.md)** - DDD快速参考
- **[GETTING_STARTED_DDD.md](./GETTING_STARTED_DDD.md)** - DDD入门指南
- **[SETTINGS_GUIDE.md](./SETTINGS_GUIDE.md)** - 设置功能说明
- **[SECURITY_GUIDE.md](./SECURITY_GUIDE.md)** - 安全功能完整指南
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 故障排除指南

## 🎨 组件库

项目使用了完整的Shadcn/ui组件库，包括：
- Button, Input, Textarea - 表单组件
- Dialog, Alert Dialog, Sheet - 对话框
- Tabs, Accordion, Collapsible - 布局组件
- Card, Badge, Avatar - 展示组件
- Toast (Sonner) - 通知提示
- Switch, Checkbox, Radio - 选择器
- 以及更多...

所有组件位于 `/components/ui/` 目录下。

## 🐛 已知问题

目前应用使用模拟数据，待接入真实后端API。

## 📝 开发计划

- [ ] 接入真实后端API
- [ ] 完善行程编辑功能
- [ ] 增加地图交互功能
- [ ] 添加更多分享样式

## 📄 License

MIT License

---

**开发团队** | Smart Travel AI © 2025
