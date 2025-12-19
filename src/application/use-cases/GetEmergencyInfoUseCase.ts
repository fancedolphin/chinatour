/**
 * Application Layer - Get Emergency Info Use Case
 * 获取应急信息用例
 */

import { EmergencyInfo } from '../../domain/entities/EmergencyInfo';
import { IEmergencyRepository } from '../../domain/repositories/IEmergencyRepository';

/**
 * 获取应急信息输入DTO
 */
export interface GetEmergencyInfoInput {
  countryCode?: string;
  countryName?: string;
  useCache?: boolean; // 是否使用缓存（用于离线场景）
}

/**
 * 获取应急信息输出DTO
 */
export interface GetEmergencyInfoOutput {
  success: boolean;
  emergencyInfo?: EmergencyInfo;
  error?: string;
  fromCache?: boolean;
}

/**
 * 获取应急信息用例
 */
export class GetEmergencyInfoUseCase {
  constructor(
    private emergencyRepository: IEmergencyRepository
  ) {}

  /**
   * 执行获取应急信息用例
   */
  async execute(input: GetEmergencyInfoInput): Promise<GetEmergencyInfoOutput> {
    try {
      let emergencyInfo: EmergencyInfo | null = null;
      let fromCache = false;

      // 1. 如果启用缓存，先尝试从缓存获取
      if (input.useCache && input.countryCode) {
        emergencyInfo = await this.emergencyRepository.getCached(input.countryCode);
        if (emergencyInfo) {
          fromCache = true;
        }
      }

      // 2. 如果缓存中没有，从远程获取
      if (!emergencyInfo) {
        if (input.countryCode) {
          emergencyInfo = await this.emergencyRepository.getByCountryCode(input.countryCode);
        } else if (input.countryName) {
          emergencyInfo = await this.emergencyRepository.getByCountryName(input.countryName);
        }

        // 3. 如果获取成功，缓存起来
        if (emergencyInfo) {
          await this.emergencyRepository.cache(emergencyInfo);
        }
      }

      if (!emergencyInfo) {
        return {
          success: false,
          error: 'Emergency information not found for the specified country'
        };
      }

      return {
        success: true,
        emergencyInfo,
        fromCache
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get emergency information'
      };
    }
  }

  /**
   * 获取所有支持的国家列表
   */
  async getSupportedCountries(): Promise<string[]> {
    try {
      return await this.emergencyRepository.getSupportedCountries();
    } catch (error) {
      console.error('Failed to get supported countries:', error);
      return [];
    }
  }

  /**
   * 预缓存常用国家的应急信息
   */
  async preCachePopularCountries(countryCodes: string[]): Promise<void> {
    try {
      const promises = countryCodes.map(async (code) => {
        const info = await this.emergencyRepository.getByCountryCode(code);
        if (info) {
          await this.emergencyRepository.cache(info);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to pre-cache emergency information:', error);
    }
  }
}
