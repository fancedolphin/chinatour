/**
 * Presentation Layer - useAuth Hook (Supabase Auth 版本)
 * 保持原有接口，内部改用 Supabase Auth API
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { User } from '../../domain/entities/User';
import { supabaseUserToEntity, getCurrentUserEntity } from '../adapters/userAdapter';

const TEMPORARY_AUTH_ERROR_MESSAGE = '认证服务暂时不可用，请稍后重试';
const EMAIL_LOGIN_ONLY_MESSAGE = '当前仅支持邮箱登录，请输入完整邮箱地址';
const TRANSIENT_AUTH_ERROR_PATTERNS = [
  'Database error querying schema',
  'terminating connection due to administrator command',
  'Failed to fetch',
  'network',
];

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isTransientAuthError(error?: { message?: string; status?: number } | null): boolean {
  if (!error) {
    return false;
  }

  if (error.status === 500) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? '';
  return TRANSIENT_AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern.toLowerCase()));
}

function mapAuthErrorMessage(error?: { message?: string; status?: number } | null): string {
  if (!error?.message) {
    return '登录失败';
  }

  if (isTransientAuthError(error)) {
    return TEMPORARY_AUTH_ERROR_MESSAGE;
  }

  return error.message;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 认证Hook
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载当前用户（从 Supabase Auth）
   */
  const loadCurrentUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = await getCurrentUserEntity();
      console.log('[useAuth] 加载当前用户:', user ? user.username : '无用户');
      setCurrentUser(user);
    } catch (err) {
      console.error('[useAuth] 加载用户失败:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 登录（邮箱 + 密码）
   * 直接使用 Supabase Auth 的 signInWithPassword
   */
  const login = async (identifier: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const email = identifier.trim();

      console.log('[useAuth] 执行登录:', email);

      if (!isEmail(email)) {
        console.log('[useAuth] 登录失败: 非邮箱登录标识');
        setError(EMAIL_LOGIN_ONLY_MESSAGE);
        return { success: false, error: EMAIL_LOGIN_ONLY_MESSAGE };
      }

      // 直接使用邮箱进行 Supabase Auth 登录
      let signInResult = await supabase.auth.signInWithPassword({
        email,
        password: password,
      });

      if (isTransientAuthError(signInResult.error)) {
        console.warn('[useAuth] 登录遇到临时错误，准备重试一次:', signInResult.error?.message);
        await wait(400);
        signInResult = await supabase.auth.signInWithPassword({
          email,
          password: password,
        });
      }

      const { data, error: authError } = signInResult;

      if (authError) {
        const errorMessage = mapAuthErrorMessage(authError);
        console.log('[useAuth] 登录失败:', authError.message);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (data.user) {
        const user = supabaseUserToEntity(data.user);
        console.log('[useAuth] 登录成功，设置用户:', user.username);
        setCurrentUser(user);
        return { success: true };
      }

      return { success: false, error: 'Unknown error' };
    } catch (err) {
      const errorMsg = mapAuthErrorMessage(
        err instanceof Error ? { message: err.message } : { message: 'Login failed' }
      );
      console.error('[useAuth] 登录异常:', errorMsg);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 注册（邮箱密码）
   */
  const register = async (data: {
    username: string;
    email: string;
    displayName: string;
    password: string;
    avatar?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useAuth] 执行注册:', data.email);

      // Supabase Auth API: signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            display_name: data.displayName,
            avatar_url: data.avatar,
          },
        },
      });

      if (authError) {
        console.log('[useAuth] 注册失败:', authError.message);
        setError(authError.message);
        return { success: false, errors: [authError.message] };
      }

      if (authData.user) {
        const user = supabaseUserToEntity(authData.user);
        setCurrentUser(user);
        return { success: true };
      }

      return { success: false, errors: ['Unknown error'] };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMsg);
      return { success: false, errors: [errorMsg] };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 登出
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setError(null);
    } catch (err) {
      console.error('[useAuth] 登出失败:', err);
    }
  };

  /**
   * 检查是否已登录
   */
  const isAuthenticated = (): boolean => {
    return currentUser !== null;
  };

  /**
   * 更新用户资料
   * 注意：这里保持接口兼容，但内部使用 Supabase
   */
  const updateProfile = async (updates: Partial<User>) => {
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // 更新 Supabase Auth user_metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          username: updates.username,
          display_name: updates.displayName,
          avatar_url: updates.avatar,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const updatedUser = supabaseUserToEntity(data.user);
        setCurrentUser(updatedUser);
        return { success: true, user: updatedUser };
      }

      return { success: false, error: 'Update failed' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Update failed',
      };
    }
  };

  /**
   * 修改密码
   */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentUser) {
      return { success: false, error: '请先登录' };
    }

    try {
      // Supabase 不需要验证当前密码，直接更新
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '修改密码失败',
      };
    }
  };

  /**
   * Google OAuth 登录（预留接口）
   */
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'OAuth login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  /**
   * 密码重置：发送重置邮件（预留接口）
   */
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Reset failed',
      };
    }
  };

  /**
   * 监听认证状态变化
   */
  useEffect(() => {
    // 初始加载
    loadCurrentUser();

    // 订阅认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] 认证状态变化:', event);

      if (session?.user) {
        const user = supabaseUserToEntity(session.user);
        setCurrentUser(user);
        setLoading(false);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    currentUser,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refresh: loadCurrentUser,
    // 扩展方法（不影响现有接口）
    loginWithGoogle,
    resetPassword,
  };
}
