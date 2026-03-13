import { ChevronLeft, Sparkles, Send, Calendar, MapPin, Clock, DollarSign, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { RestaurantDetailCard } from './RestaurantDetailCard';
import { TransportDetailCard } from './TransportDetailCard';
import { AttractionDetailCard } from './AttractionDetailCard';
import { ActivityItem } from './ActivityItem';
import { MealItem } from './MealItem';
import { getMockRestaurantData, getMockTransportData, getMockAttractionData } from './mock-data';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { tripService } from '@/services/tripService';
import { getDestinationImageUrl } from '@/utils/tripDataTransformer';
import { toast } from 'sonner';
import { sendGeminiMessage, type ChatHistory } from '@/services/geminiService';

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
  alternativePlan?: string;
}

interface Activity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest';
}

interface AIPlannerChatPageProps {
  onBack: () => void;
  initialPlan?: string;
  onSaveSuccess?: () => void;
}

export function AIPlannerChatPage({ onBack, initialPlan, onSaveSuccess }: AIPlannerChatPageProps) {
  const { currentUser } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TripPlan | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<ChatHistory>([]);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Detail card states
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedTransport, setSelectedTransport] = useState<any>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<any>(null);

  const callGemini = async (userMessage: string, showInChat: boolean) => {
    setIsTyping(true);
    if (showInChat) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    }
    try {
      const { response, updatedHistory } = await sendGeminiMessage(
        chatHistoryRef.current,
        userMessage,
      );
      chatHistoryRef.current = updatedHistory;
      setMessages(prev => [...prev, { role: 'assistant', content: response.text, timestamp: new Date() }]);
      if (response.tripPlan) {
        setCurrentPlan(response.tripPlan as TripPlan);
        setExpandedDays([1]);
      }
    } catch (err) {
      console.error('[AIPlannerChatPage] Gemini 调用失败:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，AI 助手暂时无法响应，请稍后重试。',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (initialPlan) {
      chatHistoryRef.current = [];
      callGemini(initialPlan, false);
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
      // 解析日期字符串 "2024年10月1日 - 10月7日"
      const dateMatch = currentPlan.dates.match(
        /(\d{4})年(\d{1,2})月(\d{1,2})日\s*[-–]\s*(?:\d{4}年)?(\d{1,2})月(\d{1,2})日/
      );
      let startDate: string;
      let endDate: string;
      if (dateMatch) {
        const [, year, sm, sd, em, ed] = dateMatch;
        startDate = `${year}-${sm.padStart(2, '0')}-${sd.padStart(2, '0')}`;
        endDate = `${year}-${em.padStart(2, '0')}-${ed.padStart(2, '0')}`;
      } else {
        const today = new Date();
        startDate = today.toISOString().split('T')[0];
        const end = new Date(today);
        end.setDate(today.getDate() + currentPlan.days.length - 1);
        endDate = end.toISOString().split('T')[0];
      }

      const activityTypeMap: Record<string, string> = {
        attraction: 'attraction',
        transport: 'transport',
        rest: 'other',
      };

      const itineraries = currentPlan.days.map((day) => {
        const activities: any[] = day.activities.map((act, idx) => ({
          time: act.time,
          type: activityTypeMap[act.type] || 'other',
          name: act.name,
          description: act.description,
          order_index: idx,
        }));

        const mealBase = activities.length;
        const meals = [
          { slot: '早餐', info: day.meals.breakfast, time: '08:00' },
          { slot: '午餐', info: day.meals.lunch, time: '12:00' },
          { slot: '晚餐', info: day.meals.dinner, time: '19:00' },
        ].filter((m) => m.info);

        meals.forEach(({ slot, info, time }, idx) => {
          const [name, desc] = info!.split(' - ');
          activities.push({
            time,
            type: 'meal',
            name: `${slot}：${name.trim()}`,
            description: desc || info!,
            order_index: mealBase + idx,
          });
        });

        return {
          itinerary: { day_number: day.day, theme: day.theme, date: null },
          activities,
        };
      });

      await tripService.createTripWithItineraries({
        trip: {
          user_id: currentUser.id,
          destination: currentPlan.destination,
          start_date: startDate,
          end_date: endDate,
          duration: `${currentPlan.days.length}天`,
          budget: currentPlan.budget,
          image_url: getDestinationImageUrl(currentPlan.destination),
          status: 'planning',
          source: 'ai',
        },
        itineraries,
      });

      toast.success('行程已保存！');
      onSaveSuccess?.();
    } catch (err) {
      toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    const message = inputValue;
    setInputValue('');
    callGemini(message, true);
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Handle click functions
  const handleActivityClick = (activity: Activity) => {
    if (activity.type === 'transport') {
      const data = getMockTransportData(activity.name, '酒店');
      setSelectedTransport(data);
    } else if (activity.type === 'attraction') {
      const data = getMockAttractionData(activity.name);
      setSelectedAttraction(data);
    }
  };

  const handleMealClick = (mealInfo: string) => {
    const restaurantName = mealInfo.split(' - ')[0];
    const data = getMockRestaurantData(restaurantName);
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
              <h1 className="text-gray-900">AI 行程规划助手</h1>
              <p className="text-xs text-gray-500">智能对话，实时更新方案</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPlanPreview(!showPlanPreview)}
            className="md:hidden"
          >
            {showPlanPreview ? '隐藏' : '显示'}方案
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
                  <h2 className="text-gray-900 mb-2">开始规划你的行程</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    告诉我你的需求，我会实时为你生成和优化行程方案
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    <button
                      onClick={() => {
                        setInputValue('帮我规划一个伦敦7日游');
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                    >
                      <p className="text-sm text-gray-900">伦敦7日深度游</p>
                      <p className="text-xs text-gray-500 mt-1">经典+小众景点</p>
                    </button>
                    <button
                      onClick={() => {
                        setInputValue('预算有限，帮我优化行程');
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                    >
                      <p className="text-sm text-gray-900">经济型方案</p>
                      <p className="text-xs text-gray-500 mt-1">省钱攻略</p>
                    </button>
                    <button
                      onClick={() => {
                        setInputValue('推荐美食餐厅');
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                    >
                      <p className="text-sm text-gray-900">美食推荐</p>
                      <p className="text-xs text-gray-500 mt-1">特色餐厅</p>
                    </button>
                    <button
                      onClick={() => {
                        setInputValue('准备雨天备选方案');
                        setTimeout(() => handleSend(), 100);
                      }}
                      className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                    >
                      <p className="text-sm text-gray-900">雨天方案</p>
                      <p className="text-xs text-gray-500 mt-1">室内活动</p>
                    </button>
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
                        <span className="text-xs text-gray-500">AI 助手</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                      <span className="text-sm text-gray-600">AI 正在思考...</span>
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
                  placeholder="告诉我你想要调整的内容，比如：调整预算、更换餐厅、添加景点..."
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
                <span>💡 按 Enter 发送，Shift + Enter 换行</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Preview Sidebar */}
        {showPlanPreview && currentPlan && (
          <div className="w-full md:w-[400px] lg:w-[480px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Header - Fixed */}
            <div className="p-4 border-b border-gray-200 shrink-0">
              <h2 className="text-gray-900 mb-1">当前方案</h2>
              <p className="text-xs text-gray-500">实时更新中</p>
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
                      预算：{currentPlan.budget}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      共 {currentPlan.days.length} 天
                    </div>
                  </div>
                </div>

                {/* Daily Plans */}
                {currentPlan.days.map((day) => (
                  <div key={day.day} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleDay(day.day)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm">D{day.day}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-gray-900">{day.theme}</p>
                          <p className="text-xs text-gray-500">{day.activities.length} 个活动</p>
                        </div>
                      </div>
                      {expandedDays.includes(day.day) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedDays.includes(day.day) && (
                      <div className="px-4 pb-4 space-y-3">
                        <Separator />
                        
                        {/* Activities */}
                        <div className="space-y-2">
                          {day.activities.map((activity, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleActivityClick(activity)}
                              className="flex gap-3 w-full text-left hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              <div className="text-xs text-gray-500 w-12 shrink-0 pt-0.5">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{activity.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Meals */}
                        {(day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                          <>
                            <Separator />
                            <div className="space-y-1.5">
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span>🍽️</span>
                                <span>餐饮推荐</span>
                              </p>
                              {day.meals.breakfast && (
                                <button
                                  onClick={() => handleMealClick(day.meals.breakfast!)}
                                  className="text-xs text-gray-700 pl-5 hover:text-red-500 transition-colors w-full text-left"
                                >
                                  早餐：{day.meals.breakfast}
                                </button>
                              )}
                              {day.meals.lunch && (
                                <button
                                  onClick={() => handleMealClick(day.meals.lunch!)}
                                  className="text-xs text-gray-700 pl-5 hover:text-red-500 transition-colors w-full text-left"
                                >
                                  午餐：{day.meals.lunch}
                                </button>
                              )}
                              {day.meals.dinner && (
                                <button
                                  onClick={() => handleMealClick(day.meals.dinner!)}
                                  className="text-xs text-gray-700 pl-5 hover:text-red-500 transition-colors w-full text-left"
                                >
                                  晚餐：{day.meals.dinner}
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {/* Alternative Plan */}
                        {day.alternativePlan && (
                          <>
                            <Separator />
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">🌧️ 雨天备选</p>
                              <p className="text-xs text-gray-700">{day.alternativePlan}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons - Fixed at Bottom */}
            <div className="p-4 pb-20 border-t border-gray-200 bg-white shrink-0">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  显示地图
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  size="sm"
                  onClick={handleSaveTrip}
                  disabled={isSaving || !currentPlan}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />保存中...</>
                  ) : (
                    '保存行程'
                  )}
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
