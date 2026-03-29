import type { PlanningIntent, StructuredItinerary, TravelStyle } from './contracts';

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
  'Dunhuang',
  'Beijing',
  'Shanghai',
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
  const explicit = text.match(/(\d{1,2})\s*(天|日)/);
  if (explicit?.[1]) {
    const value = Number(explicit[1]);
    return Math.min(10, Math.max(1, value));
  }

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
    content.includes('打卡多')
  ) {
    return 'aggressive';
  }

  if (
    content.includes('慢游') ||
    content.includes('休闲') ||
    content.includes('轻松') ||
    content.includes('悠闲')
  ) {
    return 'relaxed';
  }

  return 'balanced';
}

function detectInterestTags(text: string): string[] {
  const tags: string[] = [];
  const mapping: Array<[string, string]> = [
    ['美食', 'food'],
    ['吃', 'food'],
    ['博物馆', 'museum'],
    ['历史', 'history'],
    ['购物', 'shopping'],
    ['自然', 'nature'],
    ['亲子', 'family'],
    ['夜景', 'night-view'],
    ['文化', 'culture'],
  ];

  mapping.forEach(([keyword, tag]) => {
    if (text.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  });

  return tags;
}

function detectCuisinePreference(text: string): string | undefined {
  const match = text.match(/(川菜|粤菜|湘菜|鲁菜|淮扬菜|清真|素食|海鲜|火锅|烧烤)/);
  return match?.[1];
}

export function extractPlanningIntent(
  userMessage: string,
  currentPlan?: StructuredItinerary | null,
): PlanningIntent {
  return {
    rawQuery: userMessage,
    destination: detectDestination(userMessage, currentPlan),
    durationDays: detectDurationDays(userMessage, currentPlan),
    travelStyle: detectTravelStyle(userMessage),
    interestTags: detectInterestTags(userMessage),
    cuisinePreference: detectCuisinePreference(userMessage),
  };
}
