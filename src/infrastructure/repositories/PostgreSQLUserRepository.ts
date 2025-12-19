/**
 * Infrastructure Layer - PostgreSQL User Repository Implementation
 * PostgreSQL用户仓储实现（预留接口）
 * 
 * 使用说明：
 * 1. 安装依赖: npm install pg @types/pg bcrypt @types/bcrypt
 * 2. 配置环境变量（参考 database.config.ts）
 * 3. 在Container.ts中替换UserRepository的实现
 * 4. 运行数据库迁移脚本
 */

import { User, UserPreferences } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * PostgreSQL用户仓储实现（预留）
 * 
 * 注意：此文件是预留接口，需要安装相关依赖后才能使用
 * 当前使用LocalStorage实现，迁移到PostgreSQL时启用此实现
 */
export class PostgreSQLUserRepository implements IUserRepository {
  // private pool: Pool;

  constructor(/* config: PostgreSQLConfig */) {
    // 初始化PostgreSQL连接池
    // this.pool = new Pool({
    //   host: config.host,
    //   port: config.port,
    //   database: config.database,
    //   user: config.user,
    //   password: config.password,
    //   ssl: config.ssl,
    //   max: config.poolSize,
    //   connectionTimeoutMillis: config.connectionTimeout,
    //   idleTimeoutMillis: config.idleTimeout,
    // });
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
    */
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE username = $1 AND is_active = true',
        [username.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
    */
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
    */
  }

  /**
   * 保存用户（创建或更新）
   */
  async save(user: User): Promise<User> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const exists = await this.findById(user.id);

      if (exists) {
        // 更新
        const result = await this.pool.query(
          `UPDATE users 
           SET username = $1, email = $2, display_name = $3, 
               avatar_url = $4, bio = $5, preferences = $6, updated_at = NOW()
           WHERE id = $7
           RETURNING *`,
          [
            user.username,
            user.email,
            user.displayName,
            user.avatar,
            user.bio,
            JSON.stringify(user.preferences),
            user.id
          ]
        );
        return this.mapRowToUser(result.rows[0]);
      } else {
        // 创建
        const result = await this.pool.query(
          `INSERT INTO users (id, username, email, display_name, avatar_url, bio, preferences, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING *`,
          [
            user.id,
            user.username,
            user.email,
            user.displayName,
            user.avatar,
            user.bio,
            JSON.stringify(user.preferences)
          ]
        );
        return this.mapRowToUser(result.rows[0]);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
    */
  }

  /**
   * 删除用户（软删除）
   */
  async delete(id: string): Promise<boolean> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
    */
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM users WHERE username = $1 AND is_active = true',
        [username.toLowerCase()]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw error;
    }
    */
  }

  /**
   * 检查邮箱是否存在
   */
  async emailExists(email: string): Promise<boolean> {
    throw new Error('PostgreSQL implementation not installed. Install pg and bcrypt packages first.');
    
    // PostgreSQL实现示例：
    /*
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
    */
  }

  /**
   * 获取当前登录用户
   */
  async getCurrentUser(): Promise<User | null> {
    // 从session或cookie中获取当前用户ID
    // 这部分需要配合认证系统实现
    throw new Error('Not implemented. Use session/cookie based authentication.');
  }

  /**
   * 设置当前登录用户
   */
  async setCurrentUser(userId: string): Promise<void> {
    // 设置session或cookie
    // 这部分需要配合认证系统实现
    throw new Error('Not implemented. Use session/cookie based authentication.');
  }

  /**
   * 清除当前登录用户
   */
  clearCurrentUser(): void {
    // 清除session或cookie
    // 这部分需要配合认证系统实现
    throw new Error('Not implemented. Use session/cookie based authentication.');
  }

  /**
   * 将数据库行映射为User实体
   */
  // private mapRowToUser(row: any): User {
  //   return new User(
  //     row.id,
  //     row.username,
  //     row.email,
  //     row.display_name,
  //     new Date(row.created_at),
  //     new Date(row.updated_at),
  //     row.avatar_url,
  //     row.bio,
  //     row.preferences as UserPreferences
  //   );
  // }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    // await this.pool.end();
  }
}

/**
 * 密码处理工具（使用bcrypt）
 */
export class PasswordHasher {
  private static readonly SALT_ROUNDS = 10;

  /**
   * 哈希密码
   */
  static async hash(plainPassword: string): Promise<string> {
    throw new Error('bcrypt not installed. Install bcrypt package first.');
    // const bcrypt = require('bcrypt');
    // return await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
  }

  /**
   * 验证密码
   */
  static async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    throw new Error('bcrypt not installed. Install bcrypt package first.');
    // const bcrypt = require('bcrypt');
    // return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

/**
 * 数据库迁移工具
 */
export class DatabaseMigration {
  // private pool: Pool;

  constructor(/* pool: Pool */) {
    // this.pool = pool;
  }

  /**
   * 执行迁移
   */
  async migrate(): Promise<void> {
    throw new Error('PostgreSQL implementation not installed.');
    
    // PostgreSQL实现示例：
    /*
    try {
      // 创建users表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          avatar_url TEXT,
          bio TEXT,
          preferences JSONB DEFAULT '{}',
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          permissions TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          is_email_verified BOOLEAN DEFAULT false
        );
      `);

      // 创建索引
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);');

      // 创建触发器
      await this.pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await this.pool.query(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      console.log('Database migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
    */
  }

  /**
   * 回滚迁移
   */
  async rollback(): Promise<void> {
    // await this.pool.query('DROP TABLE IF EXISTS users CASCADE;');
  }
}

/**
 * PostgreSQL使用示例代码
 */
export const USAGE_EXAMPLE = `
// 1. 安装依赖
// npm install pg @types/pg bcrypt @types/bcrypt

// 2. 配置环境变量（.env文件）
// VITE_DB_TYPE=postgresql
// VITE_DB_HOST=localhost
// VITE_DB_PORT=5432
// VITE_DB_NAME=smarttravel
// VITE_DB_USER=postgres
// VITE_DB_PASSWORD=your_password

// 3. 在Container.ts中替换实现
import { PostgreSQLUserRepository } from '../repositories/PostgreSQLUserRepository';
import { getDatabaseConfig } from '../config/database.config';

// 在Container的constructor中：
const dbConfig = getDatabaseConfig();
if (dbConfig.type === 'postgresql' && dbConfig.postgresql) {
  this.userRepository = new PostgreSQLUserRepository(dbConfig.postgresql);
} else {
  this.userRepository = new UserRepository(); // LocalStorage实现
}

// 4. 运行数据库迁移
import { DatabaseMigration } from '../repositories/PostgreSQLUserRepository';

const migration = new DatabaseMigration(pool);
await migration.migrate();

// 5. 使用示例
const userRepo = new PostgreSQLUserRepository(dbConfig.postgresql);
const user = await userRepo.findByUsername('admin');

// 6. 密码处理示例
import { PasswordHasher } from '../repositories/PostgreSQLUserRepository';

// 注册时哈希密码
const hashedPassword = await PasswordHasher.hash('mypassword123');

// 登录时验证密码
const isValid = await PasswordHasher.verify('mypassword123', hashedPassword);
`;
