import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Clock, ChevronRight, Share2, Trash2, Loader2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { TripDetailPage } from './TripDetailPage';
import { TripMapPage } from './TripMapPage';
import { ShareTripModal } from './ShareTripModal';
import { useAuth } from '@/presentation/hooks/useAuth';
import { tripService, type Trip as DBTrip } from '@/services/tripService';

interface Trip {
  id: string;
  destination: string;
  dates: string;
  duration: string;
  status: 'planning' | 'upcoming' | 'completed';
  image: string;
  budget: string;
}

type ViewMode = 'list' | 'detail' | 'map';

interface MyTripsPageProps {
  onNavigateToPlanner?: () => void;
}

export function MyTripsPage({ onNavigateToPlanner }: MyTripsPageProps = {}) {
  const { currentUser, loading: authLoading } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 数据加载逻辑
  useEffect(() => {
    if (currentUser && !authLoading) {
      loadTrips();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  // 页面可见时自动刷新列表（从AI规划页返回时）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser && viewMode === 'list') {
        console.log('[MyTripsPage] 页面重新可见，刷新行程列表');
        loadTrips();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, viewMode]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tripService.getUserTrips(currentUser!.id);
      const mappedTrips: Trip[] = data.map((dbTrip: DBTrip) => ({
        id: dbTrip.id,
        destination: dbTrip.destination,
        dates: formatDateRange(dbTrip.start_date, dbTrip.end_date),
        duration: dbTrip.duration || calculateDuration(dbTrip.start_date, dbTrip.end_date),
        status: dbTrip.status,
        image: dbTrip.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
        budget: dbTrip.budget || '未设置',
      }));
      setTrips(mappedTrips);
    } catch (err) {
      console.error('[MyTripsPage] 加载行程失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sYear = startDate.getFullYear();
    const sMonth = startDate.getMonth() + 1;
    const sDay = startDate.getDate();
    const eMonth = endDate.getMonth() + 1;
    const eDay = endDate.getDate();
    return `${sYear}年${sMonth}月${sDay}日 - ${eMonth}月${eDay}日`;
  };

  const calculateDuration = (start: string, end: string): string => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1;
    return `${days}天`;
  };

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个行程吗？')) return;

    try {
      setDeleting(tripId);
      await tripService.deleteTrip(tripId);
      await loadTrips();
    } catch (err) {
      console.error('[MyTripsPage] 删除行程失败:', err);
      alert('删除失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateTrip = () => {
    console.log('[MyTripsPage] 导航到 AI 规划页面');
    if (onNavigateToPlanner) {
      onNavigateToPlanner();
    } else {
      alert('导航功能未配置');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">规划中</Badge>;
      case 'upcoming':
        return <Badge className="bg-green-500">即将出发</Badge>;
      case 'completed':
        return <Badge variant="secondary">已完成</Badge>;
      default:
        return null;
    }
  };

  const handleViewDetail = (tripId: string) => {
    setSelectedTripId(tripId);
    setViewMode('detail');
  };

  const handleOpenMap = () => {
    setViewMode('map');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTripId(null);
  };

  // Loading 状态
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // Error 状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">加载失败：{error}</p>
          <Button onClick={loadTrips}>重试</Button>
        </div>
      </div>
    );
  }

  // 未登录状态
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <p className="text-gray-600">请先登录</p>
      </div>
    );
  }

  // Show detail page
  if (viewMode === 'detail' && selectedTripId) {
    return (
      <TripDetailPage
        tripId={selectedTripId}
        onBack={handleBackToList}
        onOpenMap={handleOpenMap}
      />
    );
  }

  // Show map page
  if (viewMode === 'map' && selectedTripId) {
    return (
      <TripMapPage
        tripId={selectedTripId}
        onBack={handleBackToList}
      />
    );
  }

  // Show list view

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Create New Trip Button */}
        <Button
          className="w-full bg-red-500 hover:bg-red-600 mb-6 h-14"
          onClick={handleCreateTrip}
        >
          <Plus className="w-5 h-5 mr-2" />
          创建新行程
        </Button>

        {/* Trips List */}
        <div className="space-y-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="relative h-40">
                <ImageWithFallback
                  src={trip.image}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  {getStatusBadge(trip.status)}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <h3 className="absolute bottom-3 left-3 text-white">
                  {trip.destination}
                </h3>
              </div>

              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {trip.dates}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {trip.duration}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    预算：{trip.budget}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareTrip(trip);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteTrip(trip.id, e)}
                    disabled={deleting === trip.id}
                  >
                    {deleting === trip.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetail(trip.id)}
                  >
                    查看详情
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    onClick={() => handleViewDetail(trip.id)}
                  >
                    继续规划
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {trips.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">还没有行程</h3>
            <p className="text-sm text-gray-500 mb-6">
              创建你的第一个行程计划吧
            </p>
            <Button className="bg-red-500 hover:bg-red-600">
              <Plus className="w-4 h-4 mr-2" />
              创建行程
            </Button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareTrip && (
        <ShareTripModal
          trip={{
            id: shareTrip.id,
            destination: shareTrip.destination,
            startDate: '2024-10-01',
            endDate: '2024-10-07',
            budget: shareTrip.budget,
            image: shareTrip.image,
            days: parseInt(shareTrip.duration),
            highlights: [
              'Explore iconic landmarks',
              'Taste authentic local cuisine',
              'Experience vibrant culture',
            ],
          }}
          onClose={() => setShareTrip(null)}
        />
      )}
    </div>
  );
}
