/**
 * Infrastructure Layer - Admin Initializer
 * 管理员账户初始化器
 * 负责创建默认管理员账户和系统初始化
 */

import { User, UserPreferences } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * 默认管理员账户配置
 * 注意：在生产环境中，这些应该通过环境变量或安全配置管理
 */
export const DEFAULT_ADMIN_CONFIG = {
  username: 'admin',
  password: 'admin123', // 注意：仅用于开发/演示，生产环境应使用强密码
  email: 'admin@smarttravel.com',
  displayName: '系统管理员',
  avatar: 'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff'
};

/**
 * 默认测试用户配置
 */
export const DEFAULT_TEST_USER_CONFIG = {
  username: 'testuser',
  password: 'test123',
  email: 'test@smarttravel.com',
  displayName: '测试用户',
  avatar: 'https://ui-avatars.com/api/?name=Test+User&background=3b82f6&color=fff'
};

/**
 * 管理员初始化器
 */
export class AdminInitializer {
  constructor(private userRepository: IUserRepository) {}

  /**
   * 初始化默认管理员账户
   * 如果管理员账户不存在，则创建
   */
  async initializeDefaultAdmin(): Promise<User> {
    const existingAdmin = await this.userRepository.findByUsername(DEFAULT_ADMIN_CONFIG.username);

    if (existingAdmin) {
      console.log('Default admin account already exists');
      return existingAdmin;
    }

    console.log('Creating default admin account...');

    const adminPreferences: UserPreferences = {
      language: 'zh',
      currency: 'CNY',
      notifications: {
        email: true,
        push: true,
        tripReminders: true
      }
    };

    const adminUser = new User(
      crypto.randomUUID(),
      DEFAULT_ADMIN_CONFIG.username,
      DEFAULT_ADMIN_CONFIG.email,
      DEFAULT_ADMIN_CONFIG.displayName,
      new Date(),
      new Date(),
      DEFAULT_ADMIN_CONFIG.avatar,
      '系统管理员账户，负责平台管理和维护',
      adminPreferences,
      DEFAULT_ADMIN_CONFIG.password  // 设置密码
    );

    // 添加角色标识（扩展属性）
    (adminUser as any).role = 'admin';
    (adminUser as any).permissions = [
      'user_management',
      'content_moderation',
      'system_settings',
      'analytics_access'
    ];

    const savedAdmin = await this.userRepository.save(adminUser);
    console.log('Default admin account created successfully:', savedAdmin.username);

    return savedAdmin;
  }

  /**
   * 初始化默认测试用户
   */
  async initializeDefaultTestUser(): Promise<User> {
    const existingUser = await this.userRepository.findByUsername(DEFAULT_TEST_USER_CONFIG.username);

    if (existingUser) {
      console.log('Default test user already exists');
      return existingUser;
    }

    console.log('Creating default test user...');

    const testUserPreferences: UserPreferences = {
      language: 'zh',
      currency: 'CNY',
      notifications: {
        email: true,
        push: true,
        tripReminders: true
      }
    };

    const testUser = new User(
      crypto.randomUUID(),
      DEFAULT_TEST_USER_CONFIG.username,
      DEFAULT_TEST_USER_CONFIG.email,
      DEFAULT_TEST_USER_CONFIG.displayName,
      new Date(),
      new Date(),
      DEFAULT_TEST_USER_CONFIG.avatar,
      '测试用户账户，用于功能测试和演示',
      testUserPreferences,
      DEFAULT_TEST_USER_CONFIG.password  // 设置密码
    );

    (testUser as any).role = 'user';

    const savedUser = await this.userRepository.save(testUser);
    console.log('Default test user created successfully:', savedUser.username);

    return savedUser;
  }

  /**
   * 初始化所有默认账户
   */
  async initializeAllDefaults(): Promise<void> {
    console.log('Initializing default accounts...');
    
    try {
      await this.initializeDefaultAdmin();
      await this.initializeDefaultTestUser();
      console.log('All default accounts initialized successfully');
    } catch (error) {
      console.error('Failed to initialize default accounts:', error);
      throw error;
    }
  }

  /**
   * 验证密码（简化实现）
   * 注意：在生产环境中应使用bcrypt等加密库
   * 
   * @param username 用户名
   * @param password 明文密码
   * @returns 是否验证通过
   */
  async validatePassword(username: string, password: string): Promise<boolean> {
    // 检查是否是默认管理员账户
    if (username === DEFAULT_ADMIN_CONFIG.username) {
      return password === DEFAULT_ADMIN_CONFIG.password;
    }

    // 检查是否是默认测试用户
    if (username === DEFAULT_TEST_USER_CONFIG.username) {
      return password === DEFAULT_TEST_USER_CONFIG.password;
    }

    // 对于其他用户，暂时接受任何密码（演示用）
    // 在生产环境中，应该从数据库获取加密密码并验证
    return true;
  }
}

/**
 * PostgreSQL数据库接口（预留）
 * 当迁移到PostgreSQL时，替换UserRepository的实现
 */
export interface IPostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
}

/**
 * PostgreSQL用户表结构（预留）
 */
export interface PostgreSQLUserTable {
  id: string; // UUID
  username: string; // UNIQUE
  email: string; // UNIQUE
  display_name: string;
  password_hash: string; // bcrypt hash
  avatar_url?: string;
  bio?: string;
  preferences?: any; // JSONB
  role: 'admin' | 'user'; // ENUM
  permissions?: string[]; // ARRAY
  created_at: Date; // TIMESTAMP
  updated_at: Date; // TIMESTAMP
  last_login_at?: Date; // TIMESTAMP
  is_active: boolean; // BOOLEAN
  is_email_verified: boolean; // BOOLEAN
}

/**
 * PostgreSQL迁移SQL（预留）
 */
export const POSTGRESQL_MIGRATION_SQL = `
-- 创建用户表
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

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员账户
INSERT INTO users (username, email, display_name, password_hash, avatar_url, bio, role, permissions)
VALUES (
  'admin',
  'admin@smarttravel.com',
  '系统管理员',
  '$2b$10$YourHashedPasswordHere', -- 需要替换为实际的bcrypt hash
  'https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff',
  '系统管理员账户，负责平台管理和维护',
  'admin',
  ARRAY['user_management', 'content_moderation', 'system_settings', 'analytics_access']
)
ON CONFLICT (username) DO NOTHING;

-- 插入默认测试用户
INSERT INTO users (username, email, display_name, password_hash, avatar_url, bio, role)
VALUES (
  'testuser',
  'test@smarttravel.com',
  '测试用户',
  '$2b$10$YourHashedPasswordHere', -- 需要替换为实际的bcrypt hash
  'https://ui-avatars.com/api/?name=Test+User&background=3b82f6&color=fff',
  '测试用户账户，用于功能测试和演示',
  'user'
)
ON CONFLICT (username) DO NOTHING;
`;

/**
 * PostgreSQL连接示例代码（预留）
 */
export const POSTGRESQL_CONNECTION_EXAMPLE = `
// 安装依赖: npm install pg
// TypeScript类型: npm install @types/pg

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smarttravel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'yourpassword',
  ssl: process.env.DB_SSL === 'true',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 查询用户示例
async function findUserByUsername(username: string) {
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [username]
  );
  return result.rows[0];
}

// 验证密码示例（需要bcrypt）
import bcrypt from 'bcrypt';

async function validatePassword(plainPassword: string, hashedPassword: string) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// 创建用户示例
async function createUser(userData: any) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const result = await pool.query(
    \`INSERT INTO users (username, email, display_name, password_hash, avatar_url, bio, preferences, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *\`,
    [
      userData.username,
      userData.email,
      userData.displayName,
      hashedPassword,
      userData.avatar,
      userData.bio,
      JSON.stringify(userData.preferences),
      userData.role || 'user'
    ]
  );
  
  return result.rows[0];
}
`;
