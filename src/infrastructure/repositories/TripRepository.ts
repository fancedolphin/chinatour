/**
 * Infrastructure Layer - Trip Repository Implementation
 * 行程仓储实现（基础设施层实现领域层接口）
 * ✅ 允许依赖：Domain Layer
 * ❌ 禁止依赖：Application Layer
 */

import { Trip, TripStatus } from '../../domain/entities/Trip';
import { ITripRepository } from '../../domain/repositories/ITripRepository';

/**
 * 行程仓储实现（使用本地存储模拟）
 * 在实际项目中，这里会连接真实的API或数据库
 */
export class TripRepository implements ITripRepository {
  private readonly STORAGE_KEY = 'trips';

  /**
   * 根据ID查找行程
   */
  async findById(id: string): Promise<Trip | null> {
    const trips = this.getAllTripsFromStorage();
    const tripData = trips.find(t => t.id === id);
    
    if (!tripData) return null;
    
    return this.deserializeTrip(tripData);
  }

  /**
   * 查找用户的所有行程
   */
  async findByUserId(userId: string): Promise<Trip[]> {
    const trips = this.getAllTripsFromStorage();
    return trips
      .filter(t => t.createdBy === userId)
      .map(t => this.deserializeTrip(t));
  }

  /**
   * 根据状态查找行程
   */
  async findByStatus(userId: string, status: TripStatus): Promise<Trip[]> {
    const trips = this.getAllTripsFromStorage();
    return trips
      .filter(t => t.createdBy === userId && t.status === status)
      .map(t => this.deserializeTrip(t));
  }

  /**
   * 保存行程（创建或更新）
   */
  async save(trip: Trip): Promise<Trip> {
    const trips = this.getAllTripsFromStorage();
    const existingIndex = trips.findIndex(t => t.id === trip.id);
    
    trip.updatedAt = new Date();
    const serialized = this.serializeTrip(trip);

    if (existingIndex >= 0) {
      trips[existingIndex] = serialized;
    } else {
      trips.push(serialized);
    }

    this.saveTripsToStorage(trips);
    return trip;
  }

  /**
   * 删除行程
   */
  async delete(id: string): Promise<boolean> {
    const trips = this.getAllTripsFromStorage();
    const filteredTrips = trips.filter(t => t.id !== id);
    
    if (filteredTrips.length === trips.length) {
      return false; // 没有找到要删除的行程
    }

    this.saveTripsToStorage(filteredTrips);
    return true;
  }

  /**
   * 搜索行程
   */
  async search(query: {
    userId?: string;
    destination?: string;
    startDate?: Date;
    endDate?: Date;
    status?: TripStatus;
  }): Promise<Trip[]> {
    const trips = this.getAllTripsFromStorage();
    
    return trips
      .filter(trip => {
        if (query.userId && trip.createdBy !== query.userId) return false;
        if (query.destination && !trip.destination.toLowerCase().includes(query.destination.toLowerCase())) return false;
        if (query.status && trip.status !== query.status) return false;
        if (query.startDate && new Date(trip.startDate) < query.startDate) return false;
        if (query.endDate && new Date(trip.endDate) > query.endDate) return false;
        return true;
      })
      .map(t => this.deserializeTrip(t));
  }

  /**
   * 获取热门行程
   */
  async getPopularTrips(limit: number): Promise<Trip[]> {
    const trips = this.getAllTripsFromStorage();
    
    // 简化实现：返回最新的公开行程
    return trips
      .filter(t => t.status === TripStatus.COMPLETED || t.status === TripStatus.CONFIRMED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map(t => this.deserializeTrip(t));
  }

  /**
   * 从LocalStorage获取所有行程
   */
  private getAllTripsFromStorage(): any[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load trips from storage:', error);
      return [];
    }
  }

  /**
   * 保存行程到LocalStorage
   */
  private saveTripsToStorage(trips: any[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trips));
    } catch (error) {
      console.error('Failed to save trips to storage:', error);
    }
  }

  /**
   * 序列化Trip实体为可存储的对象
   */
  private serializeTrip(trip: Trip): any {
    return {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      coverImage: trip.coverImage,
      status: trip.status,
      createdBy: trip.createdBy,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      days: trip.days,
      budget: trip.budget,
      travelers: trip.travelers,
      tags: trip.tags
    };
  }

  /**
   * 反序列化存储对象为Trip实体
   */
  private deserializeTrip(data: any): Trip {
    return new Trip(
      data.id,
      data.title,
      data.destination,
      new Date(data.startDate),
      new Date(data.endDate),
      data.coverImage,
      data.status as TripStatus,
      data.createdBy,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.days,
      data.budget,
      data.travelers,
      data.tags
    );
  }
}
