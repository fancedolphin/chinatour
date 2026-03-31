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
  description: string;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  price_range?: string | null;
  meal_type?: string | null;
  specialties?: string[] | null;
  dietary_options?: string[] | null;
  opening_hours?: string | null;
  reservation_required: boolean;
  popularity_score: number;
  avg_rating?: number | null;
  review_count: number;
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
  };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const destinations = Array.isArray(body.destinations) ? body.destinations : [];
  const restaurants = Array.isArray(body.restaurants) ? body.restaurants : [];
  const dishes = Array.isArray(body.dishes) ? body.dishes : [];

  if (!destinations.length && !restaurants.length && !dishes.length) {
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
      const rows = restaurants.map((item) => ({
        id: item.id,
        destination_id: item.destination_id ?? null,
        name: item.name,
        name_en: item.name_en ?? null,
        cuisine_type: item.cuisine_type ?? null,
        description: item.description,
        location_lat: item.location_lat ?? null,
        location_lng: item.location_lng ?? null,
        address: item.address ?? null,
        price_range: item.price_range ?? null,
        meal_type: item.meal_type ?? null,
        specialties: ensureStringArray(item.specialties),
        dietary_options: ensureStringArray(item.dietary_options),
        opening_hours: item.opening_hours ?? null,
        reservation_required: item.reservation_required,
        popularity_score: item.popularity_score,
        avg_rating: item.avg_rating ?? null,
        review_count: item.review_count,
        menu_image_url: item.menu_image_url ?? null,
        embedding: toVectorLiteral(item.embedding),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('restaurants').upsert(rows, { onConflict: 'id' });
      if (error) {
        throw error;
      }
    }

    const restaurantIds = [...new Set(restaurants.map((item) => item.id).filter(Boolean))];
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
  } catch (error) {
    return jsonResponse(500, {
      error: 'Batch import failed',
      details: formatError(error),
    });
  }

  return jsonResponse(200, {
    imported_destinations: destinations.length,
    imported_restaurants: restaurants.length,
    imported_dishes: dishes.length,
  });
});
