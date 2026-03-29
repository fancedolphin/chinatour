import { createClient } from '@jsr/supabase__supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ogodnvjaiwelqmjqkvda.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('缺少 SUPABASE_SERVICE_ROLE_KEY，无法执行 RAG MVP seed。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DESTINATIONS = [
  {
    name: '北京',
    country: '中国',
    description: '中国首都，历史文化遗产密集，适合首访中国的国际游客。',
    best_season: '春秋',
    average_budget_daily: '800-1500 CNY',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
  {
    name: '上海',
    country: '中国',
    description: '现代都市与历史街区并存，餐饮和城市夜景丰富。',
    best_season: '春秋',
    average_budget_daily: '900-1800 CNY',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
];

const ATTRACTIONS = [
  {
    destination: '北京',
    name: '故宫博物院',
    category: '历史文化',
    description: '明清皇宫，建议提前实名预约并预留半天以上游览。',
    address: '北京市东城区景山前街4号',
    location_lat: 39.916345,
    location_lng: 116.397155,
    ticket_price: '旺季60元',
    recommended_duration: '4-6小时',
    tags: ['历史', '宫殿', '预约'],
  },
  {
    destination: '北京',
    name: '八达岭长城',
    category: '自然人文',
    description: '长城经典段落，建议早出发避开高峰并关注缆车开放时间。',
    address: '北京市延庆区军都山关沟古道北口',
    location_lat: 40.356523,
    location_lng: 116.017436,
    ticket_price: '40元起',
    recommended_duration: '3-5小时',
    tags: ['户外', '世界遗产'],
  },
  {
    destination: '上海',
    name: '外滩',
    category: '城市地标',
    description: '黄浦江沿线经典步行区域，适合夜景拍照。',
    address: '上海市黄浦区中山东一路',
    location_lat: 31.240011,
    location_lng: 121.490317,
    ticket_price: '免费',
    recommended_duration: '1-2小时',
    tags: ['夜景', '城市漫步'],
  },
  {
    destination: '上海',
    name: '上海博物馆（人民广场馆）',
    category: '博物馆',
    description: '综合性博物馆，展品丰富，建议提前预约时段。',
    address: '上海市黄浦区人民大道201号',
    location_lat: 31.230391,
    location_lng: 121.473701,
    ticket_price: '免费（需预约）',
    recommended_duration: '2-3小时',
    tags: ['室内', '文化', '预约'],
  },
];

const RESTAURANTS = [
  {
    destination: '北京',
    name: '全聚德（和平门店）',
    cuisine_type: '京菜',
    description: '经典北京烤鸭门店，适合首次体验京味。',
    address: '北京市西城区前门西大街14号',
    location_lat: 39.901864,
    location_lng: 116.380307,
    price_range: '200-400元/人',
    specialties: ['北京烤鸭', '芥末鸭掌'],
  },
  {
    destination: '北京',
    name: '护国寺小吃总店',
    cuisine_type: '北京小吃',
    description: '本地小吃集合，出餐快，适合午间。',
    address: '北京市西城区护国寺大街93号',
    location_lat: 39.929311,
    location_lng: 116.373497,
    price_range: '40-80元/人',
    specialties: ['豆汁', '艾窝窝', '面茶'],
  },
  {
    destination: '上海',
    name: '绿波廊',
    cuisine_type: '本帮菜',
    description: '豫园附近老字号，主打传统上海风味。',
    address: '上海市黄浦区豫园路115号',
    location_lat: 31.227137,
    location_lng: 121.492449,
    price_range: '120-250元/人',
    specialties: ['八宝鸭', '红烧肉'],
  },
  {
    destination: '上海',
    name: '南翔馒头店（豫园店）',
    cuisine_type: '点心',
    description: '小笼包代表门店，排队高峰明显。',
    address: '上海市黄浦区豫园路85号',
    location_lat: 31.227339,
    location_lng: 121.492829,
    price_range: '35-80元/人',
    specialties: ['蟹粉小笼', '鲜肉小笼'],
  },
];

const TRAVEL_TIPS = [
  {
    destination: '北京',
    category: 'booking',
    title: '故宫预约',
    content: '故宫需提前实名预约，旺季建议至少提前3天。',
    is_important: true,
  },
  {
    destination: '北京',
    category: 'booking',
    title: '长城交通',
    content: '八达岭建议早班车出发，返程高峰需预留排队时间。',
    is_important: true,
  },
  {
    destination: '上海',
    category: 'booking',
    title: '博物馆时段预约',
    content: '热门馆需预约入场时段，周末和节假日名额紧张。',
    is_important: true,
  },
  {
    destination: '上海',
    category: 'ticket',
    title: '夜景游船购票',
    content: '黄浦江游船建议提前线上购票，现场可能售罄。',
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
    throw new Error(`generate-embedding 调用失败: ${response.status} ${details}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.embedding) || payload.embedding.length !== 768) {
    throw new Error(`embedding 维度异常: ${payload.embedding?.length ?? 'unknown'}`);
  }

  return payload.embedding;
}

async function upsertDestination(item) {
  const { data: existing, error: queryError } = await supabase
    .from('destinations')
    .select('id')
    .eq('name', item.name)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.name} ${item.description} ${item.best_season}`;
  const embedding = vectorLiteral(await generateEmbedding(embeddingText));

  const payload = { ...item, embedding, updated_at: new Date().toISOString() };

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
  if (!destinationId) throw new Error(`destination 不存在: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('attractions')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('name', item.name)
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
  if (!destinationId) throw new Error(`destination 不存在: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('name', item.name)
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
  if (!destinationId) throw new Error(`destination 不存在: ${item.destination}`);

  const { data: existing, error: queryError } = await supabase
    .from('travel_tips')
    .select('id')
    .eq('destination_id', destinationId)
    .eq('title', item.title)
    .maybeSingle();
  if (queryError) throw queryError;

  const embeddingText = `${item.title} ${item.content} ${item.category}`;
  const payload = {
    destination_id: destinationId,
    category: item.category,
    title: item.title,
    content: item.content,
    is_important: item.is_important,
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
  console.log('开始执行 RAG MVP seed...');
  console.log(`Supabase: ${SUPABASE_URL}`);

  for (const destination of DESTINATIONS) {
    await upsertDestination(destination);
    console.log(`✓ destination: ${destination.name}`);
  }

  for (const attraction of ATTRACTIONS) {
    await upsertAttraction(attraction);
    console.log(`✓ attraction: ${attraction.destination} / ${attraction.name}`);
  }

  for (const restaurant of RESTAURANTS) {
    await upsertRestaurant(restaurant);
    console.log(`✓ restaurant: ${restaurant.destination} / ${restaurant.name}`);
  }

  for (const tip of TRAVEL_TIPS) {
    await upsertTravelTip(tip);
    console.log(`✓ travel_tip: ${tip.destination} / ${tip.title}`);
  }

  console.log('RAG MVP seed 完成。');
}

main().catch((error) => {
  console.error('RAG MVP seed 失败:', error.message || error);
  process.exit(1);
});
