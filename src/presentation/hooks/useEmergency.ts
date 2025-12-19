/**
 * Presentation Layer - useEmergency Hook
 * 应急信息相关的React Hook
 */

import { useState, useEffect } from 'react';
import { container } from '../../infrastructure/di/Container';
import { EmergencyInfo } from '../../domain/entities/EmergencyInfo';

/**
 * 应急信息Hook
 */
export function useEmergency(countryCode?: string) {
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportedCountries, setSupportedCountries] = useState<string[]>([]);

  const getEmergencyInfoUseCase = container.getGetEmergencyInfoUseCase();

  /**
   * 加载应急信息
   */
  const loadEmergencyInfo = async (code: string, useCache: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getEmergencyInfoUseCase.execute({
        countryCode: code,
        useCache
      });

      if (result.success && result.emergencyInfo) {
        setEmergencyInfo(result.emergencyInfo);
      } else {
        setError(result.error || 'Failed to load emergency info');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载支持的国家列表
   */
  const loadSupportedCountries = async () => {
    try {
      const countries = await getEmergencyInfoUseCase.getSupportedCountries();
      setSupportedCountries(countries);
    } catch (err) {
      console.error('Failed to load supported countries:', err);
    }
  };

  /**
   * 预缓存常用国家
   */
  const preCacheCountries = async (countryCodes: string[]) => {
    try {
      await getEmergencyInfoUseCase.preCachePopularCountries(countryCodes);
    } catch (err) {
      console.error('Failed to pre-cache countries:', err);
    }
  };

  // 自动加载
  useEffect(() => {
    if (countryCode) {
      loadEmergencyInfo(countryCode);
    }
    loadSupportedCountries();
  }, [countryCode]);

  return {
    emergencyInfo,
    loading,
    error,
    supportedCountries,
    loadEmergencyInfo,
    preCacheCountries
  };
}
