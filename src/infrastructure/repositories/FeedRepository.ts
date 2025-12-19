/**
 * Infrastructure Layer - Feed Repository Implementation
 * 信息流仓储实现
 * ✅ 允许依赖：Domain Layer
 * ❌ 禁止依赖：Application Layer
 */

import { FeedItem, FeedType, FeedAuthor } from '../../domain/entities/FeedItem';
import { IFeedRepository } from '../../domain/repositories/IFeedRepository';

/**
 * 信息流仓储实现
 */
export class FeedRepository implements IFeedRepository {
  private readonly STORAGE_KEY = 'feed_items';

  /**
   * 根据ID查找内容
   */
  async findById(id: string): Promise<FeedItem | null> {
    const items = this.getAllItemsFromStorage();
    const itemData = items.find(i => i.id === id);
    
    if (!itemData) return null;
    
    return this.deserializeFeedItem(itemData);
  }

  /**
   * 获取推荐信息流
   */
  async getRecommendedFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]> {
    const items = this.getAllItemsFromStorage();
    
    // 简化实现：返回最新的内容
    // 在实际项目中，这里会有推荐算法
    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
      .map(i => this.deserializeFeedItem(i));
  }

  /**
   * 获取关注的用户的信息流
   */
  async getFollowingFeed(userId: string, limit: number, offset: number): Promise<FeedItem[]> {
    // 简化实现：返回推荐信息流
    // 在实际项目中，这里会查询关注关系
    return this.getRecommendedFeed(userId, limit, offset);
  }

  /**
   * 根据类型获取信息流
   */
  async getByType(type: FeedType, limit: number, offset: number): Promise<FeedItem[]> {
    const items = this.getAllItemsFromStorage();
    
    return items
      .filter(i => i.type === type)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
      .map(i => this.deserializeFeedItem(i));
  }

  /**
   * 根据目的地获取信息流
   */
  async getByDestination(destination: string, limit: number, offset: number): Promise<FeedItem[]> {
    const items = this.getAllItemsFromStorage();
    
    return items
      .filter(i => i.destination?.toLowerCase().includes(destination.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
      .map(i => this.deserializeFeedItem(i));
  }

  /**
   * 搜索信息流
   */
  async search(query: string, limit: number, offset: number): Promise<FeedItem[]> {
    const items = this.getAllItemsFromStorage();
    const lowerQuery = query.toLowerCase();
    
    return items
      .filter(i => 
        i.title.toLowerCase().includes(lowerQuery) ||
        i.content?.toLowerCase().includes(lowerQuery) ||
        i.destination?.toLowerCase().includes(lowerQuery) ||
        i.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit)
      .map(i => this.deserializeFeedItem(i));
  }

  /**
   * 保存信息流项目
   */
  async save(feedItem: FeedItem): Promise<FeedItem> {
    const items = this.getAllItemsFromStorage();
    const existingIndex = items.findIndex(i => i.id === feedItem.id);
    
    const serialized = this.serializeFeedItem(feedItem);

    if (existingIndex >= 0) {
      items[existingIndex] = serialized;
    } else {
      items.push(serialized);
    }

    this.saveItemsToStorage(items);
    return feedItem;
  }

  /**
   * 删除信息流项目
   */
  async delete(id: string): Promise<boolean> {
    const items = this.getAllItemsFromStorage();
    const filteredItems = items.filter(i => i.id !== id);
    
    if (filteredItems.length === items.length) {
      return false;
    }

    this.saveItemsToStorage(filteredItems);
    return true;
  }

  /**
   * 初始化示例数据
   */
  async initializeSampleData(): Promise<void> {
    const existingItems = this.getAllItemsFromStorage();
    
    if (existingItems.length > 0) {
      return; // 已有数据，不需要初始化
    }

    const sampleItems: FeedItem[] = [
      FeedItem.create({
        type: FeedType.TRIP_SHARE,
        title: '东京7日深度游，樱花季最全攻略！',
        images: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800'],
        author: {
          id: 'user1',
          name: '旅行达人小红',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          verified: true
        },
        content: '樱花季去东京真的太美了！给大家分享一下我的完整行程...',
        destination: 'Tokyo',
        tags: ['东京', '樱花', '日本', '旅行攻略']
      }),
      FeedItem.create({
        type: FeedType.PHOTO,
        title: '巴黎铁塔的日落，浪漫到极致',
        images: ['https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800'],
        author: {
          id: 'user2',
          name: '摄影师Lisa',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100'
        },
        destination: 'Paris',
        tags: ['巴黎', '埃菲尔铁塔', '日落', '摄影']
      }),
      FeedItem.create({
        type: FeedType.TIP,
        title: '泰国旅行省钱攻略！人均3k玩转曼谷',
        images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=800'],
        author: {
          id: 'user3',
          name: '穷游小王',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
        },
        content: '分享一些在泰国旅行的省钱小技巧...',
        destination: 'Bangkok',
        tags: ['泰国', '曼谷', '省钱', '攻略']
      })
    ];

    for (const item of sampleItems) {
      await this.save(item);
    }
  }

  /**
   * 从LocalStorage获取所有项目
   */
  private getAllItemsFromStorage(): any[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load feed items from storage:', error);
      return [];
    }
  }

  /**
   * 保存项目到LocalStorage
   */
  private saveItemsToStorage(items: any[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save feed items to storage:', error);
    }
  }

  /**
   * 序列化FeedItem实体
   */
  private serializeFeedItem(item: FeedItem): any {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content,
      images: item.images,
      author: item.author,
      destination: item.destination,
      tags: item.tags,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      createdAt: item.createdAt.toISOString()
    };
  }

  /**
   * 反序列化FeedItem实体
   */
  private deserializeFeedItem(data: any): FeedItem {
    return new FeedItem(
      data.id,
      data.type as FeedType,
      data.title,
      data.images || [],
      data.author as FeedAuthor,
      data.likes || 0,
      data.comments || 0,
      data.saves || 0,
      new Date(data.createdAt),
      data.content,
      data.destination,
      data.tags
    );
  }
}
