import { useEffect, useState } from 'react';
import { ChevronLeft, Calendar, MapPin, Share2, Download, Map, ChevronDown, ChevronUp, Clock, Utensils, Camera, DollarSign, Loader2, AlertCircle, Phone, Star, Route, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { ShareTripModal } from './ShareTripModal';
import { AttractionDetailCard } from './AttractionDetailCard';
import { RestaurantDetailCard } from './RestaurantDetailCard';
import { TransportDetailCard } from './TransportDetailCard';
import { toast } from 'sonner@2.0.3';
import { supabase } from '@/utils/supabase/client';
import { tripService, type TripDetail } from '@/services/tripService';
import { downloadTripPDF } from '@/services/exportService';
import { amapService } from '@/services/amapService';

interface Activity {
  id: string;
  time: string;
  type: 'attraction' | 'meal' | 'transport' | 'rest';
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

interface EnhancedActivityDetail {
  name: string;
  description: string;
  time: string;
  type: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  tel?: string;
  rating?: string;
  opentime?: string;
  cost?: string;
  photos?: string[];
  route?: {
    distance: string;
    duration: string;
    steps: Array<{ instruction: string }>;
  };
  dataSource: 'ai' | 'amap' | 'mixed';
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
  const [enhancedActivities, setEnhancedActivities] = useState<Record<string, EnhancedActivityDetail>>({});
  const [enhancedLoading, setEnhancedLoading] = useState<Record<string, boolean>>({});
  const [enhancedErrors, setEnhancedErrors] = useState<Record<string, string>>({});

  // Database state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbTripData, setDbTripData] = useState<TripDetail | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Mock data
  const tripData = {
    id: tripId,
    destination: '伦敦 · 爱丁堡',
    startDate: '2024-10-01',
    endDate: '2024-10-07',
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

  // Load trip data from database
  useEffect(() => {
    const loadTripDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[TripDetailPage] Loading trip detail:', tripId);

        const data = await tripService.getTripDetail(tripId);
        setDbTripData(data);

        console.log('[TripDetailPage] Trip detail loaded successfully:', {
          tripId: data.id,
          destination: data.destination,
          itineraryCount: data.trip_itineraries?.length || 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载行程失败';
        console.error('[TripDetailPage] Failed to load trip:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadTripDetail();
  }, [tripId]);

  // Transform database data to component format
  const actualTripData = dbTripData ? {
    id: dbTripData.id,
    destination: dbTripData.destination,
    startDate: dbTripData.start_date,
    endDate: dbTripData.end_date,
    dates: `${dbTripData.start_date} - ${dbTripData.end_date}`,
    duration: dbTripData.duration,
    budget: dbTripData.budget,
    coverImage: dbTripData.image_url || tripData.coverImage,
  } : tripData;

  const actualItinerary: DayItinerary[] = dbTripData ?
    (dbTripData.trip_itineraries || [])
      .sort((a, b) => a.day_number - b.day_number)
      .map((itinerary) => ({
        day: itinerary.day_number,
        date: itinerary.date || '',
        theme: itinerary.theme || '',
        activities: (itinerary.activities || [])
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((act) => ({
            id: act.id,
            time: act.time || '',
            type: act.type === 'dining' ? 'meal' as const :
                  act.type === 'sightseeing' ? 'attraction' as const :
                  act.type === 'transportation' ? 'transport' as const :
                  'attraction' as const,
            name: act.name || '',
            description: act.description || undefined,
            duration: act.duration || undefined,
            price: act.price || undefined,
            image: act.image_url || undefined,
            address: act.address || undefined,
            locationLat: act.location_lat || undefined,
            locationLng: act.location_lng || undefined,
          })),
      }))
    : itinerary;

  const extractCityFromDestination = (destination: string) => {
    if (!destination) return '';
    const parts = destination.split(/·|\.|,|，|\s+/).map(part => part.trim()).filter(Boolean);
    return parts[0] || destination;
  };

  const formatDistance = (distance?: string) => {
    const value = Number(distance || 0);
    if (!Number.isFinite(value) || value <= 0) return '';
    return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
  };

  const formatDuration = (duration?: string) => {
    const seconds = Number(duration || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const minutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    return hours ? `${hours}小时${remain ? `${remain}分钟` : ''}` : `${minutes}分钟`;
  };

  const parsePoiLocation = (location?: string) => {
    if (!location) return undefined;
    const [lng, lat] = location.split(',');
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return undefined;
    return { lat: latNum, lng: lngNum };
  };

  const buildBaseDetail = (activity: Activity): EnhancedActivityDetail => ({
    name: activity.name,
    description: activity.description || '',
    time: activity.time,
    type: activity.type,
    coordinates: activity.locationLat && activity.locationLng
      ? { lat: activity.locationLat, lng: activity.locationLng }
      : undefined,
    address: activity.address,
    cost: activity.price,
    photos: activity.image ? [activity.image] : undefined,
    dataSource: 'ai',
  });

  const findPoiForActivity = async (activity: Activity, city: string) => {
    const keyword = activity.name;
    const typeMap: Record<Activity['type'], string | undefined> = {
      meal: '餐饮服务',
      attraction: '风景名胜',
      transport: undefined,
      rest: '酒店',
    };

    if (activity.locationLat && activity.locationLng) {
      const nearby = await amapService.searchNearby(activity.locationLat, activity.locationLng, keyword);
      if (nearby && nearby.length > 0) {
        return nearby[0];
      }
    }

    const pois = await amapService.searchPOI(keyword, city, typeMap[activity.type]);
    if (pois && pois.length > 0) {
      return pois[0];
    }

    return null;
  };

  const parseRouteEndpoints = (text?: string) => {
    if (!text) return null;
    const parts = text.split(/→|->|—|－|至|到/).map((item) => item.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { from: parts[0], to: parts[1] };
    }
    return null;
  };

  const findPoiByName = async (name: string, city: string) => {
    if (!name) return null;
    const pois = await amapService.searchPOI(name, city);
    if (pois && pois.length > 0) return pois[0];
    const fallback = await amapService.searchPOI(name, '', undefined);
    if (fallback && fallback.length > 0) return fallback[0];
    return null;
  };

  const buildRouteDetailForTransport = async (activity: Activity, city: string) => {
    const endpoints = parseRouteEndpoints(activity.name) || parseRouteEndpoints(activity.description);
    let originLocation: string | null = null;
    let destinationLocation: string | null = activity.locationLat && activity.locationLng
      ? `${activity.locationLng},${activity.locationLat}`
      : null;
    let addressLabel = activity.address;

    if (endpoints) {
      const [fromPoi, toPoi] = await Promise.all([
        findPoiByName(endpoints.from, city),
        destinationLocation ? Promise.resolve(null) : findPoiByName(endpoints.to, city),
      ]);

      if (fromPoi?.location) {
        originLocation = fromPoi.location;
      }
      if (!destinationLocation && toPoi?.location) {
        destinationLocation = toPoi.location;
      }
      if (!addressLabel) {
        addressLabel = `${endpoints.from} → ${endpoints.to}`;
      }
    }

    if (!originLocation || !destinationLocation) {
      return null;
    }

    const routeResult = await amapService.getRoute(originLocation, destinationLocation, 'walking');
    if (!routeResult?.route?.paths?.length) {
      return null;
    }

    const bestPath = routeResult.route.paths[0];
    return {
      address: addressLabel,
      route: {
        distance: formatDistance(bestPath.distance),
        duration: formatDuration(bestPath.duration),
        steps: (bestPath.steps || []).map((step) => ({
          instruction: step.instruction,
        })),
      },
    };
  };

  const enhanceActivityWithAmap = async (activity: Activity): Promise<EnhancedActivityDetail> => {
    const baseDetail = buildBaseDetail(activity);
    const city = extractCityFromDestination(actualTripData.destination);

    try {
      if (activity.type === 'transport') {
        const routeDetail = await buildRouteDetailForTransport(activity, city);
        if (routeDetail) {
          return {
            ...baseDetail,
            address: routeDetail.address || baseDetail.address,
            route: routeDetail.route,
            dataSource: 'mixed',
          };
        }
        return baseDetail;
      }

      const poi = await findPoiForActivity(activity, city);
      if (!poi) {
        return baseDetail;
      }

      const coords = parsePoiLocation(poi.location) || baseDetail.coordinates;
      const photos = poi.photos?.map((p) => p.url).filter(Boolean) || [];

      return {
        ...baseDetail,
        address: poi.address || baseDetail.address,
        tel: poi.tel || baseDetail.tel,
        rating: poi.rating || baseDetail.rating,
        opentime: poi.opentime || baseDetail.opentime,
        cost: poi.cost || baseDetail.cost,
        photos: photos.length ? photos : baseDetail.photos,
        coordinates: coords,
        dataSource: 'mixed',
      };
    } catch (error) {
      console.error('[TripDetailPage] Failed to enhance activity with Amap', {
        activityId: activity.id,
        activityName: activity.name,
        error,
      });
      return baseDetail;
    }
  };

  useEffect(() => {
    const activities = actualItinerary.flatMap((day) => day.activities);
    if (!activities.length) return;

    let cancelled = false;

    const baseMap = activities.reduce<Record<string, EnhancedActivityDetail>>((acc, act) => {
      acc[act.id] = buildBaseDetail(act);
      return acc;
    }, {});

    setEnhancedActivities((prev) => ({ ...baseMap, ...prev }));
    setEnhancedErrors((prev) => {
      const next = { ...prev };
      activities.forEach((act) => {
        if (next[act.id]) {
          delete next[act.id];
        }
      });
      return next;
    });

    const loadingMap = activities.reduce<Record<string, boolean>>((acc, act) => {
      acc[act.id] = true;
      return acc;
    }, {});
    setEnhancedLoading((prev) => ({ ...prev, ...loadingMap }));

    const loadEnhanced = async () => {
      for (const activity of activities) {
        try {
          const detail = await enhanceActivityWithAmap(activity);
          if (cancelled) continue;
          setEnhancedActivities((prev) => ({ ...prev, [activity.id]: detail }));
          setEnhancedErrors((prev) => {
            const next = { ...prev };
            delete next[activity.id];
            return next;
          });
        } catch (err) {
          if (cancelled) continue;
          console.error('[TripDetailPage] Amap enhancement failed', err);
          setEnhancedActivities((prev) => ({ ...prev, [activity.id]: buildBaseDetail(activity) }));
          setEnhancedErrors((prev) => ({ ...prev, [activity.id]: '高德数据暂不可用' }));
        } finally {
          if (cancelled) continue;
          setEnhancedLoading((prev) => ({ ...prev, [activity.id]: false }));
        }
      }
    };

    loadEnhanced();

    return () => {
      cancelled = true;
    };
  }, [dbTripData, tripId]);

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

  const renderEnhancedActivity = (activity: Activity) => {
    const detail = enhancedActivities[activity.id];
    const isLoading = enhancedLoading[activity.id];
    const error = enhancedErrors[activity.id];
    const ratingValue = detail?.rating
      ? Math.min(5, Math.max(0, Math.round(parseFloat(detail.rating) || 0)))
      : 0;
    const routeSteps = detail?.route?.steps || [];

    if (!detail && !isLoading && !error) {
      return null;
    }

    return (
      <div className="mt-3 rounded-lg border border-gray-100 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              高德增强
            </Badge>
            <span className="text-xs text-gray-500">
              {detail?.dataSource === 'mixed' ? 'AI + 高德' : detail?.dataSource === 'amap' ? '高德数据' : 'AI数据'}
            </span>
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
        </div>

        {error && (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {detail && (
          <div className="mt-3 space-y-3 text-sm text-gray-700">
            {detail.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">地址</div>
                  <div className="text-gray-800">{detail.address}</div>
                </div>
              </div>
            )}

            {detail.tel && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${detail.tel}`} className="text-red-600 hover:underline">
                  {detail.tel}
                </a>
              </div>
            )}

            {detail.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3 h-3 ${idx < ratingValue ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-gray-500">{detail.rating}</span>
                </div>
              </div>
            )}

            {detail.opentime && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">开放时间</div>
                  <div className="text-gray-800">{detail.opentime}</div>
                </div>
              </div>
            )}

            {detail.cost && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>{detail.cost}</span>
              </div>
            )}

            {detail.photos && detail.photos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ImageIcon className="w-4 h-4" />
                  <span>实景照片</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {detail.photos.slice(0, 6).map((photo, index) => (
                    <ImageWithFallback
                      key={index}
                      src={photo}
                      alt={`${detail.name}-${index + 1}`}
                      className="h-20 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {detail.route && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <Route className="w-4 h-4 text-purple-500" />
                  <span>{detail.route.distance || '步行路线'}{detail.route.duration ? ` · ${detail.route.duration}` : ''}</span>
                </div>
                {routeSteps.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {routeSteps.slice(0, 8).map((step, idx) => (
                      <div key={idx} className="flex gap-2 text-xs text-gray-600">
                        <span className="text-gray-400">{idx + 1}.</span>
                        <span className="flex-1">{step.instruction}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    if (!dbTripData) {
      toast.error('行程数据尚未加载完成');
      return;
    }

    try {
      setIsExporting(true);
      await downloadTripPDF(dbTripData);
      toast.success('PDF 已开始下载');
    } catch (exportError) {
      console.error('[TripDetailPage] 导出 PDF 失败:', exportError);
      toast.error(exportError instanceof Error ? exportError.message : '导出 PDF 失败');
    } finally {
      setIsExporting(false);
    }
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载行程中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>
              返回
            </Button>
            <Button onClick={() => window.location.reload()}>
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
              <Button variant="ghost" size="sm" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image & Basic Info */}
      <div className="relative h-56">
        <ImageWithFallback
          src={actualTripData.coverImage}
          alt={actualTripData.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-white mb-2">{actualTripData.destination}</h2>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {actualTripData.dates}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {actualTripData.duration}
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              {actualTripData.budget}
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
            {actualItinerary.map((day) => (
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

                            {renderEnhancedActivity(activity)}
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
                  <span className="text-red-500">{actualTripData.budget}</span>
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
            id: actualTripData.id,
            destination: actualTripData.destination,
            startDate: dbTripData?.start_date || '',
            endDate: dbTripData?.end_date || '',
            budget: actualTripData.budget,
            image: actualTripData.coverImage,
            days: actualItinerary.length || undefined,
            highlights: actualItinerary.flatMap((day) => day.activities.map((activity) => activity.name)).slice(0, 3),
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
