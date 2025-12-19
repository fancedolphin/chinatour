/**
 * Supabase Project Configuration
 *
 * 这些配置从环境变量中读取，确保敏感信息不会被硬编码到代码中
 */

// 项目 ID (从 URL 中提取)
export const projectId = 'ogodnvjaiwelqmjqkvda';

// Supabase 项目 URL (从环境变量读取，带默认值)
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ogodnvjaiwelqmjqkvda.supabase.co';

// 公共匿名密钥 (从环境变量读取)
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 验证配置是否完整
if (!publicAnonKey) {
  console.warn('⚠️  VITE_SUPABASE_ANON_KEY is not set. Please add it to your .env.local file.');
}
