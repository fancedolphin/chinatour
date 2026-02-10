import { ChevronLeft, Sparkles, Send, Calendar, MapPin, Clock, DollarSign, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { TripMapViewer } from './TripMapViewer';
import { useAuth } from '@/presentation/hooks/useAuth';
import { tripService } from '@/services/tripService';
import { tripDataTransformer } from '@/utils/tripDataTransformer';
import { ACTIVITY_LABELS, ACTIVITY_STYLES } from '@/constants/activityTypes';

// --- Types ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Activity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest' | 'meal';
  geoCoordinates?: {
    lat: number;
    lng: number;
  };
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

interface TripPlan {
  destination: string;
  dates: string;
  budget: string;
  days: DayPlan[];
}

interface AIPlannerChatPageProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  initialPlan?: string;
  onActivityClick?: (activity: Activity, dayNumber: number) => void;
}

// --- Gemini Configuration ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Define the Schema for structured output
const TRIP_PLAN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    chatResponse: {
      type: SchemaType.STRING,
      description: "Conversational response to the user explaining changes or recommendations.",
    },
    tripPlan: {
      type: SchemaType.OBJECT,
      description: "The full structured trip plan. Return null if no plan is created yet.",
      nullable: true,
      properties: {
        destination: { type: SchemaType.STRING },
        dates: { type: SchemaType.STRING },
        budget: { type: SchemaType.STRING },
        days: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              day: { type: SchemaType.INTEGER },
              theme: { type: SchemaType.STRING },
              activities: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    time: { type: SchemaType.STRING },
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING },
                    geoCoordinates: {
                      type: SchemaType.OBJECT,
                      nullable: true,
                      description: "Latitude and longitude for the location.",
                      properties: {
                        lat: { type: SchemaType.NUMBER },
                        lng: { type: SchemaType.NUMBER }
                      },
                      required: ['lat', 'lng']
                    }
                  },
                  required: ['time', 'name', 'description', 'type'],
                },
              },
              meals: {
                type: SchemaType.OBJECT,
                properties: {
                  breakfast: { type: SchemaType.STRING, nullable: true },
                  lunch: { type: SchemaType.STRING, nullable: true },
                  dinner: { type: SchemaType.STRING, nullable: true },
                },
              },
              alternativePlan: { type: SchemaType.STRING, nullable: true },
            },
            required: ['day', 'theme', 'activities', 'meals'],
          },
        },
      },
      required: ['destination', 'dates', 'budget', 'days'],
    },
  },
  required: ['chatResponse'],
};

export function AIPlannerChatPage({ onBack, onSaveSuccess, initialPlan, onActivityClick }: AIPlannerChatPageProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TripPlan | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  // Ref to store chat history for the API context
  const chatHistoryRef = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- API Interaction ---
  const callGemini = async (userMessage: string) => {
    setIsTyping(true);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: TRIP_PLAN_SCHEMA,
        },
        systemInstruction: `You are an expert Travel Planner AI. Your goal is to help users plan trips and output structured JSON data.
Rules:
1. Always respond in JSON format matching the provided schema.
2. The 'chatResponse' field should be a friendly, helpful message in Chinese using emojis.
3. The 'tripPlan' field should be the full itinerary.
4. If the user asks to modify the plan, return the MODIFIED full plan in 'tripPlan'.
5. For every activity, provide accurate 'geoCoordinates' (lat, lng) for map display.
6. Use appropriate currency (£ for UK, ¥ for China, etc.).
7. Ensure times are sequential and realistic.`,
      });

      // Build context with current plan if exists
      let contextMessage = userMessage;
      if (currentPlan) {
        contextMessage = `Current Plan: ${JSON.stringify(currentPlan)}. User Request: ${userMessage}`;
      }

      const chat = model.startChat({
        history: chatHistoryRef.current,
      });

      const result = await chat.sendMessage(contextMessage);
      const responseText = result.response.text();

      if (!responseText) throw new Error("No response from AI");

      const data = JSON.parse(responseText);

      // Update UI State
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.chatResponse, timestamp: new Date() }
      ]);

      if (data.tripPlan) {
        setCurrentPlan(data.tripPlan);
        setExpandedDays([1]);
      }

      // Update History Ref
      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: responseText }] }
      ];
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "抱歉，连接AI服务时出现问题，请稍后重试。", timestamp: new Date() }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Initial Load Trigger
  useEffect(() => {
    if (initialPlan && messages.length === 0) {
      handleSend(initialPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    callGemini(text);
  };

  const handleSavePlan = async () => {
    if (!currentPlan) return;
    if (!currentUser) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "请先登录后再保存行程 🔐", timestamp: new Date() }
      ]);
      return;
    }

    setIsSaving(true);
    try {
      const transformedData = await tripDataTransformer.transformWithEnhancement(
        currentPlan,
        currentUser.id,
      );
      console.log('[AIPlannerChatPage] 行程保存数据转换完成:', {
        destination: transformedData.trip.destination,
        itineraryCount: transformedData.itineraries.length,
      });

      const savedTrip = await tripService.createTripWithItineraries(transformedData);
      console.log('[AIPlannerChatPage] 行程保存完成:', savedTrip.id);

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "✅ 行程已成功保存！你可以在「我的行程」中查看和编辑。", timestamp: new Date() }
      ]);

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (e) {
      console.error("Save failed", e);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "保存行程失败，请稍后重试。", timestamp: new Date() }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Flatten activities for map rendering
  const getFlattenedLocations = () => {
    if (!currentPlan) return [];
    const locations: Array<{
      name: string;
      description: string;
      coordinates: { lat: number; lng: number };
      day: number;
    }> = [];
    currentPlan.days.forEach(day => {
      day.activities.forEach(act => {
        if (act.geoCoordinates && act.geoCoordinates.lat && act.geoCoordinates.lng) {
          locations.push({
            name: act.name,
            description: act.description,
            coordinates: act.geoCoordinates,
            day: day.day
          });
        }
      });
    });
    return locations;
  };

  const handleOpenMap = () => {
    const locs = getFlattenedLocations();
    if (locs.length === 0) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "当前行程暂无坐标数据，无法显示地图。", timestamp: new Date() }
      ]);
      return;
    }
    setIsMapOpen(true);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="flex-none sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-gray-900 font-semibold">AI 行程规划助手</h1>
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
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${showPlanPreview ? 'md:border-r border-gray-200' : ''}`}>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 && !isTyping && (
                <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">开始规划你的行程</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    告诉我你的需求，我会实时为你生成和优化行程方案
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {[
                      { title: "伦敦7日深度游", sub: "经典+小众景点", prompt: "帮我规划一个伦敦7日游，包含大英博物馆和一些小众景点" },
                      { title: "经济型方案", sub: "省钱攻略", prompt: "我想去英国玩，但是预算有限，帮我做一个经济型方案" },
                      { title: "美食推荐", sub: "特色餐厅", prompt: "推荐一些伦敦当地人爱吃的美食餐厅" },
                      { title: "雨天方案", sub: "室内活动", prompt: "如果在伦敦遇到下雨天，有什么室内活动的备选方案？" }
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(item.prompt)}
                        className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all hover:shadow-md"
                      >
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-red-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-medium text-gray-500">AI 助手</span>
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
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600">AI 正在思考...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex-none border-t border-gray-200 bg-white/90 backdrop-blur-sm p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
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
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none focus:border-red-400 focus:ring-red-400"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-red-500 hover:bg-red-600 self-end transition-all hover:shadow-lg disabled:opacity-50"
                  size="lg"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2 text-xs text-gray-500 justify-end">
                <span>💡 按 Enter 发送，Shift + Enter 换行</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Preview Sidebar */}
        {showPlanPreview && currentPlan && (
          <div className="w-full md:w-[400px] lg:w-[480px] bg-white border-l border-gray-200 flex flex-col h-full animate-in slide-in-from-right duration-300 overflow-hidden">
            <div className="flex-none p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h2 className="text-gray-900 font-semibold">当前方案</h2>
              <p className="text-xs text-gray-500">实时更新中</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 pb-4">
                {/* Trip Summary */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{currentPlan.destination}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-red-500" />
                      {currentPlan.dates}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign className="w-4 h-4 text-red-500" />
                      预算：{currentPlan.budget}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-red-500" />
                      共 {currentPlan.days.length} 天
                    </div>
                  </div>
                </div>

                {/* Daily Plans */}
                {currentPlan.days.map((day) => (
                  <div key={day.day} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <button
                      onClick={() => toggleDay(day.day)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center shrink-0 font-bold shadow-sm">
                          <span className="text-sm">D{day.day}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900">{day.theme}</p>
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
                      <div className="px-4 pb-4 space-y-3 bg-white">
                        <Separator />
                        {/* Activities */}
                        <div className="space-y-3 pt-2">
                          {day.activities.map((activity, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 group cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
                              onClick={() => onActivityClick?.(activity, day.day)}
                            >
                              <div className="text-xs font-medium text-gray-500 w-12 shrink-0 pt-0.5">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                  <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ACTIVITY_STYLES[activity.type]}`}>
                                    {ACTIVITY_LABELS[activity.type]}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-normal">{activity.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Meals */}
                        {(day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                          <>
                            <Separator />
                            <div className="bg-yellow-50/50 p-3 rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                <span className="text-base">🍽️</span>
                                <span>餐饮推荐</span>
                              </p>
                              <div className="space-y-1.5">
                                {day.meals.breakfast && (
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-gray-400 w-8 shrink-0">早餐</span>
                                    <span className="text-gray-700">{day.meals.breakfast}</span>
                                  </div>
                                )}
                                {day.meals.lunch && (
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-gray-400 w-8 shrink-0">午餐</span>
                                    <span className="text-gray-700">{day.meals.lunch}</span>
                                  </div>
                                )}
                                {day.meals.dinner && (
                                  <div className="flex gap-2 text-xs">
                                    <span className="text-gray-400 w-8 shrink-0">晚餐</span>
                                    <span className="text-gray-700">{day.meals.dinner}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Alternative Plan */}
                        {day.alternativePlan && (
                          <>
                            <Separator />
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                              <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                                <span>🌧️</span> 雨天备选
                              </p>
                              <p className="text-xs text-blue-600 leading-relaxed">{day.alternativePlan}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 hover:border-red-200 hover:bg-red-50 hover:text-red-600" 
                    size="sm"
                    onClick={handleOpenMap}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    查看地图
                  </Button>
                  <Button 
                    className="flex-1 bg-red-500 hover:bg-red-600" 
                    size="sm"
                    onClick={handleSavePlan}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      '保存方案'
                    )}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Map Viewer Modal */}
        {currentPlan && (
          <TripMapViewer 
            isOpen={isMapOpen} 
            onClose={() => setIsMapOpen(false)} 
            locations={getFlattenedLocations()}
            destination={currentPlan.destination}
          />
        )}
      </div>
    </div>
  );
}
