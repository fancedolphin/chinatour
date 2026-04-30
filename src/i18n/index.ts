import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './zh.json';
import en from './en.json';
import { setLocaleResolver } from '@/utils/formatters';

export type SupportedLocale = 'zh' | 'en';

const STORAGE_KEY = 'language';
const FALLBACK: SupportedLocale = 'zh';

function resolveInitialLocale(): SupportedLocale {
  // Build-time locale takes precedence — it identifies which site the user is on.
  // 中文站和英文站是不同 URL，用户切换语言不应跨站。Settings 页里仍允许覆盖（写入 localStorage）。
  const buildLocale = import.meta.env?.VITE_LOCALE;
  if (buildLocale === 'zh' || buildLocale === 'en') {
    return buildLocale;
  }
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') {
      return saved;
    }
  }
  return FALLBACK;
}

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: resolveInitialLocale(),
  fallbackLng: FALLBACK,
  supportedLngs: ['zh', 'en'],
  interpolation: {
    escapeValue: false, // React already handles XSS escaping.
  },
  returnNull: false,
});

setLocaleResolver(() => (i18n.language === 'en' ? 'en' : 'zh'));

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    if (lng === 'zh' || lng === 'en') {
      window.localStorage.setItem(STORAGE_KEY, lng);
    }
    document.documentElement.setAttribute('lang', lng);
  });
}

/**
 * 数据层使用的当前 locale。
 * 服务层（ragService 等）调 supabase RPC 时传 `locale_filter` 用，
 * 跟 i18next 当前语言保持一致。在 React 渲染外可调用，无 hook 依赖。
 */
export function getCurrentLocale(): SupportedLocale {
  return i18n.language === 'en' ? 'en' : 'zh';
}

export default i18n;
