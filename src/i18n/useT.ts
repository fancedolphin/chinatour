import { useTranslation } from 'react-i18next';
import type { SupportedLocale } from './index';

/**
 * 新代码请用 useT()，返回与 i18next 一致的 t/i18n。
 * 旧代码可继续用 useLanguage()，那是 LanguageContext 的兼容层（同样走 i18next）。
 */
export function useT() {
  const { t, i18n } = useTranslation();
  return {
    t,
    locale: i18n.language as SupportedLocale,
    setLocale(next: SupportedLocale) {
      void i18n.changeLanguage(next);
    },
  };
}
