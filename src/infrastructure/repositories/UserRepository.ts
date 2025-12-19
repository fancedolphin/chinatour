/**
 * Infrastructure Layer - User Repository Implementation
 * 用户仓储实现
 * ✅ 允许依赖：Domain Layer
 * ❌ 禁止依赖：Application Layer
 */

import { User, UserPreferences } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * 用户仓储实现（使用LocalStorage）
 */
export class UserRepository implements IUserRepository {
  private readonly STORAGE_KEY = 'users';
  private readonly CURRENT_USER_KEY = 'current_user';

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    const users = this.getAllUsersFromStorage();
    const userData = users.find(u => u.id === id);
    
    if (!userData) return null;
    
    return this.deserializeUser(userData);
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const users = this.getAllUsersFromStorage();
    const userData = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!userData) return null;
    
    return this.deserializeUser(userData);
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = this.getAllUsersFromStorage();
    const userData = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!userData) return null;
    
    return this.deserializeUser(userData);
  }

  /**
   * 保存用户（创建或更新）
   */
  async save(user: User): Promise<User> {
    const users = this.getAllUsersFromStorage();
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    user.updatedAt = new Date();
    const serialized = this.serializeUser(user);

    if (existingIndex >= 0) {
      users[existingIndex] = serialized;
    } else {
      users.push(serialized);
    }

    this.saveUsersToStorage(users);
    return user;
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<boolean> {
    const users = this.getAllUsersFromStorage();
    const filteredUsers = users.filter(u => u.id !== id);
    
    if (filteredUsers.length === users.length) {
      return false;
    }

    this.saveUsersToStorage(filteredUsers);
    
    // 如果删除的是当前用户，清除当前用户
    const currentUserId = this.getCurrentUserId();
    if (currentUserId === id) {
      this.clearCurrentUser();
    }
    
    return true;
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * 检查邮箱是否存在
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        return false;
      }

      // 更新密码（简单实现，实际应加密）
      user.setPassword(newPassword);
      await this.save(user);
      
      return true;
    } catch (error) {
      console.error('Failed to update password:', error);
      return false;
    }
  }

  /**
   * 获取当前登录用户
   */
  async getCurrentUser(): Promise<User | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;
    
    return this.findById(userId);
  }

  /**
   * 设置当前登录用户
   */
  async setCurrentUser(userId: string): Promise<void> {
    localStorage.setItem(this.CURRENT_USER_KEY, userId);
  }

  /**
   * 清除当前登录用户
   */
  clearCurrentUser(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string | null {
    return localStorage.getItem(this.CURRENT_USER_KEY);
  }

  /**
   * 从LocalStorage获取所有用户
   */
  private getAllUsersFromStorage(): any[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load users from storage:', error);
      return [];
    }
  }

  /**
   * 保存用户到LocalStorage
   */
  private saveUsersToStorage(users: any[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Failed to save users to storage:', error);
    }
  }

  /**
   * 序列化User实体
   */
  private serializeUser(user: User): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      preferences: user.preferences,
      passwordHash: user.getPasswordHash(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  /**
   * 反序列化User实体
   */
  private deserializeUser(data: any): User {
    return new User(
      data.id,
      data.username,
      data.email,
      data.displayName,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.avatar,
      data.bio,
      data.preferences as UserPreferences,
      data.passwordHash
    );
  }
}
