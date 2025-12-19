/**
 * Presentation Layer - useTrips Hook
 * 行程相关的React Hook（表现层）
 */

import { useState, useEffect } from 'react';
import { container } from '../../infrastructure/di/Container';
import { TripSummaryDTO } from '../../application/use-cases/GetMyTripsUseCase';
import { TripStatus } from '../../domain/entities/Trip';

/**
 * 行程Hook
 * 封装行程相关的业务逻辑
 */
export function useTrips(userId: string) {
  const [trips, setTrips] = useState<TripSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取Use Case
  const getMyTripsUseCase = container.getGetMyTripsUseCase();

  /**
   * 加载行程列表
   */
  const loadTrips = async (status?: TripStatus) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getMyTripsUseCase.execute({
        userId,
        status,
        sortBy: 'date',
        sortOrder: 'desc'
      });

      if (result.success) {
        setTrips(result.trips);
      } else {
        setError(result.error || 'Failed to load trips');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 创建新行程
   */
  const createTrip = async (data: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    coverImage?: string;
  }) => {
    const createTripUseCase = container.getCreateTripUseCase();
    
    const result = await createTripUseCase.execute({
      userId,
      ...data
    });

    if (result.success) {
      // 重新加载行程列表
      await loadTrips();
      return { success: true, trip: result.trip };
    } else {
      return { success: false, errors: result.errors };
    }
  };

  /**
   * 分享行程
   */
  const shareTrip = async (tripId: string, platform: string, style?: string) => {
    const shareTripUseCase = container.getShareTripUseCase();
    
    const result = await shareTripUseCase.execute({
      tripId,
      platform: platform as any,
      style: style as any
    });

    return result;
  };

  // 自动加载行程
  useEffect(() => {
    if (userId) {
      loadTrips();
    }
  }, [userId]);

  return {
    trips,
    loading,
    error,
    loadTrips,
    createTrip,
    shareTrip,
    refresh: loadTrips
  };
}
