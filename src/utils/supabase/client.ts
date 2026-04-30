/**
 * Supabase Client Configuration
 *
 * 创建类型安全的 Supabase 客户端实例
 * 使用 Database 类型提供完整的 TypeScript 支持
 */

import { createClient } from '@jsr/supabase__supabase-js';
import type { Database } from '@/types/database';
import { supabaseUrl, publicAnonKey } from './info';

/**
 * 创建 Supabase 客户端单例
 *
 * 配置说明:
 * - persistSession: 持久化用户会话到 localStorage
 * - autoRefreshToken: 自动刷新过期的访问令牌
 */
export const supabase = createClient<Database>(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'Nodb-Travel-App',
    },
  },
});

/**
 * 辅助函数：获取当前用户
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
  return user;
}

/**
 * 辅助函数：检查用户是否已登录
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

export default supabase;

// Expose the client to window in dev mode only — the Playwright E2E harness
// uses `window.__supabase` for fixture seeding. Production bundles never set it.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __supabase: typeof supabase }).__supabase = supabase;
}
