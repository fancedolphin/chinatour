/**
 * Domain Layer - Trip Planning Service
 * 行程规划领域服务（处理跨实体的业务逻辑）
 */

import { Trip, TripDay, Activity } from '../entities/Trip';

/**
 * 行程规划领域服务
 * 包含跨实体的复杂业务逻辑
 */
export class TripPlanningService {
  /**
   * 计算行程总预算
   */
  calculateTotalBudget(trip: Trip): number {
    if (!trip.budget) return 0;

    const breakdown = trip.budget.breakdown;
    if (!breakdown) return trip.budget.total;

    return (
      (breakdown.accommodation || 0) +
      (breakdown.food || 0) +
      (breakdown.transportation || 0) +
      (breakdown.activities || 0) +
      (breakdown.other || 0)
    );
  }

  /**
   * 计算每日预算
   */
  calculateDailyBudget(trip: Trip): number {
    const total = this.calculateTotalBudget(trip);
    const duration = trip.getDuration();
    return duration > 0 ? total / duration : 0;
  }

  /**
   * 验证行程日期连续性
   */
  validateDayContinuity(trip: Trip): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trip.days || trip.days.length === 0) {
      return { valid: true, errors: [] };
    }

    const sortedDays = [...trip.days].sort((a, b) => a.day - b.day);

    for (let i = 0; i < sortedDays.length; i++) {
      if (sortedDays[i].day !== i + 1) {
        errors.push(`Missing day ${i + 1} in trip schedule`);
      }
    }

    const expectedDays = trip.getDuration();
    if (sortedDays.length !== expectedDays) {
      errors.push(`Trip should have ${expectedDays} days but has ${sortedDays.length}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 优化行程活动时间
   */
  optimizeActivitySchedule(day: TripDay): TripDay {
    // 按时间排序活动
    const sortedActivities = [...day.activities].sort((a, b) => {
      const timeA = this.parseTime(a.time);
      const timeB = this.parseTime(b.time);
      return timeA - timeB;
    });

    // 检查时间冲突并调整
    const optimizedActivities: Activity[] = [];
    let currentEndTime = 0;

    for (const activity of sortedActivities) {
      const startTime = this.parseTime(activity.time);
      
      if (startTime < currentEndTime) {
        // 时间冲突，调整到前一个活动结束后
        activity.time = this.formatTime(currentEndTime);
      }

      optimizedActivities.push(activity);
      currentEndTime = this.parseTime(activity.time) + activity.duration;
    }

    return {
      ...day,
      activities: optimizedActivities
    };
  }

  /**
   * 计算行程的可行性分数
   */
  calculateFeasibilityScore(trip: Trip): number {
    let score = 100;

    // 检查每天的活动数量
    if (trip.days) {
      for (const day of trip.days) {
        if (day.activities.length > 8) {
          score -= 10; // 活动太多
        }
        if (day.activities.length < 2) {
          score -= 5; // 活动太少
        }

        // 检查每天的总时间
        const totalDuration = day.activities.reduce((sum, act) => sum + act.duration, 0);
        if (totalDuration > 720) { // 超过12小时
          score -= 15;
        }
      }
    }

    // 检查预算合理性
    if (trip.budget) {
      const dailyBudget = this.calculateDailyBudget(trip);
      if (dailyBudget < 100) {
        score -= 10; // 预算可能太低
      }
      if (dailyBudget > 5000) {
        score -= 5; // 预算可能太高
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成行程摘要
   */
  generateSummary(trip: Trip): string {
    const duration = trip.getDuration();
    const destination = trip.destination;
    const activitiesCount = trip.days?.reduce((sum, day) => sum + day.activities.length, 0) || 0;
    
    return `${duration}天${destination}之旅，包含${activitiesCount}个精彩活动`;
  }

  /**
   * 辅助方法：解析时间字符串为分钟数
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * 辅助方法：格式化分钟数为时间字符串
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * 检查活动地点的地理距离合理性
   */
  checkLocationProximity(activities: Activity[]): { reasonable: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // 这里可以添加基于地理坐标的距离计算
    // 简化实现：检查是否有坐标信息
    for (let i = 0; i < activities.length - 1; i++) {
      const current = activities[i];
      const next = activities[i + 1];

      if (current.location.coordinates && next.location.coordinates) {
        // 计算距离（简化版本）
        const distance = this.calculateDistance(
          current.location.coordinates,
          next.location.coordinates
        );

        // 如果两个活动之间距离超过20公里但时间间隔小于30分钟
        const timeDiff = this.parseTime(next.time) - this.parseTime(current.time) - current.duration;
        if (distance > 20 && timeDiff < 30) {
          warnings.push(
            `从 ${current.location.name} 到 ${next.location.name} 可能需要更多时间（距离：${distance.toFixed(1)}km）`
          );
        }
      }
    }

    return {
      reasonable: warnings.length === 0,
      warnings
    };
  }

  /**
   * 计算两点之间的距离（简化的Haversine公式）
   */
  private calculateDistance(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRad(coord2.latitude - coord1.latitude);
    const dLon = this.toRad(coord2.longitude - coord1.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.latitude)) *
      Math.cos(this.toRad(coord2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
