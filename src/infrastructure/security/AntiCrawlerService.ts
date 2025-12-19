/**
 * Infrastructure Layer - Anti-Crawler Service
 * 反爬虫服务 - 提供多层防护机制
 */

/**
 * 请求指纹生成器
 * 基于多个因素生成唯一请求签名
 */
export class RequestFingerprintGenerator {
  /**
   * 生成设备指纹
   */
  static generateDeviceFingerprint(): string {
    const factors = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      navigator.hardwareConcurrency || 'unknown',
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.maxTouchPoints || 0,
      // Canvas指纹
      this.getCanvasFingerprint(),
      // WebGL指纹
      this.getWebGLFingerprint(),
    ].join('|');

    return this.hashString(factors);
  }

  /**
   * 生成Canvas指纹
   */
  private static getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';

      const text = 'SmartTravel,Anti-Crawler,2024';
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText(text, 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText(text, 4, 17);

      return canvas.toDataURL();
    } catch (e) {
      return 'canvas-error';
    }
  }

  /**
   * 生成WebGL指纹
   */
  private static getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';

      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'no-debug-info';

      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      return `${vendor}~${renderer}`;
    } catch (e) {
      return 'webgl-error';
    }
  }

  /**
   * 简单哈希函数
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成请求签名
   */
  static generateRequestSignature(
    timestamp: number,
    path: string,
    method: string,
    deviceFingerprint: string,
    secretKey: string
  ): string {
    const data = [timestamp, path.toLowerCase(), method.toUpperCase(), deviceFingerprint].join('|');
    return this.hmacSHA256(data, secretKey);
  }

  /**
   * 简化版HMAC-SHA256 (生产环境建议使用crypto-js)
   */
  private static hmacSHA256(message: string, secret: string): string {
    // 注意：这是简化版本，生产环境应使用crypto-js或Web Crypto API
    const combined = secret + message;
    return this.hashString(combined);
  }
}

/**
 * 请求频率限制器
 * 防止短时间内大量请求
 */
export class RateLimiter {
  private requestLog: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * 检查是否超过限制
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requestLog.get(identifier) || [];

    // 清理过期记录
    const validRequests = requests.filter(time => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return true;
    }

    // 记录本次请求
    validRequests.push(now);
    this.requestLog.set(identifier, validRequests);

    return false;
  }

  /**
   * 获取剩余请求次数
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requestLog.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  /**
   * 重置限制
   */
  reset(identifier: string): void {
    this.requestLog.delete(identifier);
  }
}

/**
 * 人机行为检测器
 * 检测用户行为是否符合人类特征
 */
export class BehaviorDetector {
  private mouseMovements: Array<{ x: number; y: number; time: number }> = [];
  private clickTimestamps: number[] = [];
  private scrollEvents: number[] = [];
  private readonly maxRecords = 100;

  constructor() {
    this.initListeners();
  }

  /**
   * 初始化事件监听
   */
  private initListeners(): void {
    // 鼠标移动
    document.addEventListener('mousemove', (e) => {
      this.mouseMovements.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      });

      if (this.mouseMovements.length > this.maxRecords) {
        this.mouseMovements.shift();
      }
    });

    // 点击事件
    document.addEventListener('click', () => {
      this.clickTimestamps.push(Date.now());
      if (this.clickTimestamps.length > this.maxRecords) {
        this.clickTimestamps.shift();
      }
    });

    // 滚动事件
    document.addEventListener('scroll', () => {
      this.scrollEvents.push(Date.now());
      if (this.scrollEvents.length > this.maxRecords) {
        this.scrollEvents.shift();
      }
    });
  }

  /**
   * 检测是否为人类行为
   */
  isHumanBehavior(): boolean {
    const checks = [
      this.hasMouseMovement(),
      this.hasNaturalClickPattern(),
      this.hasScrollActivity(),
      this.hasReasonableSpeed(),
    ];

    // 至少通过3个检测
    return checks.filter(Boolean).length >= 3;
  }

  /**
   * 检测是否有鼠标移动
   */
  private hasMouseMovement(): boolean {
    return this.mouseMovements.length > 5;
  }

  /**
   * 检测点击模式是否自然
   */
  private hasNaturalClickPattern(): boolean {
    if (this.clickTimestamps.length < 2) return true;

    // 检查点击间隔是否过于规律（机器人特征）
    const intervals: number[] = [];
    for (let i = 1; i < this.clickTimestamps.length; i++) {
      intervals.push(this.clickTimestamps[i] - this.clickTimestamps[i - 1]);
    }

    // 计算标准差，标准差过小说明过于规律
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // 标准差小于100ms认为过于规律
    return stdDev > 100;
  }

  /**
   * 检测是否有滚动活动
   */
  private hasScrollActivity(): boolean {
    return this.scrollEvents.length > 0;
  }

  /**
   * 检测速度是否合理
   */
  private hasReasonableSpeed(): boolean {
    if (this.mouseMovements.length < 2) return true;

    // 检查鼠标移动速度是否过快（机器人特征）
    let maxSpeed = 0;
    for (let i = 1; i < this.mouseMovements.length; i++) {
      const prev = this.mouseMovements[i - 1];
      const curr = this.mouseMovements[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const time = curr.time - prev.time;
      const speed = time > 0 ? distance / time : 0;
      maxSpeed = Math.max(maxSpeed, speed);
    }

    // 速度超过5px/ms认为异常
    return maxSpeed < 5;
  }

  /**
   * 获取行为评分 (0-100)
   */
  getBehaviorScore(): number {
    let score = 0;

    // 鼠标移动 (25分)
    score += Math.min(25, this.mouseMovements.length / 4);

    // 点击活动 (25分)
    score += Math.min(25, this.clickTimestamps.length * 5);

    // 滚动活动 (25分)
    score += Math.min(25, this.scrollEvents.length * 5);

    // 自然性 (25分)
    if (this.hasNaturalClickPattern()) score += 25;

    return Math.round(score);
  }
}

/**
 * Token管理器
 * 管理防护Token的生成和验证
 */
export class TokenManager {
  private readonly SECRET_KEY = 'SmartTravel2024SecretKey'; // 生产环境应从环境变量读取
  private tokenCache: Map<string, { token: string; expires: number }> = new Map();

  /**
   * 生成访问Token
   */
  generateAccessToken(userId?: string): string {
    const timestamp = Date.now();
    const deviceFingerprint = RequestFingerprintGenerator.generateDeviceFingerprint();
    const randomStr = Math.random().toString(36).substring(2);
    
    const payload = {
      t: timestamp,
      d: deviceFingerprint,
      u: userId || 'anonymous',
      r: randomStr,
    };

    const payloadStr = btoa(JSON.stringify(payload));
    const signature = RequestFingerprintGenerator.generateRequestSignature(
      timestamp,
      '/',
      'GET',
      deviceFingerprint,
      this.SECRET_KEY
    );

    return `${payloadStr}.${signature}`;
  }

  /**
   * 验证Token
   */
  validateToken(token: string): boolean {
    try {
      const [payloadStr, signature] = token.split('.');
      const payload = JSON.parse(atob(payloadStr));

      // 检查时效性 (24小时)
      const age = Date.now() - payload.t;
      if (age > 24 * 60 * 60 * 1000) {
        return false;
      }

      // 验证签名
      const expectedSignature = RequestFingerprintGenerator.generateRequestSignature(
        payload.t,
        '/',
        'GET',
        payload.d,
        this.SECRET_KEY
      );

      return signature === expectedSignature;
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取或创建Token
   */
  getOrCreateToken(userId?: string): string {
    const key = userId || 'anonymous';
    const cached = this.tokenCache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.token;
    }

    const token = this.generateAccessToken(userId);
    this.tokenCache.set(key, {
      token,
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24小时
    });

    return token;
  }
}

/**
 * 反爬虫服务主类
 */
export class AntiCrawlerService {
  private rateLimiter: RateLimiter;
  private behaviorDetector: BehaviorDetector;
  private tokenManager: TokenManager;
  private deviceFingerprint: string;

  constructor() {
    this.rateLimiter = new RateLimiter(60000, 100); // 每分钟100个请求
    this.behaviorDetector = new BehaviorDetector();
    this.tokenManager = new TokenManager();
    this.deviceFingerprint = RequestFingerprintGenerator.generateDeviceFingerprint();

    // 定期清理过期数据
    this.startCleanupJob();
  }

  /**
   * 检查请求是否允许
   */
  canProceed(identifier?: string): {
    allowed: boolean;
    reason?: string;
    headers?: Record<string, string>;
  } {
    const id = identifier || this.deviceFingerprint;

    // 1. 检查频率限制
    if (this.rateLimiter.isRateLimited(id)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded. Please slow down.',
      };
    }

    // 2. 检查人机行为
    const behaviorScore = this.behaviorDetector.getBehaviorScore();
    if (behaviorScore < 20) {
      console.warn('Low behavior score:', behaviorScore);
      // 不完全阻止，但记录可疑行为
    }

    // 3. 生成防护Headers
    const token = this.tokenManager.getOrCreateToken(identifier);
    const timestamp = Date.now();
    const signature = RequestFingerprintGenerator.generateRequestSignature(
      timestamp,
      window.location.pathname,
      'GET',
      this.deviceFingerprint,
      'request-secret'
    );

    return {
      allowed: true,
      headers: {
        'X-Device-Id': this.deviceFingerprint,
        'X-Access-Token': token,
        'X-Request-Time': timestamp.toString(),
        'X-Request-Sign': signature,
        'X-Behavior-Score': behaviorScore.toString(),
      },
    };
  }

  /**
   * 获取设备指纹
   */
  getDeviceFingerprint(): string {
    return this.deviceFingerprint;
  }

  /**
   * 获取行为评分
   */
  getBehaviorScore(): number {
    return this.behaviorDetector.getBehaviorScore();
  }

  /**
   * 启动清理任务
   */
  private startCleanupJob(): void {
    // 每小时清理一次
    setInterval(() => {
      console.log('[AntiCrawler] Running cleanup job...');
    }, 60 * 60 * 1000);
  }

  /**
   * 检测环境是否可疑
   */
  detectSuspiciousEnvironment(): {
    isSuspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // 检测Headless浏览器
    if (navigator.webdriver) {
      reasons.push('WebDriver detected');
    }

    // 检测调试工具
    if ((window as any).__nightmare) {
      reasons.push('Nightmare.js detected');
    }

    if ((window as any)._phantom || (window as any).callPhantom) {
      reasons.push('PhantomJS detected');
    }

    // 检测自动化框架
    if ((window as any).domAutomation || (window as any).domAutomationController) {
      reasons.push('Automation framework detected');
    }

    // 检测Selenium
    if (document.documentElement.getAttribute('webdriver')) {
      reasons.push('Selenium detected');
    }

    // 检测Chrome Headless
    if (navigator.userAgent.includes('HeadlessChrome')) {
      reasons.push('Headless Chrome detected');
    }

    // 检测语言不匹配
    if (navigator.languages && navigator.languages.length === 0) {
      reasons.push('No languages configured');
    }

    // 检测插件异常
    if (navigator.plugins.length === 0) {
      reasons.push('No browser plugins');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }
}

/**
 * 导出单例
 */
export const antiCrawlerService = new AntiCrawlerService();
