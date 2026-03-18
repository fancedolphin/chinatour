/**
 * Presentation Layer - Travel Tips Page
 * 旅行提示页面
 */

"use client";

import React, { useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Search, UtensilsCrossed, X } from "lucide-react";
import { FoodEncyclopediaSection } from "@/components/FoodEncyclopediaSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TravelTip } from "../../domain/entities/TravelTip";
import { useLanguage } from "../context/LanguageContext";
import { useTravelTips } from "../hooks/useTravelTips";

type TipsSection = "travel_tips" | "food_encyclopedia";

export function TravelTipsPage() {
  const { filteredTips, loading, error, searchQuery, searchTips } = useTravelTips();
  const { language } = useLanguage();
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<TipsSection>("travel_tips");

  const toggleExpanded = (tipId: string) => {
    setExpandedTips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tipId)) {
        newSet.delete(tipId);
      } else {
        newSet.add(tipId);
      }
      return newSet;
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchTips(e.target.value);
  };

  const clearSearch = () => {
    searchTips("");
  };

  const renderTipItem = (tip: TravelTip) => {
    const isExpanded = expandedTips.has(tip.id);
    const displayTitle = language === "zh" ? tip.title : tip.titleEn;

    return (
      <div key={tip.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleExpanded(tip.id)}>
          <span className="text-2xl">{tip.icon}</span>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-1">{displayTitle}</h3>
            <Badge variant="outline" className="text-xs">
              {tip.tips.length} {language === "zh" ? "条提示" : "tips"}
            </Badge>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-2 pl-11">
            {tip.tips.map((item, idx) => {
              const displayText = language === "zh" ? item.text : item.textEn;
              const colorClass =
                item.color === "red"
                  ? "text-red-600"
                  : item.color === "blue"
                    ? "text-blue-600"
                    : item.color === "green"
                      ? "text-green-600"
                      : item.color === "orange"
                        ? "text-orange-600"
                        : "text-gray-700";

              return (
                <div key={idx} className={`text-sm ${colorClass}`}>
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
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{activeSection === "travel_tips" ? "⚠️" : "🍽️"}</span>
            <div>
              <h1 className="text-xl">
                {activeSection === "travel_tips"
                  ? language === "zh"
                    ? "中国旅行重要注意事项"
                    : "Important China Travel Tips"
                  : language === "zh"
                    ? "中国传统美食百科"
                    : "Chinese Food Encyclopedia"}
              </h1>
              <p className="text-sm text-white/90 mt-1">
                {activeSection === "travel_tips"
                  ? language === "zh"
                    ? "必读指南，让你的中国之旅更顺利"
                    : "Essential guide for a smooth trip in China"
                  : language === "zh"
                    ? "按菜系、辣度和过敏源筛选菜品"
                    : "Filter dishes by cuisine, spice level, and allergens"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={activeSection === "travel_tips" ? "secondary" : "outline"}
              onClick={() => setActiveSection("travel_tips")}
              className={activeSection === "travel_tips" ? "bg-white text-red-600 hover:bg-white/95" : "bg-transparent text-white border-white/60 hover:bg-white/10"}
            >
              {language === "zh" ? "旅行提示" : "Tips"}
            </Button>
            <Button
              type="button"
              variant={activeSection === "food_encyclopedia" ? "secondary" : "outline"}
              onClick={() => setActiveSection("food_encyclopedia")}
              className={activeSection === "food_encyclopedia" ? "bg-white text-red-600 hover:bg-white/95" : "bg-transparent text-white border-white/60 hover:bg-white/10"}
            >
              <UtensilsCrossed className="w-4 h-4" />
              {language === "zh" ? "美食百科" : "Food"}
            </Button>
          </div>

          {activeSection === "travel_tips" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={language === "zh" ? "搜索提示（如：护照、液体、支付等）" : "Search tips (e.g., passport, liquid, payment)"}
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 pr-10 bg-white text-gray-900 border-none shadow-sm"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2" type="button">
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {activeSection === "food_encyclopedia" && <FoodEncyclopediaSection />}

        {activeSection === "travel_tips" && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-900 mb-1">{language === "zh" ? "加载失败" : "Loading Failed"}</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {!loading && searchQuery && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {language === "zh" ? `找到 ${filteredTips.length} 条相关提示` : `Found ${filteredTips.length} related tips`}
                </p>
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-3">
                {filteredTips.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-gray-900 mb-2">{language === "zh" ? "未找到相关提示" : "No tips found"}</h3>
                    <p className="text-sm text-gray-500">{language === "zh" ? "尝试使用其他关键词搜索" : "Try searching with different keywords"}</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div className="text-xs text-gray-700">
                          <p>
                            {language === "zh"
                              ? "点击任意卡片查看详细提示。建议仔细阅读航班液体规定和护照使用频率两个部分。"
                              : "Click any card to view detailed tips. We recommend reading the flight liquid regulations and passport usage sections carefully."}
                          </p>
                        </div>
                      </div>
                    </div>
                    {filteredTips.map((tip) => renderTipItem(tip))}
                  </>
                )}
              </div>
            )}

            {!loading && !error && filteredTips.length > 0 && (
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  {language === "zh" ? "提示：这些信息基于实际旅行经验总结，建议收藏备用" : "Tip: These tips are based on real travel experiences, bookmark for reference"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
