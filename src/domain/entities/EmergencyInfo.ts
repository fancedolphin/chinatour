/**
 * Domain Layer - EmergencyInfo Entity
 * 应急信息实体
 */

export interface EmergencyInfoEntity {
  country: string;
  countryCode: string;
  emergencyNumbers: EmergencyNumbers;
  embassy?: EmbassyInfo;
  commonPhrases: EmergencyPhrase[];
}

export interface EmergencyNumbers {
  police: string;
  ambulance: string;
  fire: string;
  general?: string; // 通用紧急号码，如112或911
}

export interface EmbassyInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  website?: string;
  emergencyHotline?: string;
}

export interface EmergencyPhrase {
  id: string;
  english: string;
  local: string;
  pronunciation?: string;
  category: PhraseCategory;
}

export enum PhraseCategory {
  HELP = 'help',
  MEDICAL = 'medical',
  DIRECTION = 'direction',
  POLICE = 'police',
  GENERAL = 'general'
}

/**
 * EmergencyInfo Entity 实现
 */
export class EmergencyInfo implements EmergencyInfoEntity {
  constructor(
    public country: string,
    public countryCode: string,
    public emergencyNumbers: EmergencyNumbers,
    public commonPhrases: EmergencyPhrase[],
    public embassy?: EmbassyInfo
  ) {}

  /**
   * 获取最重要的紧急电话
   */
  getPrimaryEmergencyNumber(): string {
    return this.emergencyNumbers.general || 
           this.emergencyNumbers.police || 
           '112';
  }

  /**
   * 获取特定类别的短语
   */
  getPhrasesByCategory(category: PhraseCategory): EmergencyPhrase[] {
    return this.commonPhrases.filter(phrase => phrase.category === category);
  }

  /**
   * 检查是否有大使馆信息
   */
  hasEmbassyInfo(): boolean {
    return this.embassy !== undefined;
  }

  /**
   * 工厂方法：创建紧急信息
   */
  static create(data: {
    country: string;
    countryCode: string;
    police: string;
    ambulance: string;
    fire: string;
    general?: string;
    embassy?: EmbassyInfo;
  }): EmergencyInfo {
    return new EmergencyInfo(
      data.country,
      data.countryCode,
      {
        police: data.police,
        ambulance: data.ambulance,
        fire: data.fire,
        general: data.general
      },
      [], // phrases will be added separately
      data.embassy
    );
  }
}
