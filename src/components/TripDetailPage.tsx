import { useEffect, useState } from 'react';
import { ChevronLeft, Calendar, MapPin, Share2, Download, Map, ChevronDown, ChevronUp, Clock, Utensils, Camera, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { ShareTripModal } from './ShareTripModal';
import { AttractionDetailCard } from './AttractionDetailCard';
import { RestaurantDetailCard } from './RestaurantDetailCard';
import { TransportDetailCard } from './TransportDetailCard';
import { supabase } from '@/utils/supabase/client';

interface Activity {
  id: string;
  time: string;
  type: 'attraction' | 'meal' | 'transport';
  name: string;
  description?: string;
  duration?: string;
  price?: string;
  image?: string;
  address?: string;
  restaurantId?: string;
  attractionId?: string;
  transportRouteId?: string;
  locationLat?: number;
  locationLng?: number;
}

interface DayItinerary {
  day: number;
  date: string;
  theme: string;
  activities: Activity[];
}

interface TripDetailPageProps {
  tripId: string;
  onBack: () => void;
  onOpenMap?: () => void;
}

export function TripDetailPage({ tripId, onBack, onOpenMap }: TripDetailPageProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [currentView, setCurrentView] = useState<'itinerary' | 'budget'>('itinerary');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [restaurantDetail, setRestaurantDetail] = useState<any>(null);
  const [attractionDetail, setAttractionDetail] = useState<any>(null);
  const [transportDetail, setTransportDetail] = useState<any>(null);

  // Mock data
  const tripData = {
    id: tripId,
    destination: '伦敦 · 爱丁堡',
    dates: '2024年10月1日 - 10月7日',
    duration: '7天',
    budget: '£3,500',
    coverImage: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200',
  };

  const itinerary: DayItinerary[] = [
    {
      day: 1,
      date: '10月1日 周二',
      theme: '抵达伦敦 · 市中心初探',
      activities: [
        {
          id: '1-1',
          time: '09:00',
          type: 'transport',
          name: '希思罗机场 → 酒店',
          description: '乘坐希思罗快线，约15分钟',
          duration: '15分钟',
          price: '£25',
          transportRouteId: '33333333-3333-4333-8333-333333333331',
        },
        {
          id: '1-2',
          time: '12:00',
          type: 'meal',
          name: 'Dishoom 午餐',
          description: '印度风味餐厅，招牌菜：黄油鸡',
          duration: '1小时',
          price: '£20-30',
          image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
          address: 'Covent Garden',
          restaurantId: '11111111-1111-4111-8111-111111111112',
          locationLat: 51.5123,
          locationLng: -0.124,
        },
        {
          id: '1-3',
          time: '14:00',
          type: 'attraction',
          name: '大英博物馆',
          description: '世界四大博物馆之一，免费参观',
          duration: '3小时',
          price: '免费',
          image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400',
          address: 'Great Russell St, London WC1B 3DG',
          attractionId: '22222222-2222-4222-8222-222222222221',
          locationLat: 51.5194,
          locationLng: -0.127,
        },
        {
          id: '1-4',
          time: '18:30',
          type: 'meal',
          name: 'The Ivy Market Grill',
          description: '英式传统晚餐，环境优雅',
          duration: '2小时',
          price: '£40-60',
          image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
          address: 'Covent Garden',
        },
      ],
    },
    {
      day: 2,
      date: '10月2日 周三',
      theme: '皇家伦敦 · 历史巡礼',
      activities: [
        {
          id: '2-1',
          time: '08:30',
          type: 'meal',
          name: '酒店早餐',
          description: '全英式早餐',
          duration: '45分钟',
          price: '包含',
        },
        {
          id: '2-2',
          time: '10:00',
          type: 'attraction',
          name: '白金汉宫',
          description: '观看换岗仪式（11:00开始）',
          duration: '2小时',
          price: '免费观看',
          image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400',
          address: 'London SW1A 1AA',
          attractionId: '22222222-2222-4222-8222-222222222222',
          locationLat: 51.5014,
          locationLng: -0.1419,
        },
        {
          id: '2-3',
          time: '12:30',
          type: 'meal',
          name: 'Sketch 午餐',
          description: '网红粉红餐厅，记得拍照打卡',
          duration: '1.5小时',
          price: '£35-50',
          image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400',
          address: '9 Conduit St, London W1S 2XG',
        },
        {
          id: '2-4',
          time: '15:00',
          type: 'attraction',
          name: '伦敦塔',
          description: '千年古堡，皇冠珠宝收藏',
          duration: '2.5小时',
          price: '£33.60',
          image: 'https://images.unsplash.com/photo-1565967526567-97ea2e48f7c7?w=400',
          address: 'Tower of London, EC3N 4AB',
          attractionId: '22222222-2222-4222-8222-222222222223',
          locationLat: 51.5081,
          locationLng: -0.0759,
        },
        {
          id: '2-5',
          time: '19:00',
          type: 'meal',
          name: 'Duck & Waffle',
          description: '顶楼餐厅，俯瞰伦敦夜景',
          duration: '2小时',
          price: '£45-70',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
          address: '110 Bishopsgate, London EC2N 4AY',
        },
      ],
    },
  ];

  const toggleDay = (day: number) => {
    setExpandedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attraction':
        return <Camera className="w-5 h-5 text-blue-500" />;
      case 'meal':
        return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'transport':
        return <MapPin className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleExport = () => {
    // Mock export functionality
    alert('正在导出行程为PDF...');
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleActivityClick = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  useEffect(() => {
    if (!selectedActivity) {
      setRestaurantDetail(null);
      setAttractionDetail(null);
      setTransportDetail(null);
      return;
    }

    const loadDetail = async () => {
      if (selectedActivity.type === 'meal') {
        if (selectedActivity.restaurantId) {
          const { data, error } = await supabase
            .from('restaurants')
            .select('*, restaurant_dishes(*)')
            .eq('id', selectedActivity.restaurantId)
            .maybeSingle();

          if (!error && data) {
            const hours =
              (typeof data.opening_hours === 'object' &&
                data.opening_hours !== null &&
                'general' in data.opening_hours &&
                (data.opening_hours as any).general) ||
              (typeof data.opening_hours === 'string' ? data.opening_hours : null) ||
              '营业时间未提供';
            const dishes = Array.isArray((data as any).restaurant_dishes)
              ? (data as any).restaurant_dishes
              : [];
            setRestaurantDetail({
              name: data.name,
              nameEn: data.name_en || data.name,
              address: data.address || selectedActivity.address || '地址未提供',
              hours,
              cuisine: data.cuisine_type || '精选美食',
              priceRange: data.price_range || selectedActivity.price || '¥100-200',
              signature: dishes
                .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                .map((dish: any) => ({
                  name: dish.name,
                  nameEn: dish.name_en || dish.name,
                  description: dish.description || '',
                  image: dish.image_url || selectedActivity.image,
                  allergens: dish.allergens || [],
                })),
              menuImage:
                data.menu_image_url ||
                selectedActivity.image ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
            });
            return;
          }
        }

        // Fallback to selected activity
        setRestaurantDetail({
          name: selectedActivity.name,
          nameEn: selectedActivity.name,
          address: selectedActivity.address || '地址未提供',
          hours: '11:00-22:00',
          cuisine: '精选美食',
          priceRange: selectedActivity.price || '¥100-200',
          signature: [
            {
              name: '招牌菜',
              nameEn: 'Signature Dish',
              description: selectedActivity.description || '餐厅特色美食',
              image:
                selectedActivity.image ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
              allergens: [],
            },
          ],
          menuImage:
            selectedActivity.image ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
        });
      }

      if (selectedActivity.type === 'attraction') {
        if (selectedActivity.attractionId) {
          const { data, error } = await supabase
            .from('attractions')
            .select('*')
            .eq('id', selectedActivity.attractionId)
            .maybeSingle();

          if (!error && data) {
            const gallery = Array.isArray(data.gallery_urls)
              ? data.gallery_urls
              : data.gallery_urls
                ? [String(data.gallery_urls)]
                : [];
            const tips = Array.isArray(data.tips) ? data.tips : [];
            const highlights = Array.isArray(data.highlights) ? data.highlights : [];
            setAttractionDetail({
              name: data.name,
              nameEn: data.name_en || data.name,
              address: data.address || selectedActivity.address || '地址未提供',
              hours:
                (typeof data.opening_hours === 'string'
                  ? data.opening_hours
                  : undefined) || '开放时间未提供',
              ticketPrice: data.ticket_price || selectedActivity.price || '免费',
              description: data.description || selectedActivity.description || '暂无描述',
              highlights: highlights.length ? highlights : ['适合拍照打卡'],
              tips: tips.length ? tips : ['建议提前在线购票'],
              images: gallery.length
                ? gallery
                : selectedActivity.image
                  ? [selectedActivity.image]
                  : [],
              estimatedDuration:
                data.estimated_duration ||
                selectedActivity.duration ||
                '2小时',
            });
            return;
          }
        }

        setAttractionDetail({
          name: selectedActivity.name,
          nameEn: selectedActivity.name,
          address: selectedActivity.address || '地址未提供',
          hours: '09:00-18:00',
          ticketPrice: selectedActivity.price || '免费',
          description: selectedActivity.description || '暂无描述',
          highlights: [
            '适合拍照打卡',
            '交通便利',
            '周边配套完善',
          ],
          tips: [
            '建议游览时长：' + (selectedActivity.duration || '2小时'),
            '建议提前在线购票',
            '注意开放时间',
          ],
          images: selectedActivity.image ? [selectedActivity.image] : [],
          estimatedDuration: selectedActivity.duration || '2小时',
        });
      }

      if (selectedActivity.type === 'transport') {
        if (selectedActivity.transportRouteId) {
          const { data, error } = await supabase
            .from('transport_routes')
            .select('*')
            .eq('id', selectedActivity.transportRouteId)
            .maybeSingle();

          if (!error && data) {
            const isSubway = data.mode === 'subway';
            const apps = Array.isArray(data.apps) ? data.apps : [];
            setTransportDetail({
              from: data.from_location,
              to: data.to_location,
              subway: isSubway
                ? {
                    line: data.line_name || '',
                    stations: data.stations || [],
                    duration: data.duration || selectedActivity.duration || '',
                    price: data.price_info || selectedActivity.price || '',
                    ticketGuide: data.ticket_guide || [],
                    alipayGuide: data.alipay_guide || [],
                  }
                : undefined,
              taxi: !isSubway
                ? {
                    estimatedPrice: data.price_info || '',
                    duration: data.duration || '',
                    paymentMethods: data.payment_methods || [],
                    apps,
                  }
                : {
                    estimatedPrice: data.price_info || selectedActivity.price || '',
                    duration: data.duration || selectedActivity.duration || '',
                    paymentMethods: data.payment_methods || [],
                    apps,
                  },
            });
            return;
          }
        }

        setTransportDetail({
          from: '起点',
          to: '终点',
          subway: undefined,
          taxi: undefined,
        });
      }
    };

    loadDetail();
  }, [selectedActivity]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1">
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-gray-900">行程详情</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image & Basic Info */}
      <div className="relative h-56">
        <ImageWithFallback
          src={tripData.coverImage}
          alt={tripData.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-white mb-2">{tripData.destination}</h2>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {tripData.dates}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {tripData.duration}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {tripData.budget}
            </div>
          </div>
        </div>
      </div>

      {/* Map Button */}
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <Button 
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 h-12"
          onClick={onOpenMap}
        >
          <Map className="w-5 h-5 mr-2" />
          查看地图与路线
        </Button>
      </div>

      {/* Content Tabs */}
      <div className="max-w-screen-xl mx-auto px-4">
        <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white rounded-xl p-1 mb-4">
            <TabsTrigger value="itinerary">行程安排</TabsTrigger>
            <TabsTrigger value="budget">预算明细</TabsTrigger>
          </TabsList>

          <TabsContent value="itinerary" className="space-y-3">
            {itinerary.map((day) => (
              <Card key={day.day} className="overflow-hidden">
                <button
                  onClick={() => toggleDay(day.day)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                      D{day.day}
                    </div>
                    <div className="text-left">
                      <div className="text-gray-900">{day.theme}</div>
                      <div className="text-sm text-gray-500">{day.date}</div>
                    </div>
                  </div>
                  {expandedDays.includes(day.day) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedDays.includes(day.day) && (
                  <div className="border-t border-gray-100">
                    {day.activities.map((activity, index) => (
                      <div key={activity.id} className="p-4 border-b border-gray-100 last:border-0">
                        <div className="flex gap-3">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                              {getActivityIcon(activity.type)}
                            </div>
                            {index < day.activities.length - 1 && (
                              <div className="w-0.5 h-12 bg-gray-200 my-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div 
                              onClick={() => handleActivityClick(activity)}
                              className="flex items-start justify-between mb-2 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {activity.time}
                                  </span>
                                  {activity.duration && (
                                    <span className="text-xs text-gray-400">
                                      · {activity.duration}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-gray-900 mb-1">{activity.name}</h4>
                                {activity.description && (
                                  <p className="text-sm text-gray-600 mb-1">
                                    {activity.description}
                                  </p>
                                )}
                                {activity.address && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {activity.address}
                                  </p>
                                )}
                              </div>
                              {activity.price && (
                                <Badge variant="outline" className="ml-2 whitespace-nowrap">
                                  {activity.price}
                                </Badge>
                              )}
                            </div>

                            {activity.image && (
                              <ImageWithFallback
                                src={activity.image}
                                alt={activity.name}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="budget" className="space-y-3">
            <Card className="p-4">
              <h3 className="text-gray-900 mb-4">预算概览</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700">景点门票</span>
                  </div>
                  <span className="text-gray-900">£450</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-700">餐饮</span>
                  </div>
                  <span className="text-gray-900">£800</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700">交通</span>
                  </div>
                  <span className="text-gray-900">£350</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">住宿</span>
                  </div>
                  <span className="text-gray-900">£1,200</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">其他</span>
                  </div>
                  <span className="text-gray-900">£700</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                  <span className="text-gray-900">总计</span>
                  <span className="text-red-500">{tripData.budget}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50">
              <h4 className="text-gray-900 text-sm mb-2">💡 省钱小贴士</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 大英博物馆等多个博物馆免费参观</li>
                <li>• 使用Oyster卡可节省20%交通费用</li>
                <li>• 提前预订景点门票可享折扣</li>
                <li>• 午餐时段用餐比晚餐更实惠</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareTripModal
          trip={{
            id: tripData.id,
            destination: tripData.destination,
            startDate: '2024-10-01',
            endDate: '2024-10-07',
            budget: tripData.budget,
            image: tripData.coverImage,
            days: 7,
            highlights: [
              'Visit iconic landmarks',
              'Explore local cuisine',
              'Experience rich culture',
            ],
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <>
          {selectedActivity.type === 'attraction' && attractionDetail && (
            <AttractionDetailCard
              attraction={attractionDetail}
              onClose={() => setSelectedActivity(null)}
            />
          )}
          {selectedActivity.type === 'meal' && restaurantDetail && (
            <RestaurantDetailCard
              restaurant={restaurantDetail}
              onClose={() => setSelectedActivity(null)}
            />
          )}
          {selectedActivity.type === 'transport' && transportDetail && (
            <TransportDetailCard
              transport={transportDetail}
              onClose={() => setSelectedActivity(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
