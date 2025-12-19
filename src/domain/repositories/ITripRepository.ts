/**
 * Domain Layer - Trip Repository Interface
 * 行程仓储接口（领域层定义，基础设施层实现）
 */

import { Trip, TripStatus } from '../entities/Trip';

/**
 * 行程仓储接口
 * 注意：这是一个接口，不依赖任何具体实现
 */
export interface ITripRepository {
  /**
   * 根据ID查找行程
   */
  findById(id: string): Promise<Trip | null>;

  /**
   * 查找用户的所有行程
   */
  findByUserId(userId: string): Promise<Trip[]>;

  /**
   * 根据状态查找行程
   */
  findByStatus(userId: string, status: TripStatus): Promise<Trip[]>;

  /**
   * 保存行程（创建或更新）
   */
  save(trip: Trip): Promise<Trip>;

  /**
   * 删除行程
   */
  delete(id: string): Promise<boolean>;

  /**
   * 搜索行程
   */
  search(query: {
    userId?: string;
    destination?: string;
    startDate?: Date;
    endDate?: Date;
    status?: TripStatus;
  }): Promise<Trip[]>;

  /**
   * 获取热门行程
   */
  getPopularTrips(limit: number): Promise<Trip[]>;
}
