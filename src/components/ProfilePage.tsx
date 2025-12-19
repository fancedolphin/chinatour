import { useState } from 'react';
import { Settings, Bookmark, Heart, Share2, History } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuthContext } from '../presentation/context/AuthContext';
import { SettingsPage } from './SettingsPage';

interface ProfilePageProps {
  userPosts: any[];
}

export function ProfilePage({ userPosts }: ProfilePageProps) {
  // 获取用户信息
  const { currentUser } = useAuthContext();
  
  // UI状态
  const [showSettings, setShowSettings] = useState(false);

  // 显示设置页面
  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  // Mock history trips
  const historyTrips = [
    {
      id: '1',
      destination: '伦敦 · 爱丁堡',
      date: '2024年10月',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
      status: 'completed',
    },
    {
      id: '2',
      destination: '北京',
      date: '2024年9月',
      image: 'https://images.unsplash.com/photo-1677818911820-7111f3292f9b?w=400',
      status: 'completed',
    },
    {
      id: '3',
      destination: '上海',
      date: '2024年8月',
      image: 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=400',
      status: 'completed',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {/* Settings Button */}
        <div className="flex justify-end mb-4">
          <button 
            className="p-2 hover:bg-white rounded-xl transition-colors"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {/* Profile Info */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-start gap-4 mb-4">
            <ImageWithFallback
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="text-gray-900 mb-1">{currentUser?.displayName || '小红书用户'}</h2>
              <p className="text-sm text-gray-600 mb-3">小红书号: {currentUser?.username || '123456789'}</p>
              <p className="text-sm text-gray-700">
                {currentUser?.bio || '分享生活中的美好瞬间 ✨'}
              </p>
            </div>
          </div>

          <div className="flex gap-8 py-3 border-t border-gray-100">
            <div className="text-center">
              <div className="text-gray-900 mb-1">128</div>
              <div className="text-xs text-gray-500">关注</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900 mb-1">2.8k</div>
              <div className="text-xs text-gray-500">粉丝</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900 mb-1">5.2k</div>
              <div className="text-xs text-gray-500">获赞与收藏</div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-white rounded-xl p-1 mb-4">
            <TabsTrigger 
              value="history" 
              className="flex items-center gap-1 text-xs transition-all duration-200 data-[state=active]:bg-red-50 data-[state=active]:text-red-500 hover:bg-gray-50 active:scale-95"
            >
              <History className="w-4 h-4 transition-transform duration-200 data-[state=active]:scale-110" />
              历史
            </TabsTrigger>
            <TabsTrigger 
              value="saved" 
              className="flex items-center gap-1 text-xs transition-all duration-200 data-[state=active]:bg-red-50 data-[state=active]:text-red-500 hover:bg-gray-50 active:scale-95"
            >
              <Bookmark className="w-4 h-4 transition-transform duration-200 data-[state=active]:scale-110" />
              收藏
            </TabsTrigger>
            <TabsTrigger 
              value="liked" 
              className="flex items-center gap-1 text-xs transition-all duration-200 data-[state=active]:bg-red-50 data-[state=active]:text-red-500 hover:bg-gray-50 active:scale-95"
            >
              <Heart className="w-4 h-4 transition-transform duration-200 data-[state=active]:scale-110" />
              赞过
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <div className="space-y-3">
              {historyTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex gap-3">
                    <ImageWithFallback
                      src={trip.image}
                      alt={trip.destination}
                      className="w-24 h-24 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-gray-900 mb-1">{trip.destination}</h4>
                        <p className="text-sm text-gray-500">{trip.date}</p>
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        已完成
                      </Badge>
                    </div>
                    <div className="p-3 flex flex-col justify-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="bg-white rounded-xl p-12 text-center">
              <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">暂无收藏内容</p>
            </div>
          </TabsContent>

          <TabsContent value="liked">
            <div className="bg-white rounded-xl p-12 text-center">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">暂无点赞内容</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
