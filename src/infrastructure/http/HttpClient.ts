import { API_CONFIG } from '../config/api.config';
import { toast } from 'sonner';
import { AntiCrawlerInterceptor } from './AntiCrawlerInterceptor';
import { ANTI_CRAWLER_CONFIG } from '../config/anti-crawler.config';

// 请求配置类型
export interface RequestConfig extends RequestInit {
  params?: Record<string, any>; // 查询参数
  timeout?: number; // 超时时间（毫秒）
}

// 请求选项类型
export interface RequestOptions {
  raw?: boolean; // 是否返回原始响应，不自动解析json
  showToast?: boolean; // 是否显示toast提示
}

// 拦截器类型
export interface Interceptor {
  request?: (config: RequestConfig) => RequestConfig;
  response?: (response: Response, options?: RequestOptions) => Promise<any>;
  error?: (error: any) => Promise<any>;
}

// 默认拦截器
const defaultInterceptor: Interceptor = {
  // 请求拦截器
  request: (config) => {
    // 检查是否是FormData，如果是则不设置Content-Type
    const isFormData = config.body instanceof FormData;
    
    // 默认添加Content-Type和Accept头
    config.headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "*/*",
      ...(config.headers || {}),
    };

    return config;
  },

  // 响应拦截器
  response: async (response, options) => {
 
    if (response.status === 401) {
      // 清除本地存储的 token
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        // 注意：不要在这里直接重定向，让业务代码处理
      }
      const error: any = new Error("未登录或登录已过期");
      error.status = 401;
      throw error;
    }

    // 如果是原始响应模式，直接返回response不消费流
    if (options?.raw) {
      return response;
    }

    // 非成功响应
    if (!response.ok) {
      const errorData = await response.json();
      // 不显示toast，只返回错误数据
      return errorData;
    }

    // 正常响应，解析JSON并返回
    return await response.json();
  },

  // 错误拦截器
  error: async (error) => {
 
    // 处理超时错误
    if (error.name === "AbortError") {
      return {
        code: 408,
        message: "请求超时",
        data: null,
        timestamp: Date.now(),
      };
    }

    // 处理网络错误
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        code: 503,
        message: "网络连接失败",
        data: null,
        timestamp: Date.now(),
      };
    }

    // 处理 401
    if (error.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      return {
        code: 401,
        message: "未登录或登录已过期",
        data: null,
        timestamp: Date.now(),
      };
    }

    // 返回标准化的错误响应
    return {
      code: error.status || 500,
      message: error.message || "未知错误",
      data: error.data || null,
      timestamp: Date.now(),
    };
  },
};

// HTTP客户端类
class HttpClient {
  private baseUrl: string;
  private interceptors: Interceptor[];
  private defaultTimeout: number;
  private antiCrawlerInterceptor: AntiCrawlerInterceptor | null = null;

  constructor(
    baseUrl: string = API_CONFIG.BASE_URL,
    interceptors: Interceptor[] = [defaultInterceptor],
    defaultTimeout: number = 30000
  ) {
    this.baseUrl = baseUrl;
    this.interceptors = interceptors;
    this.defaultTimeout = defaultTimeout;
    
    // 初始化反爬虫拦截器
    if (ANTI_CRAWLER_CONFIG.enabled) {
      this.antiCrawlerInterceptor = new AntiCrawlerInterceptor({
        enableRateLimit: ANTI_CRAWLER_CONFIG.rateLimit.enabled,
        enableSignature: ANTI_CRAWLER_CONFIG.signature.enabled,
        enableBehaviorCheck: ANTI_CRAWLER_CONFIG.behaviorCheck.enabled,
        enableEnvironmentCheck: ANTI_CRAWLER_CONFIG.environmentCheck.enabled,
        whitelistPaths: ANTI_CRAWLER_CONFIG.whitelist.paths,
      });
    }
  }

  // 添加拦截器
  addInterceptor(interceptor: Interceptor): void {
    this.interceptors.push(interceptor);
  }

  // 构建URL
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = this.baseUrl + endpoint;

    if (params && Object.keys(params).length > 0) {
      const query = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .filter(Boolean)
        .join("&");

      if (query) {
        url += `?${query}`;
      }
    }

    return url;
  }

  // 执行请求
  private async request<T>(endpoint: string, config: RequestConfig = {}, options?: RequestOptions): Promise<T> {
    // 应用请求拦截器 - 使用reduce串联所有拦截器确保只应用一次
    const processedConfig = this.interceptors.reduce(
      (cfg, interceptor) => (interceptor.request ? interceptor.request(cfg) : cfg),
      { ...config }
    );

    // 构建完整URL
    const url = this.buildUrl(endpoint, processedConfig.params);
 

    try {
      // 处理超时
      let timeoutId: NodeJS.Timeout | null = null;
      let abortController: AbortController | null = null;
      
      if (processedConfig.timeout || this.defaultTimeout) {
        abortController = new AbortController();
        processedConfig.signal = abortController.signal;
        
        timeoutId = setTimeout(() => {
          if (abortController) {
            abortController.abort();
          }
        }, processedConfig.timeout || this.defaultTimeout);
      }

      const response = await fetch(url, processedConfig);
      
      // 清除超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 处理 401 状态码
      if (response.status === 401) {
        // 清除认证信息
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          // 如果当前不在登录页面，触发自定义事件通知应用
          if (!window.location.pathname.includes('/login')) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
      }

      // 处理响应
      let result: any;
      
      // 如果是原始响应模式，直接返回
      if (options?.raw) {
        return response as unknown as T;
      }

      // 解析响应
      try {
        result = await response.json();
      } catch (e) {
        result = {
          code: response.status,
          message: response.statusText || `请求失败 (${response.status})`,
          data: null
        };
      }

      // 显示toast提示
      if (options?.showToast) {
        toast(result.message, {
          style: result.code === 200 ? {} : { background: '#ef4444', color: '#fff' }
        });
      }
      
      return result;
      
    } catch (error: any) {
      // 处理异常
      const errorResult = {
        code: error.status || 500,
        message: error.message || "未知错误",
        data: null,
        timestamp: Date.now(),
      };
      
      // 显示toast提示
      if (options?.showToast) {
        toast.error(errorResult.message);
      }
      
      return errorResult as unknown as T;
    }
  }

  // HTTP方法
  async get<T>(endpoint: string, config: RequestConfig = {}, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" }, options);
  }

  async post<T>(endpoint: string, data?: any, config: RequestConfig = {}, options?: RequestOptions): Promise<T> {
    // 处理 FormData 类型的数据
    const isFormData = data instanceof FormData;
    
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      headers: isFormData ? {
        ...config.headers,
      } : {
        "Content-Type": "application/json",
        ...config.headers,
      },
    }, options);
  }

  async put<T>(endpoint: string, data?: any, config: RequestConfig = {}, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }, options);
  }

  async delete<T>(endpoint: string, config: RequestConfig = {}, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" }, options);
  }
}

// 导出单例实例
export const httpClient = new HttpClient();

// 增强的认证拦截器
export const addAuthInterceptor = () => {
  httpClient.addInterceptor({
    request: (config) => {
      // 在每个请求中动态读取token
      if (typeof window !== "undefined") {
        let token = localStorage.getItem("auth_token");
        
        // 如果localStorage中没有token，尝试从cookie中读取
        if (!token) {
          const cookies = document.cookie.split(';');
          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' && value) {
              token = value;
              // 同步到localStorage以便后续使用
              localStorage.setItem("auth_token", token);
              break;
            }
          }
        }
        
        if (token) {
          // 基本的token格式检查（JWT通常包含两个点）
          if (token.split('.').length === 3) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`
            };
          } else {
            // token格式异常，清理并记录警告
            console.warn('[HttpClient] Token格式异常，已清理');
            localStorage.removeItem("auth_token");
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        }
      }
      
      return config;
    },
    
    response: async (response, options) => {
      // 处理401认证失败的响应
      if (response.status === 401) {
        console.warn('[HttpClient] 收到401响应，清理认证信息');
        
        if (typeof window !== "undefined") {
          // 清理认证信息
          localStorage.removeItem("auth_token");
          document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          // 触发自定义事件，由App.tsx处理重定向
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      
      return undefined; // 让默认响应拦截器处理
    },
    
    error: async (error) => {
      // 处理认证相关错误
      if (error.status === 401) {
        console.warn('[HttpClient] 请求认证失败:', error.message);
      }
      
      return undefined; // 让默认错误拦截器处理
    }
  });
};

// 认证状态检查工具
export const checkAuthStatus = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const token = localStorage.getItem("auth_token");
  if (!token) return false;
  
  // 基本格式检查
  if (token.split('.').length !== 3) {
    // 格式异常，清理token
    localStorage.removeItem("auth_token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    return false;
  }
  
  try {
    // 简单的JWT payload解析（不验证签名，只检查过期时间）
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      console.warn('[HttpClient] Token已过期');
      localStorage.removeItem("auth_token");
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('[HttpClient] Token解析失败:', error);
    localStorage.removeItem("auth_token");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    return false;
  }
};

// API响应类型接口
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

// 初始化：添加认证拦截器
addAuthInterceptor();
