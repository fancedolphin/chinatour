/**
 * 环境变量访问工具
 * 提供安全的环境变量访问方式
 */

// 类型定义
interface ImportMetaEnv {
  VITE_API_BASE_URL?: string;
  VITE_ENV?: string;
  [key: string]: string | undefined;
}

// 获取环境变量（带默认值）
function getEnv(key: string, defaultValue: string = ''): string {
  try {
    // 尝试从import.meta.env读取
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = (import.meta.env as ImportMetaEnv)[key];
      return value || defaultValue;
    }
    
    // 如果import.meta.env不可用，返回默认值
    return defaultValue;
  } catch (error) {
    console.warn(`[Env] 无法读取环境变量 ${key}, 使用默认值:`, defaultValue);
    return defaultValue;
  }
}

// 导出环境变量
export const ENV = {
  // API基础URL
  API_BASE_URL: getEnv('VITE_API_BASE_URL', 'http://localhost:3000/api'),
  
  // 环境类型
  ENV: getEnv('VITE_ENV', 'development'),
  
  // 是否为开发环境
  IS_DEV: getEnv('VITE_ENV', 'development') === 'development',
  
  // 是否为生产环境
  IS_PROD: getEnv('VITE_ENV', 'development') === 'production',
} as const;

// 打印环境配置（仅开发环境）
if (ENV.IS_DEV) {
  console.log('[Env] 环境配置:', {
    API_BASE_URL: ENV.API_BASE_URL,
    ENV: ENV.ENV,
  });
}
