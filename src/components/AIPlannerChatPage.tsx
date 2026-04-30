import { ChevronLeft, Sparkles, Send, Calendar, MapPin, Clock, DollarSign, ChevronDown, ChevronUp, Loader2, CloudRain, Camera, Utensils, Train, Home } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { RestaurantDetailCard, type RestaurantDetail } from './RestaurantDetailCard';
import { TransportDetailCard } from './TransportDetailCard';
import { AttractionDetailCard } from './AttractionDetailCard';
import type { TripMapPreviewPayload } from './TripMapPage';
import { getMockTransportData, getMockAttractionData } from './mock-data';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { restaurantDetailService } from '@/services/restaurantDetailService';
import { tripService } from '@/services/tripService';
import { transformTripPlanWithEnhancement, type TripPlan as PersistedTripPlan } from '@/utils/tripDataTransformer';
import { toast } from 'sonner';
import { tripPlanningService } from '@/services/planning/tripPlanningService';
import { useT } from '@/i18n/useT';
import type {
  MealRecommendation,
  PlanningIntent,
  SourceType,
  StructuredItinerary,
  TripPlanningResponse,
} from '@/services/planning/contracts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TripPlan {
  destination: string;
  dates: string;
  budget: string;
  days: DayPlan[];
}

interface DayPlan {
  day: number;
  theme: string;
  activities: Activity[];
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  mealDetails?: {
    breakfast?: MealRecommendation;
    lunch?: MealRecommendation;
    dinner?: MealRecommendation;
  };
  alternativePlan?: string;
}

interface Activity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest' | 'meal';
  source?: SourceType;
  confidence?: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  mealType?: MealSlot;
  anchorActivityId?: string;
  candidateId?: string;
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner';

type TimelineItem =
  | (Activity & {
      sourceOrder: number;
      raw?: undefined;
    })
  | {
      time: string;
      name: string;
      description: string;
      type: 'meal';
      mealType: MealSlot;
      raw: string;
      sourceOrder: number;
    };

interface AIPlannerChatPageProps {
  onBack: () => void;
  initialPlan?: string;
  onSaveSuccess?: () => void;
  onOpenMap?: (payload: string | TripMapPreviewPayload) => void;
}

function buildTimelineItems(day: DayPlan): TimelineItem[] {
  const mealEntries: TimelineItem[] = [];
  const activityCount = day.activities.length;
  const hasPlannerMealActivities = day.activities.some((activity) => activity.type === 'meal');
  if (!hasPlannerMealActivities) {
    if (day.meals.breakfast) mealEntries.push({ time: '08:00', name: day.meals.breakfast.split(' - ')[0], description: day.meals.breakfast, type: 'meal', mealType: 'breakfast', raw: day.meals.breakfast, sourceOrder: activityCount + mealEntries.length });
    if (day.meals.lunch) mealEntries.push({ time: '12:00', name: day.meals.lunch.split(' - ')[0], description: day.meals.lunch, type: 'meal', mealType: 'lunch', raw: day.meals.lunch, sourceOrder: activityCount + mealEntries.length });
    if (day.meals.dinner) mealEntries.push({ time: '19:00', name: day.meals.dinner.split(' - ')[0], description: day.meals.dinner, type: 'meal', mealType: 'dinner', raw: day.meals.dinner, sourceOrder: activityCount + mealEntries.length });
  }

  return [
    ...day.activities.map((activity, index) => ({ ...activity, sourceOrder: index })),
    ...mealEntries,
  ].sort((a, b) => {
    const timeComparison = a.time.localeCompare(b.time);
    if (timeComparison !== 0) {
      return timeComparison;
    }

    const mealBeforeNonActivity =
      a.type === 'meal' && (b.type === 'transport' || b.type === 'rest');
    const nonActivityAfterMeal =
      b.type === 'meal' && (a.type === 'transport' || a.type === 'rest');

    if (mealBeforeNonActivity) {
      return -1;
    }

    if (nonActivityAfterMeal) {
      return 1;
    }

    return a.sourceOrder - b.sourceOrder;
  });
}

function extractCity(destination: string): string {
  const parts = destination
    .split(/·|,|，|\/|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] || destination;
}

function buildPreviewMapPayload(plan: TripPlan): TripMapPreviewPayload {
  const city = extractCity(plan.destination);
  const itineraries = plan.days.map((day) => {
    const previewActivities = buildTimelineItems(day)
      .map((item, index) => {
        const location = item.type === 'meal'
          ? item.location ?? (item.mealType ? day.mealDetails?.[item.mealType]?.location : undefined)
          : item.location;

        if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
          return null;
        }

        if (item.type === 'transport') {
          return null;
        }

        return {
          id: `preview-activity-${day.day}-${index}`,
          name: item.name,
          location_lat: location.lat,
          location_lng: location.lng,
          order_index: index + 1,
          address: location.address ?? '',
          type: item.type === 'meal'
            ? 'restaurant'
            : item.type === 'attraction'
              ? 'attraction'
              : 'hotel',
        };
      })
      .filter((activity): activity is NonNullable<typeof activity> => Boolean(activity));

    return {
      id: `preview-itinerary-${day.day}`,
      day_number: day.day,
      theme: day.theme,
      activities: previewActivities.map(({ id, name, location_lat, location_lng, order_index }) => ({
        id,
        name,
        location_lat,
        location_lng,
        order_index,
      })),
      mapLocations: previewActivities.map(({ id, name, location_lat, location_lng, order_index, address, type }) => ({
        id: `preview-location-${day.day}-${order_index}`,
        name,
        city,
        district: '',
        address,
        lat: location_lat,
        lng: location_lng,
        type,
        order: day.day * 100 + order_index,
        articles: [],
        videos: [],
      })),
    };
  });

  return {
    trip: {
      id: 'preview-trip',
      destination: plan.destination,
      trip_itineraries: itineraries.map(({ id, day_number, theme, activities }) => ({
        id,
        day_number,
        theme,
        activities,
      })),
    },
    locations: itineraries.flatMap((itinerary) => itinerary.mapLocations),
  };
}

function buildPersistedPlan(plan: TripPlan): PersistedTripPlan {
  return {
    destination: plan.destination,
    dates: plan.dates,
    budget: plan.budget,
    days: plan.days.map((day) => {
      const hasPlannerMealActivities = day.activities.some((activity) => activity.type === 'meal');
      const mealActivities = hasPlannerMealActivities
        ? []
        : [
            { slot: 'breakfast' as const, info: day.meals.breakfast, detail: day.mealDetails?.breakfast, time: '08:00' },
            { slot: 'lunch' as const, info: day.meals.lunch, detail: day.mealDetails?.lunch, time: '12:00' },
            { slot: 'dinner' as const, info: day.meals.dinner, detail: day.meals.dinner ? day.mealDetails?.dinner : undefined, time: '19:00' },
          ]
            .filter((meal) => meal.info)
            .map((meal) => {
              const [name, ...descriptionParts] = meal.info!.split(' - ');
              const description = descriptionParts.join(' - ').trim();

              return {
                time: meal.time,
                name: name.trim(),
                description: description || meal.info!,
                type: 'meal' as const,
                geoCoordinates: meal.detail?.location
                  ? {
                      lat: meal.detail.location.lat,
                      lng: meal.detail.location.lng,
                    }
                  : undefined,
                address: meal.detail?.location?.address,
              };
            });

      return {
        day: day.day,
        theme: day.theme,
        activities: [
          ...day.activities.map((activity) => ({
            time: activity.time,
            name: activity.name,
            description: activity.description,
            type: activity.type,
            geoCoordinates: activity.location
              ? {
                  lat: activity.location.lat,
                  lng: activity.location.lng,
                }
              : undefined,
            address: activity.location?.address,
          })),
          ...mealActivities,
        ],
        meals: {},
        alternativePlan: day.alternativePlan,
      };
    }),
  };
}

export function AIPlannerChatPage({ onBack, initialPlan, onSaveSuccess, onOpenMap }: AIPlannerChatPageProps) {
  const { t, locale } = useT();
  const { currentUser } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TripPlan | null>(null);
  const [currentIntent, setCurrentIntent] = useState<PlanningIntent | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isSaving, setIsSaving] = useState(false);
  const [replanningDay, setReplanningDay] = useState<number | null>(null);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [lastStageTimings, setLastStageTimings] = useState<TripPlanningResponse['diagnostics']['stageTimings'] | null>(null);
  
  // Detail card states
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<any>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<any>(null);

  const callPlanner = async (userMessage: string, showInChat: boolean) => {
    setIsTyping(true);
    if (showInChat) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    }
    try {
      const result = await tripPlanningService.plan({
        userMessage,
        currentPlan,
      });

      if (isMountedRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.text, timestamp: new Date() }]);
        setCurrentPlan(result.tripPlan as TripPlan);
        setCurrentIntent(result.intent);
        setLastStageTimings(result.diagnostics.stageTimings);
        setExpandedDays([1]);
      }

      if (!result.validation.can_generate) {
        toast.warning(t('planner.fewerData'));
      }
    } catch (err) {
      console.error('[AIPlannerChatPage] TripPlanning 调用失败:', err);
      if (isMountedRef.current) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: t('planner.noResponse'),
          timestamp: new Date(),
        }]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialPlan) {
      callPlanner(initialPlan, false);
    }
  }, [initialPlan]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSaveTrip = async () => {
    if (!currentPlan || !currentUser) return;

    setIsSaving(true);
    try {
      const transformedData = await transformTripPlanWithEnhancement(
        buildPersistedPlan(currentPlan),
        currentUser.id,
      );

      const savedTrip = await tripService.createTripWithItineraries(transformedData);

      if (!isMountedRef.current) {
        return;
      }

      setSavedTripId(savedTrip.id);
      toast.success(t('planner.saveSuccess'));

      if (!onOpenMap) {
        onSaveSuccess?.();
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : t('common.unknownError');
        toast.error(t('planner.saveFailed', { message }));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    const message = inputValue;
    setInputValue('');
    callPlanner(message, true);
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleBadWeatherReplan = async (dayNumber: number) => {
    if (!currentPlan || replanningDay !== null) return;

    setReplanningDay(dayNumber);
    try {
      const previousDay = currentPlan.days.find(day => day.day === dayNumber);
      const result = await tripPlanningService.replanDayForBadWeather({
        day: dayNumber,
        currentPlan: currentPlan as unknown as StructuredItinerary,
        intent: currentIntent ?? undefined,
      });
      const nextDay = result.tripPlan.days.find(day => day.day === dayNumber);
      const didChangeDay =
        previousDay?.theme !== nextDay?.theme ||
        JSON.stringify(previousDay?.meals ?? {}) !== JSON.stringify(nextDay?.meals ?? {}) ||
        (previousDay?.activities ?? [])
          .filter(activity => activity.type === 'attraction')
          .map(activity => `${activity.time}:${activity.name}`)
          .join('|') !==
          (nextDay?.activities ?? [])
            .filter(activity => activity.type === 'attraction')
            .map(activity => `${activity.time}:${activity.name}`)
            .join('|');

      if (!isMountedRef.current) {
        return;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
      }]);
      setCurrentPlan(result.tripPlan as TripPlan);
      setCurrentIntent(result.intent);
      setLastStageTimings(result.diagnostics.stageTimings);
      if (didChangeDay) {
        toast.success(t('planner.weather.switched', { day: dayNumber }));
      } else {
        toast.info(t('planner.weather.kept', { day: dayNumber }));
      }
    } catch (err) {
      console.error('[AIPlannerChatPage] 雨天重规划失败:', err);
      if (isMountedRef.current) {
        toast.error(t('planner.weather.failed'));
      }
    } finally {
      if (isMountedRef.current) {
        setReplanningDay(null);
      }
    }
  };

  // Handle click functions
  const handleActivityClick = (activity: Activity) => {
    if (activity.type === 'transport') {
      const data = getMockTransportData(activity.name, t('planner.transportFallback'));
      setSelectedTransport(data);
    } else if (activity.type === 'attraction') {
      const data = getMockAttractionData(activity.name);
      setSelectedAttraction(data);
    }
  };

  const handleMealClick = async (mealInfo: string) => {
    const restaurantName = mealInfo.split(' - ')[0];
    const data = await restaurantDetailService.findByName(restaurantName, currentPlan?.destination);
    if (data) {
      setSelectedRestaurant(data);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1">
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-gray-900">{t('planner.title')}</h1>
              <p className="text-xs text-gray-500">{t('planner.subtitle')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPlanPreview(!showPlanPreview)}
            className="md:hidden"
          >
            <span>{showPlanPreview ? t('planner.planSidebar.hide') : t('planner.planSidebar.show')}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full overflow-hidden">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showPlanPreview && currentPlan ? 'md:border-r border-gray-200' : ''}`}>
          {/* Messages - Scrollable area */}
          <ScrollArea className="flex-1 px-4 pt-4">
            <div className="max-w-3xl mx-auto space-y-4 pb-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-gray-900 mb-2">{t('planner.emptyState.title')}</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {t('planner.emptyState.subtitle')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {([1, 2, 3, 4] as const).map((idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInputValue(t(`planner.emptyState.prompt${idx}`));
                          setTimeout(() => handleSend(), 100);
                        }}
                        className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <p className="text-sm text-gray-900">{t(`planner.emptyState.prompt${idx}Title`)}</p>
                        <p className="text-xs text-gray-500 mt-1">{t(`planner.emptyState.prompt${idx}Desc`)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-gray-500">{t('planner.assistantLabel')}</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="text-sm text-gray-600">{t('planner.thinking')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area - Fixed at bottom of chat area */}
          <div className="border-t border-gray-200 bg-white p-4 pb-20 shadow-lg">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <Textarea
                  placeholder={t('planner.placeholder')}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-red-500 hover:bg-red-600 self-end"
                  size="lg"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2 text-xs text-gray-500">
                <span>{t('planner.inputHint')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Preview Sidebar */}
        {showPlanPreview && currentPlan && (
          <div className="w-full md:w-[400px] lg:w-[480px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Header - Fixed */}
            <div className="p-4 border-b border-gray-200 shrink-0">
              <h2 className="text-gray-900 mb-1">{t('planner.planSidebar.currentPlan')}</h2>
              <p className="text-xs text-gray-500">{t('planner.planSidebar.realtime')}</p>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Trip Summary */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4">
                  <h3 className="text-gray-900 mb-3">{currentPlan.destination}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {currentPlan.dates}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      {t('planner.planSidebar.budget', { value: currentPlan.budget })}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {t('planner.planSidebar.totalDays', { count: currentPlan.days.length })}
                    </div>
                  </div>
                </div>

                {lastStageTimings && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm text-gray-900 mb-3">{t('planner.planSidebar.timingsTitle')}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>{t('planner.planSidebar.timingAttraction', { ms: Math.round(lastStageTimings.attraction_retrieval) })}</div>
                      <div>{t('planner.planSidebar.timingRestaurantNear', { ms: Math.round(lastStageTimings.restaurant_proximity) })}</div>
                      <div>{t('planner.planSidebar.timingRestaurantFallback', { ms: Math.round(lastStageTimings.restaurant_fallback) })}</div>
                      <div>{t('planner.planSidebar.timingValidator', { ms: Math.round(lastStageTimings.validator) })}</div>
                    </div>
                  </div>
                )}

                {/* Daily Plans */}
                {currentPlan.days.map((day) => {
                  const allItems = buildTimelineItems(day);

                  const getItemIcon = (type: string) => {
                    switch (type) {
                      case 'attraction': return <Camera className="w-5 h-5 text-blue-500" />;
                      case 'meal': return <Utensils className="w-5 h-5 text-orange-500" />;
                      case 'transport': return <Train className="w-5 h-5 text-purple-500" />;
                      case 'rest': return <Home className="w-5 h-5 text-green-500" />;
                      default: return <Clock className="w-5 h-5 text-gray-500" />;
                    }
                  };

                  return (
                  <Card key={day.day} className="overflow-hidden">
                    <button
                      onClick={() => toggleDay(day.day)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white shrink-0">
                          D{day.day}
                        </div>
                        <div className="text-left">
                          <div className="text-gray-900">{day.theme}</div>
                          <div className="text-sm text-gray-500">{t('planner.planSidebar.dayActivities', { count: day.activities.length })}</div>
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
                        {allItems.map((item, index) => {
                          const isInteractive = item.type === 'meal' || item.type === 'attraction' || item.type === 'transport';

                          const timelineContent = (
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                                  {getItemIcon(item.type)}
                                </div>
                                {index < allItems.length - 1 && (
                                  <div className="w-0.5 flex-1 min-h-[12px] bg-gray-200 my-1" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    {item.time}
                                  </span>
                                  {item.mealType && (
                                    <span className="text-xs text-orange-500">{t(`planner.meals.${item.mealType}`)}</span>
                                  )}
                                  {'source' in item && item.source && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {item.source}
                                      {typeof item.confidence === 'number'
                                        ? ` ${Math.round(item.confidence * 100)}%`
                                        : ''}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="text-gray-900 mb-1 text-sm">{item.name}</h4>
                                {item.description && (
                                  <p className="text-xs text-gray-600">{item.description}</p>
                                )}
                                {'location' in item && item.location?.address && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {item.location.address}
                                  </p>
                                )}
                              </div>
                            </div>
                          );

                          if (!isInteractive) {
                            return (
                              <div key={index} className="p-4 border-b border-gray-100 last:border-0">
                                {timelineContent}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                if (item.type === 'meal') {
                                  handleMealClick(item.raw ?? `${item.name} - ${item.description}`);
                                } else {
                                  handleActivityClick(item);
                                }
                              }}
                              className="w-full p-4 border-b border-gray-100 last:border-0 text-left hover:bg-gray-50 transition-colors"
                            >
                              {timelineContent}
                            </button>
                          );
                        })}

                        {/* Alternative Plan */}
                        {day.alternativePlan && (
                          <div className="px-4 pb-3 pt-2">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">{t('planner.planSidebar.rainyAlt')}</p>
                              <p className="text-xs text-gray-700">{day.alternativePlan}</p>
                            </div>
                          </div>
                        )}

                        <div className="px-4 pb-4 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleBadWeatherReplan(day.day)}
                            disabled={isTyping || replanningDay !== null}
                          >
                            {replanningDay === day.day ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CloudRain className="w-4 h-4 mr-2" />
                            )}
                            <span>{replanningDay === day.day ? t('planner.planSidebar.replanning') : t('planner.planSidebar.replanRainyButton')}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                  );
                })}
              </div>
            </div>

                {/* Action Buttons - Fixed at Bottom */}
            <div className="p-4 pb-20 border-t border-gray-200 bg-white shrink-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    if (!currentPlan) {
                      toast.info(t('planner.planSidebar.noMap'));
                      return;
                    }

                    if (savedTripId) {
                      onOpenMap?.(savedTripId);
                      return;
                    }

                    onOpenMap?.(buildPreviewMapPayload(currentPlan));
                  }}
                  disabled={!currentPlan}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{t('planner.planSidebar.showMap')}</span>
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  size="sm"
                  onClick={handleSaveTrip}
                  disabled={isSaving || !currentPlan}
                >
                  <Loader2
                    className={`w-4 h-4 ${isSaving ? 'mr-1 animate-spin' : 'mr-1 opacity-0'}`}
                    aria-hidden="true"
                  />
                  <span>{isSaving ? t('planner.saving') : t('planner.savePlan')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Cards */}
      {selectedRestaurant && (
        <RestaurantDetailCard
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      )}
      {selectedTransport && (
        <TransportDetailCard
          transport={selectedTransport}
          onClose={() => setSelectedTransport(null)}
        />
      )}
      {selectedAttraction && (
        <AttractionDetailCard
          attraction={selectedAttraction}
          onClose={() => setSelectedAttraction(null)}
        />
      )}
    </div>
  );
}
