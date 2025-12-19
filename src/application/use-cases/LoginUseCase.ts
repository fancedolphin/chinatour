/**
 * Application Layer - Login Use Case
 * 用户登录用例
 */

import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AdminInitializer } from '../../infrastructure/initializers/AdminInitializer';

/**
 * 登录输入DTO
 */
export interface LoginInput {
  username: string;
  password: string; // 注意：实际项目中应该加密
}

/**
 * 登录输出DTO
 */
export interface LoginOutput {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * 登录用例
 */
export class LoginUseCase {
  constructor(
    private userRepository: IUserRepository,
    private adminInitializer?: AdminInitializer
  ) {}

  /**
   * 执行登录
   * 注意：这是简化实现，实际项目中应该：
   * 1. 密码加密验证
   * 2. JWT token生成
   * 3. 多因素认证
   * 4. 登录日志记录
   */
  async execute(input: LoginInput): Promise<LoginOutput> {
    try {
      // 1. 查找用户
      const user = await this.userRepository.findByUsername(input.username);
      
      if (!user) {
        return {
          success: false,
          error: 'Username or password is incorrect'
        };
      }

      // 2. 验证密码
      // 使用User实体的verifyPassword方法
      const isPasswordValid = user.verifyPassword(input.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Username or password is incorrect'
        };
      }

      // 3. 设置为当前用户
      await (this.userRepository as any).setCurrentUser(user.id);

      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }
}
