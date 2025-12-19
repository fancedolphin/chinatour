/**
 * Domain Layer - Travel Tip Entity
 * 旅行提示实体
 */

export interface TravelTip {
  id: string;
  category: string;
  icon: string;
  title: string;
  titleEn: string;
  tips: TipItem[];
  tags: string[];
  priority: number; // 优先级，用于排序
}

export interface TipItem {
  text: string;
  textEn: string;
  highlight?: boolean; // 是否高亮显示
  color?: 'red' | 'blue' | 'green' | 'orange'; // 文字颜色
}

/**
 * 旅行提示类别
 */
export enum TravelTipCategory {
  FLIGHT = 'flight',
  TRAIN = 'train',
  PASSPORT = 'passport',
  SAFETY = 'safety',
  TIPS = 'tips',
  APP_USAGE = 'app_usage',
  PAYMENT = 'payment',
  COMMUNICATION = 'communication'
}
