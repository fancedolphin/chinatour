/**
 * Application Layer - Get Travel Tips Use Case
 * 获取旅行提示用例
 */

import { ITravelTipRepository } from '../../domain/repositories/ITravelTipRepository';
import { TravelTip } from '../../domain/entities/TravelTip';

export class GetTravelTipsUseCase {
  constructor(private travelTipRepository: ITravelTipRepository) {}

  /**
   * 执行：获取所有旅行提示
   */
  async execute(): Promise<TravelTip[]> {
    return await this.travelTipRepository.getAll();
  }

  /**
   * 按类别获取
   */
  async executeByCategory(category: string): Promise<TravelTip[]> {
    return await this.travelTipRepository.getByCategory(category);
  }

  /**
   * 搜索旅行提示
   */
  async executeSearch(query: string): Promise<TravelTip[]> {
    return await this.travelTipRepository.search(query);
  }
}
