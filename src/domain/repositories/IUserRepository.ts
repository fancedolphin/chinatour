/**
 * Domain Layer - User Repository Interface
 * 用户仓储接口（领域层定义，基础设施层实现）
 */

import { User } from '../entities/User';

/**
 * 用户仓储接口
 */
export interface IUserRepository {
  /**
   * 根据ID查找用户
   */
  findById(id: string): Promise<User | null>;

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * 保存用户（创建或更新）
   */
  save(user: User): Promise<User>;

  /**
   * 删除用户
   */
  delete(id: string): Promise<boolean>;

  /**
   * 检查用户名是否存在
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * 检查邮箱是否存在
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * 更新用户密码
   */
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
}
