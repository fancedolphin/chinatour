import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { followService } from '@/services/followService';
import { useT } from '@/i18n/useT';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  onToggle?: (isFollowing: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  onToggle,
  size = 'md',
}: FollowButtonProps) {
  const { t } = useT();
  const { currentUser } = useAuthContext();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsFollowing(initialIsFollowing);
    }
  }, [initialIsFollowing, loading]);

  if (currentUser?.id === targetUserId) {
    return null;
  }

  const buttonSize = size === 'md' ? 'default' : size;

  const handleClick = async () => {
    if (!currentUser) {
      toast.error(t('follow.loginRequired'));
      return;
    }

    if (loading) {
      return;
    }

    const optimisticValue = !isFollowing;
    setLoading(true);
    setIsFollowing(optimisticValue);
    onToggle?.(optimisticValue);

    try {
      const result = await followService.toggleFollow(targetUserId);
      if (result.isFollowing !== optimisticValue) {
        setIsFollowing(result.isFollowing);
        onToggle?.(result.isFollowing);
      }
    } catch (error) {
      const rollbackValue = !optimisticValue;
      setIsFollowing(rollbackValue);
      onToggle?.(rollbackValue);
      toast.error(error instanceof Error ? error.message : t('follow.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size={buttonSize}
      variant={isFollowing ? 'outline' : 'default'}
      className={isFollowing
        ? `min-w-24 border-gray-200 text-gray-600 ${hovered ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-50' : 'hover:bg-gray-50'}`
        : 'min-w-24 border-transparent bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'}
      disabled={loading}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        hovered ? t('follow.unfollow') : t('follow.following')
      ) : (
        t('follow.follow')
      )}
    </Button>
  );
}
