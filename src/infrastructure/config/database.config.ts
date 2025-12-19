/**
 * Infrastructure Layer - Database Configuration
 * 数据库配置文件（支持LocalStorage和PostgreSQL）
 */

/**
 * 数据库类型
 */
export type DatabaseType = 'localstorage' | 'postgresql';

/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  type: DatabaseType;
  postgresql?: PostgreSQLConfig;
}

/**
 * PostgreSQL配置接口
 */
export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

/**
 * 从环境变量获取数据库配置
 */
export function getDatabaseConfig(): DatabaseConfig {
  const dbType = (import.meta.env.VITE_DB_TYPE as DatabaseType) || 'localstorage';

  if (dbType === 'postgresql') {
    return {
      type: 'postgresql',
      postgresql: {
        host: import.meta.env.VITE_DB_HOST || 'localhost',
        port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
        database: import.meta.env.VITE_DB_NAME || 'smarttravel',
        user: import.meta.env.VITE_DB_USER || 'postgres',
        password: import.meta.env.VITE_DB_PASSWORD || '',
        ssl: import.meta.env.VITE_DB_SSL === 'true',
        poolSize: parseInt(import.meta.env.VITE_DB_POOL_SIZE || '20'),
        connectionTimeout: parseInt(import.meta.env.VITE_DB_CONNECTION_TIMEOUT || '2000'),
        idleTimeout: parseInt(import.meta.env.VITE_DB_IDLE_TIMEOUT || '30000'),
      }
    };
  }

  return {
    type: 'localstorage'
  };
}

/**
 * 默认数据库配置
 */
export const defaultDatabaseConfig: DatabaseConfig = getDatabaseConfig();

/**
 * 开发环境配置示例
 */
export const developmentConfig: DatabaseConfig = {
  type: 'localstorage'
};

/**
 * 生产环境配置示例（PostgreSQL）
 */
export const productionConfig: DatabaseConfig = {
  type: 'postgresql',
  postgresql: {
    host: process.env.DB_HOST || 'your-database-host.com',
    port: 5432,
    database: 'smarttravel_prod',
    user: 'smarttravel_user',
    password: process.env.DB_PASSWORD || '',
    ssl: true,
    poolSize: 50,
    connectionTimeout: 5000,
    idleTimeout: 30000,
  }
};

/**
 * 环境变量配置说明
 * 
 * .env 文件示例：
 * 
 * # 数据库类型 (localstorage | postgresql)
 * VITE_DB_TYPE=localstorage
 * 
 * # PostgreSQL配置（仅当DB_TYPE=postgresql时需要）
 * VITE_DB_HOST=localhost
 * VITE_DB_PORT=5432
 * VITE_DB_NAME=smarttravel
 * VITE_DB_USER=postgres
 * VITE_DB_PASSWORD=your_password_here
 * VITE_DB_SSL=false
 * VITE_DB_POOL_SIZE=20
 * VITE_DB_CONNECTION_TIMEOUT=2000
 * VITE_DB_IDLE_TIMEOUT=30000
 * 
 * 生产环境 .env.production 示例：
 * 
 * VITE_DB_TYPE=postgresql
 * VITE_DB_HOST=your-db-host.amazonaws.com
 * VITE_DB_PORT=5432
 * VITE_DB_NAME=smarttravel_prod
 * VITE_DB_USER=smarttravel_app
 * VITE_DB_PASSWORD=${DATABASE_PASSWORD} # 从环境变量或密钥管理服务获取
 * VITE_DB_SSL=true
 * VITE_DB_POOL_SIZE=50
 */
