import { supabase } from '@/utils/supabase/client';
import {
  SHARED_TRIP_CARD_SELECT,
  mapSharedTripCard,
  type SharedTripCard,
} from '@/services/sharedTripService';

export type SearchSortBy = 'relevance' | 'latest' | 'popular';

export interface SearchOptions {
  keyword?: string;
  tags?: string[];
  sortBy?: SearchSortBy;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  trips: SharedTripCard[];
  total: number;
  hasMore: boolean;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
}

const DEFAULT_HOT_SEARCHES = [
  '周末城市漫游',
  '北京胡同',
  '上海咖啡店',
  '广州早茶',
  '成都吃辣',
];

type SharedTripRow = Record<string, any>;
type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
};

function normalizeKeyword(keyword?: string) {
  return keyword?.trim() ?? '';
}

function dedupeTrips(rows: SharedTripRow[]) {
  const tripMap = new Map<string, SharedTripCard>();

  for (const row of rows) {
    if (!row?.id) {
      continue;
    }
    tripMap.set(row.id, mapSharedTripCard(row));
  }

  return Array.from(tripMap.values());
}

function mapSearchUser(row: UserRow): SearchUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username ?? '旅行者',
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    followersCount: row.followers_count ?? 0,
    followingCount: row.following_count ?? 0,
  };
}

function applySharedTripSort(trips: SharedTripCard[], keyword: string, sortBy: SearchSortBy, tags: string[]) {
  const normalizedKeyword = keyword.toLowerCase();

  const scoreTrip = (trip: SharedTripCard) => {
    let score = 0;
    const destination = trip.destination.toLowerCase();
    const description = (trip.description ?? '').toLowerCase();
    const author = trip.author.name.toLowerCase();

    if (normalizedKeyword && destination.includes(normalizedKeyword)) {
      score += 8;
    }
    if (normalizedKeyword && description.includes(normalizedKeyword)) {
      score += 5;
    }
    if (normalizedKeyword && author.includes(normalizedKeyword)) {
      score += 3;
    }
    if (tags.length > 0 && trip.tags) {
      score += tags.filter((tag) => trip.tags?.includes(tag)).length * 4;
    }

    return score + trip.likesCount * 0.2 + trip.viewsCount * 0.01;
  };

  return [...trips].sort((left, right) => {
    if (sortBy === 'latest') {
      return new Date(right.sharedAt).getTime() - new Date(left.sharedAt).getTime();
    }

    if (sortBy === 'popular') {
      return (
        right.likesCount - left.likesCount
        || right.viewsCount - left.viewsCount
        || new Date(right.sharedAt).getTime() - new Date(left.sharedAt).getTime()
      );
    }

    return (
      scoreTrip(right) - scoreTrip(left)
      || new Date(right.sharedAt).getTime() - new Date(left.sharedAt).getTime()
    );
  });
}

function applyBaseBrowseSort(query: ReturnType<typeof supabase.from>, sortBy: SearchSortBy) {
  if (sortBy === 'latest') {
    return query.order('shared_at', { ascending: false });
  }

  if (sortBy === 'popular') {
    return query
      .order('likes_count', { ascending: false })
      .order('views_count', { ascending: false })
      .order('shared_at', { ascending: false });
  }

  return query
    .order('featured', { ascending: false })
    .order('views_count', { ascending: false })
    .order('shared_at', { ascending: false });
}

async function fetchTripRowsByTextField(
  field: 'title' | 'description',
  pattern: string,
  tags: string[],
  limit: number,
) {
  let query = supabase
    .from('shared_trips')
    .select(SHARED_TRIP_CARD_SELECT)
    .eq('is_active', true)
    .ilike(field, pattern)
    .limit(limit);

  if (tags.length > 0) {
    query = query.contains('tags', tags);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SharedTripRow[];
}

async function fetchTripRowsByDestination(pattern: string, tags: string[], limit: number) {
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id')
    .ilike('destination', pattern)
    .limit(limit);

  if (tripsError) {
    throw new Error(tripsError.message);
  }

  const tripIds = (trips ?? []).map((trip) => trip.id);
  if (tripIds.length === 0) {
    return [] as SharedTripRow[];
  }

  let query = supabase
    .from('shared_trips')
    .select(SHARED_TRIP_CARD_SELECT)
    .eq('is_active', true)
    .in('trip_id', tripIds)
    .limit(limit);

  if (tags.length > 0) {
    query = query.contains('tags', tags);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SharedTripRow[];
}

export const searchService = {
  async searchSharedTrips(options: SearchOptions = {}): Promise<SearchResult> {
    const keyword = normalizeKeyword(options.keyword);
    const tags = options.tags ?? [];
    const sortBy = options.sortBy ?? 'relevance';
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    if (!keyword) {
      let query = supabase
        .from('shared_trips')
        .select(SHARED_TRIP_CARD_SELECT, { count: 'exact' })
        .eq('is_active', true);

      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }

      query = applyBaseBrowseSort(query, sortBy).range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const trips = (data ?? []).map(mapSharedTripCard);
      const total = count ?? trips.length;
      return {
        trips,
        total,
        hasMore: offset + trips.length < total,
      };
    }

    const pattern = `%${keyword}%`;
    const candidateLimit = Math.max(limit * 3, 30);

    const [titleRows, descriptionRows, destinationRows] = await Promise.all([
      fetchTripRowsByTextField('title', pattern, tags, candidateLimit),
      fetchTripRowsByTextField('description', pattern, tags, candidateLimit),
      fetchTripRowsByDestination(pattern, tags, candidateLimit),
    ]);

    const mergedTrips = dedupeTrips([
      ...titleRows,
      ...descriptionRows,
      ...destinationRows,
    ]);

    const sortedTrips = applySharedTripSort(mergedTrips, keyword, sortBy, tags);
    const pagedTrips = sortedTrips.slice(offset, offset + limit);

    return {
      trips: pagedTrips,
      total: sortedTrips.length,
      hasMore: offset + pagedTrips.length < sortedTrips.length,
    };
  },

  async searchUsers(keyword: string, limit = 6) {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) {
      return [] as SearchUser[];
    }

    const pattern = `%${normalizedKeyword}%`;
    const [displayNameMatches, usernameMatches] = await Promise.all([
      supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, followers_count, following_count')
        .ilike('display_name', pattern)
        .order('followers_count', { ascending: false })
        .limit(limit),
      supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, followers_count, following_count')
        .ilike('username', pattern)
        .order('followers_count', { ascending: false })
        .limit(limit),
    ]);

    if (displayNameMatches.error) {
      throw new Error(displayNameMatches.error.message);
    }
    if (usernameMatches.error) {
      throw new Error(usernameMatches.error.message);
    }

    const userMap = new Map<string, SearchUser>();
    for (const row of [...(displayNameMatches.data ?? []), ...(usernameMatches.data ?? [])] as UserRow[]) {
      userMap.set(row.id, mapSearchUser(row));
    }

    return Array.from(userMap.values())
      .sort((left, right) => right.followersCount - left.followersCount)
      .slice(0, limit);
  },

  async searchByTag(tag: string, options: Omit<SearchOptions, 'tags'> = {}) {
    return this.searchSharedTrips({
      ...options,
      tags: [tag],
    });
  },

  async searchByDestination(destination: string, options: Omit<SearchOptions, 'keyword'> = {}) {
    const pattern = `%${normalizeKeyword(destination)}%`;
    const tags = options.tags ?? [];
    const sortBy = options.sortBy ?? 'relevance';
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const rows = await fetchTripRowsByDestination(pattern, tags, Math.max(limit * 3, 30));
    const sortedTrips = applySharedTripSort(dedupeTrips(rows), destination, sortBy, tags);
    const pagedTrips = sortedTrips.slice(offset, offset + limit);

    return {
      trips: pagedTrips,
      total: sortedTrips.length,
      hasMore: offset + pagedTrips.length < sortedTrips.length,
    };
  },

  async getHotSearches() {
    return DEFAULT_HOT_SEARCHES;
  },

  async getPopularTags(limit = 15) {
    const { data, error } = await supabase
      .from('shared_trips')
      .select('tags')
      .eq('is_active', true)
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    const tagCounts = new Map<string, number>();
    for (const row of data ?? []) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
      .slice(0, limit)
      .map(([tag]) => tag);
  },
};

export default searchService;
