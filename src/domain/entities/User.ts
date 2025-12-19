/**
 * Domain Layer - User Entity
 * 用户实体，包含用户业务规则
 */

export interface UserEntity {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  
  // 业务方法
  hasCompletedProfile(): boolean;
  canCreateTrip(): boolean;
}

export interface UserPreferences {
  language: 'zh' | 'en';
  currency: string;
  travelStyle?: TravelStyle[];
  dietaryRestrictions?: string[];
  notifications?: {
    email: boolean;
    push: boolean;
    tripReminders: boolean;
  };
}

export enum TravelStyle {
  ADVENTURE = 'adventure',
  RELAXATION = 'relaxation',
  CULTURAL = 'cultural',
  FOOD = 'food',
  SHOPPING = 'shopping',
  NATURE = 'nature',
  LUXURY = 'luxury',
  BUDGET = 'budget'
}

/**
 * User Entity 实现
 */
export class User implements UserEntity {
  constructor(
    public id: string,
    public username: string,
    public email: string,
    public displayName: string,
    public createdAt: Date,
    public updatedAt: Date,
    public avatar?: string,
    public bio?: string,
    public preferences?: UserPreferences,
    private passwordHash?: string
  ) {}

  /**
   * 验证密码
   * 注意：此方法仅用于演示，生产环境应使用加密密码
   */
  verifyPassword(plainPassword: string): boolean {
    // 简单的明文密码验证（仅用于演示）
    return this.passwordHash === plainPassword;
  }

  /**
   * 设置密码
   * 注意：此方法仅用于演示，生产环境应使用加密
   */
  setPassword(plainPassword: string): void {
    this.passwordHash = plainPassword;
  }

  /**
   * 获取密码哈希
   */
  getPasswordHash(): string | undefined {
    return this.passwordHash;
  }

  hasCompletedProfile(): boolean {
    return Boolean(
      this.displayName &&
      this.email &&
      this.preferences?.language
    );
  }

  canCreateTrip(): boolean {
    return this.hasCompletedProfile();
  }

  /**
   * 业务规则：验证用户数据
   */
  static validate(user: Partial<UserEntity>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.username || user.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!user.email || !User.isValidEmail(user.email)) {
      errors.push('Valid email is required');
    }

    if (!user.displayName || user.displayName.trim().length === 0) {
      errors.push('Display name is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证邮箱格式
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 工厂方法：创建新用户
   */
  static create(data: {
    username: string;
    email: string;
    displayName: string;
    avatar?: string;
  }): User {
    const validation = User.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    return new User(
      crypto.randomUUID(),
      data.username,
      data.email,
      data.displayName,
      new Date(),
      new Date(),
      data.avatar,
      undefined,
      {
        language: 'zh',
        currency: 'CNY',
        notifications: {
          email: true,
          push: true,
          tripReminders: true
        }
      }
    );
  }
}
