/**
 * Infrastructure Layer - Anti-Crawler Configuration
 * 反爬虫配置
 */

/**
 * 反爬虫配置接口
 */
export interface AntiCrawlerConfig {
  // 功能开关
  enabled: boolean;
  
  // 速率限制配置
  rateLimit: {
    enabled: boolean;
    windowMs: number;      // 时间窗口（毫秒）
    maxRequests: number;   // 最大请求数
  };
  
  // 签名验证配置
  signature: {
    enabled: boolean;
    secretKey: string;     // 签名密钥
  };
  
  // 行为检测配置
  behaviorCheck: {
    enabled: boolean;
    minScore: number;      // 最低行为分数（0-100）
  };
  
  // 环境检测配置
  environmentCheck: {
    enabled: boolean;
    blockHeadless: boolean; // 是否阻止Headless浏览器
    blockAutomation: boolean; // 是否阻止自动化工具
  };
  
  // 白名单配置
  whitelist: {
    paths: string[];       // 路径白名单
    ips?: string[];        // IP白名单（需要后端支持）
  };
  
  // 挑战机制
  challenge: {
    enabled: boolean;
    type: 'captcha' | 'slider' | 'click'; // 验证类型
    threshold: number;     // 触发挑战的分数阈值
  };
  
  // 日志配置
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * 默认配置 - 开发环境
 */
export const DEV_ANTI_CRAWLER_CONFIG: AntiCrawlerConfig = {
  enabled: false, // 开发环境默认关闭
  
  rateLimit: {
    enabled: false,
    windowMs: 60000,  // 1分钟
    maxRequests: 1000, // 开发环境宽松限制
  },
  
  signature: {
    enabled: false,
    secretKey: 'dev-secret-key-change-in-production',
  },
  
  behaviorCheck: {
    enabled: false,
    minScore: 10, // 开发环境低阈值
  },
  
  environmentCheck: {
    enabled: false,
    blockHeadless: false,
    blockAutomation: false,
  },
  
  whitelist: {
    paths: ['/health', '/ping', '/api/public'],
  },
  
  challenge: {
    enabled: false,
    type: 'slider',
    threshold: 30,
  },
  
  logging: {
    enabled: true,
    level: 'debug',
  },
};

/**
 * 生产环境配置
 */
export const PROD_ANTI_CRAWLER_CONFIG: AntiCrawlerConfig = {
  enabled: true, // 生产环境开启
  
  rateLimit: {
    enabled: true,
    windowMs: 60000,  // 1分钟
    maxRequests: 100,  // 每分钟100次
  },
  
  signature: {
    enabled: true,
    secretKey: process.env.VITE_ANTI_CRAWLER_SECRET || 'change-me-in-production',
  },
  
  behaviorCheck: {
    enabled: true,
    minScore: 30, // 需要达到30分才允许
  },
  
  environmentCheck: {
    enabled: true,
    blockHeadless: true,  // 阻止Headless浏览器
    blockAutomation: true, // 阻止自动化工具
  },
  
  whitelist: {
    paths: ['/health', '/ping'],
  },
  
  challenge: {
    enabled: true,
    type: 'slider',
    threshold: 40, // 分数低于40需要验证
  },
  
  logging: {
    enabled: true,
    level: 'warn',
  },
};

/**
 * 测试环境配置
 */
export const TEST_ANTI_CRAWLER_CONFIG: AntiCrawlerConfig = {
  enabled: true,
  
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 200,
  },
  
  signature: {
    enabled: true,
    secretKey: 'test-secret-key',
  },
  
  behaviorCheck: {
    enabled: true,
    minScore: 20,
  },
  
  environmentCheck: {
    enabled: true,
    blockHeadless: false, // 测试环境允许E2E测试
    blockAutomation: false,
  },
  
  whitelist: {
    paths: ['/health', '/ping', '/api/test'],
  },
  
  challenge: {
    enabled: false, // 测试环境不启用挑战
    type: 'captcha',
    threshold: 30,
  },
  
  logging: {
    enabled: true,
    level: 'info',
  },
};

/**
 * 获取当前环境配置
 */
export function getAntiCrawlerConfig(): AntiCrawlerConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PROD_ANTI_CRAWLER_CONFIG;
    case 'test':
      return TEST_ANTI_CRAWLER_CONFIG;
    case 'development':
    default:
      return DEV_ANTI_CRAWLER_CONFIG;
  }
}

/**
 * 导出当前配置
 */
export const ANTI_CRAWLER_CONFIG = getAntiCrawlerConfig();
