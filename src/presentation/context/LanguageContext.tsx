/**
 * Presentation Layer - Language Context (兼容层)
 *
 * 现已委托 react-i18next 实现，但保留 useLanguage()/LanguageProvider 的 API 形态，
 * 让旧代码（App.tsx / SettingsPage / TripPlannerBottomNav 等）无需一次性迁移。
 * 新代码请用 src/i18n/useT.ts 中的 useT()。
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { type SupportedLocale } from '@/i18n';

type Language = SupportedLocale;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // i18n 已在 src/i18n/index.ts 模块加载阶段初始化，这里只做 React 订阅。
  const { t, i18n: i18nFromHook } = useTranslation();
  const [language, setLanguageState] = useState<Language>(
    () => (i18nFromHook.language === 'en' ? 'en' : 'zh'),
  );

  useEffect(() => {
    const handler = (lng: string) => {
      if (lng === 'zh' || lng === 'en') {
        setLanguageState(lng);
      }
    };
    i18nFromHook.on('languageChanged', handler);
    return () => {
      i18nFromHook.off('languageChanged', handler);
    };
  }, [i18nFromHook]);

  const setLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
