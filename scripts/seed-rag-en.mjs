/**
 * seed-rag-en.mjs
 *
 * Starter EN-locale RAG seed dataset for the English ChinaView site.
 * Mirrors seed-rag-mvp.mjs but inserts rows with locale='en' so the
 * locale-aware RPCs (match_attractions / match_restaurants / ...) can
 * route by VITE_LOCALE without leaking Chinese descriptions into the
 * EN narrative prompts.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-rag-en.mjs
 *
 * Idempotent: re-running upserts on (destination_id, name, locale).
 * Requires migration 019_add_locale_field.sql to be applied first.
 */

import { createClient } from '@jsr/supabase__supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ogodnvjaiwelqmjqkvda.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCALE = 'en';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY — aborting EN seed.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DESTINATIONS = [
  {
    name: 'Beijing',
    country: 'China',
    description:
      'China\'s capital — dense imperial heritage and modern dining; an essential stop for first-time international visitors.',
    best_season: 'Spring & Autumn',
    average_budget_daily: '800-1500 CNY',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
  {
    name: 'Shanghai',
    country: 'China',
    description:
      'A cosmopolitan blend of Art Deco bund, modern Pudong skyline, and a deep food scene from xiaolongbao to Michelin-star fine dining.',
    best_season: 'Spring & Autumn',
    average_budget_daily: '900-1800 CNY',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
];

const ATTRACTIONS = [
  {
    destination: 'Beijing',
    name: 'The Forbidden City (Gugong)',
    category: 'Historical & Cultural',
    description:
      'Imperial palace of the Ming and Qing dynasties. Real-name reservation required several days in advance; budget at least half a day.',
    address: '4 Jingshan Front Street, Dongcheng District, Beijing',
    location_lat: 39.916345,
    location_lng: 116.397155,
    ticket_price: '60 CNY (peak season)',
    recommended_duration: '4-6 hours',
    tags: ['history', 'palace', 'reservation-required'],
  },
  {
    destination: 'Beijing',
    name: 'Mutianyu Great Wall',
    category: 'Outdoor & Landmark',
    description:
      'Restored Ming-era section with cable car and toboggan; less crowded than Badaling and family-friendly.',
    address: 'Mutianyu Village, Huairou District, Beijing',
    location_lat: 40.4319,
    location_lng: 116.5704,
    ticket_price: '45 CNY + cable car',
    recommended_duration: '4-5 hours',
    tags: ['great-wall', 'outdoor', 'family'],
  },
  {
    destination: 'Shanghai',
    name: 'The Bund (Waitan)',
    category: 'Cityscape',
    description:
      'Historic riverside promenade lined with colonial-era architecture; best at dusk with the Pudong skyline lit up across the river.',
    address: 'Zhongshan East 1st Road, Huangpu District, Shanghai',
    location_lat: 31.2397,
    location_lng: 121.4905,
    ticket_price: 'Free',
    recommended_duration: '1-2 hours',
    tags: ['cityscape', 'photography', 'free'],
  },
];

const RESTAURANTS = [
  {
    destination: 'Beijing',
    name: 'Quanjude (Qianmen)',
    cuisine_type: 'Beijing / Peking Duck',
    description:
      'Heritage Peking duck restaurant; carved tableside. Reservations recommended on weekends.',
    address: '32 Qianmen Street, Dongcheng District, Beijing',
    location_lat: 39.8956,
    location_lng: 116.3975,
    price_range: '¥¥¥',
    specialties: ['Peking duck', 'duck soup'],
  },
  {
    destination: 'Shanghai',
    name: 'Jia Jia Tang Bao',
    cuisine_type: 'Shanghainese / Soup Dumplings',
    description:
      'Tiny shop famed for fresh xiaolongbao; cash-friendly, expect short queues at lunch.',
    address: '90 Huanghe Road, Huangpu District, Shanghai',
    location_lat: 31.2336,
    location_lng: 121.4717,
    price_range: '¥',
    specialties: ['xiaolongbao', 'crab roe dumplings'],
  },
];

const TRAVEL_TIPS = [
  {
    destination: 'Beijing',
    category: 'ticket',
    title: 'Real-name reservation for major sites',
    content:
      'The Forbidden City, National Museum, and Mutianyu require advance real-name reservation linked to your passport. Book 3-7 days ahead.',
    is_important: true,
  },
  {
    destination: 'Shanghai',
    category: 'transport',
    title: 'Metro is fastest at peak hours',
    content:
      'Shanghai Metro covers all major sights; buy a transit card or use Alipay/WeChat QR. Avoid road taxis 8-9am and 5-7pm.',
    is_important: false,
  },
];

const DESTINATION_ID_MAP = new Map();

function vectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

async function generateEmbedding(text) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embedding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`generate-embedding failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.embedding) || payload.embedding.length !== 768) {
    throw new Error(`embedding dim invalid: ${payload.embedding?.length ?? 'unknown'}`);
  }

  return payload.embedding;
}

async function upsertDestination(item) {
  const { data: existing, error: queryError } = await supabase
    .from('destinations')
    .select('id')
    .eq('name', item.name)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.name} ${item.description} ${item.best_season}`;
  const embedding = vectorLiteral(await generateEmbedding(embeddingText));

  const payload = { ...item, locale: LOCALE, embedding, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('destinations')
      .update(payload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
    DESTINATION_ID_MAP.set(item.name, existing.id);
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('destinations')
    .insert(payload)
    .select('id')
    .single();
  if (insertError) throw insertError;
  DESTINATION_ID_MAP.set(item.name, inserted.id);
}

async function upsertAttraction(item) {
  const destinationId = DESTINATION_ID_MAP.get(item.destination);
  if (!destinationId) throw new Error(`destination not found: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('attractions')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('name', item.name)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.name} ${item.description} ${item.tags.join(' ')}`;
  const payload = {
    destination_id: destinationId,
    name: item.name,
    category: item.category,
    description: item.description,
    address: item.address,
    location_lat: item.location_lat,
    location_lng: item.location_lng,
    ticket_price: item.ticket_price,
    recommended_duration: item.recommended_duration,
    tags: item.tags,
    popularity_score: 0.7,
    locale: LOCALE,
    embedding: vectorLiteral(await generateEmbedding(embeddingText)),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('attractions')
      .update(payload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from('attractions').insert(payload);
  if (insertError) throw insertError;
}

async function upsertRestaurant(item) {
  const destinationId = DESTINATION_ID_MAP.get(item.destination);
  if (!destinationId) throw new Error(`destination not found: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('name', item.name)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.name} ${item.description} ${item.specialties.join(' ')}`;
  const payload = {
    destination_id: destinationId,
    name: item.name,
    cuisine_type: item.cuisine_type,
    description: item.description,
    address: item.address,
    location_lat: item.location_lat,
    location_lng: item.location_lng,
    price_range: item.price_range,
    specialties: item.specialties,
    popularity_score: 0.7,
    locale: LOCALE,
    embedding: vectorLiteral(await generateEmbedding(embeddingText)),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from('restaurants').insert(payload);
  if (insertError) throw insertError;
}

async function upsertTravelTip(item) {
  const destinationId = DESTINATION_ID_MAP.get(item.destination);
  if (!destinationId) throw new Error(`destination not found: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('travel_tips')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('title', item.title)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.title} ${item.content} ${item.category}`;
  const payload = {
    destination_id: destinationId,
    category: item.category,
    title: item.title,
    content: item.content,
    is_important: item.is_important,
    locale: LOCALE,
    embedding: vectorLiteral(await generateEmbedding(embeddingText)),
  };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('travel_tips')
      .update(payload)
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from('travel_tips').insert(payload);
  if (insertError) throw insertError;
}

async function main() {
  console.log('Running EN-locale RAG seed...');
  console.log(`Supabase: ${SUPABASE_URL}`);

  for (const destination of DESTINATIONS) {
    await upsertDestination(destination);
    console.log(`✓ destination(en): ${destination.name}`);
  }

  for (const attraction of ATTRACTIONS) {
    await upsertAttraction(attraction);
    console.log(`✓ attraction(en): ${attraction.destination} / ${attraction.name}`);
  }

  for (const restaurant of RESTAURANTS) {
    await upsertRestaurant(restaurant);
    console.log(`✓ restaurant(en): ${restaurant.destination} / ${restaurant.name}`);
  }

  for (const tip of TRAVEL_TIPS) {
    await upsertTravelTip(tip);
    console.log(`✓ travel_tip(en): ${tip.destination} / ${tip.title}`);
  }

  console.log('EN seed complete.');
}

main().catch((err) => {
  console.error('EN seed failed:', err);
  process.exit(1);
});
