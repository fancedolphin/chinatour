import type {
  BookingTip,
  GroupType,
  PlaceCandidate,
  SlotResult,
  TravelStyle,
} from '../services/planning/dataContracts';

export interface PlanningEvaluationCase {
  id: string;
  prompt: string;
  scenario: string;
  expectedIntent: {
    destination: string;
    durationDays: number;
    travelStyle: TravelStyle;
    includeIndustrial?: boolean;
    cuisinePreference?: string;
    groupType?: GroupType;
    travelMonth?: number;
  };
  slots: {
    core_attractions: SlotResult;
    food: SlotResult;
  };
  bookingTips: BookingTip[];
  expectedCoreAttractions: string[];
  expectedFoods: string[];
  expectCanGenerate: boolean;
}

type CityFixture = {
  attractions: PlaceCandidate[];
  food: PlaceCandidate[];
};

function attraction(
  id: string,
  name: string,
  description: string,
  indoorOutdoor: 'indoor' | 'outdoor' | 'both',
): PlaceCandidate {
  return {
    id,
    name,
    description,
    slot: 'core_attractions',
    source: 'rag',
    confidence: 0.9,
    indoorOutdoor,
  };
}

function restaurant(id: string, name: string, description: string): PlaceCandidate {
  return {
    id,
    name,
    description,
    slot: 'food',
    source: 'rag',
    confidence: 0.86,
  };
}

function slot(items: PlaceCandidate[]): SlotResult {
  return {
    items,
    satisfied: items.length >= 2,
  };
}

function pick(items: PlaceCandidate[], names: string[]): PlaceCandidate[] {
  return items.filter((item) => names.includes(item.name));
}

function bookingTip(id: string, title: string, content: string): BookingTip {
  return { id, title, content };
}

function point(lat: number, lng: number) {
  return { lat, lng };
}

const cityFixtures: Record<string, CityFixture> = {
  北京: {
    attractions: [
      attraction('bj-1', '故宫博物院', '皇家宫殿与中轴线核心景点，建议预留半天。', 'both'),
      attraction('bj-2', '天坛公园', '适合历史文化与城市步行结合。', 'outdoor'),
      attraction('bj-3', '中国考古博物馆', '适合雨天与深度历史主题。', 'indoor'),
      attraction('bj-4', '三元牛奶工厂', '工业主题参观与品牌体验。', 'both'),
    ],
    food: [
      restaurant('bj-f1', '四季民福烤鸭店', '烤鸭与京菜经典组合。'),
      restaurant('bj-f2', '护国寺小吃', '豆汁、艾窝窝和面茶。'),
      restaurant('bj-f3', '方砖厂69号炸酱面', '老北京面食与午餐快线。'),
    ],
  },
  上海: {
    attractions: [
      attraction('sh-1', '外滩', '城市地标与夜景核心步行线。', 'outdoor'),
      attraction('sh-2', '豫园', '海派老城厢与园林空间。', 'both'),
      attraction('sh-3', '上海博物馆', '适合雨天与文化主题。', 'indoor'),
      attraction('sh-4', '上海汽车文化与制造体验中心', '工业旅游与汽车主题展陈。', 'indoor'),
    ],
    food: [
      restaurant('sh-f1', '绿波廊', '本帮菜和豫园商圈就餐。'),
      restaurant('sh-f2', '南翔馒头店', '小笼与点心优先。'),
      restaurant('sh-f3', '德兴馆', '焖肉面与老上海小吃。'),
    ],
  },
  西安: {
    attractions: [
      attraction('xa-1', '兵马俑', '经典历史线核心景点，通勤较长。', 'both'),
      attraction('xa-2', '西安城墙', '古城骑行与步行。', 'outdoor'),
      attraction('xa-3', '西安博物院', '室内展陈丰富，适合雨天。', 'indoor'),
      attraction('xa-4', '大唐不夜城', '夜景与城市表演街区。', 'both'),
    ],
    food: [
      restaurant('xa-f1', '老孙家泡馍', '泡馍与清真餐饮。'),
      restaurant('xa-f2', '贾三灌汤包', '小吃与午餐。'),
      restaurant('xa-f3', '定家小酥肉', '回民街常见菜式。'),
    ],
  },
  成都: {
    attractions: [
      attraction('cd-1', '宽窄巷子', '成都城市漫步和慢节奏体验。', 'both'),
      attraction('cd-2', '成都博物馆', '适合雨天与历史艺术。', 'indoor'),
      attraction('cd-3', '川剧变脸剧场', '文化体验与晚间表演。', 'indoor'),
      attraction('cd-4', '人民公园', '喝茶和本地慢生活。', 'outdoor'),
    ],
    food: [
      restaurant('cd-f1', '陈麻婆豆腐', '经典川菜体验。'),
      restaurant('cd-f2', '钟水饺', '本地小吃和午餐。'),
      restaurant('cd-f3', '龙抄手', '抄手与川味快餐。'),
    ],
  },
  敦煌: {
    attractions: [
      attraction('dh-1', '鸣沙山月牙泉', '沙漠景观，傍晚体验更佳。', 'outdoor'),
      attraction('dh-2', '莫高窟', '预约制石窟参观。', 'indoor'),
      attraction('dh-3', '敦煌博物馆', '室内补充丝路背景。', 'indoor'),
      attraction('dh-4', '沙洲夜市', '夜间逛吃与纪念品。', 'both'),
    ],
    food: [
      restaurant('dh-f1', '达记酿皮', '敦煌小吃与午餐。'),
      restaurant('dh-f2', '驴肉黄面馆', '本地特色主食。'),
      restaurant('dh-f3', '杏皮水铺', '轻食和饮品。'),
    ],
  },
  杭州: {
    attractions: [
      attraction('hz-1', '西湖', '杭州核心景观与步行线。', 'outdoor'),
      attraction('hz-2', '中国丝绸博物馆', '适合室内文化体验。', 'indoor'),
      attraction('hz-3', '灵隐寺', '宗教文化与步行。', 'both'),
      attraction('hz-4', '清河坊', '购物与历史街区。', 'both'),
    ],
    food: [
      restaurant('hz-f1', '楼外楼', '杭帮菜经典。'),
      restaurant('hz-f2', '奎元馆', '面食和快餐。'),
      restaurant('hz-f3', '知味观', '杭式点心和小吃。'),
    ],
  },
  广州: {
    attractions: [
      attraction('gz-1', '陈家祠', '岭南建筑与文化。', 'both'),
      attraction('gz-2', '广东省博物馆', '雨天优先的综合馆。', 'indoor'),
      attraction('gz-3', '沙面', '城市散步与拍照。', 'outdoor'),
      attraction('gz-4', '广州塔观景区', '夜景地标。', 'both'),
    ],
    food: [
      restaurant('gz-f1', '点都德', '早茶与粤点。'),
      restaurant('gz-f2', '陶陶居', '经典粤菜和点心。'),
      restaurant('gz-f3', '银记肠粉', '便捷早餐。'),
    ],
  },
  重庆: {
    attractions: [
      attraction('cq-1', '洪崖洞', '夜景与城市层叠空间。', 'both'),
      attraction('cq-2', '三峡博物馆', '历史与室内展陈。', 'indoor'),
      attraction('cq-3', '磁器口古镇', '古镇与地方小吃。', 'outdoor'),
      attraction('cq-4', '李子坝观景平台', '城市交通奇观。', 'outdoor'),
    ],
    food: [
      restaurant('cq-f1', '珮姐老火锅', '重庆火锅体验。'),
      restaurant('cq-f2', '山城小汤圆', '夜宵与甜品。'),
      restaurant('cq-f3', '花市豌杂面', '便捷本地面食。'),
    ],
  },
};

const fixtureLocations: Record<string, Record<string, { lat: number; lng: number }>> = {
  北京: {
    故宫博物院: point(39.9163, 116.3972),
    天坛公园: point(39.8822, 116.4065),
    中国考古博物馆: point(39.9876, 116.3098),
    三元牛奶工厂: point(40.0481, 116.4459),
    四季民福烤鸭店: point(39.9149, 116.4027),
    护国寺小吃: point(39.9301, 116.3724),
    方砖厂69号炸酱面: point(39.9394, 116.3931),
  },
  上海: {
    外滩: point(31.2400, 121.4900),
    豫园: point(31.2273, 121.4926),
    上海博物馆: point(31.2304, 121.4740),
    上海汽车文化与制造体验中心: point(31.2941, 121.2272),
    绿波廊: point(31.2276, 121.4921),
    南翔馒头店: point(31.2278, 121.4927),
    德兴馆: point(31.2318, 121.4767),
  },
  西安: {
    兵马俑: point(34.3849, 109.2786),
    西安城墙: point(34.2591, 108.9470),
    西安博物院: point(34.2395, 108.9544),
    大唐不夜城: point(34.2198, 108.9687),
    老孙家泡馍: point(34.2620, 108.9487),
    贾三灌汤包: point(34.2657, 108.9498),
    定家小酥肉: point(34.2638, 108.9468),
  },
  成都: {
    宽窄巷子: point(30.6679, 104.0498),
    成都博物馆: point(30.6578, 104.0648),
    川剧变脸剧场: point(30.6597, 104.0703),
    人民公园: point(30.6590, 104.0552),
    陈麻婆豆腐: point(30.6574, 104.0670),
    钟水饺: point(30.6588, 104.0613),
    龙抄手: point(30.6608, 104.0636),
  },
  敦煌: {
    鸣沙山月牙泉: point(40.0872, 94.6821),
    莫高窟: point(40.0422, 94.8077),
    敦煌博物馆: point(40.1484, 94.6617),
    沙洲夜市: point(40.1424, 94.6678),
    达记酿皮: point(40.1430, 94.6682),
    驴肉黄面馆: point(40.1421, 94.6662),
    杏皮水铺: point(40.1415, 94.6674),
  },
  杭州: {
    西湖: point(30.2480, 120.1500),
    中国丝绸博物馆: point(30.2240, 120.1546),
    灵隐寺: point(30.2428, 120.1006),
    清河坊: point(30.2422, 120.1736),
    楼外楼: point(30.2582, 120.1415),
    奎元馆: point(30.2544, 120.1682),
    知味观: point(30.2590, 120.1661),
  },
  广州: {
    陈家祠: point(23.1258, 113.2448),
    广东省博物馆: point(23.1196, 113.3216),
    沙面: point(23.1086, 113.2415),
    广州塔观景区: point(23.1085, 113.3247),
    点都德: point(23.1281, 113.2644),
    陶陶居: point(23.1288, 113.2582),
    银记肠粉: point(23.1301, 113.2610),
  },
  重庆: {
    洪崖洞: point(29.5635, 106.5772),
    三峡博物馆: point(29.5646, 106.5510),
    磁器口古镇: point(29.5813, 106.4464),
    李子坝观景平台: point(29.5565, 106.5349),
    珮姐老火锅: point(29.5584, 106.5763),
    山城小汤圆: point(29.5608, 106.5738),
    花市豌杂面: point(29.5652, 106.5489),
  },
};

for (const [city, fixture] of Object.entries(cityFixtures)) {
  const center = ({
      北京: point(39.9163, 116.3972),
      上海: point(31.2304, 121.474),
      西安: point(34.2591, 108.947),
      成都: point(30.6585, 104.062),
      敦煌: point(40.1422, 94.667),
      杭州: point(30.252, 120.158),
      广州: point(23.1281, 113.2644),
      重庆: point(29.5635, 106.56),
    } as Record<string, { lat: number; lng: number }>)[city];

  cityFixtures[city] = {
    attractions: fixture.attractions.map((item, index) => ({
      ...item,
      location: point(center.lat + index * 0.002, center.lng + index * 0.002),
    })),
    food: fixture.food.map((item, index) => ({
      ...item,
      location: point(center.lat + index * 0.0015 + 0.0004, center.lng + index * 0.0015 + 0.0004),
    })),
  };
}

type CaseConfig = {
  id: string;
  prompt: string;
  scenario: string;
  city: keyof typeof cityFixtures;
  coreAttractions: string[];
  food: string[];
  bookingTips?: BookingTip[];
  expectCanGenerate?: boolean;
  expectedIntent: PlanningEvaluationCase['expectedIntent'];
};

function buildCase(config: CaseConfig): PlanningEvaluationCase {
  const fixture = cityFixtures[config.city];
  const coreAttractions = pick(fixture.attractions, config.coreAttractions);
  const food = pick(fixture.food, config.food);

  return {
    id: config.id,
    prompt: config.prompt,
    scenario: config.scenario,
    expectedIntent: config.expectedIntent,
    slots: {
      core_attractions: slot(coreAttractions),
      food: slot(food),
    },
    bookingTips: config.bookingTips ?? [],
    expectedCoreAttractions: config.coreAttractions,
    expectedFoods: config.food,
    expectCanGenerate: config.expectCanGenerate ?? true,
  };
}

export const planningEvaluationDataset: PlanningEvaluationCase[] = [
  buildCase({
    id: 'eval-001',
    prompt: '北京3天，历史古迹和本地小吃为主',
    scenario: 'standard_history_food',
    city: '北京',
    coreAttractions: ['故宫博物院', '天坛公园', '中国考古博物馆'],
    food: ['四季民福烤鸭店', '护国寺小吃', '方砖厂69号炸酱面'],
    bookingTips: [bookingTip('bj-tip-1', '故宫预约', '故宫需提前实名预约')],
    expectedIntent: { destination: '北京', durationDays: 3, travelStyle: 'moderate', cuisinePreference: 'local snacks' },
  }),
  buildCase({
    id: 'eval-002',
    prompt: '北京2天，亲子轻松一点，下雨也能玩',
    scenario: 'family_indoor',
    city: '北京',
    coreAttractions: ['中国考古博物馆', '故宫博物院', '三元牛奶工厂'],
    food: ['护国寺小吃', '四季民福烤鸭店'],
    bookingTips: [bookingTip('bj-tip-2', '馆内预约', '博物馆类景点建议提前预约')],
    expectedIntent: { destination: '北京', durationDays: 2, travelStyle: 'relaxed', groupType: 'family' },
  }),
  buildCase({
    id: 'eval-003',
    prompt: '北京4天，想看工厂和手作体验，顺便吃火锅',
    scenario: 'industrial_food',
    city: '北京',
    coreAttractions: ['三元牛奶工厂', '中国考古博物馆', '故宫博物院'],
    food: ['四季民福烤鸭店', '方砖厂69号炸酱面'],
    expectedIntent: { destination: '北京', durationDays: 4, travelStyle: 'moderate', includeIndustrial: true, cuisinePreference: 'hotpot' },
  }),
  buildCase({
    id: 'eval-004',
    prompt: '春节去北京3天，逛夜市买纪念品，节奏轻松',
    scenario: 'festival_shopping',
    city: '北京',
    coreAttractions: ['故宫博物院', '天坛公园'],
    food: ['护国寺小吃', '四季民福烤鸭店'],
    bookingTips: [bookingTip('bj-tip-3', '春节预约', '节假日热门景点需提前锁定时段')],
    expectedIntent: { destination: '北京', durationDays: 3, travelStyle: 'relaxed', travelMonth: 1 },
  }),
  buildCase({
    id: 'eval-005',
    prompt: '上海2天，主要想吃本帮菜和逛逛城市地标',
    scenario: 'standard_city_landmark',
    city: '上海',
    coreAttractions: ['外滩', '豫园', '上海博物馆'],
    food: ['绿波廊', '南翔馒头店', '德兴馆'],
    bookingTips: [bookingTip('sh-tip-1', '博物馆预约', '热门馆周末需预约时段')],
    expectedIntent: { destination: '上海', durationDays: 2, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-006',
    prompt: '上海3天，情侣慢游，晚上想看看夜景再吃点小笼',
    scenario: 'couple_night_view',
    city: '上海',
    coreAttractions: ['外滩', '豫园'],
    food: ['南翔馒头店', '绿波廊'],
    expectedIntent: { destination: '上海', durationDays: 3, travelStyle: 'relaxed', groupType: 'couple' },
  }),
  buildCase({
    id: 'eval-007',
    prompt: '去上海玩2天，想看工厂展陈，也想顺便购物',
    scenario: 'industrial_shopping',
    city: '上海',
    coreAttractions: ['上海汽车文化与制造体验中心', '上海博物馆', '豫园'],
    food: ['德兴馆', '南翔馒头店'],
    expectedIntent: { destination: '上海', durationDays: 2, travelStyle: 'moderate', includeIndustrial: true },
  }),
  buildCase({
    id: 'eval-008',
    prompt: '国庆去上海4天，想逛夜市买纪念品，别太赶',
    scenario: 'holiday_shopping',
    city: '上海',
    coreAttractions: ['豫园', '外滩', '上海博物馆'],
    food: ['绿波廊', '德兴馆'],
    expectedIntent: { destination: '上海', durationDays: 4, travelStyle: 'relaxed', travelMonth: 10 },
  }),
  buildCase({
    id: 'eval-009',
    prompt: '西安2天，想走经典历史线',
    scenario: 'classic_history',
    city: '西安',
    coreAttractions: ['兵马俑', '西安城墙', '西安博物院'],
    food: ['老孙家泡馍', '贾三灌汤包', '定家小酥肉'],
    bookingTips: [bookingTip('xa-tip-1', '兵马俑预约', '旺季建议至少提前一天预约')],
    expectedIntent: { destination: '西安', durationDays: 2, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-010',
    prompt: '西安3天，一家三口轻松玩，最好多些室内内容',
    scenario: 'family_indoor_history',
    city: '西安',
    coreAttractions: ['西安博物院', '兵马俑', '大唐不夜城'],
    food: ['贾三灌汤包', '老孙家泡馍'],
    expectedIntent: { destination: '西安', durationDays: 3, travelStyle: 'relaxed', groupType: 'family' },
  }),
  buildCase({
    id: 'eval-011',
    prompt: '春节去西安2天，想看庙会和古城夜景',
    scenario: 'festival_night_view',
    city: '西安',
    coreAttractions: ['大唐不夜城', '西安城墙'],
    food: ['定家小酥肉', '贾三灌汤包'],
    expectedIntent: { destination: '西安', durationDays: 2, travelStyle: 'moderate', travelMonth: 1 },
  }),
  buildCase({
    id: 'eval-012',
    prompt: '西安2天，想吃清真和泡馍，路线不要太累',
    scenario: 'halal_easy',
    city: '西安',
    coreAttractions: ['西安博物院', '西安城墙'],
    food: ['老孙家泡馍', '定家小酥肉'],
    expectedIntent: { destination: '西安', durationDays: 2, travelStyle: 'relaxed', cuisinePreference: 'halal' },
  }),
  buildCase({
    id: 'eval-013',
    prompt: '成都3天，想慢慢吃川菜看博物馆',
    scenario: 'slow_food_museum',
    city: '成都',
    coreAttractions: ['成都博物馆', '宽窄巷子', '人民公园'],
    food: ['陈麻婆豆腐', '钟水饺', '龙抄手'],
    expectedIntent: { destination: '成都', durationDays: 3, travelStyle: 'relaxed', cuisinePreference: 'sichuan' },
  }),
  buildCase({
    id: 'eval-014',
    prompt: '成都2天，晚上想看变脸表演，白天别太赶',
    scenario: 'culture_show',
    city: '成都',
    coreAttractions: ['川剧变脸剧场', '宽窄巷子', '成都博物馆'],
    food: ['钟水饺', '陈麻婆豆腐'],
    expectedIntent: { destination: '成都', durationDays: 2, travelStyle: 'relaxed' },
  }),
  buildCase({
    id: 'eval-015',
    prompt: '成都4天，朋友一起特种兵式打卡，能不能多安排一点',
    scenario: 'packed_group',
    city: '成都',
    coreAttractions: ['宽窄巷子', '成都博物馆', '川剧变脸剧场'],
    food: ['陈麻婆豆腐', '龙抄手'],
    expectedIntent: { destination: '成都', durationDays: 4, travelStyle: 'packed', groupType: 'group' },
  }),
  buildCase({
    id: 'eval-016',
    prompt: '成都2天，不吃肉，想轻松一点',
    scenario: 'vegetarian_relaxed',
    city: '成都',
    coreAttractions: ['成都博物馆', '人民公园'],
    food: ['钟水饺', '龙抄手'],
    expectedIntent: { destination: '成都', durationDays: 2, travelStyle: 'relaxed', cuisinePreference: 'vegetarian' },
  }),
  buildCase({
    id: 'eval-017',
    prompt: '敦煌2天，想看经典历史线',
    scenario: 'fallback_history',
    city: '敦煌',
    coreAttractions: ['莫高窟', '敦煌博物馆', '鸣沙山月牙泉'],
    food: ['驴肉黄面馆', '达记酿皮'],
    bookingTips: [bookingTip('dh-tip-1', '莫高窟预约', '莫高窟需提前预约并按时入场')],
    expectedIntent: { destination: '敦煌', durationDays: 2, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-018',
    prompt: '敦煌2天，上午轻松一点，傍晚想去沙漠',
    scenario: 'time_sensitive_outdoor',
    city: '敦煌',
    coreAttractions: ['鸣沙山月牙泉', '莫高窟'],
    food: ['达记酿皮', '驴肉黄面馆'],
    expectedIntent: { destination: '敦煌', durationDays: 2, travelStyle: 'relaxed' },
  }),
  buildCase({
    id: 'eval-019',
    prompt: '敦煌3天，想逛夜市买纪念品，再看看博物馆',
    scenario: 'night_market',
    city: '敦煌',
    coreAttractions: ['沙洲夜市', '敦煌博物馆', '莫高窟'],
    food: ['杏皮水铺', '达记酿皮'],
    expectedIntent: { destination: '敦煌', durationDays: 3, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-020',
    prompt: '敦煌1天，主要想吃点本地小吃，不太想看景点',
    scenario: 'low_attraction_supply',
    city: '敦煌',
    coreAttractions: [],
    food: ['达记酿皮', '驴肉黄面馆', '杏皮水铺'],
    expectCanGenerate: false,
    expectedIntent: { destination: '敦煌', durationDays: 1, travelStyle: 'moderate', cuisinePreference: 'local snacks' },
  }),
  buildCase({
    id: 'eval-021',
    prompt: '杭州3天，想看西湖和博物馆，吃点杭帮菜',
    scenario: 'lake_and_museum',
    city: '杭州',
    coreAttractions: ['西湖', '中国丝绸博物馆', '灵隐寺'],
    food: ['楼外楼', '知味观', '奎元馆'],
    expectedIntent: { destination: '杭州', durationDays: 3, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-022',
    prompt: '杭州2天，慢慢逛街买手信，别太累',
    scenario: 'shopping_relaxed',
    city: '杭州',
    coreAttractions: ['清河坊', '中国丝绸博物馆', '西湖'],
    food: ['知味观', '楼外楼'],
    expectedIntent: { destination: '杭州', durationDays: 2, travelStyle: 'relaxed' },
  }),
  buildCase({
    id: 'eval-023',
    prompt: '去杭州玩2天，下雨也能玩的路线',
    scenario: 'rainy_day_indoor',
    city: '杭州',
    coreAttractions: ['中国丝绸博物馆', '灵隐寺'],
    food: ['奎元馆', '知味观'],
    expectedIntent: { destination: '杭州', durationDays: 2, travelStyle: 'moderate' },
  }),
  buildCase({
    id: 'eval-024',
    prompt: '杭州4天，想轻松一点，也想逛点老街',
    scenario: 'slow_old_street',
    city: '杭州',
    coreAttractions: ['清河坊', '西湖', '灵隐寺'],
    food: ['楼外楼', '奎元馆'],
    expectedIntent: { destination: '杭州', durationDays: 4, travelStyle: 'relaxed' },
  }),
  buildCase({
    id: 'eval-025',
    prompt: '广州2天，想吃早茶和粤菜，顺便看老建筑',
    scenario: 'dim_sum_architecture',
    city: '广州',
    coreAttractions: ['陈家祠', '沙面', '广东省博物馆'],
    food: ['点都德', '陶陶居', '银记肠粉'],
    expectedIntent: { destination: '广州', durationDays: 2, travelStyle: 'moderate', cuisinePreference: 'cantonese' },
  }),
  buildCase({
    id: 'eval-026',
    prompt: '广州3天，亲子出行，最好有室内内容和早茶',
    scenario: 'family_indoor_food',
    city: '广州',
    coreAttractions: ['广东省博物馆', '陈家祠', '广州塔观景区'],
    food: ['点都德', '银记肠粉'],
    expectedIntent: { destination: '广州', durationDays: 3, travelStyle: 'moderate', groupType: 'family' },
  }),
  buildCase({
    id: 'eval-027',
    prompt: '广州2天，情侣慢游，晚上看看夜景',
    scenario: 'couple_night',
    city: '广州',
    coreAttractions: ['广州塔观景区', '沙面'],
    food: ['陶陶居', '点都德'],
    expectedIntent: { destination: '广州', durationDays: 2, travelStyle: 'relaxed', groupType: 'couple' },
  }),
  buildCase({
    id: 'eval-028',
    prompt: '广州2天，清真餐饮优先，少走路',
    scenario: 'halal_easy',
    city: '广州',
    coreAttractions: ['广东省博物馆', '陈家祠'],
    food: ['银记肠粉', '点都德'],
    expectedIntent: { destination: '广州', durationDays: 2, travelStyle: 'relaxed', cuisinePreference: 'halal' },
  }),
  buildCase({
    id: 'eval-029',
    prompt: '重庆3天，想吃火锅和看城市夜景',
    scenario: 'night_view_hotpot',
    city: '重庆',
    coreAttractions: ['洪崖洞', '三峡博物馆', '磁器口古镇'],
    food: ['珮姐老火锅', '山城小汤圆', '花市豌杂面'],
    expectedIntent: { destination: '重庆', durationDays: 3, travelStyle: 'moderate', cuisinePreference: 'hotpot' },
  }),
  buildCase({
    id: 'eval-030',
    prompt: '重庆2天，特种兵一点，多看几个点',
    scenario: 'packed_city',
    city: '重庆',
    coreAttractions: ['洪崖洞', '磁器口古镇', '李子坝观景平台'],
    food: ['珮姐老火锅', '花市豌杂面'],
    expectedIntent: { destination: '重庆', durationDays: 2, travelStyle: 'packed' },
  }),
  buildCase({
    id: 'eval-031',
    prompt: '重庆2天，朋友一起轻松逛夜市，再吃点面',
    scenario: 'group_relaxed_night_market',
    city: '重庆',
    coreAttractions: ['洪崖洞', '磁器口古镇'],
    food: ['花市豌杂面', '山城小汤圆'],
    expectedIntent: { destination: '重庆', durationDays: 2, travelStyle: 'relaxed', groupType: 'group' },
  }),
  buildCase({
    id: 'eval-032',
    prompt: '重庆1天，下雨也能玩的室内路线',
    scenario: 'indoor_replan_anchor',
    city: '重庆',
    coreAttractions: ['三峡博物馆', '洪崖洞'],
    food: ['花市豌杂面', '山城小汤圆'],
    expectedIntent: { destination: '重庆', durationDays: 1, travelStyle: 'moderate' },
  }),
];
