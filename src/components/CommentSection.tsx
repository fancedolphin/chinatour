import { useState, useEffect } from 'react';
import { Heart, Reply, Trash2, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { commentService, type CommentWithAuthor } from '@/services/commentService';

interface CommentSectionProps {
  sharedTripId: string;
  onCommentsCountChange?: (count: number) => void;
}

export function CommentSection({ sharedTripId, onCommentsCountChange }: CommentSectionProps) {
  const { currentUser } = useAuthContext();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; authorName: string } | null>(null);

  useEffect(() => {
    loadComments();
  }, [sharedTripId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getComments(sharedTripId, currentUser?.id);
      setComments(data);
    } catch (err) {
      console.error('[CommentSection] 加载评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + c.replies.length,
    0
  );

  const handleSubmit = async () => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    const content = newComment.trim();
    if (!content) return;
    if (content.length > 500) {
      toast.error('评论不能超过 500 字');
      return;
    }

    try {
      setSubmitting(true);
      await commentService.createComment(
        sharedTripId,
        currentUser.id,
        content,
        replyTo?.id
      );
      setNewComment('');
      setReplyTo(null);
      await loadComments();
      onCommentsCountChange?.(totalCount + 1);
      toast.success('评论成功');
    } catch (err) {
      toast.error('评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;
    try {
      await commentService.deleteComment(commentId, currentUser.id);
      await loadComments();
      onCommentsCountChange?.(Math.max(0, totalCount - 1));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const handleToggleLike = async (commentId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    try {
      const liked = await commentService.toggleCommentLike(commentId, currentUser.id);
      setComments((prev) =>
        updateCommentLike(prev, commentId, liked)
      );
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div id="comments" className="bg-white rounded-xl p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        评论 ({totalCount})
      </h3>

      {/* 评论输入框 */}
      <div className="mb-6">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
            <span>回复 @{replyTo.authorName}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? '写下你的评论...' : '登录后即可评论'}
            className="flex-1 resize-none min-h-[80px]"
            maxLength={500}
            disabled={!currentUser}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">
            {newComment.length}/500
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting || !currentUser}
            className="gap-1"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            发送
          </Button>
        </div>
      </div>

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-gray-400 py-8">暂无评论，来发表第一条吧</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.id}
              onReply={(id, name) => setReplyTo({ id, authorName: name })}
              onDelete={handleDelete}
              onToggleLike={handleToggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- CommentItem ---

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId?: string;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  onToggleLike: (commentId: string) => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onToggleLike,
  isReply = false,
}: CommentItemProps) {
  const timeAgo = formatTimeAgo(comment.createdAt);
  const isOwner = currentUserId === comment.author.id;

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-10' : ''}`}>
      <ImageWithFallback
        src={comment.author.avatar || ''}
        alt={comment.author.name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {comment.author.name}
          </span>
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>

        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
          {comment.content}
        </p>

        {/* 操作栏 */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => onToggleLike(comment.id)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                comment.liked ? 'fill-red-500 text-red-500' : ''
              }`}
            />
            {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
          </button>

          {!isReply && (
            <button
              onClick={() => onReply(comment.id, comment.author.name)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              回复
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          )}
        </div>

        {/* 回复列表 */}
        {comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                onToggleLike={onToggleLike}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function updateCommentLike(
  comments: CommentWithAuthor[],
  commentId: string,
  liked: boolean
): CommentWithAuthor[] {
  return comments.map((c) => {
    if (c.id === commentId) {
      return {
        ...c,
        liked,
        likesCount: c.likesCount + (liked ? 1 : -1),
      };
    }
    if (c.replies.length > 0) {
      return { ...c, replies: updateCommentLike(c.replies, commentId, liked) };
    }
    return c;
  });
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}
