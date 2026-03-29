/**
 * Comment Service
 *
 * 评论服务层 — 评论 CRUD、点赞、分页查询
 */

import { supabase } from '@/utils/supabase/client';
import type { Tables, TablesInsert } from '@/types/database';

export type TripComment = Tables<'trip_comments'>;
export type CommentLike = Tables<'comment_likes'>;

/** 评论展示结构（join users） */
export interface CommentWithAuthor {
  id: string;
  sharedTripId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  replies: CommentWithAuthor[];
  liked: boolean;
}

// 应用层防刷：记录最近发送时间
const recentPostTimestamps: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function checkRateLimit(): boolean {
  const now = Date.now();
  // 清理窗口外的记录
  while (recentPostTimestamps.length > 0 && recentPostTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    recentPostTimestamps.shift();
  }
  return recentPostTimestamps.length < RATE_LIMIT_MAX;
}

function recordPost(): void {
  recentPostTimestamps.push(Date.now());
}

export const commentService = {
  /**
   * 获取某个共享行程的评论列表（含回复和作者信息）
   */
  async getComments(
    sharedTripId: string,
    userId?: string
  ): Promise<CommentWithAuthor[]> {
    // 获取所有顶层评论 + 回复
    const { data, error } = await supabase
      .from('trip_comments')
      .select(`
        id,
        shared_trip_id,
        parent_id,
        content,
        likes_count,
        created_at,
        user_id,
        users (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('shared_trip_id', sharedTripId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[commentService] 获取评论失败:', error.message);
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    // 获取当前用户的点赞状态
    let likedSet = new Set<string>();
    if (userId) {
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', (data ?? []).map((c: any) => c.id));

      likedSet = new Set((likes ?? []).map((l: any) => l.comment_id));
    }

    const rows = (data ?? []) as any[];

    const toComment = (row: any): CommentWithAuthor => ({
      id: row.id,
      sharedTripId: row.shared_trip_id,
      parentId: row.parent_id,
      content: row.content,
      likesCount: row.likes_count ?? 0,
      createdAt: row.created_at ?? '',
      author: {
        id: row.users?.id ?? row.user_id,
        name: row.users?.display_name ?? '用户',
        avatar: row.users?.avatar_url ?? null,
      },
      replies: [],
      liked: likedSet.has(row.id),
    });

    // 组装嵌套结构：顶层评论 + 回复
    const commentMap = new Map<string, CommentWithAuthor>();
    const topLevel: CommentWithAuthor[] = [];

    for (const row of rows) {
      const comment = toComment(row);
      commentMap.set(comment.id, comment);
    }

    for (const comment of commentMap.values()) {
      if (comment.parentId && commentMap.has(comment.parentId)) {
        commentMap.get(comment.parentId)!.replies.push(comment);
      } else {
        topLevel.push(comment);
      }
    }

    return topLevel;
  },

  /**
   * 发表评论
   */
  async createComment(
    sharedTripId: string,
    userId: string,
    content: string,
    parentId?: string
  ): Promise<TripComment> {
    if (!checkRateLimit()) {
      throw new Error('评论太频繁，请稍后再试');
    }

    const payload: TablesInsert<'trip_comments'> = {
      shared_trip_id: sharedTripId,
      user_id: userId,
      content: content.trim(),
      parent_id: parentId ?? null,
    };

    const { data, error } = await supabase
      .from('trip_comments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[commentService] 发表评论失败:', error.message);
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    recordPost();
    return data!;
  },

  /**
   * 删除评论（软删除）
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_comments')
      .update({ is_deleted: true })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      console.error('[commentService] 删除评论失败:', error.message);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  },

  /**
   * 切换评论点赞
   */
  async toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
    // 检查是否已点赞
    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // 取消点赞
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existing.id);

      if (error) throw new Error(`Failed to unlike comment: ${error.message}`);
      return false;
    } else {
      // 点赞
      const { error } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: userId });

      if (error) throw new Error(`Failed to like comment: ${error.message}`);
      return true;
    }
  },
};

export default commentService;
