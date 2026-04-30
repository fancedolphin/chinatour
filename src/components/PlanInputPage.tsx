import { FileText, Sparkles, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { GuidedQuestionPage } from './GuidedQuestionPage';
import { ExistingPlanPage } from './ExistingPlanPage';
import { EmergencyAssistantCard } from './EmergencyAssistantCard';
import { AIPlannerChatPage } from './AIPlannerChatPage';
import type { TripMapPreviewPayload } from './TripMapPage';
import { tripService, type TripDetail } from '@/services/tripService';
import { useT } from '@/i18n/useT';
import i18n from '@/i18n';

function buildResumePrompt(trip: TripDetail): string {
  const days = [...trip.trip_itineraries]
    .sort((a, b) => a.day_number - b.day_number)
    .map(it => {
      const acts = [...it.activities]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map(a => `  ${a.time ?? ''} ${a.name}：${a.description ?? ''}`)
        .join('\n');
      const header = i18n.t('planInput.resumeDayHeader', { day: it.day_number, theme: it.theme ?? '' });
      return `${header}\n${acts}`;
    })
    .join('\n\n');
  return i18n.t('planInput.resumePrompt', {
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    budget: trip.budget ?? i18n.t('planInput.resumeNoBudget'),
    days,
  });
}

interface PlanInputPageProps {
  onNavigateToTrips?: () => void;
  resumeTripId?: string;
  onClearResume?: () => void;
  onOpenMap?: (payload: string | TripMapPreviewPayload) => void;
}

type AppEntry = { name: string; description: string; steps: string[] };

const TRANSPORT_VISUALS = [
  { icon: '🚄', color: 'from-blue-500 to-blue-600' },
  { icon: '✈️', color: 'from-orange-500 to-orange-600' },
  { icon: '🗺️', color: 'from-green-500 to-green-600' },
];
const LIFE_VISUALS = [
  { icon: '🛏️', color: 'from-yellow-500 to-yellow-600' },
  { icon: '💳', color: 'from-blue-400 to-blue-500' },
  { icon: '💬', color: 'from-green-500 to-green-600' },
];
const TRANSLATE_VISUALS = [{ icon: '🔤', color: 'from-blue-500 to-purple-500' }];

export function PlanInputPage({ onNavigateToTrips, resumeTripId, onClearResume, onOpenMap }: PlanInputPageProps = {}) {
  const { t } = useT();
  const [selectedMode, setSelectedMode] = useState<'new' | 'existing' | null>(null);
  const [resumeInitialPlan, setResumeInitialPlan] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    if (!resumeTripId) {
      setResumeInitialPlan(null);
      return;
    }
    let cancelled = false;
    setResumeLoading(true);
    tripService.getTripDetail(resumeTripId)
      .then(trip => {
        if (!cancelled) setResumeInitialPlan(buildResumePrompt(trip));
      })
      .catch(err => {
        console.error('[PlanInputPage] failed to load trip:', err);
        if (!cancelled) onClearResume?.();
      })
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });
    return () => { cancelled = true; };
  }, [resumeTripId]);

  if (resumeTripId) {
    if (resumeLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-red-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{t('planInput.loadingTrip')}</p>
          </div>
        </div>
      );
    }
    if (resumeInitialPlan) {
      return (
        <AIPlannerChatPage
          onBack={() => {
            onClearResume?.();
            setSelectedMode(null);
            setResumeInitialPlan(null);
          }}
          initialPlan={resumeInitialPlan}
          onSaveSuccess={onNavigateToTrips}
          onOpenMap={onOpenMap}
        />
      );
    }
  }

  if (selectedMode === 'new') {
    return <GuidedQuestionPage onBack={() => setSelectedMode(null)} onSaveSuccess={onNavigateToTrips} onOpenMap={onOpenMap} />;
  }

  if (selectedMode === 'existing') {
    return <ExistingPlanPage onBack={() => setSelectedMode(null)} onSaveSuccess={onNavigateToTrips} onOpenMap={onOpenMap} />;
  }

  const tips = t('planInput.tips', { returnObjects: true }) as string[];
  const usage = t('planInput.appsUsage', { returnObjects: true }) as string[];
  const transportApps = t('planInput.transportApps', { returnObjects: true }) as AppEntry[];
  const lifeApps = t('planInput.lifeApps', { returnObjects: true }) as AppEntry[];
  const translateApps = t('planInput.translateApps', { returnObjects: true }) as AppEntry[];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden mb-6 h-48">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1615826932727-ed9f182ac67e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBwbGFubmluZ3xlbnwxfHx8fDE3NjA4MDM0NjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Travel Planning"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
            <h2 className="text-white mb-2">{t('planInput.heroTitle')}</h2>
            <p className="text-white/90 text-sm">{t('planInput.heroSubtitle')}</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-4">
          <button
            onClick={() => setSelectedMode('new')}
            className="w-full bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900 mb-1 flex items-center gap-2">
                  {t('planInput.modeNew')}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </h3>
                <p className="text-sm text-gray-600">{t('planInput.modeNewDesc')}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">{t('planInput.modeNewTagSmart')}</span>
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">{t('planInput.modeNewTagBudget')}</span>
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">{t('planInput.modeNewTagStyle')}</span>
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedMode('existing')}
            className="w-full bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-gray-900 mb-1 flex items-center gap-2">
                  {t('planInput.modeExisting')}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </h3>
                <p className="text-sm text-gray-600">{t('planInput.modeExistingDesc')}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{t('planInput.modeExistingTagDining')}</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{t('planInput.modeExistingTagAlt')}</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{t('planInput.modeExistingTagRoute')}</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4">
          <h3 className="text-gray-900 mb-2 text-sm">{t('planInput.tipsTitle')}</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            {tips.map((tip, i) => <li key={i}>• {tip}</li>)}
          </ul>
        </div>

        {/* Emergency Assistant Card */}
        <div className="mt-4">
          <EmergencyAssistantCard />
        </div>

        {/* Travel Apps Recommendations */}
        <div className="mt-6">
          <h3 className="text-gray-900 mb-4">{t('planInput.appsTitle')}</h3>

          <AppCategoryBlock
            icon="🚄"
            title={t('planInput.appsTransportTitle')}
            apps={transportApps}
            visuals={TRANSPORT_VISUALS}
            stepsTitle={t('planInput.appsStepsTitle')}
          />
          <AppCategoryBlock
            icon="🍔"
            title={t('planInput.appsLifeTitle')}
            apps={lifeApps}
            visuals={LIFE_VISUALS}
            stepsTitle={t('planInput.appsStepsTitle')}
          />
          <AppCategoryBlock
            icon="🌐"
            title={t('planInput.appsTranslateTitle')}
            apps={translateApps}
            visuals={TRANSLATE_VISUALS}
            stepsTitle={t('planInput.appsStepsTitle')}
          />
        </div>

        {/* App Usage Tips */}
        <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
          <h4 className="text-gray-900 mb-2 text-sm">{t('planInput.appsUsageTitle')}</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {usage.map((item, i) => <li key={i}>• {item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AppCategoryBlock({
  icon,
  title,
  apps,
  visuals,
  stepsTitle,
}: {
  icon: string;
  title: string;
  apps: AppEntry[];
  visuals: Array<{ icon: string; color: string }>;
  stepsTitle: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 mb-3">
      <h4 className="text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm">{title}</span>
      </h4>
      <div className="space-y-3">
        {apps.map((app, i) => {
          const v = visuals[i] || visuals[visuals.length - 1];
          return (
            <AppRecommendCardWithSteps
              key={app.name}
              name={app.name}
              description={app.description}
              icon={v.icon}
              color={v.color}
              steps={app.steps}
              stepsTitle={stepsTitle}
            />
          );
        })}
      </div>
    </div>
  );
}

interface AppRecommendCardWithStepsProps {
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: string[];
  stepsTitle: string;
}

function AppRecommendCardWithSteps({ name, description, icon, color, steps, stepsTitle }: AppRecommendCardWithStepsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gray-50 hover:bg-gray-100 p-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-xl shadow-sm`}>
            {icon}
          </div>
          <div className="text-left">
            <h5 className="text-sm text-gray-900">{name}</h5>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="bg-white p-4 border-t border-gray-200">
          <p className="text-xs text-gray-900 mb-2">{stepsTitle}</p>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-2 text-xs text-gray-600">
                <span className="text-blue-500 flex-shrink-0">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
