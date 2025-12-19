# 🔧 故障排除指南

本文档列出常见问题及解决方案。

## 📋 目录

- [环境变量问题](#环境变量问题)
- [认证问题](#认证问题)
- [API调用问题](#api调用问题)
- [路由问题](#路由问题)
- [构建问题](#构建问题)

## 🌍 环境变量问题

### 问题: `Cannot read properties of undefined (reading 'VITE_API_BASE_URL')`

**原因**: `import.meta.env`在某些环境下未定义

**解决方案**:

项目已使用统一的环境变量访问工具`/infrastructure/config/env.ts`，该工具会自动处理未定义的情况。

1. 确保`.env`文件存在（项目已包含）
2. 重启开发服务器
3. 如果问题持续，检查Vite配置

**验证方法**:

```typescript
import { ENV } from './infrastructure/config/env';
console.log('API地址:', ENV.API_BASE_URL);
```

### 问题: 环境变量未生效

**解决方案**:

1. 检查`.env`文件是否存在于项目根目录
2. 确保环境变量名以`VITE_`开头
3. 重启开发服务器（Vite需要重启才能读取.env更改）
4. 检查变量名拼写是否正确

## 🔐 认证问题

### 问题: Token无法保存

**检查步骤**:

1. 打开浏览器控制台
2. 执行：
   ```javascript
   localStorage.getItem('auth_token')
   ```
3. 检查是否返回Token

**可能原因**:

- 浏览器隐私模式（localStorage不可用）
- 浏览器禁用了存储
- Token格式错误

**解决方案**:

```typescript
// 手动清理并重新登录
localStorage.removeItem('auth_token');
document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
// 然后重新登录
```

### 问题: 登录后立即跳转回登录页

**原因**: Token验证失败或Token格式错误

**解决方案**:

1. 检查Token格式：
   ```javascript
   const token = localStorage.getItem('auth_token');
   console.log('Token:', token);
   console.log('Token部分数量:', token.split('.').length); // 应该是3
   ```

2. 检查Token是否过期：
   ```javascript
   const token = localStorage.getItem('auth_token');
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('过期时间:', new Date(payload.exp * 1000));
   console.log('当前时间:', new Date());
   ```

3. 清理并重新登录

### 问题: 收到401错误

**原因**: Token过期或无效

**自动处理**:
应用会自动：
1. 清理过期Token
2. 显示未授权提示
3. 重定向到登录页

**手动处理**:
如果自动处理失败，手动清理：
```javascript
localStorage.removeItem('auth_token');
document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
window.location.href = '/';
```

## 🌐 API调用问题

### 问题: API请求返回404

**检查步骤**:

1. 确认API地址正确：
   ```typescript
   import { API_CONFIG } from './infrastructure/config/api.config';
   console.log('API基础URL:', API_CONFIG.BASE_URL);
   ```

2. 检查端点拼写：
   ```typescript
   import { API_ENDPOINTS } from './infrastructure/config/api.config';
   console.log('用户端点:', API_ENDPOINTS.USERS.INFO);
   ```

3. 检查后端服务是否运行

### 问题: 请求超时

**解决方案**:

1. 增加超时时间：
   ```typescript
   const response = await httpClient.get('/slow-api', {
     timeout: 60000 // 60秒
   });
   ```

2. 检查网络连接
3. 检查后端服务状态

### 问题: CORS错误

**原因**: 跨域请求被阻止

**后端解决方案**:

```javascript
// Express示例
app.use(cors({
  origin: 'http://localhost:5173', // Vite默认端口
  credentials: true
}));
```

### 问题: FormData上传失败

**检查步骤**:

1. 确认使用FormData：
   ```typescript
   const formData = new FormData();
   formData.append('file', file);
   ```

2. 不要手动设置Content-Type（HttpClient会自动处理）

3. 检查文件大小限制

## 🛣️ 路由问题

### 问题: 路由守卫无限循环

**原因**: 路由守卫配置错误

**解决方案**:

1. 检查公开页面配置：
   ```typescript
   // RouteGuard.tsx
   const PUBLIC_PAGES = ['login'];
   ```

2. 确保登录页在公开页面列表中

3. 检查Token验证逻辑

### 问题: 页面刷新后状态丢失

**原因**: 状态未持久化

**解决方案**:

Token会自动保存到localStorage，其他状态需要手动处理：

```typescript
// 保存状态
localStorage.setItem('user_preference', JSON.stringify(data));

// 恢复状态
const data = JSON.parse(localStorage.getItem('user_preference') || '{}');
```

## 🏗️ 构建问题

### 问题: TypeScript类型错误

**解决方案**:

1. 确保`vite-env.d.ts`存在
2. 重启TypeScript服务器（VSCode: `Cmd/Ctrl + Shift + P` -> "Restart TS Server"）
3. 删除`node_modules`和`package-lock.json`，重新安装依赖

### 问题: 构建时环境变量未生效

**解决方案**:

1. 确保`.env`文件在项目根目录
2. 变量名必须以`VITE_`开头
3. 重新构建项目

### 问题: 依赖安装失败

**解决方案**:

```bash
# 清理缓存
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 或使用yarn
rm -rf node_modules yarn.lock
yarn install
```

## 🐛 调试技巧

### 1. 启用详细日志

开发环境会自动输出调试日志：

```javascript
// 在浏览器控制台查看
[HttpClient] 添加认证头到请求: POST /users
[AuthApi] 登录成功，Token已保存
[RouteGuard] 检查认证状态
```

### 2. 检查网络请求

1. 打开浏览器开发者工具
2. 切换到Network标签
3. 筛选XHR/Fetch请求
4. 检查请求头、响应状态、响应数据

### 3. 验证Token

```javascript
// 在浏览器控制台
const token = localStorage.getItem('auth_token');

// 检查Token格式
console.log('Token存在:', !!token);
console.log('Token长度:', token?.length);
console.log('Token部分:', token?.split('.').length); // 应该是3

// 解析Token内容
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token内容:', payload);
    console.log('过期时间:', new Date(payload.exp * 1000));
  } catch (e) {
    console.error('Token解析失败:', e);
  }
}
```

### 4. 检查认证状态

```javascript
// 在浏览器控制台
import { checkAuthStatus } from './infrastructure/http/HttpClient';
console.log('认证状态:', checkAuthStatus());
```

## 📞 获取帮助

如果以上方案都无法解决问题：

1. **查看文档**:
   - [SECURITY_GUIDE.md](./SECURITY_GUIDE.md) - 安全功能详细说明
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明
   - [DDD_QUICK_REFERENCE.md](./DDD_QUICK_REFERENCE.md) - API快速参考

2. **检查日志**:
   - 浏览器控制台日志
   - Network标签请求详情
   - 后端服务日志

3. **重现问题**:
   - 记录操作步骤
   - 截图错误信息
   - 导出浏览器控制台日志

4. **隔离问题**:
   - 最小化复现步骤
   - 排除其他因素干扰
   - 尝试不同浏览器

## 🔄 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run type-check

# 清理缓存
rm -rf node_modules .vite dist
npm install
```

## ✅ 健康检查清单

在报告问题前，请确认：

- [ ] `.env`文件存在且配置正确
- [ ] 开发服务器正在运行
- [ ] 后端API服务可访问
- [ ] 浏览器控制台无错误
- [ ] Token格式正确（JWT格式，3个部分）
- [ ] Token未过期
- [ ] 网络连接正常
- [ ] 依赖已正确安装

---

**文档维护**: Smart Travel AI Team  
**最后更新**: 2025-11-12
