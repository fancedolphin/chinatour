import { ChevronLeft, Calendar, Banknote, Heart, MapPin, Users, Search, ChevronDown, X } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { AIPlannerChatPage } from './AIPlannerChatPage';
import { chineseCities, searchCities, getCityDisplayName, getProvinceDisplayName } from '../data/cities';
import { useT } from '@/i18n/useT';

interface GuidedQuestionPageProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  onOpenMap?: (tripId: string) => void;
}

type BudgetOption = { value: string; label: string; desc: string; icon: string };
type PreferenceOption = { value: string; label: string; icon: string };

export function GuidedQuestionPage({ onBack, onSaveSuccess, onOpenMap }: GuidedQuestionPageProps) {
  const { t, locale } = useT();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showChat, setShowChat] = useState(false);

  const [formData, setFormData] = useState({
    destinations: [] as string[],
    dateInput: '',
    duration: '',
    budget: '',
    preferences: [] as string[],
    accessibility: false,
    companions: '',
  });

  const [destinationSearch, setDestinationSearch] = useState('');
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCities = useMemo(() => {
    return searchCities(destinationSearch);
  }, [destinationSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDestinationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDestinations = useMemo(() => {
    return formData.destinations
      .map((code) => chineseCities.find((c) => c.code === code))
      .filter(Boolean) as typeof chineseCities;
  }, [formData.destinations]);

  const toggleDestination = (code: string) => {
    setFormData((prev) => {
      const next = prev.destinations.includes(code)
        ? prev.destinations.filter((c) => c !== code)
        : [...prev.destinations, code];
      return { ...prev, destinations: next };
    });
  };

  const budgetOptions = t('planInput.guided.budgetOptions', { returnObjects: true }) as BudgetOption[];
  const preferenceOptions = t('planInput.guided.preferenceOptions', { returnObjects: true }) as PreferenceOption[];

  const progress = (currentStep / totalSteps) * 100;

  const generateInitialPrompt = () => {
    const budgetOption = budgetOptions.find(b => b.value === formData.budget);
    const joiner = t('planInput.guided.preferenceJoiner');
    const selectedPreferences = preferenceOptions
      .filter(p => formData.preferences.includes(p.value))
      .map(p => p.label)
      .join(joiner);

    const unspecified = t('planInput.guided.promptUnspecified');
    const tbd = t('planInput.guided.promptTBD');
    const solo = t('planInput.guided.promptSolo');

    const destinationStr = selectedDestinations.length > 0
      ? selectedDestinations.map((c) => getCityDisplayName(c, locale as 'zh' | 'en')).join(joiner)
      : unspecified;
    const budgetStr = budgetOption ? `${budgetOption.label} (${budgetOption.desc})` : unspecified;

    return t('planInput.guided.promptTemplate', {
      destination: destinationStr,
      date: formData.dateInput || tbd,
      days: formData.duration || tbd,
      budget: budgetStr,
      preferences: selectedPreferences || unspecified,
      companions: formData.companions || solo,
      accessibility: formData.accessibility ? t('planInput.guided.promptAccessibilityLine') : '',
    });
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
              <h2 className="text-gray-900 mb-2">{t('planInput.guided.step1Title')}</h2>
              <p className="text-sm text-gray-600">{t('planInput.guided.step1Subtitle')}</p>
            </div>

            <div className="relative" ref={dropdownRef}>
              <Label htmlFor="destination-search">{t('planInput.guided.destinationLabel')}</Label>

              {/* Selected destinations as chips */}
              {selectedDestinations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDestinations.map((city) => (
                    <button
                      key={city.code}
                      type="button"
                      onClick={() => toggleDestination(city.code)}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm hover:bg-red-100 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{getCityDisplayName(city, locale as 'zh' | 'en')}</span>
                      <X className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}

              <div
                className="relative mt-2"
                onClick={() => setIsDestinationDropdownOpen(true)}
              >
                <div className="flex items-center gap-3 w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-red-300 transition-colors">
                  <Search className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-gray-400">
                    {selectedDestinations.length > 0
                      ? t('planInput.guided.addMoreDestinations')
                      : t('planInput.guided.destinationPlaceholder')}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDestinationDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isDestinationDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('planInput.guided.destinationSearchPlaceholder')}
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => {
                        const isSelected = formData.destinations.includes(city.code);
                        return (
                          <div
                            key={city.code}
                            onClick={() => {
                              toggleDestination(city.code);
                              setDestinationSearch('');
                            }}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-red-50 text-red-700' : 'hover:bg-gray-50'
                            }`}
                          >
                            <MapPin className={`w-4 h-4 ${isSelected ? 'text-red-500' : 'text-gray-400'}`} />
                            <div className="flex-1">
                              <div className={isSelected ? 'text-red-700' : 'text-gray-900'}>
                                {getCityDisplayName(city, locale as 'zh' | 'en')}
                                {city.popular && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                                    {t('planInput.guided.popularBadge')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {getProvinceDisplayName(city.province, locale as 'zh' | 'en')}
                              </div>
                            </div>
                            {isSelected && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        {t('planInput.guided.noCityFound')}
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
              <h2 className="text-gray-900 mb-2">{t('planInput.guided.step2Title')}</h2>
              <p className="text-sm text-gray-600">{t('planInput.guided.step2Subtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="dateInput">{t('planInput.guided.dateLabel')}</Label>
                <Input
                  id="dateInput"
                  placeholder={t('planInput.guided.datePlaceholder')}
                  value={formData.dateInput}
                  onChange={(e) => setFormData({ ...formData, dateInput: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="duration">{t('planInput.guided.durationLabel')}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="duration"
                    type="number"
                    placeholder={t('planInput.guided.durationPlaceholder')}
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                  <span className="text-gray-600">{t('planInput.guided.durationUnit')}</span>
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
              <h2 className="text-gray-900 mb-2">{t('planInput.guided.step3Title')}</h2>
              <p className="text-sm text-gray-600">{t('planInput.guided.step3Subtitle')}</p>
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
              <h2 className="text-gray-900 mb-2">{t('planInput.guided.step4Title')}</h2>
              <p className="text-sm text-gray-600">{t('planInput.guided.step4Subtitle')}</p>
            </div>

            <div>
              <Label className="mb-3">{t('planInput.guided.preferenceLabel')}</Label>
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
              <Label htmlFor="companions">{t('planInput.guided.companionsLabel')}</Label>
              <Input
                id="companions"
                placeholder={t('planInput.guided.companionsPlaceholder')}
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
                <div className="text-gray-900 mb-1">{t('planInput.guided.accessibilityLabel')}</div>
                <div className="text-sm text-gray-600">{t('planInput.guided.accessibilityDesc')}</div>
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
          <button onClick={onBack} className="p-1" data-testid="guided-back" aria-label={t('common.back')}>
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-900">{t('planInput.guided.header')}</h1>
            <p className="text-xs text-gray-500">{t('planInput.guided.stepIndicator', { current: currentStep, total: totalSteps })}</p>
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
              {t('planInput.guided.previous')}
            </Button>
          )}
          <Button
            onClick={() => {
              if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
              } else {
                setShowChat(true);
              }
            }}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            {currentStep === totalSteps ? t('planInput.guided.startPlanning') : t('planInput.guided.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
