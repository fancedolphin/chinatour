import { FileText, Sparkles, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { GuidedQuestionPage } from './GuidedQuestionPage';
import { ExistingPlanPage } from './ExistingPlanPage';
import { EmergencyAssistantCard } from './EmergencyAssistantCard';

interface PlanInputPageProps {
  onNavigateToTrips?: () => void;
}

export function PlanInputPage({ onNavigateToTrips }: PlanInputPageProps = {}) {
  const [selectedMode, setSelectedMode] = useState<'new' | 'existing' | null>(null);

  if (selectedMode === 'new') {
    return <GuidedQuestionPage onBack={() => setSelectedMode(null)} onSaveSuccess={onNavigateToTrips} />;
  }

  if (selectedMode === 'existing') {
    return <ExistingPlanPage onBack={() => setSelectedMode(null)} onSaveSuccess={onNavigateToTrips} />;
  }

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
            <h2 className="text-white mb-2">
              开启你的旅程
            </h2>
            <p className="text-white/90 text-sm">
              AI 智能规划，为你量身定制完美行程
            </p>
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
                  从零开始规划
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </h3>
                <p className="text-sm text-gray-600">
                  还没有计划？让我们通过几个简单问题，为你打造专属行程
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                    智能推荐
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                    预算优化
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                    风格定制
                  </span>
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
                  已有初步计划
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </h3>
                <p className="text-sm text-gray-600">
                  已经有目的地和日程？上传你的计划，我们帮你完善细节
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                    餐厅推荐
                  </span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                    备选方案
                  </span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                    优化路线
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4">
          <h3 className="text-gray-900 mb-2 text-sm">💡 小贴士</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 支持模糊输入，如"十一假期"、"下月中旬"</li>
            <li>• 可设置预算、风格偏好、饮食禁忌等个性化需求</li>
            <li>• AI 会根据天气、节假日等因素优化建议</li>
          </ul>
        </div>

        {/* Emergency Assistant Card */}
        <div className="mt-4">
          <EmergencyAssistantCard />
        </div>

        {/* Travel Apps Recommendations */}
        <div className="mt-6">
          <h3 className="text-gray-900 mb-4">🧳 行前指引 - 推荐App</h3>
          
          {/* Transportation Apps */}
          <div className="bg-white rounded-xl p-4 mb-3">
            <h4 className="text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🚄</span>
              <span className="text-sm">出行交通</span>
            </h4>
            <div className="space-y-3">
              <AppRecommendCardWithSteps
                name="12306"
                description="火车票官方购票平台"
                icon="🚄"
                color="from-blue-500 to-blue-600"
                steps={[
                  '下载"铁路12306"官方App或访问www.12306.cn',
                  '点击"注册"，输入手机号获取验证码',
                  '填写真实姓名和身份证号（需与乘车人一致）',
                  '设置登录密码和支付密码',
                  '完成人脸识别认证（首次购票必须）',
                  '添加常用联系人信息，方便快速购票'
                ]}
              />
              <AppRecommendCardWithSteps
                name="携程旅行"
                description="机票酒店火车票一站式预订"
                icon="✈️"
                color="from-orange-500 to-orange-600"
                steps={[
                  '下载"携程旅行"App或访问ctrip.com',
                  '点击"注册"，使用手机号注册',
                  '输入手机验证码完成注册',
                  '绑定邮箱（可选，便于接收订单信息）',
                  '添加常用乘客信息（姓名、证件号）',
                  '绑定支付方式（支付宝/微信/银行卡）',
                  '完成实名认证，享受更多优惠'
                ]}
              />
              <AppRecommendCardWithSteps
                name="高德地图"
                description="精准导航和路线规划"
                icon="🗺️"
                color="from-green-500 to-green-600"
                steps={[
                  '下载"高德地图"App',
                  '打开App，点击右下角"我的"',
                  '点击"登录/注册"，选择手机号登录',
                  '输入手机号和验证码',
                  '完善个人信息（可选）',
                  '开启定位权限，以便使用导航功能',
                  '下载离线地图，节省流量（设置→离线地图）'
                ]}
              />
            </div>
          </div>

          {/* Life Service Apps */}
          <div className="bg-white rounded-xl p-4 mb-3">
            <h4 className="text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🍔</span>
              <span className="text-sm">生活服务</span>
            </h4>
            <div className="space-y-3">
              <AppRecommendCardWithSteps
                name="美团"
                description="外卖、酒店、景点门票团购"
                icon="🛏️"
                color="from-yellow-500 to-yellow-600"
                steps={[
                  '下载"美团"App',
                  '点击"我的"→"登录/注册"',
                  '使用手机号注册，输入验证码',
                  '完善个人信息（昵称、头像可选）',
                  '绑定支付方式（美团支付/支付宝/微信）',
                  '添加收货地址（外卖配送用）',
                  '开启定位权限，查看附近商家和优惠'
                ]}
              />
              <AppRecommendCardWithSteps
                name="支付宝"
                description="移动支付必备工具"
                icon="💳"
                color="from-blue-400 to-blue-500"
                steps={[
                  '下载"支付宝"App或访问alipay.com',
                  '点击"注册"，输入手机号',
                  '设置登录密码和支付密码（必须不同）',
                  '完成实名认证（上传身份证照片）',
                  '人脸识别认证（扫脸验证）',
                  '绑定银行卡（用于充值和提现）',
                  '设置指纹/面容支付（可选，更便捷安全）'
                ]}
              />
              <AppRecommendCardWithSteps
                name="微信"
                description="社交聊天和移动支付"
                icon="💬"
                color="from-green-500 to-green-600"
                steps={[
                  '下载"微信"App',
                  '点击"注册"，输入手机号',
                  '设置微信号和登录密码',
                  '上传头像，设置昵称',
                  '开通微信支付：我→支付→实名认证',
                  '绑定银行卡（用于充值和转账）',
                  '设置支付密码（必须6位数字）',
                  '开启指纹/面容支付（设置→支付设置）'
                ]}
              />
            </div>
          </div>

          {/* Translation App */}
          <div className="bg-white rounded-xl p-4 mb-3">
            <h4 className="text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🌐</span>
              <span className="text-sm">语言翻译</span>
            </h4>
            <div className="space-y-3">
              <AppRecommendCardWithSteps
                name="Google Translate"
                description="多语言实时翻译工具"
                icon="🔤"
                color="from-blue-500 to-purple-500"
                steps={[
                  '下载"Google Translate"App（需要访问Google Play或App Store）',
                  '打开App，无需注册即可使用基本功能',
                  '登录Google账号（可选，同步翻译历史）',
                  '下载离线语言包（设置→离线翻译）',
                  '建议下载：中文、英文离线包',
                  '允许相机权限（用于拍照翻译功能）',
                  '允许麦克风权限（用于语音翻译）',
                  '在中国大陆使用需科学上网，或使用网页版translate.google.cn'
                ]}
              />
            </div>
          </div>
        </div>

        {/* App Usage Tips */}
        <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
          <h4 className="text-gray-900 mb-2 text-sm">📱 App使用建议</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 所有App注册都需要<span className="text-blue-600">中国手机号</span>，建议抵达后购买电话卡</li>
            <li>• 实名认证通常需要<span className="text-blue-600">中国身份证</span>，外国游客可用护照</li>
            <li>• 高德地图离线地图功能可节省大量流量</li>
            <li>• 支付宝可绑定国际信用卡，微信支付更复杂</li>
            <li>• Google Translate在中国需要VPN，建议提前下载离线语言包</li>
            <li>• 收藏常用地点和路线，提高出行效率</li>
          </ul>
        </div>
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
}

function AppRecommendCardWithSteps({ name, description, icon, color, steps }: AppRecommendCardWithStepsProps) {
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
          <p className="text-xs text-gray-900 mb-2">📝 注册步骤：</p>
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
