/**
 * Domain Layer - Travel Tip Repository Interface
 * 旅行提示仓储接口
 */

import { TravelTip } from '../entities/TravelTip';

export interface ITravelTipRepository {
  /**
   * 获取所有旅行提示
   */
  getAll(): Promise<TravelTip[]>;
  
  /**
   * 根据类别获取旅行提示
   */
  getByCategory(category: string): Promise<TravelTip[]>;
  
  /**
   * 根据ID获取旅行提示
   */
  getById(id: string): Promise<TravelTip | null>;
  
  /**
   * 搜索旅行提示
   */
  search(query: string): Promise<TravelTip[]>;
}
