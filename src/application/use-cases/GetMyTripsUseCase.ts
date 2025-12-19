/**
 * Application Layer - Get My Trips Use Case
 * 获取我的行程列表用例
 */

import { Trip, TripStatus } from '../../domain/entities/Trip';
import { ITripRepository } from '../../domain/repositories/ITripRepository';
import { TripPlanningService } from '../../domain/services/TripPlanningService';

/**
 * 获取我的行程输入DTO
 */
export interface GetMyTripsInput {
  userId: string;
  status?: TripStatus;
  sortBy?: 'date' | 'created' | 'updated';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 行程摘要DTO（用于列表展示）
 */
export interface TripSummaryDTO {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  coverImage: string;
  status: TripStatus;
  duration: number;
  summary: string;
  feasibilityScore?: number;
}

/**
 * 获取我的行程输出DTO
 */
export interface GetMyTripsOutput {
  success: boolean;
  trips: TripSummaryDTO[];
  statistics?: {
    total: number;
    byStatus: Record<TripStatus, number>;
    upcomingCount: number;
    completedCount: number;
  };
  error?: string;
}

/**
 * 获取我的行程用例
 */
export class GetMyTripsUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private planningService: TripPlanningService
  ) {}

  /**
   * 执行获取我的行程用例
   */
  async execute(input: GetMyTripsInput): Promise<GetMyTripsOutput> {
    try {
      // 1. 从仓储获取行程
      let trips: Trip[];
      
      if (input.status) {
        trips = await this.tripRepository.findByStatus(input.userId, input.status);
      } else {
        trips = await this.tripRepository.findByUserId(input.userId);
      }

      // 2. 排序
      trips = this.sortTrips(trips, input.sortBy || 'date', input.sortOrder || 'desc');

      // 3. 转换为摘要DTO
      const tripSummaries: TripSummaryDTO[] = trips.map(trip => ({
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        coverImage: trip.coverImage,
        status: trip.status,
        duration: trip.getDuration(),
        summary: this.planningService.generateSummary(trip),
        feasibilityScore: this.planningService.calculateFeasibilityScore(trip)
      }));

      // 4. 生成统计信息
      const statistics = this.generateStatistics(trips);

      return {
        success: true,
        trips: tripSummaries,
        statistics
      };
    } catch (error) {
      return {
        success: false,
        trips: [],
        error: error instanceof Error ? error.message : 'Failed to get trips'
      };
    }
  }

  /**
   * 排序行程
   */
  private sortTrips(trips: Trip[], sortBy: string, sortOrder: string): Trip[] {
    return [...trips].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = a.startDate.getTime() - b.startDate.getTime();
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updated':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 生成统计信息
   */
  private generateStatistics(trips: Trip[]) {
    const byStatus: Record<TripStatus, number> = {
      [TripStatus.DRAFT]: 0,
      [TripStatus.PLANNING]: 0,
      [TripStatus.CONFIRMED]: 0,
      [TripStatus.ONGOING]: 0,
      [TripStatus.COMPLETED]: 0,
      [TripStatus.CANCELLED]: 0
    };

    let upcomingCount = 0;
    let completedCount = 0;

    trips.forEach(trip => {
      byStatus[trip.status]++;
      
      if (trip.isActive()) {
        upcomingCount++;
      }
      
      if (trip.isCompleted()) {
        completedCount++;
      }
    });

    return {
      total: trips.length,
      byStatus,
      upcomingCount,
      completedCount
    };
  }
}
