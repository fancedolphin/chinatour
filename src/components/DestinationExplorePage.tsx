import { useEffect, useMemo, useState } from 'react';
import { History, Search, TrendingUp, Users, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuthContext } from '@/presentation/context/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { followService } from '@/services/followService';
import { searchService, type SearchSortBy, type SearchUser } from '@/services/searchService';
import { sharedTripService, type SharedTripCard, type SharedTripSortBy } from '@/services/sharedTripService';
import { SharedTripFeedList } from './SharedTripFeedList';

interface DestinationExplorePageProps {
  onImportSuccess?: (newTripId: string) => void;
  onOpenDetail?: (sharedTripId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

type ExploreTab = SharedTripSortBy | 'following';

const SEARCH_HISTORY_KEY = 'chinaview_search_history';
const SEARCH_HISTORY_LIMIT = 10;

function loadSearchHistory() {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const rawValue = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!rawValue) {
      return [] as string[];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [] as string[];
  }
}

function persistSearchHistory(history: string[]) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, SEARCH_HISTORY_LIMIT)));
}

export function DestinationExplorePage({
  onImportSuccess,
  onOpenDetail,
  onOpenProfile,
}: DestinationExplorePageProps = {}) {
  const { currentUser } = useAuthContext();
  const [trips, setTrips] = useState<SharedTripCard[]>([]);
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ExploreTab>('recommend');
  const [savedTrips, setSavedTrips] = useState<Set<string>>(new Set());
  const [likedTrips, setLikedTrips] = useState<Set<string>>(new Set());
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState('暂无公开行程');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [hotSearches, setHotSearches] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => loadSearchHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const normalizedQuery = debouncedQuery.trim();
  const isSearchMode = normalizedQuery.length > 0 || selectedTags.length > 0;

  const tabs: Array<{ value: ExploreTab; label: string }> = currentUser
    ? [
        { value: 'following', label: '关注' },
        { value: 'recommend', label: '推荐' },
        { value: 'hot', label: '最热' },
        { value: 'latest', label: '最新' },
      ]
    : [
        { value: 'recommend', label: '推荐' },
        { value: 'hot', label: '最热' },
        { value: 'latest', label: '最新' },
      ];

  const searchSortBy = useMemo<SearchSortBy>(() => {
    if (sortBy === 'latest') {
      return 'latest';
    }
    if (sortBy === 'hot') {
      return 'popular';
    }
    return 'relevance';
  }, [sortBy]);

  useEffect(() => {
    let cancelled = false;

    const loadSearchMeta = async () => {
      try {
        const [nextHotSearches, nextPopularTags] = await Promise.all([
          searchService.getHotSearches(),
          searchService.getPopularTags(),
        ]);

        if (cancelled) {
          return;
        }

        setHotSearches(nextHotSearches);
        setPopularTags(nextPopularTags);
      } catch (metaError) {
        console.error('[DestinationExplorePage] 加载搜索元数据失败:', metaError);
      }
    };

    loadSearchMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser && sortBy === 'following') {
      setSortBy('recommend');
    }
  }, [currentUser, sortBy]);

  useEffect(() => {
    let cancelled = false;

    const loadBrowseTrips = async (sort: ExploreTab) => {
      try {
        setLoading(true);
        setError(null);
        setUserResults([]);

        let data: SharedTripCard[] = [];
        let nextEmptyMessage = '暂无公开行程';

        if (sort === 'following') {
          if (!currentUser) {
            nextEmptyMessage = '请先登录后查看关注动态';
          } else {
            data = await sharedTripService.getFollowingFeed(currentUser.id);
            if (data.length === 0) {
              const counts = await followService.getFollowCounts(currentUser.id);
              nextEmptyMessage = counts.following === 0
                ? '关注感兴趣的旅行者，这里会出现他们的行程动态'
                : '你关注的旅行者还没有发布新行程';
            }
          }
        } else {
          data = await sharedTripService.getAllSharedTrips({ sort });
        }

        if (cancelled) {
          return;
        }

        setTrips(data);
        setEmptyMessage(nextEmptyMessage);

        if (currentUser && data.length > 0) {
          const interactionMap = await sharedTripService.getBatchUserInteractions(
            data.map((trip) => trip.id),
            currentUser.id,
          );
          if (cancelled) {
            return;
          }

          const nextLikedTrips = new Set<string>();
          const nextSavedTrips = new Set<string>();
          interactionMap.forEach(({ liked, saved }, id) => {
            if (liked) {
              nextLikedTrips.add(id);
            }
            if (saved) {
              nextSavedTrips.add(id);
            }
          });
          setLikedTrips(nextLikedTrips);
          setSavedTrips(nextSavedTrips);
        } else {
          setLikedTrips(new Set());
          setSavedTrips(new Set());
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('[DestinationExplorePage] 加载失败:', loadError);
          setError(loadError instanceof Error ? loadError.message : '加载失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const loadSearchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const [tripResult, matchingUsers] = await Promise.all([
          searchService.searchSharedTrips({
            keyword: normalizedQuery,
            tags: selectedTags,
            sortBy: searchSortBy,
            limit: 24,
            offset: 0,
          }),
          normalizedQuery ? searchService.searchUsers(normalizedQuery, 6) : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        setTrips(tripResult.trips);
        setUserResults(matchingUsers);
        if (tripResult.total > 0) {
          setEmptyMessage(`找到 ${tripResult.total} 条相关行程`);
        } else if (normalizedQuery && selectedTags.length > 0) {
          setEmptyMessage('没有匹配当前关键词和标签的结果');
        } else if (normalizedQuery) {
          setEmptyMessage('未找到相关行程，换个关键词试试');
        } else {
          setEmptyMessage('未找到符合筛选条件的行程');
        }

        if (normalizedQuery) {
          setSearchHistory((prev) => {
            const nextHistory = [
              normalizedQuery,
              ...prev.filter((item) => item !== normalizedQuery),
            ].slice(0, SEARCH_HISTORY_LIMIT);
            persistSearchHistory(nextHistory);
            return nextHistory;
          });
        }

        if (currentUser && tripResult.trips.length > 0) {
          const interactionMap = await sharedTripService.getBatchUserInteractions(
            tripResult.trips.map((trip) => trip.id),
            currentUser.id,
          );
          if (cancelled) {
            return;
          }

          const nextLikedTrips = new Set<string>();
          const nextSavedTrips = new Set<string>();
          interactionMap.forEach(({ liked, saved }, id) => {
            if (liked) {
              nextLikedTrips.add(id);
            }
            if (saved) {
              nextSavedTrips.add(id);
            }
          });
          setLikedTrips(nextLikedTrips);
          setSavedTrips(nextSavedTrips);
        } else {
          setLikedTrips(new Set());
          setSavedTrips(new Set());
        }
      } catch (searchError) {
        if (!cancelled) {
          console.error('[DestinationExplorePage] 搜索失败:', searchError);
          setError(searchError instanceof Error ? searchError.message : '搜索失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (isSearchMode) {
      loadSearchResults();
    } else {
      loadBrowseTrips(sortBy);
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser, isSearchMode, normalizedQuery, reloadToken, searchSortBy, selectedTags, sortBy]);

  const updateTripLikeCount = (sharedTripId: string, delta: number) => {
    setTrips((prev) => prev.map((trip) => (
      trip.id === sharedTripId
        ? { ...trip, likesCount: Math.max(0, trip.likesCount + delta) }
        : trip
    )));
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
        if (newLiked) {
          next.add(sharedTripId);
        } else {
          next.delete(sharedTripId);
        }
        return next;
      });
      updateTripLikeCount(sharedTripId, newLiked ? 1 : -1);
    } catch {
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
        if (newSaved) {
          next.add(sharedTripId);
        } else {
          next.delete(sharedTripId);
        }
        return next;
      });
    } catch {
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
    } catch (forkError) {
      toast.error('导入失败：' + (forkError instanceof Error ? forkError.message : '未知错误'));
    } finally {
      setForkingId(null);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : [...prev, tag]
    ));
    setShowHistory(false);
  };

  const handleHistorySelect = (keyword: string) => {
    setSearchQuery(keyword);
    setShowHistory(false);
  };

  const handleClearHistoryItem = (keyword: string) => {
    const nextHistory = searchHistory.filter((item) => item !== keyword);
    setSearchHistory(nextHistory);
    persistSearchHistory(nextHistory);
  };

  const handleClearAllHistory = () => {
    setSearchHistory([]);
    persistSearchHistory([]);
  };

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) {
      return '';
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
  };

  const searchSummary = useMemo(() => {
    if (!isSearchMode) {
      return null;
    }

    const parts = [];
    if (normalizedQuery) {
      parts.push(`关键词「${normalizedQuery}」`);
    }
    if (selectedTags.length > 0) {
      parts.push(`标签 ${selectedTags.join(' / ')}`);
    }
    return parts.join(' · ');
  }, [isSearchMode, normalizedQuery, selectedTags]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-screen-xl px-4 py-6">
        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-gray-50/95 px-4 pb-4 backdrop-blur">
          <div className="relative mb-3">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                placeholder="搜索行程、目的地、用户"
                className="flex-1 bg-transparent text-sm outline-none"
                onFocus={() => setShowHistory(searchQuery.trim().length === 0 && searchHistory.length > 0)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setShowHistory(event.target.value.trim().length === 0 && searchHistory.length > 0);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  onClick={() => {
                    setSearchQuery('');
                    setShowHistory(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {showHistory && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <History className="h-4 w-4" />
                    搜索历史
                  </div>
                  <button
                    type="button"
                    className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                    onClick={handleClearAllHistory}
                  >
                    清空全部
                  </button>
                </div>

                <div className="space-y-2">
                  {searchHistory.map((keyword) => (
                    <div key={keyword} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm text-gray-700"
                        onClick={() => handleHistorySelect(keyword)}
                      >
                        {keyword}
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                        onClick={() => handleClearHistoryItem(keyword)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {popularTags.map((tag) => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => handleTagToggle(tag)}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {!isSearchMode && (
          <div className="mb-4 rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <h2 className="text-gray-900">热门搜索</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotSearches.map((search) => (
                <button
                  key={search}
                  type="button"
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                  onClick={() => {
                    setSearchQuery(search);
                    setShowHistory(false);
                  }}
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearchMode && (
          <div className="mb-4 rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-gray-500">全局搜索</p>
                <h2 className="text-gray-900">{searchSummary}</h2>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>{trips.length} 条行程结果</div>
                {normalizedQuery && <div>{userResults.length} 位相关用户</div>}
              </div>
            </div>
          </div>
        )}

        {isSearchMode && normalizedQuery && userResults.length > 0 && (
          <div className="mb-4 rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <h2 className="text-gray-900">相关用户</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                  onClick={() => onOpenProfile?.(user.id)}
                >
                  <ImageWithFallback
                    src={user.avatarUrl || ''}
                    alt={user.displayName}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-gray-900">{user.displayName}</div>
                    <div className="truncate text-xs text-gray-500">@{user.username}</div>
                    <div className="mt-1 truncate text-xs text-gray-600">
                      {user.bio || '这个人很低调，还没有填写简介。'}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {user.followersCount} 粉丝 · 关注 {user.followingCount}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Tabs
          value={sortBy}
          className="mb-4 w-full"
          onValueChange={(value) => setSortBy(value as ExploreTab)}
        >
          <TabsList className={currentUser
            ? 'grid w-full grid-cols-4 rounded-xl bg-white p-1'
            : 'grid w-full grid-cols-3 rounded-xl bg-white p-1'}
          >
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <SharedTripFeedList
                trips={trips}
                loading={loading}
                error={error}
                emptyMessage={emptyMessage}
                savedTrips={savedTrips}
                likedTrips={likedTrips}
                forkingId={forkingId}
                onToggleSave={handleToggleSave}
                onToggleLike={handleToggleLike}
                onFork={handleFork}
                onOpenDetail={onOpenDetail}
                onOpenProfile={onOpenProfile}
                formatDateRange={formatDateRange}
                onRetry={() => {
                  if (isSearchMode) {
                    setReloadToken((prev) => prev + 1);
                    return;
                  }
                  setReloadToken((prev) => prev + 1);
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
