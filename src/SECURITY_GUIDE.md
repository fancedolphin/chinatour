# 🔐 安全功能指南

本文档详细说明智能旅行应用的安全功能实现。

## 📋 目录

- [HTTP客户端](#http客户端)
- [认证系统](#认证系统)
- [路由守卫](#路由守卫)
- [Token管理](#token管理)
- [API集成](#api集成)

## 🌐 HTTP客户端

### 概述

位置：`/infrastructure/http/HttpClient.ts`

统一的HTTP客户端，提供：
- 请求/响应拦截器
- 自动Token管理
- 超时控制
- 错误处理
- FormData支持

### 基本使用

```typescript
import { httpClient } from '../infrastructure/http/HttpClient';

// GET请求
const response = await httpClient.get<ApiResponse<User>>('/users');

// POST请求
const response = await httpClient.post<ApiResponse<Trip>>(
  '/trips',
  {
    destination: '东京',
    startDate: '2024-03-01',
    endDate: '2024-03-07'
  }
);

// PUT请求
const response = await httpClient.put<ApiResponse<User>>(
  '/users/profile',
  { nickname: '新昵称' }
);

// DELETE请求
const response = await httpClient.delete<ApiResponse<null>>('/trips/123');
```

### 查询参数

```typescript
// 方式1：通过params传递
const response = await httpClient.get('/trips', {
  params: {
    status: 'active',
    page: 1,
    limit: 10
  }
});
// 实际请求：/trips?status=active&page=1&limit=10

// 方式2：直接在URL中
const response = await httpClient.get('/trips?status=active');
```

### 上传文件

```typescript
// 上传单个文件
const formData = new FormData();
formData.append('avatar', file);

const response = await httpClient.post('/users/avatar', formData);

// 上传多个文件
const formData = new FormData();
formData.append('image1', file1);
formData.append('image2', file2);
formData.append('description', '描述文字');

const response = await httpClient.post('/upload', formData);
```

### 自定义配置

```typescript
// 自定义超时时间
const response = await httpClient.get('/api/slow-endpoint', {
  timeout: 60000 // 60秒
});

// 显示Toast提示
const response = await httpClient.post(
  '/trips',
  tripData,
  {},
  { showToast: true } // 自动显示成功/失败提示
);

// 获取原始响应（不解析JSON）
const response = await httpClient.get(
  '/download',
  {},
  { raw: true }
);
```

### 拦截器

#### 请求拦截器

自动添加：
- Content-Type头（非FormData）
- Authorization头（从localStorage/Cookie读取Token）

```typescript
// 拦截器会自动添加：
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 响应拦截器

自动处理：
- 401未授权 → 清理Token并触发`auth:unauthorized`事件
- 成功响应 → 解析JSON
- 错误响应 → 标准化错误格式

#### 错误拦截器

处理：
- 超时错误 → 返回408
- 网络错误 → 返回503
- 其他错误 → 标准化格式

## 🔑 认证系统

### 认证API

位置：`/infrastructure/api/AuthApi.ts`

#### 登录

```typescript
import { login } from '../infrastructure/api/AuthApi';

const response = await login({
  email: 'user@example.com',
  password: 'password123'
});

if (response.code === 200) {
  // Token已自动保存到localStorage和Cookie
  console.log('登录成功:', response.data.user);
  console.log('Token:', response.data.token);
}
```

#### 注册

```typescript
import { register } from '../infrastructure/api/AuthApi';

const response = await register({
  email: 'user@example.com',
  password: 'password123',
  nickname: '旅行达人'
});

if (response.code === 200) {
  console.log('注册成功:', response.data.user);
}
```

#### 登出

```typescript
import { logout } from '../infrastructure/api/AuthApi';

const response = await logout();
// Token已自动清除
```

#### 刷新Token

```typescript
import { refreshToken } from '../infrastructure/api/AuthApi';

const response = await refreshToken();
if (response.code === 200) {
  console.log('Token已刷新');
}
```

#### SSO回调

```typescript
import { handleSSOCallback } from '../infrastructure/api/AuthApi';

const response = await handleSSOCallback({
  code: 'auth_code_from_sso',
  state: 'optional_state'
});
```

### 用户API

位置：`/infrastructure/api/UserApi.ts`

#### 获取用户信息

```typescript
import { getUserInfo } from '../infrastructure/api/UserApi';

const response = await getUserInfo();
if (response.code === 200) {
  console.log('用户信息:', response.data);
}
```

#### 更新用户信息

```typescript
import { updateUserInfo } from '../infrastructure/api/UserApi';

const response = await updateUserInfo({
  nickname: '新昵称',
  bio: '个人简介'
});
```

#### 修改密码

```typescript
import { changePassword } from '../infrastructure/api/UserApi';

const response = await changePassword({
  currentPassword: 'old_password',
  newPassword: 'new_password',
  confirmPassword: 'new_password'
});
```

#### 上传头像

```typescript
import { uploadAvatar } from '../infrastructure/api/UserApi';

const file = event.target.files[0];
const response = await uploadAvatar(file);

if (response.code === 200) {
  console.log('头像URL:', response.data.url);
}
```

#### 获取当前用户ID

```typescript
import { getCurrentUserId, getCurrentUserIdAsync } from '../infrastructure/api/UserApi';

// 同步方式（从Token解析）
const userId = getCurrentUserId();

// 异步方式（从API获取）
const userId = await getCurrentUserIdAsync();
```

## 🛡️ 路由守卫

### 概述

位置：`/presentation/components/RouteGuard.tsx`

自动保护路由，防止未授权访问。

### 工作原理

1. **检查认证状态**
   - 读取localStorage中的Token
   - 验证Token格式（JWT格式）
   - 检查Token是否过期

2. **访问控制**
   - 公开页面：登录页（login）
   - 受保护页面：其他所有页面

3. **自动重定向**
   - 未登录访问受保护页面 → 跳转登录页
   - 已登录访问登录页 → 跳转首页

4. **监听未授权事件**
   - 当收到401响应时自动跳转登录页

### 使用方式

```typescript
// 在App.tsx中使用
<RouteGuard currentPage={currentTab} onRedirect={setCurrentTab}>
  {/* 应用内容 */}
</RouteGuard>
```

### 配置公开页面

```typescript
// 在RouteGuard.tsx中配置
const PUBLIC_PAGES = ['login', 'register', 'forgot-password'];
```

## 🎫 Token管理

### Token存储

Token同时存储在两个位置：

1. **localStorage**
   - Key: `auth_token`
   - 优点：JavaScript可直接访问
   - 缺点：XSS攻击风险

2. **Cookie**
   - Name: `token`
   - 优点：HttpOnly可防XSS
   - 缺点：需要服务端配置

### Token格式

使用JWT（JSON Web Token）：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJleHAiOjE3MDAwMDAwMDB9.signature
```

组成部分：
- Header（头部）
- Payload（载荷）：包含用户ID、过期时间等
- Signature（签名）

### Token解析

```typescript
import { getCurrentUserId } from '../infrastructure/api/UserApi';

const userId = getCurrentUserId();
// 从Token的payload中解析出userId
```

### Token验证

```typescript
import { checkAuthStatus } from '../infrastructure/http/HttpClient';

const isValid = checkAuthStatus();
// 检查Token是否存在、格式正确且未过期
```

### Token刷新

```typescript
import { refreshToken } from '../infrastructure/api/AuthApi';

// 在Token即将过期时调用
const response = await refreshToken();
```

### 自动清理

Token在以下情况会自动清理：

1. 收到401响应
2. Token格式异常
3. Token已过期
4. 用户主动登出

## 🔌 API集成

### API配置

位置：`/infrastructure/config/api.config.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  VERSION: 'v1',
};
```

### 环境变量

项目已包含`.env`文件，默认配置：

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENV=development
```

环境变量访问通过`/infrastructure/config/env.ts`统一管理，确保在各种环境下都能安全访问。

```typescript
import { ENV } from './infrastructure/config/env';

console.log(ENV.API_BASE_URL);  // 获取API地址
console.log(ENV.IS_DEV);         // 判断是否开发环境
console.log(ENV.IS_PROD);        // 判断是否生产环境
```

### API端点

```typescript
import { API_ENDPOINTS } from '../infrastructure/config/api.config';

// 使用预定义的端点
const response = await httpClient.get(API_ENDPOINTS.USERS.INFO);
const response = await httpClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
```

### 响应格式

标准响应格式：

```typescript
interface ApiResponse<T> {
  code: number;      // 状态码：200成功，其他为错误
  message: string;   // 消息
  data: T;          // 数据
  timestamp?: number; // 时间戳
}
```

示例：

```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "id": "123",
    "nickname": "旅行达人",
    "email": "user@example.com"
  },
  "timestamp": 1700000000000
}
```

错误响应：

```json
{
  "code": 401,
  "message": "未登录或登录已过期",
  "data": null,
  "timestamp": 1700000000000
}
```

## 🎯 最佳实践

### 1. 使用API封装

不要直接使用`httpClient`，而是通过API函数：

```typescript
// ❌ 不推荐
const response = await httpClient.get('/users');

// ✅ 推荐
import { getUserInfo } from '../infrastructure/api/UserApi';
const response = await getUserInfo();
```

### 2. 错误处理

```typescript
const response = await getUserInfo();

if (response.code === 200) {
  // 成功处理
  console.log(response.data);
} else {
  // 错误处理
  console.error(response.message);
  toast.error(response.message);
}
```

### 3. TypeScript类型

```typescript
import { ApiResponse } from '../infrastructure/http/HttpClient';
import { UserInfo } from '../infrastructure/api/UserApi';

const response: ApiResponse<UserInfo> = await getUserInfo();
```

### 4. 加载状态

```typescript
const [loading, setLoading] = useState(false);

const handleUpdate = async () => {
  setLoading(true);
  try {
    const response = await updateUserInfo(data);
    if (response.code === 200) {
      toast.success('更新成功');
    } else {
      toast.error(response.message);
    }
  } finally {
    setLoading(false);
  }
};
```

### 5. Token过期处理

应用已自动处理Token过期：

```typescript
// HTTP客户端会自动：
// 1. 检测401响应
// 2. 清理过期Token
// 3. 触发auth:unauthorized事件
// 4. 路由守卫监听事件并重定向到登录页

// 无需手动处理！
```

## 🚨 安全注意事项

### 1. 不要在前端存储敏感信息

```typescript
// ❌ 不要这样做
localStorage.setItem('password', password);
localStorage.setItem('creditCard', cardNumber);

// ✅ 只存储Token
localStorage.setItem('auth_token', token);
```

### 2. HTTPS

生产环境必须使用HTTPS：

```env
# 生产环境
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 3. Token保护

- Token只在请求头中传输
- 不要在URL中包含Token
- 不要在日志中打印Token

### 4. XSS防护

- 所有用户输入都需要验证和转义
- 使用React的默认XSS保护
- 避免使用`dangerouslySetInnerHTML`

### 5. CSRF防护

对于Cookie存储的Token，服务端需要：
- 设置`SameSite`属性
- 使用CSRF Token

## 📊 调试

### 开发环境日志

HTTP客户端在开发环境会输出调试日志：

```typescript
// 查看浏览器控制台
[HttpClient] 添加认证头到请求: POST /users
[HttpClient] 收到401响应，清理认证信息
[AuthApi] 登录成功，Token已保存
```

### 检查Token

```typescript
// 在浏览器控制台
const token = localStorage.getItem('auth_token');
console.log('Token:', token);

// 解析Token内容
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Payload:', payload);
```

### 网络请求

在浏览器开发者工具的Network标签中：
- 查看请求头是否包含`Authorization`
- 检查响应状态码
- 查看响应数据

## 🔄 更新日志

- **2025-11-12**: 初始版本
  - HTTP客户端实现
  - 认证系统完成
  - 路由守卫集成
  - Token管理机制

---

**文档维护**: Smart Travel AI Team  
**最后更新**: 2025-11-12
