import { ChevronLeft, Upload, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AIPlannerChatPage } from './AIPlannerChatPage';
import type { TripMapPreviewPayload } from './TripMapPage';
import { useT } from '@/i18n/useT';

interface ExistingPlanPageProps {
  onBack: () => void;
  onSaveSuccess?: () => void;
  onOpenMap?: (payload: string | TripMapPreviewPayload) => void;
}

export function ExistingPlanPage({ onBack, onSaveSuccess, onOpenMap }: ExistingPlanPageProps) {
  const { t } = useT();
  const [planText, setPlanText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleAnalyze = async () => {
    if (!planText.trim()) return;

    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowChat(true);
    }, 1500);
  };

  if (showChat) {
    return (
      <AIPlannerChatPage
        onBack={() => setShowChat(false)}
        initialPlan={planText}
        onSaveSuccess={onSaveSuccess}
        onOpenMap={onOpenMap}
      />
    );
  }

  const helpItems = t('planInput.existing.helpItems', { returnObjects: true }) as string[];
  const chatItems = t('planInput.existing.chatItems', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-gray-900">{t('planInput.existing.header')}</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-gray-900 mb-2">{t('planInput.existing.title')}</h2>
              <p className="text-sm text-gray-600">{t('planInput.existing.subtitle')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="planText">{t('planInput.existing.planLabel')}</Label>
                <Textarea
                  id="planText"
                  placeholder={t('planInput.existing.planPlaceholder')}
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  className="mt-2 min-h-[300px]"
                />
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!planText.trim() || isAnalyzing}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    {t('planInput.existing.analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('planInput.existing.submit')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
            <h3 className="text-gray-900 mb-2 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t('planInput.existing.helpTitle')}
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              {helpItems.map((item, i) => <li key={i}>• {item}</li>)}
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
            <h3 className="text-gray-900 mb-2 text-sm">{t('planInput.existing.chatTitle')}</h3>
            <p className="text-xs text-gray-600 mb-2">{t('planInput.existing.chatIntro')}</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {chatItems.map((item, i) => <li key={i}>• {item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
