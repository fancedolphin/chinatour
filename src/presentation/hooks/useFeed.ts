/**
 * Presentation Layer - useFeed Hook
 * 信息流相关的React Hook
 */

import { useState, useEffect } from 'react';
import { container } from '../../infrastructure/di/Container';
import { FeedItem, FeedType } from '../../domain/entities/FeedItem';

/**
 * 信息流Hook配置
 */
interface UseFeedOptions {
  feedType?: 'recommended' | 'following' | 'type' | 'destination';
  type?: FeedType;
  destination?: string;
  autoLoad?: boolean;
}

/**
 * 信息流Hook
 */
export function useFeed(userId: string, options: UseFeedOptions = {}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const getFeedUseCase = container.getGetFeedUseCase();
  const limit = 20;

  /**
   * 加载信息流
   */
  const loadFeed = async (reset: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;

      const result = await getFeedUseCase.execute({
        userId,
        feedType: options.feedType || 'recommended',
        type: options.type,
        destination: options.destination,
        limit,
        offset: currentOffset
      });

      if (result.success) {
        if (reset) {
          setItems(result.items);
          setOffset(limit);
        } else {
          setItems(prev => [...prev, ...result.items]);
          setOffset(prev => prev + limit);
        }
        setHasMore(result.hasMore);
      } else {
        setError(result.error || 'Failed to load feed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载更多
   */
  const loadMore = async () => {
    if (!loading && hasMore) {
      await loadFeed(false);
    }
  };

  /**
   * 刷新
   */
  const refresh = async () => {
    await loadFeed(true);
  };

  /**
   * 搜索
   */
  const search = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getFeedUseCase.search(query, limit, 0);

      if (result.success) {
        setItems(result.items);
        setHasMore(result.hasMore);
        setOffset(limit);
      } else {
        setError(result.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 点赞
   */
  const likeItem = async (itemId: string) => {
    const feedRepository = container.getFeedRepository();
    
    try {
      const item = await feedRepository.findById(itemId);
      if (item) {
        item.likes += 1;
        await feedRepository.save(item);
        
        // 更新本地状态
        setItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, likes: i.likes + 1 } : i
        ));
      }
    } catch (err) {
      console.error('Failed to like item:', err);
    }
  };

  /**
   * 收藏
   */
  const saveItem = async (itemId: string) => {
    const feedRepository = container.getFeedRepository();
    
    try {
      const item = await feedRepository.findById(itemId);
      if (item) {
        item.saves += 1;
        await feedRepository.save(item);
        
        setItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, saves: i.saves + 1 } : i
        ));
      }
    } catch (err) {
      console.error('Failed to save item:', err);
    }
  };

  // 自动加载
  useEffect(() => {
    if (options.autoLoad !== false && userId) {
      loadFeed(true);
    }
  }, [userId, options.feedType, options.type, options.destination]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    search,
    likeItem,
    saveItem
  };
}
