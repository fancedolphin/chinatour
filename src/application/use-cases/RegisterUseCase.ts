/**
 * Application Layer - Register Use Case
 * 用户注册用例
 */

import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * 注册输入DTO
 */
export interface RegisterInput {
  username: string;
  email: string;
  displayName: string;
  password: string;
  avatar?: string;
}

/**
 * 注册输出DTO
 */
export interface RegisterOutput {
  success: boolean;
  user?: User;
  errors?: string[];
}

/**
 * 注册用例
 */
export class RegisterUseCase {
  constructor(private userRepository: IUserRepository) {}

  /**
   * 执行注册
   */
  async execute(input: RegisterInput): Promise<RegisterOutput> {
    try {
      // 1. 检查用户名是否已存在
      const usernameExists = await this.userRepository.usernameExists(input.username);
      if (usernameExists) {
        return {
          success: false,
          errors: ['Username already exists']
        };
      }

      // 2. 检查邮箱是否已存在
      const emailExists = await this.userRepository.emailExists(input.email);
      if (emailExists) {
        return {
          success: false,
          errors: ['Email already exists']
        };
      }

      // 3. 使用领域层的工厂方法创建用户
      const user = User.create({
        username: input.username,
        email: input.email,
        displayName: input.displayName,
        avatar: input.avatar
      });

      // 设置密码（注意：实际项目中应该存储加密后的密码）
      user.setPassword(input.password);

      // 4. 保存用户
      const savedUser = await this.userRepository.save(user);

      // 5. 自动登录
      await (this.userRepository as any).setCurrentUser(savedUser.id);

      return {
        success: true,
        user: savedUser
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Registration failed']
      };
    }
  }
}
