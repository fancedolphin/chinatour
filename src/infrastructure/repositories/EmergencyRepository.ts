/**
 * Infrastructure Layer - Emergency Repository Implementation
 * 应急信息仓储实现
 * ✅ 允许依赖：Domain Layer
 * ❌ 禁止依赖：Application Layer
 */

import { EmergencyInfo, EmergencyPhrase, PhraseCategory } from '../../domain/entities/EmergencyInfo';
import { IEmergencyRepository } from '../../domain/repositories/IEmergencyRepository';

/**
 * 应急信息仓储实现
 */
export class EmergencyRepository implements IEmergencyRepository {
  private readonly CACHE_KEY = 'emergency_info_cache';
  
  // 预定义的应急信息数据
  private readonly emergencyData: Map<string, EmergencyInfo> = new Map();

  constructor() {
    this.initializeData();
  }

  /**
   * 根据国家代码获取应急信息
   */
  async getByCountryCode(countryCode: string): Promise<EmergencyInfo | null> {
    return this.emergencyData.get(countryCode.toUpperCase()) || null;
  }

  /**
   * 根据国家名称获取应急信息
   */
  async getByCountryName(countryName: string): Promise<EmergencyInfo | null> {
    const normalizedName = countryName.toLowerCase();
    
    for (const [, info] of this.emergencyData) {
      if (info.country.toLowerCase() === normalizedName) {
        return info;
      }
    }
    
    return null;
  }

  /**
   * 获取所有支持的国家
   */
  async getSupportedCountries(): Promise<string[]> {
    return Array.from(this.emergencyData.keys());
  }

  /**
   * 缓存应急信息
   */
  async cache(emergencyInfo: EmergencyInfo): Promise<void> {
    try {
      const cache = this.getCache();
      cache[emergencyInfo.countryCode] = {
        ...emergencyInfo,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache emergency info:', error);
    }
  }

  /**
   * 获取缓存的应急信息
   */
  async getCached(countryCode: string): Promise<EmergencyInfo | null> {
    try {
      const cache = this.getCache();
      const cached = cache[countryCode.toUpperCase()];
      
      if (!cached) return null;
      
      // 检查缓存是否过期（30天）
      const cachedAt = new Date(cached.cachedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 30) {
        return null; // 缓存过期
      }
      
      return cached as EmergencyInfo;
    } catch (error) {
      console.error('Failed to get cached emergency info:', error);
      return null;
    }
  }

  /**
   * 获取缓存对象
   */
  private getCache(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.CACHE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * 初始化应急信息数据
   */
  private initializeData(): void {
    // 英国
    this.emergencyData.set('GB', new EmergencyInfo(
      'United Kingdom',
      'GB',
      {
        police: '999',
        ambulance: '999',
        fire: '999',
        general: '112'
      },
      this.getCommonPhrases('en'),
      {
        name: 'Chinese Embassy in UK',
        phone: '+44 20 7299 4049',
        address: '49-51 Portland Place, London W1B 1JL',
        email: 'chinaembassy_uk@mfa.gov.cn',
        website: 'http://www.chinese-embassy.org.uk',
        emergencyHotline: '+44 20 7636 9756'
      }
    ));

    // 法国
    this.emergencyData.set('FR', new EmergencyInfo(
      'France',
      'FR',
      {
        police: '17',
        ambulance: '15',
        fire: '18',
        general: '112'
      },
      this.getCommonPhrases('fr'),
      {
        name: 'Chinese Embassy in France',
        phone: '+33 1 49 52 19 50',
        address: '11 Avenue George V, 75008 Paris',
        email: 'chinaemb_fr@mfa.gov.cn',
        website: 'http://fr.china-embassy.org',
        emergencyHotline: '+33 1 53 75 88 31'
      }
    ));

    // 日本
    this.emergencyData.set('JP', new EmergencyInfo(
      'Japan',
      'JP',
      {
        police: '110',
        ambulance: '119',
        fire: '119'
      },
      this.getCommonPhrases('ja'),
      {
        name: 'Chinese Embassy in Japan',
        phone: '+81 3 3403 3388',
        address: '3-4-33 Moto-Azabu, Minato-ku, Tokyo 106-0046',
        email: 'chinaconsul_jp@mfa.gov.cn',
        website: 'http://www.china-embassy.or.jp',
        emergencyHotline: '+81 3 3403 5633'
      }
    ));

    // 美国
    this.emergencyData.set('US', new EmergencyInfo(
      'United States',
      'US',
      {
        police: '911',
        ambulance: '911',
        fire: '911'
      },
      this.getCommonPhrases('en'),
      {
        name: 'Chinese Embassy in USA',
        phone: '+1 202 495 2266',
        address: '3505 International Place NW, Washington DC 20008',
        email: 'chinaembassy_us@mfa.gov.cn',
        website: 'http://www.china-embassy.org',
        emergencyHotline: '+1 202 495 2216'
      }
    ));

    // 泰国
    this.emergencyData.set('TH', new EmergencyInfo(
      'Thailand',
      'TH',
      {
        police: '191',
        ambulance: '1669',
        fire: '199',
        general: '1155' // Tourist Police
      },
      this.getCommonPhrases('en'),
      {
        name: 'Chinese Embassy in Thailand',
        phone: '+66 2 245 7010',
        address: '57 Ratchadaphisek Road, Bangkok 10110',
        email: 'chinaemb_th@mfa.gov.cn',
        website: 'http://www.chinaembassy.or.th',
        emergencyHotline: '+66 2 245 0088'
      }
    ));
  }

  /**
   * 获取常用应急短语
   */
  private getCommonPhrases(language: string): EmergencyPhrase[] {
    const phrases: EmergencyPhrase[] = [];

    if (language === 'en') {
      phrases.push(
        {
          id: '1',
          english: 'Help!',
          local: 'Help!',
          category: PhraseCategory.HELP
        },
        {
          id: '2',
          english: 'I need a doctor',
          local: 'I need a doctor',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '3',
          english: 'Where is the hospital?',
          local: 'Where is the hospital?',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '4',
          english: 'I am lost',
          local: 'I am lost',
          category: PhraseCategory.DIRECTION
        },
        {
          id: '5',
          english: 'Call the police',
          local: 'Call the police',
          category: PhraseCategory.POLICE
        },
        {
          id: '6',
          english: 'I need an ambulance',
          local: 'I need an ambulance',
          category: PhraseCategory.MEDICAL
        }
      );
    } else if (language === 'fr') {
      phrases.push(
        {
          id: '1',
          english: 'Help!',
          local: 'Au secours!',
          pronunciation: 'oh-se-KOOR',
          category: PhraseCategory.HELP
        },
        {
          id: '2',
          english: 'I need a doctor',
          local: "J'ai besoin d'un médecin",
          pronunciation: 'zhay beh-ZWAN dun mehd-SAN',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '3',
          english: 'Where is the hospital?',
          local: "Où est l'hôpital?",
          pronunciation: 'oo ay loh-pee-TAL',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '4',
          english: 'I am lost',
          local: 'Je suis perdu(e)',
          pronunciation: 'zhuh swee pair-DEW',
          category: PhraseCategory.DIRECTION
        },
        {
          id: '5',
          english: 'Call the police',
          local: 'Appelez la police',
          pronunciation: 'ah-puh-LAY la po-LEES',
          category: PhraseCategory.POLICE
        },
        {
          id: '6',
          english: 'I need an ambulance',
          local: "J'ai besoin d'une ambulance",
          pronunciation: 'zhay beh-ZWAN doon ahm-bew-LAHNS',
          category: PhraseCategory.MEDICAL
        }
      );
    } else if (language === 'ja') {
      phrases.push(
        {
          id: '1',
          english: 'Help!',
          local: '助けて！(Tasukete!)',
          pronunciation: 'ta-su-ke-te',
          category: PhraseCategory.HELP
        },
        {
          id: '2',
          english: 'I need a doctor',
          local: '医者が必要です (Isha ga hitsuyō desu)',
          pronunciation: 'ee-sha ga hi-tsu-yo de-su',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '3',
          english: 'Where is the hospital?',
          local: '病院はどこですか？(Byōin wa doko desu ka?)',
          pronunciation: 'byo-in wa do-ko de-su ka',
          category: PhraseCategory.MEDICAL
        },
        {
          id: '4',
          english: 'I am lost',
          local: '道に迷いました (Michi ni mayoimashita)',
          pronunciation: 'mi-chi ni ma-yo-i-ma-shi-ta',
          category: PhraseCategory.DIRECTION
        },
        {
          id: '5',
          english: 'Call the police',
          local: '警察を呼んでください (Keisatsu o yonde kudasai)',
          pronunciation: 'ke-sa-tsu o yon-de ku-da-sai',
          category: PhraseCategory.POLICE
        },
        {
          id: '6',
          english: 'I need an ambulance',
          local: '救急車が必要です (Kyūkyūsha ga hitsuyō desu)',
          pronunciation: 'kyu-kyu-sha ga hi-tsu-yo de-su',
          category: PhraseCategory.MEDICAL
        }
      );
    }

    return phrases;
  }
}
