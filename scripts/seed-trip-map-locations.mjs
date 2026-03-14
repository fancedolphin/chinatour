import { createClient } from '@jsr/supabase__supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_SUPABASE_URL = 'https://ogodnvjaiwelqmjqkvda.supabase.co';
const DEFAULT_TRIP_ID = '22222222-2222-4222-8222-222222222222';

const loadEnvFile = (filename) => {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) {
    return {};
  }

  return readFileSync(filepath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith('#'))
    .reduce((acc, line) => {
      const index = line.indexOf('=');
      if (index === -1) {
        return acc;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
};

const envFromFile = loadEnvFile('.env.local');
const getEnv = (key, fallback = undefined) => process.env[key] ?? envFromFile[key] ?? fallback;

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');
const TRIP_ID = getEnv('TRIP_MAP_TRIP_ID', DEFAULT_TRIP_ID);

if (!SERVICE_ROLE_KEY) {
  console.error('缺少 SUPABASE_SERVICE_ROLE_KEY，无法执行地图 seed。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const LOCATIONS = [
  {
    id: '10c00000-0000-4000-8000-000000000001',
    trip_id: TRIP_ID,
    name: '宫宴',
    city: '北京',
    district: '西城区',
    address: '北京市西城区大栅栏西街11号',
    lat: 39.89462,
    lng: 116.38967,
    type: 'restaurant',
    order_index: 0,
  },
  {
    id: '10c00000-0000-4000-8000-000000000002',
    trip_id: TRIP_ID,
    name: '故宫博物院',
    city: '北京',
    district: '东城区',
    address: '北京市东城区景山前街4号',
    lat: 39.91634,
    lng: 116.39716,
    type: 'attraction',
    order_index: 1,
  },
  {
    id: '10c00000-0000-4000-8000-000000000003',
    trip_id: TRIP_ID,
    name: '亮马河国际风情水岸',
    city: '北京',
    district: '朝阳区',
    address: '北京市朝阳区亮马桥路',
    lat: 39.94983,
    lng: 116.46144,
    type: 'attraction',
    order_index: 2,
  },
  {
    id: '10c00000-0000-4000-8000-000000000004',
    trip_id: TRIP_ID,
    name: '五大道',
    city: '天津',
    district: '和平区',
    address: '天津市和平区重庆道83号附近',
    lat: 39.11294,
    lng: 117.19592,
    type: 'attraction',
    order_index: 3,
  },
  {
    id: '10c00000-0000-4000-8000-000000000005',
    trip_id: TRIP_ID,
    name: '天津之眼',
    city: '天津',
    district: '河北区',
    address: '天津市河北区三岔河口永乐桥上',
    lat: 39.15177,
    lng: 117.17964,
    type: 'attraction',
    order_index: 4,
  },
  {
    id: '10c00000-0000-4000-8000-000000000006',
    trip_id: TRIP_ID,
    name: '三河古镇',
    city: '廊坊',
    district: '三河市',
    address: '河北省廊坊市三河市泃阳西大街附近',
    lat: 39.98222,
    lng: 117.07887,
    type: 'attraction',
    order_index: 5,
  },
  {
    id: '10c00000-0000-4000-8000-000000000007',
    trip_id: TRIP_ID,
    name: '只有红楼梦·戏剧幻城',
    city: '廊坊',
    district: '固安县',
    address: '河北省廊坊市固安县文创园路',
    lat: 39.43885,
    lng: 116.28631,
    type: 'attraction',
    order_index: 6,
  },
];

const ARTICLES = [
  {
    id: 'a7c10000-0000-4000-8000-000000000001',
    location_id: LOCATIONS[0].id,
    title: '宫宴值不值得排队？北京沉浸式宫廷菜体验',
    cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    author_name: '探店研究所',
    likes: 3821,
    url: 'https://www.xiaohongshu.com/explore/gongyan-beijing-1',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000002',
    location_id: LOCATIONS[0].id,
    title: '北京请客吃饭天花板，宫宴包间实拍',
    cover: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    author_name: '北平味道',
    likes: 2188,
    url: 'https://www.xiaohongshu.com/explore/gongyan-beijing-2',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000003',
    location_id: LOCATIONS[1].id,
    title: '故宫半日逛法，避开人群的 3 条动线',
    cover: 'https://images.unsplash.com/photo-1547981609-4b6bf67dbad2?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    author_name: '古建爱好者',
    likes: 5891,
    url: 'https://www.xiaohongshu.com/explore/forbidden-city-route',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000004',
    location_id: LOCATIONS[1].id,
    title: '故宫拍照机位合集，红墙真的太出片了',
    cover: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    author_name: '京城漫游',
    likes: 4360,
    url: 'https://www.xiaohongshu.com/explore/forbidden-city-photo',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000005',
    location_id: LOCATIONS[2].id,
    title: '亮马河夜游实录，北京夜景散步首选',
    cover: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    author_name: 'CityWalk 观察员',
    likes: 1655,
    url: 'https://www.xiaohongshu.com/explore/liangma-river-night',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000006',
    location_id: LOCATIONS[3].id,
    title: '天津五大道一日散步地图，咖啡馆和洋楼都安排了',
    cover: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    author_name: '津门慢游',
    likes: 2214,
    url: 'https://www.xiaohongshu.com/explore/tianjin-wudadao',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000007',
    location_id: LOCATIONS[4].id,
    title: '天津之眼值不值得坐？排队时间和拍照点位',
    cover: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    author_name: '摩天轮记录册',
    likes: 1940,
    url: 'https://www.xiaohongshu.com/explore/tianjin-eye-review',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000008',
    location_id: LOCATIONS[6].id,
    title: '只有红楼梦戏剧幻城怎么逛，一篇看懂演出动线',
    cover: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1541534401786-2077eed87a72?w=400',
    author_name: '剧场地图',
    likes: 3077,
    url: 'https://www.xiaohongshu.com/explore/red-mansion-city-guide',
  },
  {
    id: 'a7c10000-0000-4000-8000-000000000009',
    location_id: LOCATIONS[6].id,
    title: '红楼梦幻城拍照攻略，沉浸式空间太震撼',
    cover: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
    author_name: '看展上瘾',
    likes: 2689,
    url: 'https://www.xiaohongshu.com/explore/red-mansion-city-photo',
  },
];

const VIDEOS = [
  {
    id: 'b1d00000-0000-4000-8000-000000000001',
    location_id: LOCATIONS[0].id,
    thumbnail: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400',
    author_name: '北京吃喝小分队',
    date: '2026-03-10',
    platform: 'douyin',
    title: '宫宴晚餐全流程实拍',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000002',
    location_id: LOCATIONS[0].id,
    thumbnail: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    author_name: '请客指南',
    date: '2026-03-11',
    platform: 'xiaohongshu',
    title: '宫宴包厢和菜品全记录',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000003',
    location_id: LOCATIONS[1].id,
    thumbnail: 'https://images.unsplash.com/photo-1547981609-4b6bf67dbad2?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    author_name: '故宫散步中',
    date: '2026-03-08',
    platform: 'douyin',
    title: '故宫 3 小时极限路线',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000004',
    location_id: LOCATIONS[2].id,
    thumbnail: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    author_name: '夜游城市',
    date: '2026-03-07',
    platform: 'douyin',
    title: '亮马河夜游船和步道怎么选',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000005',
    location_id: LOCATIONS[3].id,
    thumbnail: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    author_name: '津门慢镜头',
    date: '2026-03-06',
    platform: 'xiaohongshu',
    title: '五大道最值得逛的 5 栋小洋楼',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000006',
    location_id: LOCATIONS[4].id,
    thumbnail: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    author_name: '天津旅游局外人',
    date: '2026-03-05',
    platform: 'douyin',
    title: '天津之眼最佳上桥时间',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000007',
    location_id: LOCATIONS[5].id,
    thumbnail: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    author_name: '环京周末档',
    date: '2026-03-04',
    platform: 'douyin',
    title: '三河古镇半天怎么走最顺',
  },
  {
    id: 'b1d00000-0000-4000-8000-000000000008',
    location_id: LOCATIONS[6].id,
    thumbnail: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
    author_avatar: 'https://images.unsplash.com/photo-1542204625-de293a2f8ff0?w=400',
    author_name: '戏剧迷在路上',
    date: '2026-03-03',
    platform: 'xiaohongshu',
    title: '只有红楼梦一刷和二刷差别',
  },
];

const seed = async () => {
  const { error: locationError } = await supabase
    .from('trip_map_locations')
    .upsert(LOCATIONS, { onConflict: 'id' });

  if (locationError) {
    throw locationError;
  }

  const locationIds = LOCATIONS.map((location) => location.id);

  await supabase.from('location_articles').delete().in('location_id', locationIds);
  await supabase.from('location_videos').delete().in('location_id', locationIds);

  const { error: articleError } = await supabase.from('location_articles').insert(ARTICLES);
  if (articleError) {
    throw articleError;
  }

  const { error: videoError } = await supabase.from('location_videos').insert(VIDEOS);
  if (videoError) {
    throw videoError;
  }

  console.log('trip_map_locations:', LOCATIONS.length);
  console.log('location_articles:', ARTICLES.length);
  console.log('location_videos:', VIDEOS.length);
};

seed().catch((error) => {
  console.error('地图 seed 失败:', error);
  process.exit(1);
});
