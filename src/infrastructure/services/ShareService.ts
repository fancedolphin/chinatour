/**
 * Infrastructure Layer - Share Service Implementation
 * 分享服务实现（实现应用层定义的接口）
 * ✅ 允许依赖：Domain Layer
 * ❌ 禁止依赖：Application Layer
 */

import { Trip } from '../../domain/entities/Trip';
import { IShareService, ShareData, SharePlatform } from '../../application/use-cases/ShareTripUseCase';

/**
 * 分享服务实现
 */
export class ShareService implements IShareService {
  private readonly BASE_URL = window.location.origin;

  /**
   * 生成分享图片
   */
  async generateShareImage(data: ShareData): Promise<string> {
    // 这里应该使用html2canvas或类似库生成图片
    // 简化实现：返回封面图片URL
    return data.trip.coverImage || '';
  }

  /**
   * 分享到社交媒体
   */
  async shareToSocialMedia(platform: SharePlatform, url: string, trip: Trip): Promise<boolean> {
    const shareText = this.generateShareText(trip);
    
    try {
      switch (platform) {
        case SharePlatform.INSTAGRAM:
          // Instagram不支持直接分享链接，提示用户手动分享
          this.showInstagramShareGuide(url, trip);
          return true;

        case SharePlatform.FACEBOOK:
          this.shareToFacebook(url, shareText);
          return true;

        case SharePlatform.TWITTER:
          this.shareToTwitter(url, shareText);
          return true;

        case SharePlatform.WHATSAPP:
          this.shareToWhatsApp(url, shareText);
          return true;

        case SharePlatform.PINTEREST:
          this.shareToPinterest(url, trip.coverImage, shareText);
          return true;

        case SharePlatform.EMAIL:
          this.shareViaEmail(url, trip);
          return true;

        case SharePlatform.WECHAT:
          // 微信分享需要特殊处理
          this.showWeChatShareGuide(url);
          return true;

        case SharePlatform.WEIBO:
          this.shareToWeibo(url, shareText);
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to share to social media:', error);
      return false;
    }
  }

  /**
   * 生成分享URL
   */
  generateShareUrl(tripId: string): string {
    return `${this.BASE_URL}/trip/${tripId}`;
  }

  /**
   * 生成分享文本
   */
  private generateShareText(trip: Trip): string {
    return `Check out my ${trip.getDuration()}-day trip to ${trip.destination}! 🌍✈️`;
  }

  /**
   * 分享到Facebook
   */
  private shareToFacebook(url: string, text: string): void {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
  }

  /**
   * 分享到Twitter
   */
  private shareToTwitter(url: string, text: string): void {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}&hashtags=travel,trip`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  }

  /**
   * 分享到WhatsApp
   */
  private shareToWhatsApp(url: string, text: string): void {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(whatsappUrl, '_blank');
  }

  /**
   * 分享到Pinterest
   */
  private shareToPinterest(url: string, imageUrl: string, description: string): void {
    const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(description)}`;
    window.open(pinterestUrl, '_blank', 'width=750,height=550');
  }

  /**
   * 通过邮件分享
   */
  private shareViaEmail(url: string, trip: Trip): void {
    const subject = `Check out my trip to ${trip.destination}`;
    const body = `I wanted to share my ${trip.getDuration()}-day trip to ${trip.destination} with you!\n\nView the full itinerary here: ${url}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }

  /**
   * 分享到微博
   */
  private shareToWeibo(url: string, text: string): void {
    const weiboUrl = `http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    window.open(weiboUrl, '_blank', 'width=600,height=400');
  }

  /**
   * 显示Instagram分享指南
   */
  private showInstagramShareGuide(url: string, trip: Trip): void {
    alert(`To share on Instagram:\n1. Save the trip image\n2. Open Instagram app\n3. Create a new post with the image\n4. Add this link in your bio or story: ${url}`);
  }

  /**
   * 显示微信分享指南
   */
  private showWeChatShareGuide(url: string): void {
    alert(`To share on WeChat:\n1. Copy this link: ${url}\n2. Open WeChat\n3. Paste the link in chat or Moments`);
  }
}
