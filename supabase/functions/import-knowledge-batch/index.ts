import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

type DestinationPayload = {
  id: string;
  name: string;
  country: string;
  description: string;
  best_season?: string | null;
  average_budget_daily?: string | null;
  currency: string;
  timezone: string;
  embedding?: number[] | string | null;
};

type RestaurantPayload = {
  id: string;
  destination_id?: string | null;
  name: string;
  name_en?: string | null;
  cuisine_type?: string | null;
  description?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  price_range?: string | null;
  meal_type?: string | null;
  specialties?: string[] | null;
  dietary_options?: string[] | null;
  opening_hours?: Record<string, unknown> | null;
  reservation_required?: boolean | null;
  popularity_score?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  menu_image_url?: string | null;
  embedding?: number[] | string | null;
};

type DishPayload = {
  id: string;
  restaurant_id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  image_url?: string | null;
  allergens?: string[] | null;
  recommend_count: number;
  order_index: number;
};

type AttractionPayload = {
  id: string;
  destination_id?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  opening_hours?: Record<string, unknown> | null;
  ticket_price?: string | null;
  recommended_duration?: string | null;
  best_time_to_visit?: string | null;
  tags?: string[] | null;
  popularity_score?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  embedding?: number[] | string | null;
};

type TravelTipPayload = {
  id: string;
  destination_id?: string | null;
  category?: string | null;
  title?: string | null;
  content?: string | null;
  is_important?: boolean | null;
  season_specific?: string | null;
  embedding?: number[] | string | null;
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return JSON.stringify(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...Object.fromEntries(Object.entries(error)),
      },
      null,
      2,
    );
  }

  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error, null, 2);
  }

  return String(error);
}

function ensureStringArray(value: unknown): string[] | null {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new Error('Expected array payload');
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function toVectorLiteral(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
    throw new Error('Invalid embedding payload');
  }

  return `[${value.join(',')}]`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function mergeText(existing: string | null | undefined, incoming: string | null | undefined): string | null {
  const current = existing?.trim();
  const next = incoming?.trim();

  if (!current && !next) {
    return null;
  }
  if (!current) {
    return next ?? null;
  }
  if (!next) {
    return current;
  }
  if (current.includes(next)) {
    return current;
  }
  if (next.includes(current)) {
    return next;
  }
  return `${current}\n\n${next}`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Missing Supabase runtime secrets' });
  }

  let body: {
    destinations?: DestinationPayload[];
    restaurants?: RestaurantPayload[];
    dishes?: DishPayload[];
    attractions?: AttractionPayload[];
    travel_tips?: TravelTipPayload[];
    replaceRestaurantDishes?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const destinations = Array.isArray(body.destinations) ? body.destinations : [];
  const restaurants = Array.isArray(body.restaurants) ? body.restaurants : [];
  const dishes = Array.isArray(body.dishes) ? body.dishes : [];
  const attractions = Array.isArray(body.attractions) ? body.attractions : [];
  const travelTips = Array.isArray(body.travel_tips) ? body.travel_tips : [];
  const replaceRestaurantDishes = body.replaceRestaurantDishes === true;

  if (!destinations.length && !restaurants.length && !dishes.length && !attractions.length && !travelTips.length) {
    return jsonResponse(400, { error: 'No rows provided' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    if (destinations.length) {
      const rows = destinations.map((item) => ({
        id: item.id,
        name: item.name,
        country: item.country,
        description: item.description,
        best_season: item.best_season ?? null,
        average_budget_daily: item.average_budget_daily ?? null,
        currency: item.currency,
        timezone: item.timezone,
        embedding: toVectorLiteral(item.embedding),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('destinations').upsert(rows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    if (restaurants.length) {
      const restaurantIds = restaurants.map((item) => item.id);
      const existingById = new Map<string, Record<string, unknown>>();

      for (const batch of chunk(restaurantIds, 200)) {
        const { data, error } = await supabase
          .from('restaurants')
          .select(
            'id, destination_id, name_en, cuisine_type, description, address, location_lat, location_lng, price_range, meal_type, specialties, dietary_options, opening_hours, reservation_required, popularity_score, avg_rating, review_count, menu_image_url, embedding',
          )
          .in('id', batch);
        if (error) {
          throw error;
        }
        for (const row of data ?? []) {
          existingById.set(String(row.id), row as Record<string, unknown>);
        }
      }

      const rows = restaurants.map((item) => {
        const existing = existingById.get(item.id);
        const incomingSpecialties = ensureStringArray(item.specialties);
        const incomingDietary = ensureStringArray(item.dietary_options);

        const existingReviewCount = Number(existing?.review_count ?? 0);
        const incomingReviewCount = Number(item.review_count ?? 0);
        const existingPopularity = Number(existing?.popularity_score ?? 0);
        const incomingPopularity = Number(item.popularity_score ?? 0);

        return {
          id: item.id,
          destination_id: item.destination_id ?? (existing?.destination_id as string | null | undefined) ?? null,
          name: item.name,
          name_en: item.name_en ?? (existing?.name_en as string | null | undefined) ?? null,
          cuisine_type: item.cuisine_type ?? (existing?.cuisine_type as string | null | undefined) ?? null,
          description: mergeText(existing?.description as string | null | undefined, item.description),
          location_lat: item.location_lat ?? (existing?.location_lat as number | null | undefined) ?? null,
          location_lng: item.location_lng ?? (existing?.location_lng as number | null | undefined) ?? null,
          address: item.address ?? (existing?.address as string | null | undefined) ?? null,
          price_range: item.price_range ?? (existing?.price_range as string | null | undefined) ?? null,
          meal_type: item.meal_type ?? (existing?.meal_type as string | null | undefined) ?? null,
          specialties:
            incomingSpecialties && incomingSpecialties.length
              ? incomingSpecialties
              : (existing?.specialties as string[] | null | undefined) ?? null,
          dietary_options:
            incomingDietary && incomingDietary.length
              ? incomingDietary
              : (existing?.dietary_options as string[] | null | undefined) ?? null,
          opening_hours: item.opening_hours ?? (existing?.opening_hours as Record<string, unknown> | null | undefined) ?? null,
          reservation_required: Boolean(item.reservation_required ?? existing?.reservation_required ?? false),
          popularity_score: Math.max(existingPopularity, incomingPopularity),
          avg_rating: item.avg_rating ?? (existing?.avg_rating as number | null | undefined) ?? null,
          review_count: Math.max(existingReviewCount, incomingReviewCount),
          menu_image_url: item.menu_image_url ?? (existing?.menu_image_url as string | null | undefined) ?? null,
          embedding: toVectorLiteral(item.embedding ?? existing?.embedding ?? null),
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase.from('restaurants').upsert(rows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    if (replaceRestaurantDishes) {
      const restaurantIds = [...new Set(dishes.map((item) => item.restaurant_id).filter(Boolean))];
      for (const batch of chunk(restaurantIds, 100)) {
        const { error } = await supabase.from('restaurant_dishes').delete().in('restaurant_id', batch);
        if (error) {
          throw error;
        }
      }

      for (const batch of chunk(dishes, 200)) {
        if (!batch.length) {
          continue;
        }

        const rows = batch.map((item) => ({
          id: item.id,
          restaurant_id: item.restaurant_id,
          name: item.name,
          name_en: item.name_en ?? null,
          description: item.description ?? null,
          image_url: item.image_url ?? null,
          allergens: ensureStringArray(item.allergens) ?? [],
          recommend_count: item.recommend_count,
          order_index: item.order_index,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from('restaurant_dishes').upsert(rows, { onConflict: 'id' });
        if (error) {
          throw error;
        }
      }
    }

    if (attractions.length) {
      const rows = attractions.map((item) => ({
        id: item.id,
        destination_id: item.destination_id ?? null,
        name: item.name,
        category: item.category ?? null,
        description: item.description ?? null,
        location_lat: item.location_lat ?? null,
        location_lng: item.location_lng ?? null,
        address: item.address ?? null,
        opening_hours: item.opening_hours ?? null,
        ticket_price: item.ticket_price ?? null,
        recommended_duration: item.recommended_duration ?? null,
        best_time_to_visit: item.best_time_to_visit ?? null,
        tags: ensureStringArray(item.tags),
        popularity_score: item.popularity_score ?? 0,
        avg_rating: item.avg_rating ?? null,
        review_count: item.review_count ?? 0,
        embedding: toVectorLiteral(item.embedding),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('attractions').upsert(rows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    if (travelTips.length) {
      const rows = travelTips.map((item) => ({
        id: item.id,
        destination_id: item.destination_id ?? null,
        category: item.category ?? null,
        title: item.title ?? null,
        content: item.content ?? null,
        is_important: item.is_important ?? false,
        season_specific: item.season_specific ?? null,
        embedding: toVectorLiteral(item.embedding),
      }));

      const { error } = await supabase.from('travel_tips').upsert(rows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }
  } catch (error) {
    return jsonResponse(500, {
      error: 'Batch import failed',
      details: formatError(error),
    });
  }

  return jsonResponse(200, {
    imported_destinations: destinations.length,
    imported_restaurants: restaurants.length,
    imported_dishes: replaceRestaurantDishes ? dishes.length : 0,
    imported_attractions: attractions.length,
    imported_travel_tips: travelTips.length,
  });
});
