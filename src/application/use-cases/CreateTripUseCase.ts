/**
 * Application Layer - Create Trip Use Case
 * 创建行程用例（应用层协调领域层和基础设施层）
 */

import { Trip } from '../../domain/entities/Trip';
import { ITripRepository } from '../../domain/repositories/ITripRepository';
import { TripPlanningService } from '../../domain/services/TripPlanningService';

/**
 * 创建行程用例的输入DTO
 */
export interface CreateTripInput {
  userId: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  coverImage?: string;
  travelers?: number;
  budget?: {
    total: number;
    currency: string;
  };
}

/**
 * 创建行程用例的输出DTO
 */
export interface CreateTripOutput {
  success: boolean;
  trip?: Trip;
  errors?: string[];
}

/**
 * 创建行程用例
 * 依赖注入：ITripRepository（通过构造函数注入）
 */
export class CreateTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private planningService: TripPlanningService
  ) {}

  /**
   * 执行创建行程用例
   */
  async execute(input: CreateTripInput): Promise<CreateTripOutput> {
    try {
      // 1. 使用领域层的工厂方法创建Trip实体
      const trip = Trip.create({
        title: input.title,
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
        userId: input.userId,
        coverImage: input.coverImage
      });

      // 2. 设置额外属性
      if (input.travelers) {
        trip.travelers = input.travelers;
      }

      if (input.budget) {
        trip.budget = {
          total: input.budget.total,
          currency: input.budget.currency,
          spent: 0
        };
      }

      // 3. 通过仓储保存
      const savedTrip = await this.tripRepository.save(trip);

      return {
        success: true,
        trip: savedTrip
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }
}
