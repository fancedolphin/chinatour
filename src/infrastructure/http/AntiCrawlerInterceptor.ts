/**
 * Infrastructure Layer - Anti-Crawler HTTP Interceptor
 * HTTP请求拦截器 - 自动添加反爬虫防护
 */

import { antiCrawlerService } from '../security/AntiCrawlerService';

/**
 * 请求拦截器配置
 */
export interface InterceptorConfig {
  enableRateLimit: boolean;
  enableSignature: boolean;
  enableBehaviorCheck: boolean;
  enableEnvironmentCheck: boolean;
  whitelistPaths?: string[]; // 白名单路径，不进行检查
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: InterceptorConfig = {
  enableRateLimit: true,
  enableSignature: true,
  enableBehaviorCheck: true,
  enableEnvironmentCheck: true,
  whitelistPaths: ['/health', '/ping'],
};

/**
 * 反爬虫拦截器
 */
export class AntiCrawlerInterceptor {
  private config: InterceptorConfig;

  constructor(config: Partial<InterceptorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkEnvironmentOnInit();
  }

  /**
   * 初始化时检查环境
   */
  private checkEnvironmentOnInit(): void {
    if (!this.config.enableEnvironmentCheck) return;

    const detection = antiCrawlerService.detectSuspiciousEnvironment();
    if (detection.isSuspicious) {
      console.warn(
        '[AntiCrawler] Suspicious environment detected:',
        detection.reasons
      );

      // 可选：在检测到可疑环境时采取行动
      // 例如：限制功能、要求额外验证等
    }
  }

  /**
   * 请求前拦截
   */
  async beforeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<{ url: string; options: RequestInit; shouldProceed: boolean }> {
    const path = new URL(url, window.location.origin).pathname;

    // 检查白名单
    if (this.isWhitelisted(path)) {
      return { url, options, shouldProceed: true };
    }

    // 执行反爬虫检查
    const checkResult = antiCrawlerService.canProceed();

    if (!checkResult.allowed) {
      console.error('[AntiCrawler] Request blocked:', checkResult.reason);
      return {
        url,
        options,
        shouldProceed: false,
      };
    }

    // 添加防护Headers
    const headers = new Headers(options.headers);
    if (checkResult.headers) {
      Object.entries(checkResult.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // 添加User-Agent验证
    headers.set('X-Client-Version', this.getClientVersion());
    headers.set('X-Client-Platform', navigator.platform);

    const modifiedOptions: RequestInit = {
      ...options,
      headers,
    };

    return {
      url,
      options: modifiedOptions,
      shouldProceed: true,
    };
  }

  /**
   * 响应后拦截
   */
  async afterResponse(response: Response): Promise<Response> {
    // 检查服务器返回的反爬虫指令
    const serverChallenge = response.headers.get('X-Challenge');
    if (serverChallenge) {
      console.warn('[AntiCrawler] Server challenge received:', serverChallenge);
      // 处理服务器挑战（例如：验证码、滑块等）
    }

    // 检查速率限制警告
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
      console.warn(
        '[AntiCrawler] Approaching rate limit. Remaining:',
        rateLimitRemaining
      );
    }

    return response;
  }

  /**
   * 错误拦截
   */
  async onError(error: Error, url: string): Promise<void> {
    // 记录可疑的错误模式
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      console.error('[AntiCrawler] Rate limit hit for:', url);
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.error('[AntiCrawler] Access forbidden for:', url);
      // 可能需要刷新Token或重新验证
    }
  }

  /**
   * 检查路径是否在白名单中
   */
  private isWhitelisted(path: string): boolean {
    if (!this.config.whitelistPaths) return false;
    return this.config.whitelistPaths.some(whitePath => path.startsWith(whitePath));
  }

  /**
   * 获取客户端版本
   */
  private getClientVersion(): string {
    // 从package.json或环境变量读取
    return '1.0.0';
  }
}

/**
 * 创建带反爬虫防护的Fetch包装器
 */
export function createProtectedFetch(config?: Partial<InterceptorConfig>) {
  const interceptor = new AntiCrawlerInterceptor(config);

  return async function protectedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();

    // 请求前拦截
    const { url: modifiedUrl, options: modifiedOptions, shouldProceed } =
      await interceptor.beforeRequest(url, init);

    if (!shouldProceed) {
      throw new Error('Request blocked by anti-crawler protection');
    }

    try {
      // 执行请求
      const response = await fetch(modifiedUrl, modifiedOptions);

      // 响应后拦截
      return await interceptor.afterResponse(response);
    } catch (error) {
      // 错误拦截
      await interceptor.onError(error as Error, url);
      throw error;
    }
  };
}

/**
 * 导出默认实例
 */
export const protectedFetch = createProtectedFetch();
