import { createClient } from '@jsr/supabase__supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 将前端“我的行程”相关的 mock 数据写入 Supabase。
 *
 * 运行前请确保已设置：
 * - SUPABASE_SERVICE_ROLE_KEY（必填，用于绕过 RLS）
 * - SUPABASE_URL 或 VITE_SUPABASE_URL（可选，默认使用项目 URL）
 * - SEED_USER_ID（可选，默认使用测试用户）
 *
 * 运行：node scripts/seed-mock-trips.mjs
 */

const DEFAULT_SUPABASE_URL = 'https://ogodnvjaiwelqmjqkvda.supabase.co';
const DEFAULT_USER_ID = '49fb3100-3b1a-4afb-a691-082a63a1eead'; // 来自 TEST_USER_CREDENTIALS.md

const envFromFile = loadEnvFile('.env.local');

const getEnv = (key, fallback = undefined) =>
  process.env[key] ?? envFromFile[key] ?? fallback;

const SUPABASE_URL =
  getEnv('SUPABASE_URL') ||
  getEnv('VITE_SUPABASE_URL') ||
  DEFAULT_SUPABASE_URL;
const SERVICE_ROLE_KEY =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SERVICE_ROLE_KEY');
const TARGET_USER_ID = getEnv('SEED_USER_ID', DEFAULT_USER_ID);
const OVERWRITE = getEnv('SEED_OVERWRITE', 'true') !== 'false';

if (!SERVICE_ROLE_KEY) {
  console.error(
    '❌ 缺少 SUPABASE_SERVICE_ROLE_KEY，无法写入数据。请在环境变量或 .env.local 中配置。',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const IDS = {
  restDishoom: '11111111-1111-4111-8111-111111111112',
  restRamsay: '11111111-1111-4111-8111-111111111113',
  attrBritish: '22222222-2222-4222-8222-222222222221',
  attrBuckingham: '22222222-2222-4222-8222-222222222222',
  attrLondonTower: '22222222-2222-4222-8222-222222222223',
  routeHeathrow: '33333333-3333-4333-8333-333333333331',
};

// POI 详情数据（与前端卡片保持一致）
const restaurants = [
  {
    id: IDS.restDishoom,
    name: 'Dishoom 餐厅',
    name_en: 'Dishoom',
    cuisine_type: '印度风味料理',
    price_range: '£20-30',
    address: "12 Upper St Martin's Lane, London WC2H 9FB",
    opening_hours: { general: '周一至周日 8:00-23:00' },
    menu_image_url:
      'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMGJvYXJkfGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    location_lat: 51.5123,
    location_lng: -0.124,
  },
  {
    id: IDS.restRamsay,
    name: 'Gordon Ramsay 牛排馆',
    name_en: 'Gordon Ramsay Bar & Grill',
    cuisine_type: '英式牛排',
    price_range: '£50-80',
    address: '10-11 Heddon St, London W1B 4BX',
    opening_hours: { general: '周一至周日 12:00-22:30' },
    menu_image_url:
      'https://images.unsplash.com/photo-1743811929027-f6864cc6fe1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwbWVudSUyMGJvYXJkfGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    location_lat: 51.509,
    location_lng: -0.139,
  },
];

const restaurantDishes = [
  {
    restaurant_id: IDS.restDishoom,
    name: '黑达尔咖喱',
    name_en: 'Black Daal',
    description: '慢煮24小时的黑扁豆，香浓顺滑',
    image_url:
      'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    allergens: ['乳制品', '黄油'],
    order_index: 0,
  },
  {
    restaurant_id: IDS.restDishoom,
    name: '羊肉卷饼',
    name_en: 'Lamb Raan Roll',
    description: '慢烤羊腿肉配新鲜薄饼',
    image_url:
      'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    allergens: ['面筋', '芝麻'],
    order_index: 1,
  },
  {
    restaurant_id: IDS.restDishoom,
    name: '印度奶茶',
    name_en: 'Masala Chai',
    description: '传统香料奶茶',
    image_url:
      'https://images.unsplash.com/photo-1567337710282-00832b415979?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBmb29kJTIwY3Vycnl8ZW58MXx8fHwxNzY0ODc2MDIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    allergens: ['乳制品'],
    order_index: 2,
  },
  {
    restaurant_id: IDS.restRamsay,
    name: '战斧牛排',
    name_en: 'Tomahawk Steak',
    description: '1.2kg 战斧牛排，适合2-3人分享',
    image_url:
      'https://images.unsplash.com/photo-1695924274007-82018762e6bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwc3RlYWslMjByZXN0YXVyYW50fGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    allergens: [],
    order_index: 0,
  },
  {
    restaurant_id: IDS.restRamsay,
    name: '惠灵顿牛排',
    name_en: 'Beef Wellington',
    description: '招牌酥皮包裹嫩牛肉',
    image_url:
      'https://images.unsplash.com/photo-1695924274007-82018762e6bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwc3RlYWslMjByZXN0YXVyYW50fGVufDF8fHx8MTc2NDk1MjE0N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    allergens: ['面筋', '鸡蛋'],
    order_index: 1,
  },
];

const attractions = [
  {
    id: IDS.attrBritish,
    name: '大英博物馆',
    name_en: 'The British Museum',
    address: 'Great Russell St, London WC1B 3DG',
    opening_hours: '每天 10:00-17:30（周五至20:30）',
    ticket_price: '免费入场（特展需另购票）',
    description:
      '世界上历史最悠久、规模最宏伟的综合性博物馆之一，收藏800万件文物。',
    highlights: [
      '罗塞塔石碑',
      '埃及馆木乃伊',
      '帕特农神庙雕塑',
      '中国馆文物',
      '中央大厅玻璃顶',
    ],
    tips: [
      '预留3-4小时',
      '下载馆内地图',
      '可租中文讲解器',
      '周五晚上人少',
      '纪念品店值得逛',
    ],
    gallery_urls: [
      'https://images.unsplash.com/photo-1550573307-52b75c9b046e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicml0aXNoJTIwbXVzZXVtJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg4NDcxM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    ],
    estimated_duration: '3-4小时',
    location_lat: 51.5194,
    location_lng: -0.127,
  },
  {
    id: IDS.attrBuckingham,
    name: '白金汉宫',
    name_en: 'Buckingham Palace',
    address: 'Westminster, London SW1A 1AA',
    opening_hours: '夏季（7-9月）09:30-19:30',
    ticket_price: '£30（成人），£16.50（儿童）',
    description: '英国君主的办公地点和伦敦住所，世界著名宫殿。',
    highlights: [
      '卫兵换岗仪式',
      '国事厅夏季开放',
      '皇家花园',
      '维多利亚女王纪念碑',
      '皇家马厩',
    ],
    tips: [
      '换岗提前45分钟占位',
      '内部参观需提前购票',
      '宫内禁拍，花园可拍照',
      '穿舒适的鞋',
      '圣詹姆斯公园拍照佳',
    ],
    gallery_urls: [
      'https://images.unsplash.com/photo-1647876761705-d0961f5aab21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWNraW5naGFtJTIwcGFsYWNlJTIwbG9uZG9ufGVufDF8fHx8MTc2NDg3MTEyNXww&ixlib=rb-4.1.0&q=80&w=1080',
    ],
    estimated_duration: '2-3小时',
    location_lat: 51.5014,
    location_lng: -0.1419,
  },
  {
    id: IDS.attrLondonTower,
    name: '伦敦塔',
    name_en: 'Tower of London',
    address: 'Tower of London, EC3N 4AB',
    opening_hours: '09:00-17:30',
    ticket_price: '£33.60',
    description: '千年古堡，收藏皇冠珠宝。',
    highlights: [
      '皇冠珠宝',
      '城墙与塔楼',
      '御林军讲解',
      '泰晤士河景观',
    ],
    tips: [
      '提前购票',
      '穿舒适鞋子',
      '建议跟随导览',
    ],
    gallery_urls: [
      'https://images.unsplash.com/photo-1565967526567-97ea2e48f7c7?w=800',
    ],
    estimated_duration: '2-3小时',
    location_lat: 51.5081,
    location_lng: -0.0759,
  },
];

const transportRoutes = [
  {
    id: IDS.routeHeathrow,
    from_location: '希思罗机场',
    to_location: '伦敦市中心',
    mode: 'subway',
    line_name: 'Piccadilly Line',
    stations: [
      'Heathrow Terminal 5',
      'Heathrow Terminal 4',
      'Hatton Cross',
      'Hounslow West',
      'Osterley',
      'Boston Manor',
      'Northfields',
      'South Ealing',
      'Acton Town',
      'Hammersmith',
      'Barons Court',
      "Earl's Court",
      'Gloucester Road',
      'South Kensington',
      'Knightsbridge',
      'Hyde Park Corner',
      'Green Park',
      'Piccadilly Circus',
      'Leicester Square',
      'Covent Garden',
      'Holborn',
      'Russell Square',
      "King's Cross St Pancras",
    ],
    duration: '约50分钟',
    price_info: '£5.50 (非高峰期) / £6.60 (高峰期)',
    ticket_guide: [
      '在地铁站售票机购买Oyster卡或单程票',
      '可使用无接触银行卡直接刷卡进站',
      '购买Day Travelcard可全天无限次搭乘',
    ],
    alipay_guide: [
      '打开支付宝APP搜索“伦敦交通”',
      '点击“乘车码”生成二维码',
      '出站再次扫码自动扣款',
      '首次使用需绑定支付方式',
    ],
    payment_methods: ['现金', '信用卡', '支付宝', '微信支付', 'Apple Pay'],
    apps: [
      {
        name: 'Uber',
        description: '国际打车软件，支持支付宝',
        supportsAlipay: true,
      },
      {
        name: '高德地图（国际版）',
        description: '中文界面友好，直接支持支付宝付款',
        supportsAlipay: true,
      },
      {
        name: 'Bolt',
        description: '欧洲流行打车软件',
        supportsAlipay: false,
      },
    ],
  },
];

// 与前端 MyTripsPage / TripDetailPage 保持一致的 mock 数据
const trips = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    destination: '伦敦 · 爱丁堡',
    start_date: '2024-10-01',
    end_date: '2024-10-07',
    budget: '£3,500',
    image_url:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb25kb24lMjBjaXR5c2NhcGV8ZW58MXx8fHwxNzYwODAzNDU4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    status: 'upcoming',
    source: 'manual',
    ai_prompt: null,
    itineraries: [
      {
        day_number: 1,
        date: '10月1日 周二',
        theme: '抵达伦敦 · 市中心初探',
        activities: [
          {
            time: '09:00',
            type: 'transport',
            name: '希思罗机场 → 酒店',
            description: '乘坐希思罗快线，约15分钟',
            duration: '15分钟',
            price: '£25',
            transport_route_id: IDS.routeHeathrow,
            order_index: 0,
          },
          {
            time: '12:00',
            type: 'meal',
            name: 'Dishoom 午餐',
            description: '印度风味餐厅，招牌菜：黄油鸡',
            duration: '1小时',
            price: '£20-30',
            restaurant_id: IDS.restDishoom,
            image_url:
              'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
            address: 'Covent Garden',
            location_lat: 51.5123,
            location_lng: -0.124,
            order_index: 1,
          },
          {
            time: '14:00',
            type: 'attraction',
            name: '大英博物馆',
            description: '世界四大博物馆之一，免费参观',
            duration: '3小时',
            price: '免费',
            attraction_id: IDS.attrBritish,
            image_url:
              'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400',
            address: 'Great Russell St, London WC1B 3DG',
            location_lat: 51.5194,
            location_lng: -0.127,
            order_index: 2,
          },
          {
            time: '18:30',
            type: 'meal',
            name: 'The Ivy Market Grill',
            description: '英式传统晚餐，环境优雅',
            duration: '2小时',
            price: '£40-60',
            image_url:
              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
            address: 'Covent Garden',
            order_index: 3,
          },
        ],
      },
      {
        day_number: 2,
        date: '10月2日 周三',
        theme: '皇家伦敦 · 历史巡礼',
        activities: [
          {
            time: '08:30',
            type: 'meal',
            name: '酒店早餐',
            description: '全英式早餐',
            duration: '45分钟',
            price: '包含',
            order_index: 0,
          },
          {
            time: '10:00',
            type: 'attraction',
            name: '白金汉宫',
            description: '观看换岗仪式（11:00开始）',
            duration: '2小时',
            price: '免费观看',
            attraction_id: IDS.attrBuckingham,
            image_url:
              'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400',
            address: 'London SW1A 1AA',
            location_lat: 51.5014,
            location_lng: -0.1419,
            order_index: 1,
          },
          {
            time: '12:30',
            type: 'meal',
            name: 'Sketch 午餐',
            description: '网红粉红餐厅，记得拍照打卡',
            duration: '1.5小时',
            price: '£35-50',
            image_url:
              'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400',
            address: '9 Conduit St, London W1S 2XG',
            location_lat: 51.5129,
            location_lng: -0.141,
            order_index: 2,
          },
          {
            time: '15:00',
            type: 'attraction',
            name: '伦敦塔',
            description: '千年古堡，皇冠珠宝收藏',
            duration: '2.5小时',
            price: '£33.60',
            attraction_id: IDS.attrLondonTower,
            image_url:
              'https://images.unsplash.com/photo-1565967526567-97ea2e48f7c7?w=400',
            address: 'Tower of London, EC3N 4AB',
            location_lat: 51.5081,
            location_lng: -0.0759,
            order_index: 3,
          },
          {
            time: '19:00',
            type: 'meal',
            name: 'Duck & Waffle',
            description: '顶楼餐厅，俯瞰伦敦夜景',
            duration: '2小时',
            price: '£45-70',
            image_url:
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
            address: '110 Bishopsgate, London EC2N 4AY',
            location_lat: 51.5154,
            location_lng: -0.0813,
            order_index: 4,
          },
        ],
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    destination: '北京办事处探店',
    start_date: '2024-11-15',
    end_date: '2024-11-17',
    budget: '¥2000',
    image_url:
      'https://images.unsplash.com/photo-1677818911820-7111f3292f9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWlqaW5nJTIwY2l0eXxlbnwxfHx8fDE3NjA4MDM0NjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    status: 'planning',
    source: 'manual',
    ai_prompt: null,
    itineraries: [
      {
        day_number: 1,
        date: '11月15日 周五',
        theme: '抵达北京 · 探店热身',
        activities: [
          {
            time: '10:00',
            type: 'transport',
            name: '首都机场 → 三里屯酒店',
            description: '机场快轨 + 地铁，约50分钟',
            duration: '50分钟',
            price: '¥35',
            order_index: 0,
          },
          {
            time: '12:30',
            type: 'meal',
            name: '三里屯太古里午餐',
            description: '川菜 + 精酿，小聚热身',
            duration: '1.5小时',
            price: '¥120/人',
            address: '三里屯太古里南区',
            order_index: 1,
          },
          {
            time: '15:00',
            type: 'attraction',
            name: '三里屯逛街拍照',
            description: '买咖啡、浏览买手店，踩点探店',
            duration: '2小时',
            price: '免费',
            address: '三里屯太古里',
            order_index: 2,
          },
        ],
      },
      {
        day_number: 2,
        date: '11月16日 周六',
        theme: '探店与会面日',
        activities: [
          {
            time: '09:30',
            type: 'meal',
            name: 'SOE Coffee 早餐',
            description: '冰滴 + 咸奶油可颂',
            duration: '1小时',
            price: '¥68',
            address: '朝阳 SOHO',
            order_index: 0,
          },
          {
            time: '11:00',
            type: 'attraction',
            name: '今日美术馆',
            description: '看看当期展览，采风拍照',
            duration: '2小时',
            price: '¥80',
            address: '百子湾路32号',
            location_lat: 39.8996,
            location_lng: 116.4881,
            order_index: 1,
          },
          {
            time: '14:00',
            type: 'meal',
            name: '京A Taproom 午餐',
            description: '精酿 + 汉堡补给体力',
            duration: '1.5小时',
            price: '¥150/人',
            address: '亮马桥店',
            order_index: 2,
          },
          {
            time: '17:30',
            type: 'attraction',
            name: '国贸 CBD 会面',
            description: '拜访客户 + 资料交接',
            duration: '2小时',
            price: '—',
            address: '国贸三期',
            location_lat: 39.9087,
            location_lng: 116.4607,
            order_index: 3,
          },
        ],
      },
      {
        day_number: 3,
        date: '11月17日 周日',
        theme: '返程与补货',
        activities: [
          {
            time: '10:00',
            type: 'meal',
            name: '局气早午餐',
            description: '北京味儿早午餐，结尾收尾',
            duration: '1.5小时',
            price: '¥120/人',
            address: '工体店',
            order_index: 0,
          },
          {
            time: '13:00',
            type: 'attraction',
            name: '三里屯最后补货',
            description: '买伴手礼、取定制周边',
            duration: '1小时',
            price: '视购买情况',
            address: '三里屯太古里北区',
            order_index: 1,
          },
          {
            time: '16:00',
            type: 'transport',
            name: '酒店 → 首都机场',
            description: '滴滴快车/地铁，根据路况选择',
            duration: '1小时',
            price: '¥80-120',
            order_index: 2,
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log('🌐 Supabase URL:', SUPABASE_URL);
  console.log('👤 目标用户:', TARGET_USER_ID);
  console.log(`🧹 Overwrite existing mock trips: ${OVERWRITE}`);

  await ensureUser();
  await seedPoiDetails();

  for (const trip of trips) {
    await seedTrip(trip);
  }

  console.log('\n✅ 所有 mock 行程写入完成');
  process.exit(0);
}

async function ensureUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name')
    .eq('id', TARGET_USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`无法验证用户：${error.message}`);
  }

  if (!data) {
    throw new Error(
      `未找到用户 ${TARGET_USER_ID}，请先运行 scripts/create-test-user.ts 或在 SEED_USER_ID 中指定现有用户。`,
    );
  }

  console.log(
    `🔐 将把数据写入用户 ${data.display_name || data.username || data.id}`,
  );
}

async function seedPoiDetails() {
  console.log('\n→ 写入 POI 详情数据（餐厅/景点/交通）');

  if (OVERWRITE) {
    await supabase.from('restaurant_dishes').delete().in('restaurant_id', restaurants.map((r) => r.id));
    await supabase.from('restaurants').delete().in('id', restaurants.map((r) => r.id));
    await supabase.from('attractions').delete().in('id', attractions.map((a) => a.id));
    await supabase.from('transport_routes').delete().in('id', transportRoutes.map((t) => t.id));
  }

  const insertOrUpsert = async (table, rows) => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows);
    if (error) {
      throw new Error(`写入 ${table} 失败：${error.message}`);
    }
  };

  await insertOrUpsert('restaurants', restaurants);
  await insertOrUpsert('restaurant_dishes', restaurantDishes);
  await insertOrUpsert('attractions', attractions);
  await insertOrUpsert('transport_routes', transportRoutes);

  console.log(
    `   ✓ 餐厅 ${restaurants.length} 条，招牌菜 ${restaurantDishes.length} 条，景点 ${attractions.length} 条，交通路线 ${transportRoutes.length} 条`,
  );
}

async function seedTrip(trip) {
  console.log(`\n→ 写入行程：${trip.destination}`);

  if (OVERWRITE) {
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id);
    if (deleteError) {
      console.error('   ⚠️  清理旧数据失败（可忽略，如果不存在）：', deleteError.message);
    }
  } else {
    const { data: existing, error: existingError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', trip.id)
      .maybeSingle();
    if (existingError) {
      throw new Error(`检查行程是否存在失败：${existingError.message}`);
    }
    if (existing) {
      console.log('   ↩️  已存在，跳过（设置 SEED_OVERWRITE=false 可保持数据）');
      return;
    }
  }

  const { data: insertedTrip, error: tripError } = await supabase
    .from('trips')
    .insert({
      id: trip.id,
      user_id: TARGET_USER_ID,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget: trip.budget,
      image_url: trip.image_url,
      status: trip.status,
      source: trip.source || 'manual',
      ai_prompt: trip.ai_prompt,
    })
    .select()
    .single();

  if (tripError) {
    throw new Error(`写入行程失败：${tripError.message}`);
  }

  let activitiesCount = 0;

  for (const itinerary of trip.itineraries) {
    const { data: insertedItinerary, error: itineraryError } = await supabase
      .from('trip_itineraries')
      .insert({
        trip_id: insertedTrip.id,
        day_number: itinerary.day_number,
        date: itinerary.date,
        theme: itinerary.theme,
      })
      .select()
      .single();

    if (itineraryError) {
      throw new Error(`写入每日行程失败：${itineraryError.message}`);
    }

    if (itinerary.activities?.length) {
      const payload = itinerary.activities.map((activity, index) => ({
        itinerary_id: insertedItinerary.id,
        time: activity.time,
        type: activity.type,
        name: activity.name,
        description: activity.description,
        duration: activity.duration,
        price: activity.price,
        image_url: activity.image_url,
        address: activity.address,
        location_lat: activity.location_lat,
        location_lng: activity.location_lng,
        restaurant_id: activity.restaurant_id,
        attraction_id: activity.attraction_id,
        transport_route_id: activity.transport_route_id,
        order_index:
          activity.order_index !== undefined ? activity.order_index : index,
      }));

      const { error: activitiesError } = await supabase
        .from('activities')
        .insert(payload);

      if (activitiesError) {
        throw new Error(`写入活动失败：${activitiesError.message}`);
      }

      activitiesCount += payload.length;
    }
  }

  console.log(
    `   ✓ 已写入 ${trip.itineraries.length} 天行程，共 ${activitiesCount} 个活动`,
  );
}

function loadEnvFile(filename) {
  const fullPath = resolve(process.cwd(), filename);
  if (!existsSync(fullPath)) return {};

  const lines = readFileSync(fullPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const entries = lines
    .map((line) => {
      const idx = line.indexOf('=');
      if (idx === -1) return null;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      return [key, value];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
}

main().catch((err) => {
  console.error('\n❌ 数据写入失败:', err.message);
  process.exit(1);
});
