import { ChevronLeft, Calendar, Banknote, Heart, MapPin, Users, Search, ChevronDown } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { AIPlannerChatPage } from './AIPlannerChatPage';
import { chineseCities, searchCities } from '../data/cities';

interface GuidedQuestionPageProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  onOpenMap?: (tripId: string) => void;
}

export function GuidedQuestionPage({ onBack, onSaveSuccess, onOpenMap }: GuidedQuestionPageProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showChat, setShowChat] = useState(false);

  const [formData, setFormData] = useState({
    destination: '',
    dateInput: '',
    duration: '',
    budget: '',
    preferences: [] as string[],
    accessibility: false,
    companions: '',
  });

  // Destination search states
  const [destinationSearch, setDestinationSearch] = useState('');
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    return searchCities(destinationSearch);
  }, [destinationSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDestinationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDestination = useMemo(() => {
    return chineseCities.find(c => c.code === formData.destination);
  }, [formData.destination]);

  const budgetOptions = [
    { value: 'budget1', label: '经济型', desc: '< ¥100/天', icon: '💰' },
    { value: 'budget2', label: '舒适型', desc: '¥100-¥200/天', icon: '💰💰' },
    { value: 'budget3', label: '优享型', desc: '¥200-¥500/天', icon: '💰💰💰' },
    { value: 'budget4', label: '豪华型', desc: '¥500+/天', icon: '💰💰💰💰' },
  ];

  const preferenceOptions = [
    { value: 'industrial', label: '工业旅游', icon: '🏭' },
    { value: 'nature', label: '自然风光', icon: '🏞️' },
    { value: 'history', label: '人文历史', icon: '🏛️' },
    { value: 'photo', label: '网红拍照', icon: '📸' },
    { value: 'family', label: '亲子友好', icon: '👨‍👩‍👧' },
    { value: 'relaxed', label: '慢节奏', icon: '🍃' },
    { value: 'nightlife', label: '夜生活', icon: '🌃' },
    { value: 'food', label: '美食探索', icon: '🍜' },
  ];

  const progress = (currentStep / totalSteps) * 100;

  // Generate initial prompt for AI based on form data
  const generateInitialPrompt = () => {
    const selectedDestinationData = chineseCities.find(c => c.code === formData.destination);
    const budgetOption = budgetOptions.find(b => b.value === formData.budget);
    const selectedPreferences = preferenceOptions
      .filter(p => formData.preferences.includes(p.value))
      .map(p => p.label)
      .join('、');

    return `我想规划一次旅行：
- 目的地：${selectedDestinationData?.name || '未指定'} ${selectedDestinationData?.flag || ''}
- 出行时间：${formData.dateInput || '待定'}
- 行程天数：${formData.duration || '待定'}天
- 预算档位：${budgetOption?.label || '未指定'} (${budgetOption?.desc || ''})
- 旅行风格：${selectedPreferences || '未指定'}
- 同伴构成：${formData.companions || '独自一人'}
${formData.accessibility ? '- 需要无障碍设施' : ''}

请帮我规划一个详细的行程！`;
  };

  if (showChat) {
    return (
      <AIPlannerChatPage
        onBack={() => setShowChat(false)}
        initialPlan={generateInitialPrompt()}
        onSaveSuccess={onSaveSuccess}
        onOpenMap={onOpenMap}
      />
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-gray-900 mb-2">目的地是哪里？</h2>
              <p className="text-sm text-gray-600">
                选择你想去的城市
              </p>
            </div>

            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="destination-search">目的地</Label>
              
              {/* Search Input */}
              <div 
                className="relative mt-2"
                onClick={() => setIsDestinationDropdownOpen(true)}
              >
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-red-300 transition-colors">
                  {selectedDestination ? (
                    <>
                      <MapPin className="w-5 h-5 text-red-500" />
                      <div className="flex-1">
                        <div className="text-gray-900">{selectedDestination.name}</div>
                        <div className="text-xs text-gray-500">{selectedDestination.province}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-gray-400">搜索城市名称或省份</span>
                    </>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDestinationDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDestinationDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {/* Search Input in Dropdown */}
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索城市或省份..."
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* City List */}
                  <div className="max-h-80 overflow-y-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <div
                          key={city.code}
                          onClick={() => {
                            setFormData({ ...formData, destination: city.code });
                            setIsDestinationDropdownOpen(false);
                            setDestinationSearch('');
                          }}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            formData.destination === city.code
                              ? 'bg-red-50 text-red-700'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <MapPin className={`w-4 h-4 ${formData.destination === city.code ? 'text-red-500' : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className={`${formData.destination === city.code ? 'text-red-700' : 'text-gray-900'}`}>
                              {city.name}
                              {city.popular && <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">热门</span>}
                            </div>
                            <div className="text-xs text-gray-500">{city.province}</div>
                          </div>
                          {formData.destination === city.code && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        未找到匹配的城市
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-gray-900 mb-2">出行时间</h2>
              <p className="text-sm text-gray-600">
                告诉我们你的出行日期或大概时间
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="dateInput">日期或时间描述</Label>
                <Input
                  id="dateInput"
                  placeholder='例如："十一假期"、"2024年3月15日-20日"、"下月中旬"'
                  value={formData.dateInput}
                  onChange={(e) => setFormData({ ...formData, dateInput: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="duration">行程天数</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="duration"
                    type="number"
                    placeholder="例如：7"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                  <span className="text-gray-600">天</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Banknote className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-gray-900 mb-2">预算规划</h2>
              <p className="text-sm text-gray-600">
                选择你的每日预算范围（人民币）
              </p>
            </div>

            <RadioGroup value={formData.budget} onValueChange={(value) => setFormData({ ...formData, budget: value })}>
              <div className="space-y-3">
                {budgetOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-red-300 transition-colors">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="flex-1 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.desc}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-gray-900 mb-2">旅行偏好</h2>
              <p className="text-sm text-gray-600">
                告诉我们你的旅行风格和同行情况
              </p>
            </div>

            <div>
              <Label className="mb-3">旅行风格（可多选）</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {preferenceOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      const newPreferences = formData.preferences.includes(option.value)
                        ? formData.preferences.filter(p => p !== option.value)
                        : [...formData.preferences, option.value];
                      setFormData({ ...formData, preferences: newPreferences });
                    }}
                    className={`flex items-center gap-3 bg-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      formData.preferences.includes(option.value)
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <Checkbox
                      checked={formData.preferences.includes(option.value)}
                      className="pointer-events-none"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{option.icon}</span>
                      <span className="text-sm text-gray-900">{option.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="companions">同伴构成</Label>
              <Input
                id="companions"
                placeholder="例如：独自一人、情侣、2大1小"
                value={formData.companions}
                onChange={(e) => setFormData({ ...formData, companions: e.target.value })}
                className="mt-2"
              />
            </div>

            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Checkbox
                id="accessibility"
                checked={formData.accessibility}
                onCheckedChange={(checked) => setFormData({ ...formData, accessibility: checked as boolean })}
              />
              <Label htmlFor="accessibility" className="cursor-pointer flex-1">
                <div className="text-gray-900 mb-1">需要无障碍设施</div>
                <div className="text-sm text-gray-600">
                  我们会优先推荐无障碍友好的景点和路线
                </div>
              </Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900">规划你的行程</h1>
            <p className="text-xs text-gray-500">第 {currentStep} 步，共 {totalSteps} 步</p>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-screen-xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1"
            >
              上一步
            </Button>
          )}
          <Button
            onClick={() => {
              if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
              } else {
                // Navigate to AI chat
                setShowChat(true);
              }
            }}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            {currentStep === totalSteps ? '开始智能规划' : '下一步'}
          </Button>
        </div>
      </div>
    </div>
  );
}
