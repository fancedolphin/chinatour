/**
 * Application Layer - Change Password Use Case
 * 修改密码用例
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * 修改密码请求参数
 */
export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

/**
 * 修改密码响应
 */
export interface ChangePasswordResponse {
  success: boolean;
  error?: string;
}

/**
 * 修改密码用例
 */
export class ChangePasswordUseCase {
  constructor(private userRepository: IUserRepository) {}

  /**
   * 执行密码修改
   */
  async execute(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      // 验证输入
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 查找用户
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 验证当前密码
      const isCurrentPasswordValid = user.verifyPassword(request.currentPassword);
      if (!isCurrentPasswordValid) {
        return { success: false, error: '当前密码错误' };
      }

      // 检查新密码是否与当前密码相同
      if (request.currentPassword === request.newPassword) {
        return { success: false, error: '新密码不能与当前密码相同' };
      }

      // 更新密码
      const updateSuccess = await this.userRepository.updatePassword(
        request.userId,
        request.newPassword
      );

      if (!updateSuccess) {
        return { success: false, error: '密码更新失败' };
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '修改密码时发生错误',
      };
    }
  }

  /**
   * 验证请求参数
   */
  private validateRequest(request: ChangePasswordRequest): { valid: boolean; error?: string } {
    // 验证当前密码
    if (!request.currentPassword || request.currentPassword.trim().length === 0) {
      return { valid: false, error: '请输入当前密码' };
    }

    // 验证新密码
    if (!request.newPassword || request.newPassword.trim().length === 0) {
      return { valid: false, error: '请输入新密码' };
    }

    // 验证新密码长度
    if (request.newPassword.length < 6) {
      return { valid: false, error: '新密码长度至少为6位' };
    }

    if (request.newPassword.length > 100) {
      return { valid: false, error: '新密码长度不能超过100位' };
    }

    return { valid: true };
  }
}
