import { useState, useEffect } from 'react';
import {
  ChevronLeft, Calendar, Clock, MapPin, Heart, Bookmark,
  Download, Eye, Loader2, MessageCircle, DollarSign,
  ChevronDown, ChevronUp, Camera, Utensils,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CommentSection } from './CommentSection';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { sharedTripService } from '@/services/sharedTripService';

type DetailData = Awaited<ReturnType<typeof sharedTripService.getSharedTripById>>;

interface SharedTripDetailPageProps {
  sharedTripId: string;
  onBack: () => void;
  onImportSuccess?: (newTripId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export function SharedTripDetailPage({
  sharedTripId,
  onBack,
  onImportSuccess,
  onOpenProfile,
}: SharedTripDetailPageProps) {
  const { currentUser } = useAuthContext();
  const [trip, setTrip] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [forking, setForking] = useState(false);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  useEffect(() => {
    loadDetail();
  }, [sharedTripId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await sharedTripService.getSharedTripById(sharedTripId);
      setTrip(data);

      if (currentUser) {
        const interaction = await sharedTripService.getUserInteraction(sharedTripId, currentUser.id);
        if (interaction) {
          setLiked(interaction.liked ?? false);
          setSaved(interaction.saved ?? false);
        }
      }
    } catch (err) {
      console.error('[SharedTripDetailPage] 加载失败:', err);
      toast.error('加载行程详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    try {
      const newLiked = await sharedTripService.toggleLike(sharedTripId, currentUser.id);
      setLiked(newLiked);
      setTrip((prev) =>
        prev ? { ...prev, likesCount: prev.likesCount + (newLiked ? 1 : -1) } : prev
      );
    } catch { toast.error('操作失败'); }
  };

  const handleToggleSave = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    try {
      const newSaved = await sharedTripService.toggleSave(sharedTripId, currentUser.id);
      setSaved(newSaved);
    } catch { toast.error('操作失败'); }
  };

  const handleFork = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    try {
      setForking(true);
      const newTripId = await sharedTripService.forkTrip(sharedTripId, currentUser.id);
      toast.success('行程已导入，快去修改成你的专属路线！');
      onImportSuccess?.(newTripId);
    } catch {
      toast.error('导入失败');
    } finally {
      setForking(false);
    }
  };

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'attraction':
        return <Camera className="w-5 h-5 text-blue-500" />;
      case 'meal':
        return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'transport':
        return <MapPin className="w-5 h-5 text-purple-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载行程中...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">行程不存在或已下架</p>
        <Button variant="outline" onClick={onBack}>返回</Button>
      </div>
    );
  }

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header — same as TripDetailPage */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1">
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-gray-900">行程详情</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFork}
                disabled={forking}
              >
                {forking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Image & Basic Info — same as TripDetailPage */}
      <div className="relative h-56">
        <ImageWithFallback
          src={trip.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-white mb-2">{trip.destination}</h2>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            {trip.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDateRange(trip.startDate, trip.endDate)}
              </div>
            )}
            {trip.duration && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {trip.duration}
              </div>
            )}
            {trip.budget && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {trip.budget}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4">
        {/* Author + Social Bar */}
        <div className="py-4 flex items-center justify-between">
          {onOpenProfile ? (
            <button
              type="button"
              className="-m-2 flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white"
              onClick={() => onOpenProfile(trip.author.id)}
            >
              <ImageWithFallback
                src={trip.author.avatar || ''}
                alt={trip.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{trip.author.name}</span>
                <p className="text-xs text-gray-400">
                  {new Date(trip.sharedAt).toLocaleDateString('zh-CN')} 发布
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src={trip.author.avatar || ''}
                alt={trip.author.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{trip.author.name}</span>
                <p className="text-xs text-gray-400">
                  {new Date(trip.sharedAt).toLocaleDateString('zh-CN')} 发布
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Eye className="w-4 h-4" />
              {trip.viewsCount.toLocaleString()}
            </span>
            <button
              onClick={handleToggleLike}
              className="flex items-center gap-1 text-sm transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
              />
              <span className={liked ? 'text-red-500' : 'text-gray-500'}>
                {trip.likesCount}
              </span>
            </button>
            <button onClick={handleToggleSave} className="transition-colors">
              <Bookmark
                className={`w-5 h-5 ${saved ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`}
              />
            </button>
            <a
              href="#comments"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-500 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{trip.commentsCount}</span>
            </a>
          </div>
        </div>

        {/* Import Button — same style as TripDetailPage map button */}
        <Button
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 h-12 mb-4"
          onClick={handleFork}
          disabled={forking}
        >
          {forking ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          导入行程到我的列表
        </Button>

        {/* Tags */}
        {trip.tags && trip.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {trip.tags.map((tag, i) => (
              <Badge key={i} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {trip.description && (
          <Card className="p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">{trip.description}</p>
            {trip.highlights && trip.highlights.length > 0 && (
              <ul className="mt-3 space-y-1">
                {trip.highlights.map((h, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Itinerary — same as TripDetailPage: collapsible Card with D{day} gradient badge */}
        {trip.tripData.itineraries.length > 0 && (
          <div className="space-y-3">
            {trip.tripData.itineraries.map((day) => (
              <Card key={day.dayNumber} className="overflow-hidden">
                <button
                  onClick={() => toggleDay(day.dayNumber)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                      D{day.dayNumber}
                    </div>
                    <div className="text-left">
                      <div className="text-gray-900">{day.theme || `第 ${day.dayNumber} 天`}</div>
                      {day.date && (
                        <div className="text-sm text-gray-500">{day.date}</div>
                      )}
                    </div>
                  </div>
                  {expandedDays.includes(day.dayNumber) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedDays.includes(day.dayNumber) && (
                  <div className="border-t border-gray-100">
                    {day.activities.length > 0 ? (
                      day.activities.map((activity, index) => (
                        <div key={index} className="p-4 border-b border-gray-100 last:border-0">
                          <div className="flex gap-3">
                            {/* Timeline */}
                            <div className="flex flex-col items-center">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                                {getActivityIcon(activity.type)}
                              </div>
                              {index < day.activities.length - 1 && (
                                <div className="w-0.5 h-12 bg-gray-200 my-1" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    {activity.time && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {activity.time}
                                      </span>
                                    )}
                                    {activity.duration && (
                                      <span className="text-xs text-gray-400">
                                        · {activity.duration}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-gray-900 mb-1">{activity.name}</h4>
                                  {activity.description && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      {activity.description}
                                    </p>
                                  )}
                                  {activity.address && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {activity.address}
                                    </p>
                                  )}
                                </div>
                                {activity.price && (
                                  <Badge variant="outline" className="ml-2 whitespace-nowrap">
                                    {activity.price}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-gray-400">暂无活动安排</div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Comments */}
        <div className="mt-4">
          <CommentSection
            sharedTripId={sharedTripId}
            onCommentsCountChange={(count) => {
              setTrip((prev) => prev ? { ...prev, commentsCount: count } : prev);
            }}
          />
        </div>
      </div>
    </div>
  );
}
