import { ChevronLeft, Sparkles, Send, Calendar, MapPin, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
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
}

export function AIPlannerChatPage({ onBack, initialPlan }: AIPlannerChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<TripPlan | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  
  // Detail card states
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedTransport, setSelectedTransport] = useState<any>(null);
  const [selectedAttraction, setSelectedAttraction] = useState<any>(null);

  useEffect(() => {
    if (initialPlan) {
      // Determine if it's a guided questionnaire or existing plan
      const isGuidedPlan = initialPlan.includes('我想规划一次旅行');
      
      let response = '';
      if (isGuidedPlan) {
        response = `太好了！根据你提供的信息，我为你定制了一个完美的${getMockPlan().destination}行程！✨\n\n我已经为你准备了：\n✓ 详细的每日行程安排\n✓ 符合你预算的景点和活动\n✓ 根据你的风格偏好精选的体验\n✓ 每天的餐厅推荐（早中晚餐）\n✓ 雨天备选方案\n\n请在右侧查看完整规划。你随时可以告诉我：\n• "调整预算到经济型"\n• "推荐更多美食餐厅"\n• "添加XXX景点"\n• "优化路线顺序"`;
      } else {
        response = `我已经分析了你的行程计划！这是一个${getMockPlan().destination}的行程。\n\n我帮你整理了详细的行程安排，包括每天的景点、餐厅推荐和备选方案。你可以在右侧查看完整规划。\n\n你可以告诉我：\n• 调整预算档位\n• 更换某天的餐厅\n• 添加特定景点\n• 获取雨天备选方案\n• 优化路线顺序`;
      }
      
      simulateAIResponse(response, true);
    }
  }, [initialPlan]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMockPlan = (): TripPlan => {
    return {
      destination: '伦敦 · 爱丁堡',
      dates: '2024年10月1日 - 10月7日',
      budget: '£3,500',
      days: [
        {
          day: 1,
          theme: '初遇伦敦',
          activities: [
            {
              time: '09:00',
              name: '抵达希思罗机场',
              description: '办理入境手续，领取行李',
              type: 'transport',
            },
            {
              time: '11:00',
              name: '酒店入住',
              description: 'Premier Inn London City Tower Hill',
              type: 'rest',
            },
            {
              time: '14:00',
              name: '大英博物馆',
              description: '世界三大博物馆之一，馆藏800万件文物',
              type: 'attraction',
            },
            {
              time: '17:30',
              name: '牛津街购物',
              description: '伦敦最繁华的商业街，体验都市风情',
              type: 'attraction',
            },
          ],
          meals: {
            lunch: 'Dishoom - 印度风味料理，人均£25',
            dinner: 'Gordon Ramsay Bar & Grill - 英式牛排，人均£60',
          },
          alternativePlan: '如遇下雨：改为参观自然历史博物馆 + V&A博物馆（室内活动）',
        },
        {
          day: 2,
          theme: '皇家风范',
          activities: [
            {
              time: '09:00',
              name: '白金汉宫',
              description: '观看卫兵换岗仪式（11:00开始）',
              type: 'attraction',
            },
            {
              time: '12:00',
              name: '圣詹姆斯公园',
              description: '伦敦最美的皇家公园之一',
              type: 'attraction',
            },
            {
              time: '14:30',
              name: '西敏寺',
              description: '英国王室婚礼与加冕地',
              type: 'attraction',
            },
            {
              time: '16:30',
              name: '伦敦眼',
              description: '泰晤士河畔的巨型摩天轮',
              type: 'attraction',
            },
          ],
          meals: {
            breakfast: 'The Breakfast Club - 英式早餐，人均£15',
            lunch: 'Borough Market - 市集小吃，人均£20',
            dinner: 'Sketch - 网红下午茶+晚餐，人均£80',
          },
          alternativePlan: '如遇下雨：伦敦塔 + 塔桥 + Sky Garden（有遮蔽的景点）',
        },
        {
          day: 3,
          theme: '温莎古堡',
          activities: [
            {
              time: '08:30',
              name: '前往温莎',
              description: '搭乘火车，约1小时车程',
              type: 'transport',
            },
            {
              time: '10:00',
              name: '温莎城堡',
              description: '英国女王的官方居所，世界最大的有人居住城堡',
              type: 'attraction',
            },
            {
              time: '14:00',
              name: '伊顿公学',
              description: '参观英国最著名的贵族学校',
              type: 'attraction',
            },
            {
              time: '16:30',
              name: '返回伦敦',
              description: '火车返程',
              type: 'transport',
            },
          ],
          meals: {
            breakfast: '酒店早餐',
            lunch: 'The Duchess of Cambridge - 温莎当地餐厅，人均£30',
            dinner: 'Flat Iron - 伦敦牛排馆，人均£25',
          },
          alternativePlan: '如遇下雨：照常参观（城堡内部为主）+ 增加Windsor Royal Shopping区购物时间',
        },
      ],
    };
  };

  const simulateAIResponse = (content: string, withPlan: boolean = false) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      
      if (withPlan) {
        setCurrentPlan(getMockPlan());
      }
    }, 1000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate different AI responses based on keywords
    const lowerInput = inputValue.toLowerCase();
    
    if (lowerInput.includes('预算') || lowerInput.includes('便宜') || lowerInput.includes('省钱')) {
      simulateAIResponse(
        '好的！我帮你调整为经济档预算方案。\n\n主要调整：\n• 总预算从£3,500降至£2,200\n• 餐厅改为更实惠的选择\n• 住宿调整为3星酒店\n• 增加超市购物和自助餐选项\n\n已更新右侧行程，请查看！',
        true
      );
    } else if (lowerInput.includes('餐厅') || lowerInput.includes('美食') || lowerInput.includes('吃')) {
      simulateAIResponse(
        '当然！我为你推荐更多特色餐厅：\n\n**第1天额外推荐**\n• Hoppers - 斯里兰卡街头小吃，人均£20\n• Padella - 意大利手工面，人均£15\n\n**第2天额外推荐**\n• Duck & Waffle - 24小时营业高空餐厅，人均£50\n• Bao - 台式刈包，人均£18\n\n需要我更新到行程中吗？',
        false
      );
    } else if (lowerInput.includes('雨天') || lowerInput.includes('下雨') || lowerInput.includes('天气')) {
      simulateAIResponse(
        '已为每天准备了雨天备选方案！\n\n雨天推荐活动：\n• 博物馆群（大英、自然历史、V&A）\n• 购物中心（Westfield、Harrods）\n• 室内市场（Borough Market、Camden Market）\n• 剧院音乐剧（西区剧院）\n• 室内景点（伦敦地牢、杜莎夫人蜡像馆）\n\n这些都已添加到每天的"雨天备选方案"中。',
        true
      );
    } else if (lowerInput.includes('景点') || lowerInput.includes('地方') || lowerInput.includes('推荐')) {
      simulateAIResponse(
        '为你补充一些小众但值得一去的地方：\n\n📍 **肖迪奇区（Shoreditch）**\n创意街头艺术和独立咖啡馆\n\n📍 **格林威治（Greenwich）**\n本初子午线、皇家天文台、集市\n\n📍 **诺丁山（Notting Hill）**\n彩色房屋街区、古董市场\n\n📍 **利德贺市场（Leadenhall Market）**\n哈利波特取景地\n\n需要我加入行程吗？',
        false
      );
    } else {
      simulateAIResponse(
        '我理解了你的需求！让我帮你优化行程。\n\n已完成：\n✓ 分析了你的偏好\n✓ 优化了路线顺序\n✓ 更新了时间安排\n✓ 补充了交通信息\n\n请查看右侧更新的行程方案。还有其他需要调整的吗？',
        true
      );
    }
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
          <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
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
          <div className="w-full md:w-[400px] lg:w-[480px] bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-gray-900 mb-1">当前方案</h2>
              <p className="text-xs text-gray-500">实时更新中</p>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
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
                            <div key={idx} className="flex gap-3">
                              <div className="text-xs text-gray-500 w-12 shrink-0 pt-0.5">
                                {activity.time}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{activity.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                              </div>
                            </div>
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
                                <p className="text-xs text-gray-700 pl-5">早餐：{day.meals.breakfast}</p>
                              )}
                              {day.meals.lunch && (
                                <p className="text-xs text-gray-700 pl-5">午餐：{day.meals.lunch}</p>
                              )}
                              {day.meals.dinner && (
                                <p className="text-xs text-gray-700 pl-5">晚餐：{day.meals.dinner}</p>
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" size="sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    查看地图
                  </Button>
                  <Button className="flex-1 bg-red-500 hover:bg-red-600" size="sm">
                    保存方案
                  </Button>
                </div>
              </div>
            </ScrollArea>
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