# 登录系统说明文档

## 概述

本应用采用DDD（领域驱动设计）架构实现了完整的用户认证系统，支持用户注册、登录、登出等功能。当前使用LocalStorage作为数据存储，预留了PostgreSQL数据库接口便于后续迁移。

## 默认账户

系统预设了两个默认账户供开发和测试使用：

### 1. 管理员账户
- **用户名**: `admin`
- **密码**: `admin123`
- **邮箱**: admin@smarttravel.com
- **角色**: 管理员
- **权限**: 
  - 用户管理
  - 内容审核
  - 系统设置
  - 数据分析访问

### 2. 测试用户账户
- **用户名**: `testuser`
- **密码**: `test123`
- **邮箱**: test@smarttravel.com
- **角色**: 普通用户

## 功能特性

### ✅ 已实现功能

1. **用户注册**
   - 用户名唯一性验证
   - 邮箱格式验证
   - 用户名最小长度验证（3个字符）
   - 自动生成用户头像

2. **用户登录**
   - 支持用户名登录
   - 支持邮箱登录
   - 密码验证
   - 登录状态持久化（LocalStorage）

3. **用户登出**
   - 清除登录状态
   - 重定向到登录页

4. **用户资料管理**
   - 查看用户信息
   - 更新用户资料
   - 头像上传

5. **社交登录（Mock实现）**
   - Google登录
   - Apple登录
   - Instagram登录

6. **快速登录面板**
   - 仅在开发环境显示
   - 一键登录默认账户
   - 方便开发测试

### 🔄 登录流程

```
用户打开应用
    ↓
检查登录状态
    ↓
未登录 → 显示登录页
    ↓
输入用户名/密码
    ↓
调用LoginUseCase
    ↓
验证用户凭证
    ↓
设置当前用户
    ↓
跳转到首页（规划页）
```

### 🏗️ 架构设计

采用DDD分层架构：

```
┌─────────────────────────────────────┐
│  Presentation Layer (表现层)         │
│  - LoginPage.tsx                    │
│  - AuthContext.tsx                  │
│  - useAuth.ts                       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Application Layer (应用层)          │
│  - LoginUseCase.ts                  │
│  - RegisterUseCase.ts               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Domain Layer (领域层)               │
│  - User.ts (实体)                   │
│  - IUserRepository.ts (接口)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Infrastructure Layer (基础设施层)   │
│  - UserRepository.ts (LocalStorage) │
│  - PostgreSQLUserRepository.ts (预留)│
│  - AdminInitializer.ts              │
└─────────────────────────────────────┘
```

## 使用指南

### 开发环境快速登录

#### 方法1: 使用快速登录面板
1. 打开应用
2. 在右下角找到"快速登录"面板
3. 点击"登录为管理员"或"登录为测试用户"
4. 自动跳转到首页

#### 方法2: 手动登录
1. 点击右上角"登录"按钮
2. 输入用户名和密码（参考默认账户）
3. 点击"登录"按钮
4. 登录成功后自动跳转到首页

### 注册新用户

1. 点击右上角"登录"按钮
2. 点击"立即注册"切换到注册模式
3. 填写以下信息：
   - 用户名（至少3个字符）
   - 邮箱（有效的邮箱格式）
   - 密码
4. 点击"注册"按钮
5. 注册成功后自动登录并跳转到首页

### 查看和修改个人资料

1. 登录后点击右上角用户头像
2. 在下拉菜单中选择"我的"
3. 进入个人资料页面
4. 点击"编辑资料"进行修改
5. 保存更改

### 登出

1. 点击右上角用户头像
2. 在下拉菜单中选择"退出登录"
3. 确认后退出到登录页

## 代码示例

### 在组件中使用认证

```typescript
import { useAuthContext } from '../presentation/context/AuthContext';

function MyComponent() {
  const { currentUser, isAuthenticated, login, logout } = useAuthContext();

  const handleLogin = async () => {
    const result = await login('admin', 'admin123');
    if (result.success) {
      console.log('登录成功');
    }
  };

  if (!isAuthenticated()) {
    return <div>请先登录</div>;
  }

  return (
    <div>
      <p>欢迎, {currentUser?.displayName}!</p>
      <button onClick={logout}>登出</button>
    </div>
  );
}
```

### 创建受保护的路由

```typescript
import { RouteGuard } from './presentation/components/RouteGuard';

function App() {
  return (
    <RouteGuard currentPage="profile" onRedirect={handleRedirect}>
      <ProfilePage />
    </RouteGuard>
  );
}
```

## 数据存储

### 当前实现 (LocalStorage)

数据存储在浏览器的LocalStorage中：

- **存储键**: 
  - `users` - 所有用户数据
  - `current_user` - 当前登录用户ID

- **数据格式**:
```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@smarttravel.com",
  "displayName": "系统管理员",
  "avatar": "url",
  "bio": "...",
  "preferences": {
    "language": "zh",
    "currency": "CNY"
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 清除本地数据

在浏览器控制台执行：
```javascript
// 清除所有用户数据
localStorage.removeItem('users');
localStorage.removeItem('current_user');

// 刷新页面
location.reload();
```

### 迁移到PostgreSQL

详见 [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md)

## 安全考虑

### ⚠️ 当前实现（开发/演示用）

1. **密码存储**: 明文存储在LocalStorage（仅演示用）
2. **密码验证**: 简化的验证逻辑
3. **会话管理**: 基于LocalStorage
4. **HTTPS**: 不强制要求

### ✅ 生产环境建议

1. **使用PostgreSQL数据库**
   - 启用数据加密
   - 使用SSL/TLS连接

2. **密码安全**
   - 使用bcrypt哈希存储密码（salt rounds >= 10）
   - 永远不存储明文密码
   - 实施密码强度策略

3. **会话管理**
   - 使用JWT tokens
   - 设置合理的过期时间
   - 实施token刷新机制
   - 使用HttpOnly cookies

4. **传输安全**
   - 强制使用HTTPS
   - 实施CORS策略
   - 添加CSRF保护

5. **认证增强**
   - 实施账户锁定机制
   - 添加验证码（防止暴力破解）
   - 启用双因素认证（2FA）
   - 记录登录日志

6. **数据保护**
   - 不收集不必要的PII
   - 遵守GDPR等隐私法规
   - 实施数据加密
   - 定期安全审计

## 故障排除

### 问题1: 无法登录

**症状**: 输入正确的用户名密码后无法登录

**解决方案**:
1. 检查浏览器控制台是否有错误
2. 清除LocalStorage数据并刷新页面
3. 确认用户名和密码正确
4. 检查网络连接

### 问题2: 登录后立即跳出

**症状**: 登录成功但马上又回到登录页

**解决方案**:
1. 检查RouteGuard配置
2. 确认AuthContext正确初始化
3. 清除浏览器缓存和cookies

### 问题3: 默认账户不存在

**症状**: 使用默认账户无法登录

**解决方案**:
1. 检查AdminInitializer是否正确初始化
2. 在控制台查看初始化日志
3. 手动清除LocalStorage后刷新

### 问题4: 快速登录面板不显示

**症状**: 开发环境中看不到快速登录面板

**解决方案**:
1. 确认是开发环境（`import.meta.env.DEV === true`）
2. 检查QuickLoginPanel组件是否正确导入
3. 确认未登录状态

## API参考

### AuthContext

```typescript
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: () => boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; errors?: string[] }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  refresh: () => Promise<void>;
}
```

### User Entity

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}
```

## 相关文档

- [架构文档](./ARCHITECTURE.md) - DDD架构详细说明
- [数据库迁移指南](./DATABASE_MIGRATION_GUIDE.md) - PostgreSQL迁移步骤
- [安全指南](./SECURITY_GUIDE.md) - 安全最佳实践
- [设置指南](./SETTINGS_GUIDE.md) - 系统配置说明

## 开发路线图

### 短期计划
- [ ] 实现密码重置功能
- [ ] 添加邮箱验证
- [ ] 实施账户锁定机制
- [ ] 添加登录历史记录

### 中期计划
- [ ] 迁移到PostgreSQL
- [ ] 实施JWT认证
- [ ] 添加OAuth2.0支持
- [ ] 实现双因素认证

### 长期计划
- [ ] 支持SSO（单点登录）
- [ ] 实施细粒度权限系统
- [ ] 添加生物识别认证
- [ ] 实现联邦身份认证

## 贡献指南

如需修改认证系统，请遵循以下原则：

1. **遵守DDD架构** - 不要跨层直接调用
2. **编写单元测试** - 覆盖核心认证逻辑
3. **更新文档** - 同步更新相关文档
4. **安全优先** - 任何修改都要考虑安全影响
5. **向后兼容** - 不要破坏现有API

## 联系方式

如有问题或建议，请通过以下方式联系：

- 创建GitHub Issue
- 发送邮件至: dev@smarttravel.com
- 查阅FAQ文档

---

**最后更新**: 2025-11-12
**版本**: 1.0.0
