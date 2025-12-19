import { ENV } from './env';

// API配置
export const API_CONFIG = {
  // 基础URL - 根据环境变量配置
  BASE_URL: ENV.API_BASE_URL,
  
  // 超时时间（毫秒）
  TIMEOUT: 30000,
  
  // 重试次数
  MAX_RETRIES: 3,
  
  // API版本
  VERSION: 'v1',
} as const;

// API端点
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    SSO_CALLBACK: '/auth/sso/callback',
  },
  
  // 用户相关
  USERS: {
    INFO: '/users',
    UPDATE: '/users',
    PASSWORD: '/users/password',
    AVATAR: '/users/avatar',
  },
  
  // 行程相关
  TRIPS: {
    LIST: '/trips',
    CREATE: '/trips',
    DETAIL: (id: string) => `/trips/${id}`,
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
    SHARE: (id: string) => `/trips/${id}/share`,
  },
  
  // 发现相关
  FEED: {
    LIST: '/feed',
    LIKE: (id: string) => `/feed/${id}/like`,
    SAVE: (id: string) => `/feed/${id}/save`,
  },
  
  // 旅行提示
  TIPS: {
    LIST: '/tips',
    SEARCH: '/tips/search',
  },
  
  // 应急助手
  EMERGENCY: {
    INFO: '/emergency',
  },
} as const;
