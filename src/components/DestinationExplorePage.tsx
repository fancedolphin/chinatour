import { useState } from 'react';
import { Search, TrendingUp, Calendar, Clock, MapPin, Heart, MessageCircle, Bookmark, Eye } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SharedTrip {
  id: string;
  destination: string;
  dates: string;
  duration: string;
  author: {
    name: string;
    avatar: string;
  };
  image: string;
  budget: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  description: string;
  isSaved: boolean;
}

export function DestinationExplorePage() {
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [likedTrips, setLikedTrips] = useState<string[]>([]);

  const sharedTrips: SharedTrip[] = [
    {
      id: '1',
      destination: '伦敦 · 爱丁堡',
      dates: '2024年10月1日 - 10月7日',
      duration: '7天',
      author: {
        name: '旅行达人小红',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      },
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
      budget: '£3,500',
      likes: 1248,
      comments: 89,
      views: 5621,
      tags: ['历史文化', '博物馆', '美食'],
      description: '7天深度游英伦，打卡大英博物馆、白金汉宫，品尝地道英式下午茶，体验浪漫爱丁堡🏰',
      isSaved: false,
    },
    {
      id: '2',
      destination: '北京深度游',
      dates: '2024年11月15日 - 11月17日',
      duration: '3天',
      author: {
        name: '城市探索者',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      image: 'https://images.unsplash.com/photo-1677818911820-7111f3292f9b?w=800',
      budget: '¥2,000',
      likes: 856,
      comments: 45,
      views: 3240,
      tags: ['历史古都', '美食', '胡同'],
      description: '3天玩转北京，故宫-天坛-胡同，性价比超高的美食攻略，人均200吃遍京城！',
      isSaved: false,
    },
    {
      id: '3',
      destination: '东京 · 京都',
      dates: '2024年12月20日 - 12月26日',
      duration: '7天',
      author: {
        name: '樱花少女',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      },
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
      budget: '¥8,000',
      likes: 2341,
      comments: 156,
      views: 12456,
      tags: ['日本', '寺庙', '温泉'],
      description: '东京现代+京都古韵，完美结合！附详细交通攻略和餐厅推荐🍣',
      isSaved: false,
    },
    {
      id: '4',
      destination: '成都 · 重庆',
      dates: '2024年9月10日 - 9月15日',
      duration: '6天',
      author: {
        name: '辣妹子',
        avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150',
      },
      image: 'https://images.unsplash.com/photo-1633880791834-cbf3bb0b7e9e?w=800',
      budget: '¥3,500',
      likes: 1567,
      comments: 234,
      views: 8934,
      tags: ['美食', '火锅', '熊猫'],
      description: '吃遍川渝！超全火锅串串攻略，看熊猫，逛洪崖洞，6天5晚美食之旅🌶️',
      isSaved: false,
    },
    {
      id: '5',
      destination: '巴黎浪漫游',
      dates: '2024年10月15日 - 10月21日',
      duration: '7天',
      author: {
        name: '浪漫主义者',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
      budget: '€4,200',
      likes: 3124,
      comments: 198,
      views: 15678,
      tags: ['浪漫', '艺术', '时尚'],
      description: '巴黎7日游，埃菲尔铁塔日落、卢浮宫艺术、塞纳河游船，附小众咖啡店🗼',
      isSaved: false,
    },
    {
      id: '6',
      destination: '曼彻斯特工业游',
      dates: '2024年11月5日 - 11月8日',
      duration: '4天',
      author: {
        name: '工业风爱好者',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      },
      image: 'https://images.unsplash.com/photo-1606929934973-a1308b018950?w=800',
      budget: '£800',
      likes: 456,
      comments: 34,
      views: 2341,
      tags: ['工业旅游', '足球', '博物馆'],
      description: '工业革命发源地，打卡科学工业博物馆，老特拉福德球场朝圣⚽',
      isSaved: false,
    },
  ];

  const trendingSearches = [
    '十一假期',
    '东北性价比游',
    '工业旅游路线',
    '日本温泉',
    '欧洲深度游',
  ];

  const handleToggleSave = (tripId: string) => {
    setSavedTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const handleToggleLike = (tripId: string) => {
    setLikedTrips(prev => 
      prev.includes(tripId) 
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 border border-gray-200">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索行程、目的地、用户"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>
        {/* Trending Searches */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h2 className="text-gray-900">热门搜索</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((search, index) => (
              <button
                key={index}
                className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs defaultValue="recommend" className="w-full mb-4">
          <TabsList className="w-full grid grid-cols-3 bg-white rounded-xl p-1">
            <TabsTrigger value="recommend">推荐</TabsTrigger>
            <TabsTrigger value="hot">最热</TabsTrigger>
            <TabsTrigger value="latest">最新</TabsTrigger>
          </TabsList>

          <TabsContent value="recommend" className="mt-4">
            <SharedTripsList 
              trips={sharedTrips} 
              savedTrips={savedTrips}
              likedTrips={likedTrips}
              onToggleSave={handleToggleSave}
              onToggleLike={handleToggleLike}
            />
          </TabsContent>

          <TabsContent value="hot" className="mt-4">
            <SharedTripsList 
              trips={[...sharedTrips].sort((a, b) => b.likes - a.likes)} 
              savedTrips={savedTrips}
              likedTrips={likedTrips}
              onToggleSave={handleToggleSave}
              onToggleLike={handleToggleLike}
            />
          </TabsContent>

          <TabsContent value="latest" className="mt-4">
            <SharedTripsList 
              trips={[...sharedTrips].reverse()} 
              savedTrips={savedTrips}
              likedTrips={likedTrips}
              onToggleSave={handleToggleSave}
              onToggleLike={handleToggleLike}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface SharedTripsListProps {
  trips: SharedTrip[];
  savedTrips: string[];
  likedTrips: string[];
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
}

function SharedTripsList({ trips, savedTrips, likedTrips, onToggleSave, onToggleLike }: SharedTripsListProps) {
  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <div
          key={trip.id}
          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Author Info */}
          <div className="p-3 flex items-center gap-2 border-b border-gray-100">
            <ImageWithFallback
              src={trip.author.avatar}
              alt={trip.author.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm text-gray-900">{trip.author.name}</span>
          </div>

          {/* Trip Image */}
          <div className="relative h-48 cursor-pointer group">
            <ImageWithFallback
              src={trip.image}
              alt={trip.destination}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white mb-1">{trip.destination}</h3>
              <p className="text-white/90 text-sm line-clamp-2">
                {trip.description}
              </p>
            </div>
          </div>

          {/* Trip Info */}
          <div className="p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {trip.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                {trip.dates}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {trip.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    预算：{trip.budget}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {trip.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {trip.comments}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleLike(trip.id)}
                  className="flex items-center gap-1 text-sm transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      likedTrips.includes(trip.id)
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-400'
                    }`}
                  />
                  <span className={likedTrips.includes(trip.id) ? 'text-red-500' : 'text-gray-500'}>
                    {trip.likes + (likedTrips.includes(trip.id) ? 1 : 0)}
                  </span>
                </button>
                <button
                  onClick={() => onToggleSave(trip.id)}
                  className="transition-colors"
                >
                  <Bookmark
                    className={`w-5 h-5 ${
                      savedTrips.includes(trip.id)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
