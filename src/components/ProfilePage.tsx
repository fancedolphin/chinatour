import { useEffect, useState } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { SettingsPage } from './SettingsPage';
import { FollowButton } from './FollowButton';
import { SharedTripFeedList } from './SharedTripFeedList';
import { useAuthContext } from '../presentation/context/AuthContext';
import { sharedTripService, type SharedTripCard } from '@/services/sharedTripService';
import { followService, type PublicUserProfile } from '@/services/followService';
import { supabase } from '@/utils/supabase/client';
import { useT } from '@/i18n/useT';
import { formatDateRange as fmtDateRange } from '@/utils/formatters';

interface ProfilePageProps {
  viewedUserId?: string | null;
  onBack?: () => void;
  onOpenDetail?: (sharedTripId: string) => void;
}

type ProfileTab = 'published' | 'liked';

function buildFallbackProfile(currentUser: NonNullable<ReturnType<typeof useAuthContext>['currentUser']>): PublicUserProfile {
  return {
    id: currentUser.id,
    username: currentUser.username,
    display_name: currentUser.displayName,
    avatar_url: currentUser.avatar ?? null,
    bio: currentUser.bio ?? null,
    followers_count: 0,
    following_count: 0,
    language: currentUser.preferences?.language ?? 'zh',
    theme: null,
    created_at: currentUser.createdAt.toISOString(),
    updated_at: currentUser.updatedAt.toISOString(),
  };
}

export function ProfilePage({ viewedUserId, onBack, onOpenDetail }: ProfilePageProps) {
  const { t } = useT();
  const { currentUser } = useAuthContext();
  const [showSettings, setShowSettings] = useState(false);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [publishedTrips, setPublishedTrips] = useState<SharedTripCard[]>([]);
  const [likedTrips, setLikedTrips] = useState<SharedTripCard[]>([]);
  const [savedTrips, setSavedTrips] = useState<Set<string>>(new Set());
  const [likedTripIds, setLikedTripIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [engagementCount, setEngagementCount] = useState(0);
  const [activeTab, setActiveTab] = useState<ProfileTab>('published');
  const [isFollowing, setIsFollowing] = useState(false);

  const targetUserId = viewedUserId ?? currentUser?.id ?? null;
  const isOwnProfile = Boolean(currentUser && targetUserId === currentUser.id);

  useEffect(() => {
    if (!isOwnProfile && activeTab === 'liked') {
      setActiveTab('published');
    }
  }, [activeTab, isOwnProfile]);

  useEffect(() => {
    setShowSettings(false);
  }, [targetUserId]);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      setError(t('profile.loginRequiredView'));
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const [{ data: profileRow, error: profileError }, published, liked, followingState] = await Promise.all([
          supabase
            .from('users')
            .select('id, username, display_name, avatar_url, bio, followers_count, following_count, language, theme, created_at, updated_at')
            .eq('id', targetUserId)
            .maybeSingle(),
          sharedTripService.getSharedTripsByUser(targetUserId),
          isOwnProfile ? sharedTripService.getLikedSharedTripsByUser(targetUserId) : Promise.resolve([]),
          currentUser && !isOwnProfile ? followService.isFollowing(targetUserId) : Promise.resolve(false),
        ]);

        if (profileError) {
          throw new Error(profileError.message);
        }

        let nextProfile = (profileRow as PublicUserProfile | null) ?? null;
        if (!nextProfile && isOwnProfile && currentUser) {
          nextProfile = buildFallbackProfile(currentUser);
        }
        if (!nextProfile) {
          throw new Error(t('profile.userNotFound'));
        }

        const interactionTripIds = Array.from(new Set([
          ...published.map((trip) => trip.id),
          ...liked.map((trip) => trip.id),
        ]));

        let nextLikedTripIds = new Set<string>();
        let nextSavedTrips = new Set<string>();
        if (currentUser && interactionTripIds.length > 0) {
          const interactionMap = await sharedTripService.getBatchUserInteractions(interactionTripIds, currentUser.id);
          interactionMap.forEach(({ liked: hasLiked, saved }, id) => {
            if (hasLiked) {
              nextLikedTripIds.add(id);
            }
            if (saved) {
              nextSavedTrips.add(id);
            }
          });
        }

        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        setPublishedTrips(published);
        setLikedTrips(liked);
        setLikedTripIds(nextLikedTripIds);
        setSavedTrips(nextSavedTrips);
        setEngagementCount(published.reduce((sum, trip) => sum + trip.likesCount + trip.savesCount, 0));
        setIsFollowing(followingState);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[ProfilePage] load failed:', loadError);
          setError(loadError instanceof Error ? loadError.message : t('profile.loadFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isOwnProfile, targetUserId]);

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    return fmtDateRange(new Date(start), new Date(end));
  };

  const updateTripLikeCount = (sharedTripId: string, delta: number) => {
    setPublishedTrips((prev) => prev.map((trip) => (
      trip.id === sharedTripId
        ? { ...trip, likesCount: Math.max(0, trip.likesCount + delta) }
        : trip
    )));
    setLikedTrips((prev) => prev.map((trip) => (
      trip.id === sharedTripId
        ? { ...trip, likesCount: Math.max(0, trip.likesCount + delta) }
        : trip
    )));
  };

  const updateTripSaveCount = (sharedTripId: string, delta: number) => {
    setPublishedTrips((prev) => prev.map((trip) => (
      trip.id === sharedTripId
        ? { ...trip, savesCount: Math.max(0, trip.savesCount + delta) }
        : trip
    )));
    setLikedTrips((prev) => prev.map((trip) => (
      trip.id === sharedTripId
        ? { ...trip, savesCount: Math.max(0, trip.savesCount + delta) }
        : trip
    )));
  };

  const handleToggleLike = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error(t('profile.loginRequired'));
      return;
    }

    try {
      const nextLiked = await sharedTripService.toggleLike(sharedTripId, currentUser.id);
      setLikedTripIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) {
          next.add(sharedTripId);
        } else {
          next.delete(sharedTripId);
        }
        return next;
      });

      const isPublishedTrip = publishedTrips.some((trip) => trip.id === sharedTripId);
      updateTripLikeCount(sharedTripId, nextLiked ? 1 : -1);

      if (isOwnProfile) {
        setLikedTrips((prev) => {
          if (!nextLiked) {
            return prev.filter((trip) => trip.id !== sharedTripId);
          }

          if (prev.some((trip) => trip.id === sharedTripId)) {
            return prev;
          }

          const sourceTrip = publishedTrips.find((trip) => trip.id === sharedTripId);
          if (!sourceTrip) {
            return prev;
          }

          return [
            { ...sourceTrip, likesCount: sourceTrip.likesCount + 1 },
            ...prev,
          ];
        });
      }

      if (isPublishedTrip) {
        setEngagementCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));
      }
    } catch {
      toast.error(t('profile.operationFailed'));
    }
  };

  const handleToggleSave = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error(t('profile.loginRequired'));
      return;
    }

    try {
      const nextSaved = await sharedTripService.toggleSave(sharedTripId, currentUser.id);
      setSavedTrips((prev) => {
        const next = new Set(prev);
        if (nextSaved) {
          next.add(sharedTripId);
        } else {
          next.delete(sharedTripId);
        }
        return next;
      });

      if (publishedTrips.some((trip) => trip.id === sharedTripId)) {
        updateTripSaveCount(sharedTripId, nextSaved ? 1 : -1);
        setEngagementCount((prev) => Math.max(0, prev + (nextSaved ? 1 : -1)));
      }
    } catch {
      toast.error(t('profile.operationFailed'));
    }
  };

  const handleFork = async (sharedTripId: string) => {
    if (!currentUser) {
      toast.error(t('profile.loginRequired'));
      return;
    }

    try {
      setForkingId(sharedTripId);
      await sharedTripService.forkTrip(sharedTripId, currentUser.id);
      toast.success(t('profile.forkSuccess'));
    } catch (forkError) {
      toast.error(t('profile.forkFailed', {
        reason: forkError instanceof Error ? forkError.message : t('profile.unknownError'),
      }));
    } finally {
      setForkingId(null);
    }
  };

  const displayName = profile?.display_name || (isOwnProfile ? currentUser?.displayName : null) || t('profile.defaultDisplayName');
  const username = profile?.username || currentUser?.username || t('profile.defaultUsername');
  const bio = profile?.bio || (isOwnProfile ? currentUser?.bio : null) || t('profile.defaultBio');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-screen-xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          {onBack ? (
            <Button type="button" variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </Button>
          ) : (
            <div className="h-9 w-9" />
          )}

          {isOwnProfile ? (
            <button
              type="button"
              className="rounded-xl p-2 transition-colors hover:bg-white"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-5 w-5 text-gray-700" />
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}
        </div>

        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-4">
            <ImageWithFallback
              src={profile?.avatar_url || currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-gray-900">{displayName}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t('profile.travelerId', { username })}</p>
                </div>
                {profile && (
                  isOwnProfile ? (
                    <Button type="button" variant="outline" onClick={() => setShowSettings(true)}>
                      {t('profile.editProfile')}
                    </Button>
                  ) : (
                    <FollowButton
                      targetUserId={profile.id}
                      initialIsFollowing={isFollowing}
                      onToggle={(nextIsFollowing) => {
                        setIsFollowing(nextIsFollowing);
                        setProfile((prev) => prev
                          ? {
                              ...prev,
                              followers_count: Math.max(0, prev.followers_count + (nextIsFollowing ? 1 : -1)),
                            }
                          : prev);
                      }}
                    />
                  )
                )}
              </div>
              <p className="text-sm text-gray-700">{bio}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 py-3">
            <div className="text-center">
              <div className="text-gray-900">{profile?.following_count.toLocaleString() ?? 0}</div>
              <div className="text-xs text-gray-500">{t('profile.following')}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900">{profile?.followers_count.toLocaleString() ?? 0}</div>
              <div className="text-xs text-gray-500">{t('profile.followers')}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-900">{engagementCount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{t('profile.engagement')}</div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)} className="w-full">
          <TabsList className={isOwnProfile
            ? 'mb-4 grid w-full grid-cols-2 rounded-xl bg-white p-1'
            : 'mb-4 grid w-full grid-cols-1 rounded-xl bg-white p-1'}
          >
            <TabsTrigger value="published">{t('profile.tabPublished')}</TabsTrigger>
            {isOwnProfile && <TabsTrigger value="liked">{t('profile.tabLiked')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="published">
            <SharedTripFeedList
              trips={publishedTrips}
              loading={loading}
              error={error}
              emptyMessage={isOwnProfile ? t('profile.emptyOwnPublished') : t('profile.emptyOtherPublished')}
              savedTrips={savedTrips}
              likedTrips={likedTripIds}
              forkingId={forkingId}
              onToggleSave={handleToggleSave}
              onToggleLike={handleToggleLike}
              onFork={handleFork}
              onOpenDetail={onOpenDetail}
              formatDateRange={formatDateRange}
              onRetry={() => window.location.reload()}
            />
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="liked">
              <SharedTripFeedList
                trips={likedTrips}
                loading={loading}
                error={error}
                emptyMessage={t('profile.emptyLiked')}
                savedTrips={savedTrips}
                likedTrips={likedTripIds}
                forkingId={forkingId}
                onToggleSave={handleToggleSave}
                onToggleLike={handleToggleLike}
                onFork={handleFork}
                onOpenDetail={onOpenDetail}
                formatDateRange={formatDateRange}
                onRetry={() => window.location.reload()}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
