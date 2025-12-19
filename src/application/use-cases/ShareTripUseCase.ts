/**
 * Application Layer - Share Trip Use Case
 * 分享行程用例
 */

import { Trip } from '../../domain/entities/Trip';
import { ITripRepository } from '../../domain/repositories/ITripRepository';

/**
 * 分享平台枚举
 */
export enum SharePlatform {
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  WHATSAPP = 'whatsapp',
  PINTEREST = 'pinterest',
  EMAIL = 'email',
  WECHAT = 'wechat',
  WEIBO = 'weibo'
}

/**
 * 分享样式枚举
 */
export enum ShareStyle {
  MODERN = 'modern',
  MINIMAL = 'minimal',
  INSTAGRAM_POST = 'instagram',
  INSTAGRAM_STORY = 'story'
}

/**
 * 分享行程输入DTO
 */
export interface ShareTripInput {
  tripId: string;
  platform: SharePlatform;
  style?: ShareStyle;
  includeQR?: boolean;
}

/**
 * 分享行程输出DTO
 */
export interface ShareTripOutput {
  success: boolean;
  shareUrl?: string;
  imageUrl?: string;
  error?: string;
}

/**
 * 分享数据接口（用于外部服务）
 */
export interface ShareData {
  trip: Trip;
  style: ShareStyle;
  platform: SharePlatform;
}

/**
 * 分享服务接口（由基础设施层实现）
 */
export interface IShareService {
  generateShareImage(data: ShareData): Promise<string>;
  shareToSocialMedia(platform: SharePlatform, url: string, trip: Trip): Promise<boolean>;
  generateShareUrl(tripId: string): string;
}

/**
 * 分享行程用例
 */
export class ShareTripUseCase {
  constructor(
    private tripRepository: ITripRepository,
    private shareService: IShareService
  ) {}

  /**
   * 执行分享行程用例
   */
  async execute(input: ShareTripInput): Promise<ShareTripOutput> {
    try {
      // 1. 获取行程
      const trip = await this.tripRepository.findById(input.tripId);
      
      if (!trip) {
        return {
          success: false,
          error: 'Trip not found'
        };
      }

      // 2. 检查行程是否可以分享
      if (!trip.canBeShared()) {
        return {
          success: false,
          error: 'Trip cannot be shared in its current state'
        };
      }

      // 3. 生成分享URL
      const shareUrl = this.shareService.generateShareUrl(trip.id);

      // 4. 根据样式生成分享图片
      const style = input.style || ShareStyle.MODERN;
      const shareData: ShareData = {
        trip,
        style,
        platform: input.platform
      };

      const imageUrl = await this.shareService.generateShareImage(shareData);

      // 5. 如果需要，直接分享到社交媒体
      if (input.platform !== SharePlatform.EMAIL) {
        await this.shareService.shareToSocialMedia(input.platform, shareUrl, trip);
      }

      return {
        success: true,
        shareUrl,
        imageUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share trip'
      };
    }
  }

  /**
   * 获取分享统计
   */
  async getShareStats(tripId: string): Promise<{
    totalShares: number;
    platformBreakdown: Record<SharePlatform, number>;
  }> {
    // 这里可以添加分享统计逻辑
    // 暂时返回模拟数据
    return {
      totalShares: 0,
      platformBreakdown: {} as Record<SharePlatform, number>
    };
  }
}
