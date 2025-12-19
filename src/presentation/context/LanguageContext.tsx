/**
 * Presentation Layer - Language Context
 * 多语言上下文
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * 翻译字典
 */
const translations: Record<Language, Record<string, string>> = {
  zh: {
    // 通用
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    
    // 导航
    'nav.home': '首页',
    'nav.plan': '规划',
    'nav.explore': '发现',
    'nav.trips': '行程',
    'nav.profile': '我的',
    'nav.tips': '旅行提示',
    
    // 登录/注册
    'auth.login': '登录',
    'auth.register': '注册',
    'auth.logout': '退出登录',
    'auth.username': '用户名',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.displayName': '昵称',
    'auth.confirmPassword': '确认密码',
    'auth.welcomeBack': '欢迎回来',
    'auth.createAccount': '创建账号',
    'auth.subtitle': '开启你的旅行规划之旅',
    'auth.usernamePlaceholder': '请输入用户名',
    'auth.displayNamePlaceholder': '请输入昵称',
    'auth.emailPlaceholder': '请输入邮箱',
    'auth.passwordPlaceholder': '请输入密码',
    'auth.confirmPasswordPlaceholder': '请再次输入密码',
    'auth.loginSuccess': '登录成功',
    'auth.registerSuccess': '注册成功',
    'auth.noAccount': '还没有账号？',
    'auth.registerNow': '立即注册',
    'auth.hasAccount': '已有账号？',
    'auth.loginNow': '立即登录',
    'auth.or': '或',
    
    // 行程
    'trip.create': '创建行程',
    'trip.share': '分享行程',
    'trip.delete': '删除行程',
    'trip.destination': '目的地',
    'trip.startDate': '开始日期',
    'trip.endDate': '结束日期',
    'trip.duration': '行程天数',
    'trip.planning': '规划中',
    'trip.upcoming': '即将出发',
    'trip.ongoing': '进行中',
    'trip.completed': '已完成',
    'trip.cancelled': '已取消',
    'trip.shareSuccess': '分享成功',
    
    // 发现
    'explore.trending': '热门',
    'explore.following': '关注',
    'explore.search': '搜索',
    
    // 应急
    'emergency.title': '应急助手',
    'emergency.police': '报警电话',
    'emergency.ambulance': '急救电话',
    'emergency.fire': '火警电话',
    'emergency.embassy': '大使馆'
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Navigation
    'nav.home': 'Home',
    'nav.plan': 'Plan',
    'nav.explore': 'Explore',
    'nav.trips': 'Trips',
    'nav.profile': 'Profile',
    'nav.tips': 'Travel Tips',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.username': 'Username',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.displayName': 'Display Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.welcomeBack': 'Welcome Back',
    'auth.createAccount': 'Create Account',
    'auth.subtitle': 'Start Your Travel Planning Journey',
    'auth.usernamePlaceholder': 'Enter username',
    'auth.displayNamePlaceholder': 'Enter display name',
    'auth.emailPlaceholder': 'Enter email',
    'auth.passwordPlaceholder': 'Enter password',
    'auth.confirmPasswordPlaceholder': 'Re-enter password',
    'auth.loginSuccess': 'Login successful',
    'auth.registerSuccess': 'Registration successful',
    'auth.noAccount': 'No account?',
    'auth.registerNow': 'Register now',
    'auth.hasAccount': 'Have an account?',
    'auth.loginNow': 'Login now',
    'auth.or': 'or',
    
    // Trip
    'trip.create': 'Create Trip',
    'trip.share': 'Share Trip',
    'trip.delete': 'Delete Trip',
    'trip.destination': 'Destination',
    'trip.startDate': 'Start Date',
    'trip.endDate': 'End Date',
    'trip.duration': 'Duration',
    'trip.planning': 'Planning',
    'trip.upcoming': 'Upcoming',
    'trip.ongoing': 'Ongoing',
    'trip.completed': 'Completed',
    'trip.cancelled': 'Cancelled',
    'trip.shareSuccess': 'Share successful',
    
    // Explore
    'explore.trending': 'Trending',
    'explore.following': 'Following',
    'explore.search': 'Search',
    
    // Emergency
    'emergency.title': 'Emergency Assistant',
    'emergency.police': 'Police',
    'emergency.ambulance': 'Ambulance',
    'emergency.fire': 'Fire',
    'emergency.embassy': 'Embassy'
  }
};

/**
 * 语言Provider
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'zh' || saved === 'en') ? saved : 'zh';
  });

  /**
   * 设置语言
   */
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  /**
   * 翻译函数
   */
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * 使用语言上下文的Hook
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}
