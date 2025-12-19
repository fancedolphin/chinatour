import { ChevronLeft, Upload, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AIPlannerChatPage } from './AIPlannerChatPage';

interface ExistingPlanPageProps {
  onBack: () => void;
}

export function ExistingPlanPage({ onBack }: ExistingPlanPageProps) {
  const [planText, setPlanText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleAnalyze = async () => {
    if (!planText.trim()) return;

    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowChat(true);
    }, 1500);
  };

  if (showChat) {
    return <AIPlannerChatPage onBack={() => setShowChat(false)} initialPlan={planText} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-gray-900">上传现有计划</h1>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-gray-900 mb-2">分享你的行程计划</h2>
              <p className="text-sm text-gray-600">
                粘贴你的行程文本，包括目的地、日期、酒店、景点等信息
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="planText">行程内容</Label>
                <Textarea
                  id="planText"
                  placeholder={'例如：\n\n伦敦 - 爱丁堡 7日游\n第1天：抵达伦敦，入住XX酒店\n第2天：大英博物馆、伦敦塔\n第3天：温莎城堡\n...\n\n或直接粘贴你的行程文档'}
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
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始智能规划
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
            <h3 className="text-gray-900 mb-2 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              AI 助手可以帮你
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 分析你的行程并生成详细的每日计划</li>
              <li>• 推荐每个景点附近的特色餐厅（分早中晚餐）</li>
              <li>• 提供雨天备选方案和室内活动</li>
              <li>• 优化行程路线，节省时间和交通成本</li>
              <li>• 根据预算调整住宿和餐饮档次</li>
              <li>• 补充周边隐藏景点和小众体验</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
            <h3 className="text-gray-900 mb-2 text-sm">✨ 对话式智能规划</h3>
            <p className="text-xs text-gray-600 mb-2">
              提交后进入AI对话界面，你可以：
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 随时调整预算档位</li>
              <li>• 更换或添加餐厅推荐</li>
              <li>• 调整景点和活动安排</li>
              <li>• 实时查看方案更新</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
