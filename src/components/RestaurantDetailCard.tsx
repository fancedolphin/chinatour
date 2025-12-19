import { X, MapPin, Clock, AlertTriangle, Utensils, Languages } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface DishItem {
  name: string;
  nameEn: string;
  description: string;
  image: string;
  allergens: string[];
}

interface RestaurantDetail {
  name: string;
  nameEn: string;
  address: string;
  hours: string;
  cuisine: string;
  priceRange: string;
  signature: DishItem[];
  menuImage: string;
}

interface RestaurantDetailCardProps {
  restaurant: RestaurantDetail;
  onClose: () => void;
}

export function RestaurantDetailCard({ restaurant, onClose }: RestaurantDetailCardProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5 text-red-500" />
              <h2 className="text-gray-900">{restaurant.name}</h2>
            </div>
            <p className="text-sm text-gray-500">{restaurant.nameEn}</p>
            <Badge variant="secondary" className="mt-2">
              {restaurant.cuisine}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">{restaurant.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">营业时间：{restaurant.hours}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">人均：</span>
                <span className="text-sm text-red-500">{restaurant.priceRange}</span>
              </div>
            </div>

            <Separator />

            {/* Signature Dishes */}
            <div>
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <span>🍽️</span>
                <span>招牌菜推荐</span>
              </h3>
              <div className="space-y-4">
                {restaurant.signature.map((dish, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex gap-4">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-24 h-24 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h4 className="text-sm text-gray-900">{dish.name}</h4>
                            <p className="text-xs text-gray-500">{dish.nameEn}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">{dish.description}</p>
                        
                        {/* Allergens Warning */}
                        {dish.allergens.length > 0 && (
                          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-amber-900 mb-1">过敏源警示</p>
                              <div className="flex flex-wrap gap-1">
                                {dish.allergens.map((allergen, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded"
                                  >
                                    {allergen}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Menu Section */}
            <div>
              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5 text-red-500" />
                <span>双语菜单</span>
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <img
                  src={restaurant.menuImage}
                  alt="餐厅菜单"
                  className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(restaurant.menuImage, '_blank')}
                />
                <p className="text-xs text-gray-500 text-center mt-2">
                  点击图片可放大查看完整菜单
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm text-gray-900 mb-2">💡 贴心提示</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 建议提前预订，高峰期可能需要等位</li>
                <li>• 支持支付宝、微信支付等多种支付方式</li>
                <li>• 如有食物过敏，请提前告知服务员</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`, '_blank')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            导航前往
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={onClose}
          >
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
