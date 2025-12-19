/**
 * Presentation Layer - Travel Tips Page
 * 旅行提示页面
 */

"use client";

import React, { useState } from 'react';
import { Search, AlertCircle, Loader2, X, ChevronDown } from 'lucide-react';
import { useTravelTips } from '../hooks/useTravelTips';
import { useLanguage } from '../context/LanguageContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { TravelTip } from '../../domain/entities/TravelTip';

export function TravelTipsPage() {
  const { filteredTips, loading, error, searchQuery, searchTips } = useTravelTips();
  const { language, t } = useLanguage();
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  /**
   * 切换提示展开状态
   */
  const toggleExpanded = (tipId: string) => {
    setExpandedTips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tipId)) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
  };

  /**
   * 处理搜索
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchTips(e.target.value);
  };

  /**
   * 清除搜索
   */
  const clearSearch = () => {
    searchTips('');
  };

  /**
   * 渲染提示项
   */
  const renderTipItem = (tip: TravelTip) => {
    const isExpanded = expandedTips.has(tip.id);
    const displayTitle = language === 'zh' ? tip.title : tip.titleEn;
    
    return (
      <div 
        key={tip.id} 
        className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all"
      >
        {/* 标题栏 */}
        <div 
          className="flex items-start gap-3 cursor-pointer"
          onClick={() => toggleExpanded(tip.id)}
        >
          <span className="text-2xl">{tip.icon}</span>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-1">{displayTitle}</h3>
            <Badge variant="outline" className="text-xs">
              {tip.tips.length} {language === 'zh' ? '条提示' : 'tips'}
            </Badge>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* 提示内容 */}
        {isExpanded && (
          <div className="mt-4 space-y-2 pl-11">
            {tip.tips.map((item, idx) => {
              const displayText = language === 'zh' ? item.text : item.textEn;
              const colorClass = item.color === 'red' ? 'text-red-600' : 
                                item.color === 'blue' ? 'text-blue-600' : 
                                item.color === 'green' ? 'text-green-600' : 
                                item.color === 'orange' ? 'text-orange-600' : 
                                'text-gray-700';
              
              return (
                <div 
                  key={idx}
                  className={`text-sm ${colorClass} ${item.highlight ? '' : ''}`}
                >
                  • {displayText}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 头部搜索区域 */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h1 className="text-xl">
                {language === 'zh' ? '中国旅行重要注意事项' : 'Important China Travel Tips'}
              </h1>
              <p className="text-sm text-white/90 mt-1">
                {language === 'zh' 
                  ? '必读指南，让你的中国之旅更顺利' 
                  : 'Essential guide for a smooth trip in China'}
              </p>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={language === 'zh' ? '搜索提示（如：护照、液体、支付等）' : 'Search tips (e.g., passport, liquid, payment)'}
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-10 bg-white text-gray-900 border-none shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-900 mb-1">
                {language === 'zh' ? '加载失败' : 'Loading Failed'}
              </h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 搜索结果提示 */}
        {!loading && searchQuery && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {language === 'zh' 
                ? `找到 ${filteredTips.length} 条相关提示` 
                : `Found ${filteredTips.length} related tips`}
            </p>
          </div>
        )}

        {/* 提示列表 */}
        {!loading && !error && (
          <div className="space-y-3">
            {filteredTips.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-gray-900 mb-2">
                  {language === 'zh' ? '未找到相关提示' : 'No tips found'}
                </h3>
                <p className="text-sm text-gray-500">
                  {language === 'zh' 
                    ? '尝试使用其他关键词搜索' 
                    : 'Try searching with different keywords'}
                </p>
              </div>
            ) : (
              <>
                {/* 快速提示横幅 */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div className="text-xs text-gray-700">
                      <p className="">
                        {language === 'zh' 
                          ? '点击任意卡片查看详细提示。建议仔细阅读航班液体规定和护照使用频率两个部分。' 
                          : 'Click any card to view detailed tips. We recommend reading the flight liquid regulations and passport usage sections carefully.'}
                      </p>
                    </div>
                  </div>
                </div>

                {filteredTips.map(tip => renderTipItem(tip))}
              </>
            )}
          </div>
        )}

        {/* 底部提示 */}
        {!loading && !error && filteredTips.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {language === 'zh' 
                ? '提示：这些信息基于实际旅行经验总结，建议收藏备用' 
                : 'Tip: These tips are based on real travel experiences, bookmark for reference'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
