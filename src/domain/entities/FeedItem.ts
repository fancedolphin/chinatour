/**
 * Domain Layer - FeedItem Entity
 * 信息流内容实体
 */

export interface FeedItemEntity {
  id: string;
  type: FeedType;
  title: string;
  content?: string;
  images: string[];
  author: FeedAuthor;
  destination?: string;
  tags?: string[];
  likes: number;
  comments: number;
  saves: number;
  createdAt: Date;
  
  // 业务方法
  isPopular(): boolean;
  canBeInteracted(): boolean;
}

export enum FeedType {
  TRIP_SHARE = 'trip_share',
  PHOTO = 'photo',
  TIP = 'tip',
  REVIEW = 'review',
  RECOMMENDATION = 'recommendation'
}

export interface FeedAuthor {
  id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
}

/**
 * FeedItem Entity 实现
 */
export class FeedItem implements FeedItemEntity {
  constructor(
    public id: string,
    public type: FeedType,
    public title: string,
    public images: string[],
    public author: FeedAuthor,
    public likes: number,
    public comments: number,
    public saves: number,
    public createdAt: Date,
    public content?: string,
    public destination?: string,
    public tags?: string[]
  ) {}

  isPopular(): boolean {
    // 业务规则：超过100个点赞或50个评论认为是热门
    return this.likes > 100 || this.comments > 50;
  }

  canBeInteracted(): boolean {
    // 业务规则：只有发布的内容才能被互动
    return true; // 可以扩展更复杂的规则
  }

  /**
   * 工厂方法：创建信息流项目
   */
  static create(data: {
    type: FeedType;
    title: string;
    images: string[];
    author: FeedAuthor;
    content?: string;
    destination?: string;
    tags?: string[];
  }): FeedItem {
    return new FeedItem(
      crypto.randomUUID(),
      data.type,
      data.title,
      data.images,
      data.author,
      0, // initial likes
      0, // initial comments
      0, // initial saves
      new Date(),
      data.content,
      data.destination,
      data.tags
    );
  }
}
