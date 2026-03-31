import {
  CONTRACT_VERSION,
  type GroupType,
  type PlanningIntent,
  type StructuredItinerary,
  type TravelStyle,
} from './contracts';

const KNOWN_DESTINATIONS = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '成都',
  '西安',
  '杭州',
  '南京',
  '重庆',
  '苏州',
  '天津',
  '武汉',
  '青岛',
  '长沙',
  '厦门',
  '昆明',
  '哈尔滨',
  '敦煌',
  'Dunhuang',
  'Beijing',
  'Shanghai',
];

const MONTH_PATTERNS: Array<[RegExp, number]> = [
  [/(12|十二)\s*月/, 12],
  [/(11|十一)\s*月/, 11],
  [/(10|十)\s*月/, 10],
  [/(9|九)\s*月/, 9],
  [/(8|八)\s*月/, 8],
  [/(7|七)\s*月/, 7],
  [/(6|六)\s*月/, 6],
  [/(5|五)\s*月/, 5],
  [/(4|四)\s*月/, 4],
  [/(3|三)\s*月/, 3],
  [/(2|二)\s*月/, 2],
  [/(1|一)\s*月/, 1],
  [/春节/i, 1],
  [/国庆/i, 10],
];

const CUISINE_PATTERNS: Array<[RegExp, string]> = [
  [/素食|vegan|vegetarian|不吃肉/i, 'vegetarian'],
  [/清真|halal|穆斯林|muslim/i, 'halal'],
  [/川菜|麻辣|辣/i, 'sichuan'],
  [/粤菜|广东|早茶/i, 'cantonese'],
  [/湘菜/i, 'hunan'],
  [/火锅/i, 'hotpot'],
  [/烧烤|烤串/i, 'barbecue'],
  [/海鲜|seafood/i, 'seafood'],
  [/本地小吃|小吃/i, 'local snacks'],
  [/面食|面馆/i, 'noodles'],
];

const GROUP_PATTERNS: Array<[RegExp, GroupType]> = [
  [/(一个人|solo|独自|alone)/i, 'solo'],
  [/(两个人|情侣|夫妻|couple|partner)/i, 'couple'],
  [/(家庭|亲子|一家|三口|四口|小孩|孩子|children|family|kids)/i, 'family'],
  [/(团队|朋友|多人|group|friends)/i, 'group'],
];

function detectDestination(text: string, currentPlan?: StructuredItinerary | null): string {
  for (const city of KNOWN_DESTINATIONS) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }

  const toMatch = text.match(/去([^\s，。,.!！?？]{2,12})/);
  if (toMatch?.[1]) {
    return toMatch[1];
  }

  return currentPlan?.destination || '北京';
}

function detectDurationDays(text: string, currentPlan?: StructuredItinerary | null): number {
  const explicit = text.match(/(\d{1,2})\s*(天|日|day|days|night|nights)/i);
  if (explicit?.[1]) {
    const value = Number(explicit[1]);
    return Math.min(14, Math.max(1, value));
  }

  if (/一天|1\s*day/i.test(text)) return 1;
  if (/两天|二天|2\s*days?/i.test(text)) return 2;
  if (/三天|3\s*days?/i.test(text)) return 3;
  if (/四天|4\s*days?/i.test(text)) return 4;
  if (/一周|7\s*days?/i.test(text)) return 7;

  if (currentPlan?.days?.length) {
    return currentPlan.days.length;
  }

  return 3;
}

function detectTravelStyle(text: string): TravelStyle {
  const content = text.toLowerCase();
  if (
    content.includes('特种兵') ||
    content.includes('紧凑') ||
    content.includes('高强度') ||
    content.includes('打卡多') ||
    content.includes('packed') ||
    content.includes('intensive')
  ) {
    return 'packed';
  }

  if (
    content.includes('慢游') ||
    content.includes('慢慢') ||
    content.includes('休闲') ||
    content.includes('轻松') ||
    content.includes('悠闲') ||
    content.includes('别太赶') ||
    content.includes('不要太赶') ||
    content.includes('不太累') ||
    content.includes('不要太累') ||
    content.includes('少走路') ||
    content.includes('relaxed') ||
    content.includes('slow')
  ) {
    return 'relaxed';
  }

  return 'moderate';
}

function detectInterestTags(text: string): string[] {
  const tags: string[] = [];
  const mapping: Array<[RegExp, string]> = [
    [/(美食|吃|food|eat|cuisine)/i, 'food'],
    [/(博物馆|museum|gallery|展览|艺术)/i, 'art'],
    [/(历史|古迹|heritage|history)/i, 'history'],
    [/(购物|夜市|shop|shopping|market)/i, 'shopping'],
    [/(自然|山|湖|公园|nature|mountain|lake)/i, 'nature'],
    [/(亲子|family|kids|children)/i, 'family'],
    [/(夜景|night)/i, 'night-view'],
    [/(文化|culture|戏曲|茶道|书法)/i, 'culture'],
    [/(工业|工厂|制造|factory|workshop|craft|souvenir)/i, 'industrial'],
  ];

  for (const [pattern, tag] of mapping) {
    if (pattern.test(text) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

function detectCuisinePreference(text: string): string | undefined {
  for (const [pattern, value] of CUISINE_PATTERNS) {
    if (pattern.test(text)) {
      return value;
    }
  }
  return undefined;
}

function detectIncludeIndustrial(text: string): boolean {
  return /工业|工厂|制造|车间|手作|手工|非遗|陶瓷|workshop|factory|craft|souvenir/i.test(text);
}

function detectGroupType(text: string): GroupType | undefined {
  for (const [pattern, groupType] of GROUP_PATTERNS) {
    if (pattern.test(text)) {
      return groupType;
    }
  }
  return undefined;
}

function detectTravelMonth(text: string): number | undefined {
  for (const [pattern, month] of MONTH_PATTERNS) {
    if (pattern.test(text)) {
      return month;
    }
  }
  return undefined;
}

export function extractPlanningIntent(
  userMessage: string,
  currentPlan?: StructuredItinerary | null,
  overrides?: Partial<Pick<PlanningIntent, 'destination'>>,
): PlanningIntent {
  return {
    rawQuery: userMessage,
    destination: overrides?.destination || detectDestination(userMessage, currentPlan),
    durationDays: detectDurationDays(userMessage, currentPlan),
    travelStyle: detectTravelStyle(userMessage),
    interestTags: detectInterestTags(userMessage),
    cuisinePreference: detectCuisinePreference(userMessage),
    includeIndustrial: detectIncludeIndustrial(userMessage),
    groupType: detectGroupType(userMessage),
    travelMonth: detectTravelMonth(userMessage),
    contractVersion: CONTRACT_VERSION,
  };
}
