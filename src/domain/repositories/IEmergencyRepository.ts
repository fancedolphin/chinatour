/**
 * Domain Layer - Emergency Repository Interface
 * 应急信息仓储接口
 */

import { EmergencyInfo } from '../entities/EmergencyInfo';

/**
 * 应急信息仓储接口
 */
export interface IEmergencyRepository {
  /**
   * 根据国家代码获取应急信息
   */
  getByCountryCode(countryCode: string): Promise<EmergencyInfo | null>;

  /**
   * 根据国家名称获取应急信息
   */
  getByCountryName(countryName: string): Promise<EmergencyInfo | null>;

  /**
   * 获取所有支持的国家
   */
  getSupportedCountries(): Promise<string[]>;

  /**
   * 缓存应急信息（用于离线访问）
   */
  cache(emergencyInfo: EmergencyInfo): Promise<void>;

  /**
   * 获取缓存的应急信息
   */
  getCached(countryCode: string): Promise<EmergencyInfo | null>;
}
