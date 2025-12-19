/**
 * Presentation Layer - Travel Tips Hook
 * 旅行提示Hook
 */

import { useState, useEffect } from 'react';
import { TravelTip } from '../../domain/entities/TravelTip';
import { container } from '../../infrastructure/di/Container';

export function useTravelTips() {
  const [tips, setTips] = useState<TravelTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTips, setFilteredTips] = useState<TravelTip[]>([]);

  /**
   * 加载所有旅行提示
   */
  const loadTips = async () => {
    try {
      setLoading(true);
      setError(null);
      const travelTipsUseCase = container.getTravelTipsUseCase();
      const data = await travelTipsUseCase.execute();
      setTips(data);
      setFilteredTips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load travel tips');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 搜索旅行提示
   */
  const searchTips = async (query: string) => {
    try {
      setSearchQuery(query);
      setLoading(true);
      const travelTipsUseCase = container.getTravelTipsUseCase();
      const results = await travelTipsUseCase.executeSearch(query);
      setFilteredTips(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 按类别筛选
   */
  const filterByCategory = async (category: string) => {
    try {
      setLoading(true);
      const travelTipsUseCase = container.getTravelTipsUseCase();
      if (category === 'all') {
        const data = await travelTipsUseCase.execute();
        setFilteredTips(data);
      } else {
        const data = await travelTipsUseCase.executeByCategory(category);
        setFilteredTips(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadTips();
  }, []);

  return {
    tips,
    filteredTips,
    loading,
    error,
    searchQuery,
    searchTips,
    filterByCategory,
    refresh: loadTips
  };
}
