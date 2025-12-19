/**
 * Application Layer - Get Feed Use Case
 * 获取信息流用例
 */

import { FeedItem, FeedType } from '../../domain/entities/FeedItem';
import { IFeedRepository } from '../../domain/repositories/IFeedRepository';

/**
 * 获取信息流输入DTO
 */
export interface GetFeedInput {
  userId: string;
  feedType?: 'recommended' | 'following' | 'type' | 'destination';
  type?: FeedType;
  destination?: string;
  limit?: number;
  offset?: number;
}

/**
 * 获取信息流输出DTO
 */
export interface GetFeedOutput {
  success: boolean;
  items: FeedItem[];
  hasMore: boolean;
  error?: string;
}

/**
 * 获取信息流用例
 */
export class GetFeedUseCase {
  constructor(private feedRepository: IFeedRepository) {}

  /**
   * 执行获取信息流
   */
  async execute(input: GetFeedInput): Promise<GetFeedOutput> {
    try {
      const limit = input.limit || 20;
      const offset = input.offset || 0;
      
      let items: FeedItem[] = [];

      switch (input.feedType) {
        case 'following':
          items = await this.feedRepository.getFollowingFeed(
            input.userId,
            limit + 1, // 多获取一条用于判断是否有更多
            offset
          );
          break;

        case 'type':
          if (!input.type) {
            return {
              success: false,
              items: [],
              hasMore: false,
              error: 'Type is required when feedType is "type"'
            };
          }
          items = await this.feedRepository.getByType(
            input.type,
            limit + 1,
            offset
          );
          break;

        case 'destination':
          if (!input.destination) {
            return {
              success: false,
              items: [],
              hasMore: false,
              error: 'Destination is required when feedType is "destination"'
            };
          }
          items = await this.feedRepository.getByDestination(
            input.destination,
            limit + 1,
            offset
          );
          break;

        case 'recommended':
        default:
          items = await this.feedRepository.getRecommendedFeed(
            input.userId,
            limit + 1,
            offset
          );
          break;
      }

      // 检查是否有更多内容
      const hasMore = items.length > limit;
      
      // 移除多余的一条
      if (hasMore) {
        items = items.slice(0, limit);
      }

      return {
        success: true,
        items,
        hasMore
      };
    } catch (error) {
      return {
        success: false,
        items: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Failed to get feed'
      };
    }
  }

  /**
   * 搜索信息流
   */
  async search(query: string, limit: number = 20, offset: number = 0): Promise<GetFeedOutput> {
    try {
      const items = await this.feedRepository.search(query, limit + 1, offset);
      
      const hasMore = items.length > limit;
      
      if (hasMore) {
        items.splice(limit);
      }

      return {
        success: true,
        items,
        hasMore
      };
    } catch (error) {
      return {
        success: false,
        items: [],
        hasMore: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }
}
