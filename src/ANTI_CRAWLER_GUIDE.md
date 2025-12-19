# 前端反爬虫防护指南

## 📋 目录

1. [概述](#概述)
2. [防护架构](#防护架构)
3. [核心功能](#核心功能)
4. [集成方法](#集成方法)
5. [配置说明](#配置说明)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## 概述

本项目实现了多层反爬虫防护机制，包括：

- ✅ **请求频率限制（Rate Limiting）**
- ✅ **设备指纹识别（Device Fingerprinting）**  
- ✅ **请求签名验证（Request Signature）**
- ✅ **人机行为分析（Behavior Detection）**
- ✅ **环境检测（Environment Check）**
- ✅ **挑战验证（Challenge/CAPTCHA）**
- ✅ **请求加密（Request Encryption）**

---

## 防护架构

```
┌─────────────────────────────────────────────────┐
│            前端应用（React）                      │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  HttpClient with  │
         │  Anti-Crawler     │
         └─────────┬─────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼───┐   ┌─────▼─────┐  ┌────▼────┐
│ Rate  │   │  Device   │  │Behavior │
│Limiter│   │Fingerprint│  │Detector │
└───┬───┘   └─────┬─────┘  └────┬────┘
    │              │              │
    └──────────────┼──────────────┘
                   │
         ┌─────────▼─────────┐
         │  Request with     │
         │  Protection       │
         │  Headers          │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │   Backend API     │
         └───────────────────┘
```

---

## 核心功能

### 1. 设备指纹识别

**文件**: `/infrastructure/security/DeviceFingerprint.ts`

生成唯一的设备标识，基于：
- Canvas指纹
- WebGL指纹
- Audio指纹
- 字体检测
- WebRTC IP
- 屏幕分辨率
- 硬件信息

**使用示例**:
```typescript
import { deviceFingerprint } from './infrastructure/security/DeviceFingerprint';

// 获取设备指纹
const fingerprint = deviceFingerprint.getFingerprint();

// 检查是否为真实浏览器
const isReal = deviceFingerprint.isRealBrowser();

// 获取指纹组件
const components = deviceFingerprint.getComponents();
```

### 2. 请求频率限制

**文件**: `/infrastructure/security/AntiCrawlerService.ts`

限制单位时间内的请求次数，防止暴力爬取。

**配置**:
```typescript
// 每分钟最多100个请求
const rateLimiter = new RateLimiter(60000, 100);

// 检查是否超限
if (rateLimiter.isRateLimited(userId)) {
  // 阻止请求
}

// 获取剩余配额
const remaining = rateLimiter.getRemainingRequests(userId);
```

### 3. 人机行为检测

**文件**: `/infrastructure/security/AntiCrawlerService.ts` - `BehaviorDetector`

分析用户行为模式：
- 鼠标移动轨迹
- 点击时间间隔
- 滚动活动
- 操作速度

**评分机制** (0-100分):
- 鼠标移动：25分
- 点击活动：25分
- 滚动活动：25分
- 行为自然性：25分

### 4. 环境检测

检测自动化工具和Headless浏览器：
- Selenium
- Puppeteer
- PhantomJS
- Nightmare.js
- Chrome Headless

**使用示例**:
```typescript
import { antiCrawlerService } from './infrastructure/security/AntiCrawlerService';

const detection = antiCrawlerService.detectSuspiciousEnvironment();

if (detection.isSuspicious) {
  console.warn('检测到可疑环境:', detection.reasons);
  // 触发额外验证
}
```

### 5. 挑战验证系统

**文件**: `/infrastructure/security/ChallengeService.ts`

支持三种验证类型：

#### 滑块验证
```typescript
import { SliderChallenge } from './infrastructure/security/ChallengeService';

const slider = new SliderChallenge();
slider.start();

// 用户拖动时
slider.recordMove(x, y);

// 验证
const result = slider.verify(targetPosition, currentPosition);
if (result.success) {
  const token = result.token;
}
```

#### 点选验证
```typescript
const click = new ClickChallenge();
const targets = click.generateTargets(4); // 生成4个目标

// 用户点击时
click.recordClick(x, y);

// 验证
const result = click.verify('🐱'); // 验证特定目标
```

#### 拼图验证
```typescript
const puzzle = new PuzzleChallenge();
puzzle.initialize(300); // 300px宽度

// 用户拖动
puzzle.updatePosition(newX);

// 验证
const result = puzzle.verify(5); // 5px容差
```

### 6. 请求加密

**文件**: `/infrastructure/http/RequestEncryption.ts`

使用AES-GCM加密敏感请求数据。

**使用示例**:
```typescript
import { RequestEncryption, EncryptedRequestBuilder } from './infrastructure/http/RequestEncryption';

// 加密数据
const encrypted = await RequestEncryption.encrypt(data, 'secret-key');

// 解密数据
const decrypted = await RequestEncryption.decrypt(encrypted, 'secret-key');

// 生成请求签名
const signature = RequestEncryption.generateSignature(
  'POST',
  '/api/users',
  Date.now(),
  nonce,
  requestBody
);

// 构建加密请求
const builder = new EncryptedRequestBuilder('my-secret');
const { headers, body } = await builder.buildEncryptedRequest(
  'POST',
  '/api/sensitive',
  { password: '123456' }
);
```

---

## 集成方法

### 方法1：使用AntiCrawlerInterceptor

```typescript
// 在HttpClient中集成
import { AntiCrawlerInterceptor } from './infrastructure/http/AntiCrawlerInterceptor';

const interceptor = new AntiCrawlerInterceptor({
  enableRateLimit: true,
  enableSignature: true,
  enableBehaviorCheck: true,
  enableEnvironmentCheck: true,
  whitelistPaths: ['/health', '/public'],
});

// 在请求前调用
const { url, options, shouldProceed } = await interceptor.beforeRequest(
  'https://api.example.com/users',
  { method: 'GET' }
);

if (!shouldProceed) {
  console.error('Request blocked');
  return;
}

// 执行请求
const response = await fetch(url, options);

// 响应后处理
await interceptor.afterResponse(response);
```

### 方法2：使用protectedFetch包装器

```typescript
import { protectedFetch } from './infrastructure/http/AntiCrawlerInterceptor';

// 直接使用
const response = await protectedFetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'John' })
});
```

### 方法3：在API层集成

```typescript
// UserApi.ts
import { httpClient } from '../infrastructure/http/HttpClient';
import { antiCrawlerService } from '../infrastructure/security/AntiCrawlerService';

export class UserApi {
  async getProfile() {
    // 检查是否可以继续
    const check = antiCrawlerService.canProceed();
    
    if (!check.allowed) {
      throw new Error(check.reason);
    }
    
    // 发送请求（自动附带防护headers）
    return httpClient.get('/api/profile');
  }
}
```

---

## 配置说明

### 环境配置

**文件**: `/infrastructure/config/anti-crawler.config.ts`

#### 开发环境
```typescript
export const DEV_ANTI_CRAWLER_CONFIG = {
  enabled: false,  // 开发环境关闭
  rateLimit: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 1000,
  },
  // ... 其他配置宽松
};
```

#### 生产环境
```typescript
export const PROD_ANTI_CRAWLER_CONFIG = {
  enabled: true,  // 生产环境开启
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100,  // 每分钟100次
  },
  behaviorCheck: {
    enabled: true,
    minScore: 30,  // 最低30分
  },
  environmentCheck: {
    enabled: true,
    blockHeadless: true,
    blockAutomation: true,
  },
  challenge: {
    enabled: true,
    type: 'slider',
    threshold: 40,  // 分数低于40触发验证
  },
};
```

### 环境变量

在`.env`文件中配置：

```env
# 反爬虫密钥
VITE_ANTI_CRAWLER_SECRET=your-secret-key-here

# 环境
NODE_ENV=production

# 启用日志
VITE_ANTI_CRAWLER_LOG=true
```

---

## 最佳实践

### 1. 分层防护

不要依赖单一防护机制，建议组合使用：

```typescript
// ✅ 好的做法
if (behaviorScore < 30 && requestCount > 50 && isSuspiciousEnvironment) {
  showChallenge();
}

// ❌ 不好的做法
if (requestCount > 100) {
  blockAllRequests();
}
```

### 2. 渐进式防护

根据风险等级采取不同措施：

```typescript
const riskLevel = calculateRisk(behaviorScore, requestCount, fingerprint);

switch(riskLevel) {
  case 'low':
    // 正常放行
    break;
  case 'medium':
    // 增加监控
    logSuspiciousActivity();
    break;
  case 'high':
    // 触发滑块验证
    showSliderChallenge();
    break;
  case 'critical':
    // 完全阻止
    blockRequest();
    break;
}
```

### 3. 白名单管理

为不需要防护的路径设置白名单：

```typescript
const whitelistPaths = [
  '/health',
  '/ping',
  '/api/public',
  '/static',
  '/assets',
];
```

### 4. 用户体验优先

避免误伤正常用户：

```typescript
// 新用户给予宽容期
if (isNewUser() && behaviorScore < 20) {
  // 仅记录，不阻止
  logLowBehaviorScore(userId, behaviorScore);
} else if (!isNewUser() && behaviorScore < 20) {
  // 老用户行为异常，触发验证
  showChallenge();
}
```

### 5. 定期更新指纹

设备指纹应定期刷新：

```typescript
// 每24小时刷新一次
setInterval(() => {
  const newFingerprint = deviceFingerprint.getFingerprint();
  updateFingerprint(newFingerprint);
}, 24 * 60 * 60 * 1000);
```

### 6. 日志和监控

记录可疑活动以便分析：

```typescript
const logSuspiciousActivity = (details) => {
  console.warn('[AntiCrawler]', {
    timestamp: Date.now(),
    userId,
    fingerprint,
    behaviorScore,
    requestCount,
    ...details
  });
  
  // 发送到监控服务
  sendToMonitoring(details);
};
```

---

## 常见问题

### Q1: 如何判断防护是否生效？

A: 查看浏览器控制台和网络请求：

```javascript
// 检查请求头是否包含防护信息
Headers:
  X-Device-Id: xxxxx
  X-Access-Token: xxxxx
  X-Request-Time: xxxxx
  X-Request-Sign: xxxxx
  X-Behavior-Score: 75
```

### Q2: 用户报告无法正常访问怎么办？

A: 检查用户的行为分数和环境：

```typescript
// 临时调试
console.log('Behavior Score:', antiCrawlerService.getBehaviorScore());
console.log('Device Fingerprint:', antiCrawlerService.getDeviceFingerprint());
console.log('Environment Check:', antiCrawlerService.detectSuspiciousEnvironment());
```

可以临时降低阈值或将用户加入白名单。

### Q3: 如何处理合法的爬虫（如搜索引擎）？

A: 检测User-Agent并白名单：

```typescript
const CRAWLER_WHITELIST = [
  'Googlebot',
  'Bingbot',
  'Slackbot',
];

const isWhitelistedCrawler = () => {
  return CRAWLER_WHITELIST.some(bot => 
    navigator.userAgent.includes(bot)
  );
};

if (isWhitelistedCrawler()) {
  // 跳过反爬虫检查
  return;
}
```

### Q4: 防护会影响性能吗？

A: 影响很小。指纹生成是一次性的，行为检测是轻量级的：

- 设备指纹生成：~50ms（首次）
- 行为检测：~1ms（每次请求）
- 签名验证：~2ms（每次请求）

### Q5: 如何测试反爬虫功能？

A: 使用测试环境配置：

```typescript
// 启用测试模式
process.env.NODE_ENV = 'test';

// 降低阈值以便触发
const testConfig = {
  ...PROD_ANTI_CRAWLER_CONFIG,
  behaviorCheck: {
    enabled: true,
    minScore: 90, // 很高的阈值，容易触发
  },
  rateLimit: {
    enabled: true,
    windowMs: 10000,
    maxRequests: 5, // 很低的限制
  },
};
```

### Q6: 后端需要做什么配合？

A: 后端应该：

1. **验证请求签名**
```javascript
// Node.js示例
const verifySignature = (req) => {
  const { timestamp, signature, deviceId } = req.headers;
  const expectedSignature = generateSignature(timestamp, req.path, deviceId);
  return signature === expectedSignature;
};
```

2. **实施速率限制**
```javascript
// 使用redis存储请求计数
const checkRateLimit = async (deviceId) => {
  const key = `rate:${deviceId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60); // 60秒过期
  return count <= 100;
};
```

3. **返回挑战指令**
```javascript
// 要求前端进行验证
if (behaviorScore < 30) {
  res.setHeader('X-Challenge', 'slider');
  res.status(403).json({ requireChallenge: true });
}
```

---

## 进阶配置

### 自定义行为评分算法

```typescript
class CustomBehaviorDetector extends BehaviorDetector {
  getBehaviorScore(): number {
    const baseScore = super.getBehaviorScore();
    
    // 添加自定义因素
    const timeOnPage = this.getTimeOnPage();
    const interactionDepth = this.getInteractionDepth();
    
    let bonus = 0;
    if (timeOnPage > 10000) bonus += 10; // 停留超过10秒
    if (interactionDepth > 5) bonus += 10; // 交互深度

    return Math.min(100, baseScore + bonus);
  }
}
```

### 动态调整阈值

```typescript
// 根据时间段调整
const getDynamicConfig = () => {
  const hour = new Date().getHours();
  
  // 凌晨流量小，提高防护
  if (hour >= 0 && hour < 6) {
    return {
      ...PROD_ANTI_CRAWLER_CONFIG,
      behaviorCheck: { ...PROD_ANTI_CRAWLER_CONFIG.behaviorCheck, minScore: 50 },
    };
  }
  
  return PROD_ANTI_CRAWLER_CONFIG;
};
```

---

## 总结

本反爬虫系统提供了全面的前端防护，但请记住：

1. **前端防护只是第一道防线**，后端验证同样重要
2. **没有绝对的安全**，需要持续更新和监控
3. **用户体验至上**，不要过度防护导致误伤
4. **日志和分析**是优化防护策略的关键

如有问题，请参考各模块的详细注释或联系开发团队。
