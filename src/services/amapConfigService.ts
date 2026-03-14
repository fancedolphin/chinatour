import { supabase } from '@/utils/supabase/client';

export type AmapConfig = {
  key: string;
  securityCode: string;
};

export async function getAmapConfig(): Promise<AmapConfig> {
  const fallback = {
    key: import.meta.env.VITE_AMAP_API_KEY || '74532255ab3d624097f260fe675838f0',
    securityCode: import.meta.env.VITE_AMAP_SECURITY_CODE || 'f00fa54b50d07f4fd29779d1bb8d44ef',
  };

  if (fallback.key && fallback.securityCode) {
    return fallback;
  }

  const { data, error } = await supabase.functions.invoke('amap-config');
  if (!error && data?.key && data?.securityCode) {
    return data as AmapConfig;
  }

  throw new Error('地图配置错误');
}

export default {
  getAmapConfig,
};
