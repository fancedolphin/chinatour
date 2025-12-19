/**
 * Infrastructure Layer - Challenge Service
 * 人机验证挑战服务 - 滑块、点选等验证
 */

export type ChallengeType = 'slider' | 'click' | 'puzzle' | 'captcha';

export interface ChallengeConfig {
  type: ChallengeType;
  difficulty: 'easy' | 'medium' | 'hard';
  timeout: number;
}

export interface ChallengeResult {
  success: boolean;
  token?: string;
  error?: string;
  attempts?: number;
}

/**
 * 滑块验证
 */
export class SliderChallenge {
  private startTime: number = 0;
  private moveCount: number = 0;
  private path: Array<{ x: number; y: number; time: number }> = [];

  /**
   * 开始验证
   */
  start(): void {
    this.startTime = Date.now();
    this.moveCount = 0;
    this.path = [];
  }

  /**
   * 记录移动轨迹
   */
  recordMove(x: number, y: number): void {
    this.moveCount++;
    this.path.push({
      x,
      y,
      time: Date.now() - this.startTime,
    });
  }

  /**
   * 验证结果
   */
  verify(targetPosition: number, currentPosition: number, tolerance: number = 5): ChallengeResult {
    const duration = Date.now() - this.startTime;

    // 检查1: 位置匹配度
    const positionMatch = Math.abs(targetPosition - currentPosition) <= tolerance;
    if (!positionMatch) {
      return {
        success: false,
        error: '验证失败，请重试',
      };
    }

    // 检查2: 时间合理性（不能太快或太慢）
    if (duration < 300) {
      return {
        success: false,
        error: '操作过快，请重试',
      };
    }

    if (duration > 30000) {
      return {
        success: false,
        error: '验证超时，请重试',
      };
    }

    // 检查3: 轨迹自然性
    if (!this.isNaturalPath()) {
      return {
        success: false,
        error: '检测到异常行为',
      };
    }

    // 生成验证Token
    const token = this.generateToken();

    return {
      success: true,
      token,
    };
  }

  /**
   * 检查轨迹是否自然
   */
  private isNaturalPath(): boolean {
    if (this.path.length < 5) return false;

    // 检查速度变化
    const speeds: number[] = [];
    for (let i = 1; i < this.path.length; i++) {
      const prev = this.path[i - 1];
      const curr = this.path[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const time = curr.time - prev.time;
      speeds.push(time > 0 ? distance / time : 0);
    }

    // 速度应该有变化（加速、减速），不应该完全恒定
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);

    // 标准差太小说明速度过于恒定（机器人特征）
    return stdDev > 0.1;
  }

  /**
   * 生成验证Token
   */
  private generateToken(): string {
    const data = {
      time: Date.now(),
      duration: Date.now() - this.startTime,
      moves: this.moveCount,
      pathLength: this.path.length,
    };

    return btoa(JSON.stringify(data));
  }
}

/**
 * 点选验证
 */
export class ClickChallenge {
  private targets: Array<{ x: number; y: number; label: string }> = [];
  private clicks: Array<{ x: number; y: number; time: number }> = [];
  private startTime: number = 0;

  /**
   * 生成验证目标
   */
  generateTargets(count: number = 4): Array<{ x: number; y: number; label: string }> {
    this.targets = [];
    const labels = ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

    for (let i = 0; i < count; i++) {
      this.targets.push({
        x: Math.random() * 300,
        y: Math.random() * 300,
        label: labels[Math.floor(Math.random() * labels.length)],
      });
    }

    this.startTime = Date.now();
    return this.targets;
  }

  /**
   * 记录点击
   */
  recordClick(x: number, y: number): void {
    this.clicks.push({
      x,
      y,
      time: Date.now() - this.startTime,
    });
  }

  /**
   * 验证结果
   */
  verify(targetLabel: string, tolerance: number = 20): ChallengeResult {
    const targetPoints = this.targets.filter(t => t.label === targetLabel);
    
    if (targetPoints.length === 0) {
      return {
        success: false,
        error: '无效的目标',
      };
    }

    let matchCount = 0;
    for (const click of this.clicks) {
      for (const target of targetPoints) {
        const distance = Math.sqrt(
          Math.pow(click.x - target.x, 2) + Math.pow(click.y - target.y, 2)
        );
        if (distance <= tolerance) {
          matchCount++;
          break;
        }
      }
    }

    const success = matchCount >= targetPoints.length;

    return {
      success,
      token: success ? btoa(JSON.stringify({ verified: true, time: Date.now() })) : undefined,
      error: success ? undefined : '验证失败，请重试',
      attempts: this.clicks.length,
    };
  }
}

/**
 * 拼图验证
 */
export class PuzzleChallenge {
  private piecePosition: number = 0;
  private targetPosition: number = 0;

  /**
   * 初始化拼图
   */
  initialize(imageWidth: number): void {
    // 随机生成缺口位置
    this.targetPosition = Math.floor(Math.random() * (imageWidth - 60)) + 30;
    this.piecePosition = 0;
  }

  /**
   * 更新拼图块位置
   */
  updatePosition(position: number): void {
    this.piecePosition = position;
  }

  /**
   * 验证
   */
  verify(tolerance: number = 5): ChallengeResult {
    const match = Math.abs(this.piecePosition - this.targetPosition) <= tolerance;

    return {
      success: match,
      token: match ? btoa(JSON.stringify({ verified: true, time: Date.now() })) : undefined,
      error: match ? undefined : '验证失败，请重试',
    };
  }

  /**
   * 获取目标位置（用于客户端渲染）
   */
  getTargetPosition(): number {
    return this.targetPosition;
  }
}

/**
 * 验证服务管理器
 */
export class ChallengeService {
  private activeChallenge: SliderChallenge | ClickChallenge | PuzzleChallenge | null = null;
  private challengeHistory: Array<{ type: ChallengeType; success: boolean; time: number }> = [];

  /**
   * 创建验证挑战
   */
  createChallenge(config: ChallengeConfig): any {
    switch (config.type) {
      case 'slider':
        this.activeChallenge = new SliderChallenge();
        (this.activeChallenge as SliderChallenge).start();
        return this.activeChallenge;

      case 'click':
        this.activeChallenge = new ClickChallenge();
        return {
          challenge: this.activeChallenge,
          targets: (this.activeChallenge as ClickChallenge).generateTargets(),
        };

      case 'puzzle':
        this.activeChallenge = new PuzzleChallenge();
        (this.activeChallenge as PuzzleChallenge).initialize(300);
        return this.activeChallenge;

      default:
        throw new Error(`Unsupported challenge type: ${config.type}`);
    }
  }

  /**
   * 验证挑战
   */
  verifyChallenge(type: ChallengeType, ...args: any[]): ChallengeResult {
    if (!this.activeChallenge) {
      return {
        success: false,
        error: '没有活动的验证',
      };
    }

    let result: ChallengeResult;

    switch (type) {
      case 'slider':
        result = (this.activeChallenge as SliderChallenge).verify(...args);
        break;
      case 'click':
        result = (this.activeChallenge as ClickChallenge).verify(...args);
        break;
      case 'puzzle':
        result = (this.activeChallenge as PuzzleChallenge).verify(...args);
        break;
      default:
        result = { success: false, error: '未知的验证类型' };
    }

    // 记录历史
    this.challengeHistory.push({
      type,
      success: result.success,
      time: Date.now(),
    });

    // 清理活动验证
    if (result.success) {
      this.activeChallenge = null;
    }

    return result;
  }

  /**
   * 获取验证历史
   */
  getHistory(): Array<{ type: ChallengeType; success: boolean; time: number }> {
    return [...this.challengeHistory];
  }

  /**
   * 计算验证成功率
   */
  getSuccessRate(): number {
    if (this.challengeHistory.length === 0) return 0;
    const successCount = this.challengeHistory.filter(h => h.success).length;
    return successCount / this.challengeHistory.length;
  }

  /**
   * 检查是否需要验证
   */
  needsChallenge(behaviorScore: number, requestCount: number): boolean {
    // 行为分数低于30需要验证
    if (behaviorScore < 30) return true;

    // 请求过于频繁需要验证
    if (requestCount > 50) return true;

    // 最近验证失败次数过多
    const recentFailures = this.challengeHistory
      .slice(-5)
      .filter(h => !h.success).length;
    if (recentFailures >= 3) return true;

    return false;
  }
}

/**
 * 导出单例
 */
export const challengeService = new ChallengeService();
