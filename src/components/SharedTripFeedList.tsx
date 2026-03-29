import {
  Calendar,
  Clock,
  MapPin,
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Download,
  Loader2,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { SharedTripCard } from '@/services/sharedTripService';

interface SharedTripFeedListProps {
  trips: SharedTripCard[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  savedTrips: Set<string>;
  likedTrips: Set<string>;
  forkingId: string | null;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onFork: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onOpenProfile?: (userId: string) => void;
  formatDateRange: (start: string, end: string) => string;
  onRetry: () => void;
}

export function SharedTripFeedList({
  trips,
  loading,
  error,
  emptyMessage,
  savedTrips,
  likedTrips,
  forkingId,
  onToggleSave,
  onToggleLike,
  onFork,
  onOpenDetail,
  onOpenProfile,
  formatDateRange,
  onRetry,
}: SharedTripFeedListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm animate-pulse">
            <div className="flex items-center gap-2 border-b border-gray-100 p-3">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
            <div className="h-48 bg-gray-200" />
            <div className="space-y-3 p-4">
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-gray-200" />
                <div className="h-5 w-16 rounded-full bg-gray-200" />
              </div>
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-gray-500">{error}</p>
        <Button variant="outline" onClick={onRetry}>重试</Button>
      </div>
    );
  }

  if (trips.length === 0) {
    return <div className="py-12 text-center text-gray-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {trips.map((trip) => {
        const authorContent = (
          <>
            <ImageWithFallback
              src={trip.author.avatar || ''}
              alt={trip.author.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm text-gray-900">{trip.author.name}</span>
          </>
        );

        return (
          <div
            key={trip.id}
            className={`overflow-hidden rounded-xl bg-white shadow-sm transition-shadow ${onOpenDetail ? 'cursor-pointer hover:shadow-md' : ''}`}
            onClick={() => onOpenDetail?.(trip.id)}
          >
            <div className="border-b border-gray-100 p-3">
              {onOpenProfile ? (
                <button
                  type="button"
                  className="-m-2 flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-gray-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenProfile(trip.author.id);
                  }}
                >
                  {authorContent}
                </button>
              ) : (
                <div className="flex items-center gap-2">{authorContent}</div>
              )}
            </div>

            <div className="relative h-48">
              <ImageWithFallback
                src={trip.imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'}
                alt={trip.destination}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white">{trip.destination}</h3>
                {trip.description && (
                  <p className="line-clamp-2 text-sm text-white/90">{trip.description}</p>
                )}
              </div>
            </div>

            <div className="p-4">
              {trip.tags && trip.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {trip.tags.map((tag, index) => (
                    <Badge key={`${trip.id}-${tag}-${index}`} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mb-4 space-y-2">
                {trip.startDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    {trip.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {trip.duration}
                      </span>
                    )}
                    {trip.budget && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        预算：{trip.budget}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-between border-t border-gray-100 pt-3"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {trip.viewsCount.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 transition-colors hover:text-blue-500"
                    onClick={() => onOpenDetail?.(trip.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {trip.commentsCount}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleLike(trip.id)}
                    className="flex items-center gap-1 text-sm transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${likedTrips.has(trip.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                    />
                    <span className={likedTrips.has(trip.id) ? 'text-red-500' : 'text-gray-500'}>
                      {trip.likesCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSave(trip.id)}
                    className="transition-colors"
                  >
                    <Bookmark
                      className={`h-5 w-5 ${savedTrips.has(trip.id) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`}
                    />
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => onFork(trip.id)}
                    disabled={forkingId === trip.id}
                  >
                    {forkingId === trip.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    导入行程
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
