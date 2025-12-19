/**
 * Infrastructure Layer - Anti-Crawler Integration
 * 反爬虫集成模块 - 统一集成所有防护功能
 */

import { antiCrawlerService, BehaviorDetector, RateLimiter } from './AntiCrawlerService';
import { deviceFingerprint } from './DeviceFingerprint';
import { challengeService, ChallengeConfig } from './ChallengeService';
import { RequestEncryption } from '../http/RequestEncryption';
import { ANTI_CRAWLER_CONFIG } from '../config/anti-crawler.config';

/**
 * 防护请求结果
 */
export interface ProtectionResult {
  allowed: boolean;
  needsChallenge: boolean;
  challengeType?: 'slider' | 'click' | 'puzzle';
  reason?: string;
  headers?: Record<string, string>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 反爬虫集成类
 * 统一管理所有反爬虫功能
 */
export class AntiCrawlerIntegration {
  private static instance: AntiCrawlerIntegration;
  private isInitialized: boolean = false;
  private requestCount: number = 0;
  private verificationPassed: boolean = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AntiCrawlerIntegration {
    if (!AntiCrawlerIntegration.instance) {
      AntiCrawlerIntegration.instance = new AntiCrawlerIntegration();
    }
    return AntiCrawlerIntegration.instance;
  }

  /**
   * 初始化反爬虫系统
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. 初始化设备指纹
      await this.initializeFingerprint();

      // 2. 检测环境
      this.detectEnvironment();

      // 3. 启动行为监控
      this.startBehaviorMonitoring();

      // 4. 设置定时清理
      this.startCleanupJobs();

      this.isInitialized = true;
      this.log('info', 'Anti-crawler system initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize anti-crawler system:', error);
    }
  }

  /**
   * 初始化设备指纹
   */
  private async initializeFingerprint(): Promise<void> {
    const fingerprint = deviceFingerprint.getFingerprint();
    this.log('debug', 'Device fingerprint:', fingerprint);

    // 检查是否为真实浏览器
    const isReal = deviceFingerprint.isRealBrowser();
    if (!isReal && ANTI_CRAWLER_CONFIG.environmentCheck.enabled) {
      this.log('warn', 'Suspicious browser environment detected');
    }
  }

  /**
   * 检测环境
   */
  private detectEnvironment(): void {
    if (!ANTI_CRAWLER_CONFIG.environmentCheck.enabled) return;

    const detection = antiCrawlerService.detectSuspiciousEnvironment();
    
    if (detection.isSuspicious) {
      this.log('warn', 'Suspicious environment detected:', detection.reasons);
      
      if (ANTI_CRAWLER_CONFIG.environmentCheck.blockAutomation) {
        this.verificationPassed = false;
      }
    }
  }

  /**
   * 启动行为监控
   */
  private startBehaviorMonitoring(): void {
    if (!ANTI_CRAWLER_CONFIG.behaviorCheck.enabled) return;

    // 行为检测器会自动监听用户操作
    this.log('debug', 'Behavior monitoring started');

    // 定期记录行为分数
    setInterval(() => {
      const score = antiCrawlerService.getBehaviorScore();
      this.log('debug', 'Current behavior score:', score);
    }, 30000); // 每30秒
  }

  /**
   * 启动清理任务
   */
  private startCleanupJobs(): void {
    // 每小时清理一次请求计数
    setInterval(() => {
      this.requestCount = 0;
      this.log('debug', 'Request count reset');
    }, 60 * 60 * 1000);
  }

  /**
   * 检查请求是否允许
   */
  async checkRequest(path: string): Promise<ProtectionResult> {
    // 检查白名单
    if (this.isWhitelisted(path)) {
      return {
        allowed: true,
        needsChallenge: false,
        riskLevel: 'low',
      };
    }

    // 增加请求计数
    this.requestCount++;

    // 1. 检查频率限制
    if (ANTI_CRAWLER_CONFIG.rateLimit.enabled) {
      const fingerprint = deviceFingerprint.getFingerprint();
      const rateLimitCheck = antiCrawlerService.canProceed(fingerprint);
      
      if (!rateLimitCheck.allowed) {
        return {
          allowed: false,
          needsChallenge: true,
          challengeType: 'slider',
          reason: rateLimitCheck.reason,
          riskLevel: 'critical',
        };
      }
    }

    // 2. 检查行为分数
    const behaviorScore = antiCrawlerService.getBehaviorScore();
    
    // 3. 计算风险等级
    const riskLevel = this.calculateRiskLevel(behaviorScore, this.requestCount);

    // 4. 根据风险等级决定是否需要验证
    if (riskLevel === 'critical' || (riskLevel === 'high' && !this.verificationPassed)) {
      return {
        allowed: false,
        needsChallenge: true,
        challengeType: this.selectChallengeType(riskLevel),
        reason: 'Security verification required',
        riskLevel,
      };
    }

    // 5. 生成防护headers
    const headers = await this.generateProtectionHeaders(path);

    return {
      allowed: true,
      needsChallenge: false,
      headers,
      riskLevel,
    };
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(behaviorScore: number, requestCount: number): ProtectionResult['riskLevel'] {
    // 环境检测
    const envDetection = antiCrawlerService.detectSuspiciousEnvironment();
    
    let risk = 0;

    // 行为分数低 (+30分风险)
    if (behaviorScore < 20) risk += 30;
    else if (behaviorScore < 40) risk += 20;
    else if (behaviorScore < 60) risk += 10;

    // 请求过多 (+25分风险)
    if (requestCount > 100) risk += 25;
    else if (requestCount > 50) risk += 15;
    else if (requestCount > 20) risk += 5;

    // 可疑环境 (+30分风险)
    if (envDetection.isSuspicious) risk += 30;

    // 未通过验证 (+15分风险)
    if (!this.verificationPassed) risk += 15;

    // 根据总风险分数判断等级
    if (risk >= 60) return 'critical';
    if (risk >= 40) return 'high';
    if (risk >= 20) return 'medium';
    return 'low';
  }

  /**
   * 选择验证类型
   */
  private selectChallengeType(riskLevel: ProtectionResult['riskLevel']): 'slider' | 'click' | 'puzzle' {
    switch (riskLevel) {
      case 'critical':
        return 'puzzle'; // 最难的验证
      case 'high':
        return 'slider'; // 中等难度
      default:
        return 'click'; // 简单验证
    }
  }

  /**
   * 生成防护请求头
   */
  private async generateProtectionHeaders(path: string): Promise<Record<string, string>> {
    const fingerprint = deviceFingerprint.getFingerprint();
    const timestamp = Date.now();
    const behaviorScore = antiCrawlerService.getBehaviorScore();
    const nonce = RequestEncryption.generateNonce();

    // 生成签名
    const signature = RequestEncryption.generateSignature(
      'GET',
      path,
      timestamp,
      nonce
    );

    return {
      'X-Device-Id': fingerprint,
      'X-Request-Time': timestamp.toString(),
      'X-Request-Nonce': nonce,
      'X-Request-Sign': signature,
      'X-Behavior-Score': behaviorScore.toString(),
      'X-Client-Version': '1.0.0',
      'X-Risk-Level': this.calculateRiskLevel(behaviorScore, this.requestCount),
    };
  }

  /**
   * 触发验证挑战
   */
  async triggerChallenge(type: 'slider' | 'click' | 'puzzle' = 'slider'): Promise<any> {
    const config: ChallengeConfig = {
      type,
      difficulty: 'medium',
      timeout: 30000,
    };

    const challenge = challengeService.createChallenge(config);
    
    this.log('info', `Challenge triggered: ${type}`);
    
    return challenge;
  }

  /**
   * 验证挑战结果
   */
  async verifyChallenge(type: 'slider' | 'click' | 'puzzle', ...args: any[]): Promise<boolean> {
    const result = challengeService.verifyChallenge(type, ...args);
    
    if (result.success) {
      this.verificationPassed = true;
      this.requestCount = 0; // 重置计数
      this.log('info', 'Challenge verification successful');
      return true;
    }
    
    this.log('warn', 'Challenge verification failed:', result.error);
    return false;
  }

  /**
   * 检查路径是否在白名单
   */
  private isWhitelisted(path: string): boolean {
    return ANTI_CRAWLER_CONFIG.whitelist.paths.some(
      whitePath => path.startsWith(whitePath)
    );
  }

  /**
   * 日志输出
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    if (!ANTI_CRAWLER_CONFIG.logging.enabled) return;

    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = logLevels[ANTI_CRAWLER_CONFIG.logging.level];
    const currentLevel = logLevels[level];

    if (currentLevel >= configLevel) {
      const prefix = '[AntiCrawler]';
      switch (level) {
        case 'debug':
          console.debug(prefix, ...args);
          break;
        case 'info':
          console.info(prefix, ...args);
          break;
        case 'warn':
          console.warn(prefix, ...args);
          break;
        case 'error':
          console.error(prefix, ...args);
          break;
      }
    }
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      deviceFingerprint: deviceFingerprint.getFingerprint(),
      behaviorScore: antiCrawlerService.getBehaviorScore(),
      requestCount: this.requestCount,
      verificationPassed: this.verificationPassed,
      environment: antiCrawlerService.detectSuspiciousEnvironment(),
      config: {
        enabled: ANTI_CRAWLER_CONFIG.enabled,
        rateLimit: ANTI_CRAWLER_CONFIG.rateLimit.enabled,
        behaviorCheck: ANTI_CRAWLER_CONFIG.behaviorCheck.enabled,
        environmentCheck: ANTI_CRAWLER_CONFIG.environmentCheck.enabled,
      },
    };
  }

  /**
   * 重置验证状态
   */
  reset(): void {
    this.verificationPassed = false;
    this.requestCount = 0;
    this.log('info', 'Anti-crawler state reset');
  }
}

/**
 * 导出单例
 */
export const antiCrawler = AntiCrawlerIntegration.getInstance();

/**
 * 便捷方法：检查请求
 */
export async function checkRequestProtection(path: string): Promise<ProtectionResult> {
  return antiCrawler.checkRequest(path);
}

/**
 * 便捷方法：获取防护headers
 */
export async function getProtectionHeaders(path: string): Promise<Record<string, string>> {
  const result = await antiCrawler.checkRequest(path);
  return result.headers || {};
}

/**
 * 便捷方法：触发验证
 */
export async function showChallenge(type?: 'slider' | 'click' | 'puzzle'): Promise<any> {
  return antiCrawler.triggerChallenge(type);
}
