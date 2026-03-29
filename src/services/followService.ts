import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert } from '@/types/database';

export type UserFollow = Tables<'user_follows'>;
export type PublicUserProfile = Tables<'users'>;

interface FollowCounts {
  followers: number;
  following: number;
}

async function requireCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('请先登录');
  }

  return user.id;
}

function mapProfile(row: any): PublicUserProfile {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    followers_count: row.followers_count ?? 0,
    following_count: row.following_count ?? 0,
    language: row.language,
    theme: row.theme,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const followService = {
  async followUser(targetUserId: string): Promise<void> {
    const currentUserId = await requireCurrentUserId();

    if (currentUserId === targetUserId) {
      throw new Error('不能关注自己');
    }

    const payload: TablesInsert<'user_follows'> = {
      follower_id: currentUserId,
      following_id: targetUserId,
    };

    const { error } = await supabase.from('user_follows').insert(payload);

    if (error && error.code !== '23505') {
      throw new Error(`Failed to follow user: ${error.message}`);
    }
  },

  async unfollowUser(targetUserId: string): Promise<void> {
    const currentUserId = await requireCurrentUserId();

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error) {
      throw new Error(`Failed to unfollow user: ${error.message}`);
    }
  },

  async toggleFollow(targetUserId: string): Promise<{ isFollowing: boolean }> {
    const isFollowing = await followService.isFollowing(targetUserId);

    if (isFollowing) {
      await followService.unfollowUser(targetUserId);
      return { isFollowing: false };
    }

    await followService.followUser(targetUserId);
    return { isFollowing: true };
  },

  async isFollowing(targetUserId: string): Promise<boolean> {
    const currentUserId = await requireCurrentUserId();

    const { data, error } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check follow status: ${error.message}`);
    }

    return Boolean(data);
  },

  async getBatchFollowingStatus(targetUserIds: string[]): Promise<Record<string, boolean>> {
    if (targetUserIds.length === 0) {
      return {};
    }

    let currentUserId: string;
    try {
      currentUserId = await requireCurrentUserId();
    } catch {
      return {};
    }

    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
      .in('following_id', targetUserIds);

    if (error) {
      throw new Error(`Failed to fetch following status: ${error.message}`);
    }

    const status: Record<string, boolean> = {};
    for (const id of targetUserIds) {
      status[id] = false;
    }
    for (const row of data ?? []) {
      status[row.following_id] = true;
    }
    return status;
  },

  async getFollowingList(userId: string, page: number = 0): Promise<PublicUserProfile[]> {
    const from = page * 20;
    const to = from + 19;

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following:users!user_follows_following_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          followers_count,
          following_count,
          language,
          theme,
          created_at,
          updated_at
        )
      `)
      .eq('follower_id', userId)
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch following list: ${error.message}`);
    }

    return (data ?? [])
      .map((row: any) => row.following)
      .filter(Boolean)
      .map(mapProfile);
  },

  async getFollowersList(userId: string, page: number = 0): Promise<PublicUserProfile[]> {
    const from = page * 20;
    const to = from + 19;

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        follower:users!user_follows_follower_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio,
          followers_count,
          following_count,
          language,
          theme,
          created_at,
          updated_at
        )
      `)
      .eq('following_id', userId)
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch followers list: ${error.message}`);
    }

    return (data ?? [])
      .map((row: any) => row.follower)
      .filter(Boolean)
      .map(mapProfile);
  },

  async getFollowCounts(userId: string): Promise<FollowCounts> {
    const { data, error } = await supabase
      .from('users')
      .select('followers_count, following_count')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch follow counts: ${error.message}`);
    }

    return {
      followers: data?.followers_count ?? 0,
      following: data?.following_count ?? 0,
    };
  },
};

export default followService;
