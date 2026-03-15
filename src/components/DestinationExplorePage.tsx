import { useState, useEffect } from 'react';
import { Search, TrendingUp, Calendar, Clock, MapPin, Heart, MessageCircle, Bookmark, Eye, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { sharedTripService, type SharedTripCard, type SharedTripSortBy } from '@/services/sharedTripService';

interface DestinationExplorePageProps {
  onImportSuccess?: (newTripId: string) => void;
}

export function DestinationExplorePage({ onImportSuccess }: DestinationExplorePageProps = {}) {
  const { currentUser } = useAuthContext();
  const [trips, setTrips] = useState<SharedTripCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SharedTripSortBy>('recommend');
  const [savedTrips, setSavedTrips] = useState<Set<string>>(new Set());
  const [likedTrips, setLikedTrips] = useState<Set<string>>(new Set());
  const [forkingId, setForkingId] = useState<string | null>(null);

  const trendingSearches = ['十一假期', '东北性价比游', '工业旅游路线', '日本温泉', '欧洲深度游'];

  useEffect(() => {
    loadTrips(sortBy);
  }, [sortBy]);

  const loadTrips = async (sort: SharedTripSortBy) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedTripService.getSharedTrips(sort);
      setTrips(data);

      // 预加载当前用户的互动状态（一次批量查询）
      if (currentUser && data.length > 0) {
        const interactionMap = await sharedTripService.getBatchUserInteractions(
          data.map((t) => t.id),
          currentUser.id
        );
        const likedSet = new Set<string>();
        const savedSet = new Set<string>();
        interactionMap.forEach(({ liked, saved }, id) => {
          if (liked) likedSet.add(id);
          if (saved) savedSet.add(id);
        });
        setLikedTrips(likedSet);
        setSavedTrips(savedSet);
      }
    } catch (err) {
      console.error('[DestinationExplorePage] 加载失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    try {
      const newLiked = await sharedTripService.toggleLike(sharedTripId, currentUser.id);
      setLikedTrips((prev) => {
        const next = new Set(prev);
        newLiked ? next.add(sharedTripId) : next.delete(sharedTripId);
        return next;
      });
      setTrips((prev) =>
        prev.map((t) =>
          t.id === sharedTripId
            ? { ...t, likesCount: t.likesCount + (newLiked ? 1 : -1) }
            : t
        )
      );
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const handleToggleSave = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    try {
      const newSaved = await sharedTripService.toggleSave(sharedTripId, currentUser.id);
      setSavedTrips((prev) => {
        const next = new Set(prev);
        newSaved ? next.add(sharedTripId) : next.delete(sharedTripId);
        return next;
      });
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const handleFork = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }
    try {
      setForkingId(sharedTripId);
      const newTripId = await sharedTripService.forkTrip(sharedTripId, currentUser.id);
      toast.success('行程已导入，快去修改成你的专属路线！');
      onImportSuccess?.(newTripId);
    } catch (err) {
      toast.error('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setForkingId(null);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`;
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
        <Tabs
          defaultValue="recommend"
          className="w-full mb-4"
          onValueChange={(v) => setSortBy(v as SharedTripSortBy)}
        >
          <TabsList className="w-full grid grid-cols-3 bg-white rounded-xl p-1">
            <TabsTrigger value="recommend">推荐</TabsTrigger>
            <TabsTrigger value="hot">最热</TabsTrigger>
            <TabsTrigger value="latest">最新</TabsTrigger>
          </TabsList>

          {(['recommend', 'hot', 'latest'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <TripsList
                trips={trips}
                loading={loading}
                error={error}
                savedTrips={savedTrips}
                likedTrips={likedTrips}
                forkingId={forkingId}
                onToggleSave={handleToggleSave}
                onToggleLike={handleToggleLike}
                onFork={handleFork}
                formatDateRange={formatDateRange}
                onRetry={() => loadTrips(sortBy)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

interface TripsListProps {
  trips: SharedTripCard[];
  loading: boolean;
  error: string | null;
  savedTrips: Set<string>;
  likedTrips: Set<string>;
  forkingId: string | null;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onFork: (id: string) => void;
  formatDateRange: (start: string, end: string) => string;
  onRetry: () => void;
}

function TripsList({
  trips, loading, error, savedTrips, likedTrips, forkingId,
  onToggleSave, onToggleLike, onFork, formatDateRange, onRetry,
}: TripsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
            <div className="p-3 flex items-center gap-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gray-200" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
            <div className="h-48 bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-full bg-gray-200 rounded" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error}</p>
        <Button variant="outline" onClick={onRetry}>重试</Button>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        暂无公开行程
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => (
        <div
          key={trip.id}
          className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Author */}
          <div className="p-3 flex items-center gap-2 border-b border-gray-100">
            <ImageWithFallback
              src={trip.author.avatar || ''}
              alt={trip.author.name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm text-gray-900">{trip.author.name}</span>
          </div>

          {/* Cover Image */}
          <div className="relative h-48">
            <ImageWithFallback
              src={trip.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'}
              alt={trip.destination}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white mb-1">{trip.destination}</h3>
              {trip.description && (
                <p className="text-white/90 text-sm line-clamp-2">{trip.description}</p>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {trip.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-2 mb-4">
              {trip.startDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {formatDateRange(trip.startDate, trip.endDate)}
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  {trip.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {trip.duration}
                    </span>
                  )}
                  {trip.budget && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      预算：{trip.budget}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {trip.viewsCount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {trip.commentsCount}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLike(trip.id)}
                  className="flex items-center gap-1 text-sm transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${likedTrips.has(trip.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                  />
                  <span className={likedTrips.has(trip.id) ? 'text-red-500' : 'text-gray-500'}>
                    {trip.likesCount + (likedTrips.has(trip.id) ? 1 : 0)}
                  </span>
                </button>
                <button onClick={() => onToggleSave(trip.id)} className="transition-colors">
                  <Bookmark
                    className={`w-5 h-5 ${savedTrips.has(trip.id) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`}
                  />
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => onFork(trip.id)}
                  disabled={forkingId === trip.id}
                >
                  {forkingId === trip.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  导入行程
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
