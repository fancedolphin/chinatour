/**
 * Domain Layer - Feed Repository Interface
 * 信息流仓储接口
 */

import { FeedItem, FeedType } from '../entities/FeedItem';

/**
 * 信息流仓储接口
 */
export interface IFeedRepository {
  /**
   * 根据ID查找内容
   */
  findById(id: string): Promise<FeedItem | null>;

  /**
   * 获取推荐信息流
   */
  getRecommendedFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]>;

  /**
   * 获取关注的用户的信息流
   */
  getFollowingFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]>;

  /**
   * 根据类型获取信息流
   */
  getByType(type: FeedType, limit: number, offset: number): Promise<FeedItem[]>;

  /**
   * 根据目的地获取信息流
   */
  getByDestination(destination: string, limit: number, offset: number): Promise<FeedItem[]>;

  /**
   * 搜索信息流
   */
  search(query: string, limit: number, offset: number): Promise<FeedItem[]>;

  /**
   * 保存信息流项目
   */
  save(feedItem: FeedItem): Promise<FeedItem>;

  /**
   * 删除信息流项目
   */
  delete(id: string): Promise<boolean>;
}
