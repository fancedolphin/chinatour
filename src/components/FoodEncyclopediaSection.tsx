import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Loader2, Search, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useT } from "@/i18n/useT";
import {
  ALLERGEN_DISCLAIMER_EN,
  ALLERGEN_DISCLAIMER_ZH,
  FOOD_ALLERGEN_OPTIONS,
  FOOD_CUISINE_OPTIONS,
  FOOD_SPICE_OPTIONS,
  FoodAllergen,
  FoodCuisine,
  FoodSpiceLevel,
  getCuisineMeta,
  getSpiceMeta,
} from "@/constants/foodEncyclopedia";
import { FoodEncyclopediaItem, getFoodList } from "@/services/foodEncyclopediaService";

const allergenMetaMap = new Map(FOOD_ALLERGEN_OPTIONS.map((item) => [item.value, item]));

export function FoodEncyclopediaSection() {
  const { locale } = useT();
  const language = locale;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodEncyclopediaItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<FoodCuisine[]>([]);
  const [selectedSpiceLevels, setSelectedSpiceLevels] = useState<FoodSpiceLevel[]>([]);
  const [excludedAllergens, setExcludedAllergens] = useState<FoodAllergen[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const hasActiveFilters =
    selectedCuisines.length > 0 || selectedSpiceLevels.length > 0 || excludedAllergens.length > 0 || keyword.trim().length > 0;

  useEffect(() => {
    const loadFoods = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getFoodList({
          cuisines: selectedCuisines,
          spiceLevels: selectedSpiceLevels,
          excludeAllergens: excludedAllergens,
          keyword,
        });
        setFoods(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load food encyclopedia");
      } finally {
        setLoading(false);
      }
    };

    loadFoods();
  }, [selectedCuisines, selectedSpiceLevels, excludedAllergens, keyword]);

  const toggleCuisine = (value: FoodCuisine) => {
    setSelectedCuisines((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleSpice = (value: FoodSpiceLevel) => {
    setSelectedSpiceLevels((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleAllergen = (value: FoodAllergen) => {
    setExcludedAllergens((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedCuisines([]);
    setSelectedSpiceLevels([]);
    setExcludedAllergens([]);
  };

  const disclaimer = language === "zh" ? ALLERGEN_DISCLAIMER_ZH : ALLERGEN_DISCLAIMER_EN;

  const allergenSummary = useMemo(
    () =>
      excludedAllergens
        .map((value) => {
          const meta = allergenMetaMap.get(value);
          if (!meta) return value;
          return language === "zh" ? meta.labelZh : meta.labelEn;
        })
        .join(", "),
    [excludedAllergens, language],
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 pr-10"
            placeholder={language === "zh" ? "搜索菜名/风味关键词" : "Search dish or flavor keywords"}
          />
          {keyword && (
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setKeyword("")}>
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-2">
              {language === "zh" ? "菜系筛选（含八大菜系）" : "Cuisine (Eight Major + Legacy)"}
            </p>
            <div className="flex flex-wrap gap-2">
              {FOOD_CUISINE_OPTIONS.map((item) => {
                const selected = selectedCuisines.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => toggleCuisine(item.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                    }`}
                  >
                    {language === "zh" ? item.labelZh : item.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">{language === "zh" ? "辣度筛选" : "Spice Level"}</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_SPICE_OPTIONS.map((item) => {
                const selected = selectedSpiceLevels.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => toggleSpice(item.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                    }`}
                  >
                    {item.icon} {language === "zh" ? item.labelZh : item.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">{language === "zh" ? "我要避开的过敏源" : "Exclude Allergens"}</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_ALLERGEN_OPTIONS.map((item) => {
                const selected = excludedAllergens.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => toggleAllergen(item.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-gray-700 border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    {item.icon} {language === "zh" ? item.labelZh : item.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            {excludedAllergens.length > 0
              ? language === "zh"
                ? `当前排除：${allergenSummary}`
                : `Excluded: ${allergenSummary}`
              : language === "zh"
                ? "未设置过敏源排除"
                : "No allergens excluded"}
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
            {language === "zh" ? "重置筛选" : "Reset"}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>{disclaimer}</p>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && foods.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-gray-800">{language === "zh" ? "暂无匹配菜品" : "No matching dishes"}</p>
        </div>
      )}

      {!loading && !error && foods.length > 0 && (
        <div className="space-y-3">
          {foods.map((item) => {
            const spiceMeta = getSpiceMeta(item.spice_level);
            const cuisineMeta = getCuisineMeta(item.cuisine);
            const expanded = expandedIds.has(item.id);
            const flavorSummary = (item.flavor_md ?? "").replace(/\n+/g, " ").trim();
            const brief = flavorSummary.length > 70 ? `${flavorSummary.slice(0, 70)}...` : flavorSummary;

            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-gray-900 break-words">
                      {item.name_zh}
                      {item.name_pinyin ? <span className="text-gray-500 ml-2 text-sm">({item.name_pinyin})</span> : null}
                    </h3>
                    {item.name_en && <p className="text-sm text-gray-500 mt-1">{item.name_en}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {language === "zh" ? cuisineMeta?.labelZh ?? item.cuisine : cuisineMeta?.labelEn ?? item.cuisine}
                      </Badge>
                      <Badge variant="outline">
                        {spiceMeta.icon} {language === "zh" ? spiceMeta.labelZh : spiceMeta.labelEn}
                      </Badge>
                      {item.copyReviewFlags.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                          {language === "zh" ? "文案待审校" : "Copy Review Needed"}
                        </Badge>
                      )}
                    </div>
                    {brief && <p className="text-sm text-gray-700 mt-3">{brief}</p>}
                    {item.allergens.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.allergens.map((allergen) => {
                          const meta = allergenMetaMap.get(allergen);
                          if (!meta) return null;
                          return (
                            <span key={allergen} className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                              {meta.icon} {language === "zh" ? meta.labelZh : meta.labelEn}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 text-sm text-gray-700">
                    {item.flavor_md && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{language === "zh" ? "风味描述" : "Flavor"}</p>
                        <p className="whitespace-pre-line">{item.flavor_md}</p>
                      </div>
                    )}

                    {item.foreign_analogies.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{language === "zh" ? "外国类比" : "Foreign Analogies"}</p>
                        <div className="space-y-2">
                          {item.foreign_analogies.map((analogy, index) => (
                            <div key={`${item.id}-analogy-${index}`} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                              <p className="text-gray-900 text-xs">
                                {[analogy.dish, analogy.country].filter(Boolean).join(" · ")}
                              </p>
                              {analogy.similarity && <p className="text-xs mt-1">{analogy.similarity}</p>}
                              {analogy.difference && <p className="text-xs mt-1 text-gray-600">{analogy.difference}</p>}
                              {analogy.note && <p className="text-xs mt-1 text-gray-600">{analogy.note}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.traveler_tips && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{language === "zh" ? "旅行者提示" : "Traveler Tips"}</p>
                        <p className="whitespace-pre-line">{item.traveler_tips}</p>
                      </div>
                    )}

                    {item.ordering_tips && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{language === "zh" ? "点餐建议" : "Ordering Tips"}</p>
                        <p className="whitespace-pre-line">{item.ordering_tips}</p>
                      </div>
                    )}

                    {item.allergen_note && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900">
                        <p className="text-xs">{item.allergen_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
