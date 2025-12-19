/**
 * Presentation Layer - User Adapter
 * 负责 Supabase User 与项目 User Entity 之间的类型转换
 */

import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserPreferences } from '../../domain/entities/User';
import { supabase } from '@/utils/supabase/client';

/**
 * 将 Supabase User 转换为项目 User Entity
 * @param supabaseUser - Supabase Auth 返回的用户对象
 * @param profile - 可选的 public.users 表中的用户资料
 * @returns User Entity 实例
 */
export function supabaseUserToEntity(supabaseUser: SupabaseUser, profile?: any): User {
  // 构建用户偏好设置
  const preferences: UserPreferences = {
    language: profile?.language || 'zh',
    currency: profile?.currency || 'CNY',
    travelStyle: profile?.travel_style,
    dietaryRestrictions: profile?.dietary_restrictions,
    notifications: {
      email: true,
      push: true,
      tripReminders: true,
    },
  };

  // 创建 User Entity 实例
  return new User(
    supabaseUser.id,
    supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || '',
    supabaseUser.email || '',
    supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.username || '',
    new Date(supabaseUser.created_at),
    new Date(supabaseUser.updated_at || supabaseUser.created_at),
    supabaseUser.user_metadata?.avatar_url,
    profile?.bio,
    preferences
  );
}

/**
 * 获取当前认证用户并转换为 User Entity
 * @returns User Entity 实例或 null（未登录）
 */
export async function getCurrentUserEntity(): Promise<User | null> {
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  // 选项1: 仅使用 Supabase Auth User（符合用户需求）
  return supabaseUserToEntity(supabaseUser);

  // 选项2: 如果未来需要，可从 public.users 加载完整资料
  // const { data: profile } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('id', supabaseUser.id)
  //   .single();
  // return supabaseUserToEntity(supabaseUser, profile);
}
