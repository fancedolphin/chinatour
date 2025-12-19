/**
 * Infrastructure Layer - Travel Tip Repository Implementation
 * 旅行提示仓储实现
 */

import { ITravelTipRepository } from '../../domain/repositories/ITravelTipRepository';
import { TravelTip, TravelTipCategory } from '../../domain/entities/TravelTip';

export class TravelTipRepository implements ITravelTipRepository {
  private travelTips: TravelTip[] = [
    {
      id: 'tip-flight',
      category: TravelTipCategory.FLIGHT,
      icon: '✈️',
      title: '国内航班液体规定（严格执行）',
      titleEn: 'Domestic Flight Liquid Regulations (Strictly Enforced)',
      priority: 1,
      tags: ['航班', '飞机', '液体', '充电宝', '安检', 'flight', 'airplane', 'liquid', 'powerbank', 'security'],
      tips: [
        {
          text: '手提行李禁止携带任何液体，包括100ml以下的液体',
          textEn: 'No liquids allowed in carry-on luggage, including those under 100ml',
          highlight: true,
          color: 'red'
        },
        {
          text: '所有液体（化妆品、饮料等）必须托运',
          textEn: 'All liquids (cosmetics, drinks, etc.) must be checked in',
        },
        {
          text: '充电宝只能随身携带，且必须有CCC认证标识',
          textEn: 'Power banks must be carried with you and must have CCC certification mark',
          highlight: true,
          color: 'red'
        },
        {
          text: '充电宝容量不超过20000mAh，工作人员会严格检查',
          textEn: 'Power bank capacity must not exceed 20000mAh, strictly checked',
        },
        {
          text: '建议提前2小时到机场，所有航班都很准时',
          textEn: 'Arrive at airport 2 hours early, all flights are punctual',
        }
      ]
    },
    {
      id: 'tip-train',
      category: TravelTipCategory.TRAIN,
      icon: '🚄',
      title: '火车出行小贴士',
      titleEn: 'Train Travel Tips',
      priority: 2,
      tags: ['火车', '高铁', '行李', '热水', 'train', 'luggage', 'hot water'],
      tips: [
        {
          text: '行李尺寸要求不严格，但不要过分夸张',
          textEn: 'Luggage size requirements are not strict, but don\'t be excessive',
        },
        {
          text: '列车员会帮忙整理行李架上垂下的背包带',
          textEn: 'Train attendants will help organize hanging backpack straps',
        },
        {
          text: '每节车厢有免费热水和冷水供应站',
          textEn: 'Free hot and cold water dispensers in each carriage',
          highlight: true,
          color: 'blue'
        },
        {
          text: '长途旅行可带泡面、茶包等，随时取水冲泡',
          textEn: 'Bring instant noodles and tea bags for long trips, get hot water anytime',
        },
        {
          text: '车上提供充电插座（部分列车）',
          textEn: 'Power outlets available on train (selected trains)',
        }
      ]
    },
    {
      id: 'tip-passport',
      category: TravelTipCategory.PASSPORT,
      icon: '🛂',
      title: '护照使用频率',
      titleEn: 'Passport Usage Frequency',
      priority: 3,
      tags: ['护照', '证件', '景点', '酒店', 'passport', 'ID', 'attractions', 'hotel'],
      tips: [
        {
          text: '护照会频繁使用，建议随身携带',
          textEn: 'Passport will be used frequently, keep it with you',
          highlight: true,
          color: 'blue'
        },
        {
          text: '景点购票、入场都需要出示护照',
          textEn: 'Passport required for ticket purchase and entry to attractions',
        },
        {
          text: '酒店入住需要护照登记',
          textEn: 'Passport required for hotel check-in registration',
        },
        {
          text: '火车站、机场安检需要护照+车票/机票',
          textEn: 'Passport + ticket required for train/airport security',
        },
        {
          text: '部分景点有外国人优惠，记得出示护照',
          textEn: 'Some attractions offer foreigner discounts, show your passport',
        },
        {
          text: '建议拍照或复印护照备用',
          textEn: 'Recommended to photocopy or take photos of your passport',
        }
      ]
    },
    {
      id: 'tip-safety',
      category: TravelTipCategory.SAFETY,
      icon: '👥',
      title: '安全与文化交流',
      titleEn: 'Safety and Cultural Exchange',
      priority: 4,
      tags: ['安全', '文化', '交流', '支付', 'safety', 'culture', 'payment'],
      tips: [
        {
          text: '中国治安非常安全，可放心游览',
          textEn: 'China is very safe, feel free to explore',
          highlight: true,
          color: 'green'
        },
        {
          text: '当地人对外国游客友好且好奇',
          textEn: 'Locals are friendly and curious about foreign tourists',
        },
        {
          text: '经常会被邀请合照，这是友好的表现',
          textEn: 'Often invited to take photos, it\'s a sign of friendliness',
        },
        {
          text: '大多数人不会说英语，建议使用翻译App',
          textEn: 'Most people don\'t speak English, use translation apps',
        },
        {
          text: '移动支付（微信/支付宝）非常普及，现金使用较少',
          textEn: 'Mobile payment (WeChat/Alipay) is ubiquitous, cash rarely used',
        },
        {
          text: '公共场所有大量监控摄像头，保障安全',
          textEn: 'Many surveillance cameras in public areas ensure safety',
        }
      ]
    },
    {
      id: 'tip-general',
      category: TravelTipCategory.TIPS,
      icon: '💡',
      title: '其他实用建议',
      titleEn: 'Other Practical Tips',
      priority: 5,
      tags: ['建议', '提示', 'WiFi', '手机卡', '门票', 'tips', 'wifi', 'sim card', 'tickets'],
      tips: [
        {
          text: '提前下载所有App并完成注册（避免旅途中操作）',
          textEn: 'Download and register all apps in advance (avoid during trip)',
        },
        {
          text: '外国信用卡在部分地方不能使用，建议绑定支付宝',
          textEn: 'Foreign credit cards don\'t work everywhere, bind to Alipay',
        },
        {
          text: '大多数公共场所提供免费WiFi',
          textEn: 'Free WiFi available in most public places',
        },
        {
          text: '购买中国手机卡可以使用所有App（支付宝、微信等）',
          textEn: 'Chinese SIM card enables all apps (Alipay, WeChat, etc.)',
        },
        {
          text: '景点门票建议在美团或携程提前预订，更便宜',
          textEn: 'Book attraction tickets on Meituan or Ctrip in advance, cheaper',
        }
      ]
    },
    {
      id: 'tip-app-usage',
      category: TravelTipCategory.APP_USAGE,
      icon: '📱',
      title: 'App使用建议',
      titleEn: 'App Usage Tips',
      priority: 6,
      tags: ['App', '应用', '手机号', '实名', '支付宝', '微信', 'application', 'phone number', 'alipay', 'wechat'],
      tips: [
        {
          text: '所有App注册都需要中国手机号，建议抵达后购买电话卡',
          textEn: 'All app registrations require Chinese phone number, buy SIM card upon arrival',
          highlight: true,
          color: 'blue'
        },
        {
          text: '实名认证通常需要中国身份证，外国游客可用护照',
          textEn: 'Real-name verification requires Chinese ID, foreigners can use passport',
          highlight: true,
          color: 'blue'
        },
        {
          text: '高德地图离线地图功能可节省大量流量',
          textEn: 'Amap offline maps save lots of data',
        },
        {
          text: '支付宝可绑定国际信用卡，微信支付更复杂',
          textEn: 'Alipay supports international cards, WeChat Pay is more complex',
        },
        {
          text: 'Google Translate在中国需要VPN，建议提前下载离线语言包',
          textEn: 'Google Translate needs VPN in China, download offline language packs',
        },
        {
          text: '收藏常用地点和路线，提高出行效率',
          textEn: 'Save favorite places and routes for efficient travel',
        }
      ]
    },
    {
      id: 'tip-payment',
      category: TravelTipCategory.PAYMENT,
      icon: '💳',
      title: '支付方式指南',
      titleEn: 'Payment Methods Guide',
      priority: 7,
      tags: ['支付', '现金', '支付宝', '微信', '信用卡', 'payment', 'cash', 'alipay', 'wechat', 'credit card'],
      tips: [
        {
          text: '支付宝和微信支付是主流，现金使用较少',
          textEn: 'Alipay and WeChat Pay are mainstream, cash rarely used',
        },
        {
          text: '小商店可能只接受移动支付',
          textEn: 'Small shops may only accept mobile payment',
        },
        {
          text: '支付宝Tour Pass可绑定国际信用卡',
          textEn: 'Alipay Tour Pass supports international credit cards',
        },
        {
          text: '地铁、公交可用支付宝/微信扫码支付',
          textEn: 'Metro and buses accept Alipay/WeChat QR code payment',
        },
        {
          text: '建议随身携带少量现金备用',
          textEn: 'Keep some cash as backup',
        }
      ]
    },
    {
      id: 'tip-communication',
      category: TravelTipCategory.COMMUNICATION,
      icon: '🗣️',
      title: '语言与沟通',
      titleEn: 'Language and Communication',
      priority: 8,
      tags: ['语言', '翻译', '沟通', '英语', 'language', 'translation', 'communication', 'english'],
      tips: [
        {
          text: '大城市的年轻人可能会一些英语',
          textEn: 'Young people in big cities may speak some English',
        },
        {
          text: '使用翻译App进行文字交流效果很好',
          textEn: 'Translation apps work well for text communication',
        },
        {
          text: '地铁和公交站牌通常有英文标注',
          textEn: 'Metro and bus signs usually have English',
        },
        {
          text: '酒店前台通常有英语服务',
          textEn: 'Hotel reception usually provides English service',
        },
        {
          text: '学几句基本中文会让当地人很开心',
          textEn: 'Learning basic Chinese phrases makes locals happy',
        }
      ]
    }
  ];

  async getAll(): Promise<TravelTip[]> {
    // 按优先级排序
    return [...this.travelTips].sort((a, b) => a.priority - b.priority);
  }

  async getByCategory(category: string): Promise<TravelTip[]> {
    return this.travelTips.filter(tip => tip.category === category);
  }

  async getById(id: string): Promise<TravelTip | null> {
    return this.travelTips.find(tip => tip.id === id) || null;
  }

  async search(query: string): Promise<TravelTip[]> {
    if (!query || query.trim() === '') {
      return this.getAll();
    }

    const lowerQuery = query.toLowerCase().trim();
    
    return this.travelTips.filter(tip => {
      // 搜索标题
      const titleMatch = tip.title.toLowerCase().includes(lowerQuery) ||
                        tip.titleEn.toLowerCase().includes(lowerQuery);
      
      // 搜索标签
      const tagMatch = tip.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
      
      // 搜索提示内容
      const tipsMatch = tip.tips.some(item => 
        item.text.toLowerCase().includes(lowerQuery) ||
        item.textEn.toLowerCase().includes(lowerQuery)
      );
      
      return titleMatch || tagMatch || tipsMatch;
    }).sort((a, b) => a.priority - b.priority);
  }
}
