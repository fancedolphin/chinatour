import type { PlanningIntent, StructuredItinerary } from '@/services/planning/dataContracts';

export interface PlanningGoldenExample {
  id: string;
  destination: string;
  durationDays: number;
  highlights: string[];
  notes: string;
  qualityScore: number;
  inputIntent: PlanningIntent;
  expectedOutput: StructuredItinerary;
}

export const planningGoldenExamples: PlanningGoldenExample[] = [
  {
    id: 'e4cc1b61-747e-4317-8892-af1ff33a1f77',
    destination: '北京',
    durationDays: 3,
    highlights: ['故宫 + 天坛经典线', '胡同与京味小吃', '预约型景点优先'],
    notes: '标准观光，景点齐全（正常 RAG 命中）',
    qualityScore: 0.92,
    inputIntent: {
      rawQuery: '北京3天，历史古迹和美食为主',
      destination: '北京',
      durationDays: 3,
      travelStyle: 'moderate',
      interestTags: ['history', 'food'],
      cuisinePreference: 'local snacks',
      includeIndustrial: false,
      contractVersion: '1.1',
    },
    expectedOutput: {
      destination: '北京',
      dates: '2026年4月1日 - 4月3日',
      budget: '约¥3000（人均¥1000/天）',
      days: [
        {
          day: 1,
          theme: '中轴线初识',
          activities: [
            {
              time: '09:00',
              name: '故宫博物院',
              description: '提前预约，优先参观中轴线主殿区。',
              type: 'attraction',
              source: 'rag',
              confidence: 0.92,
              indoorOutdoor: 'both',
            },
          ],
          meals: { lunch: '前门京味餐馆 - 适合第一次体验京味小吃' },
        },
      ],
      unknowns: [],
    },
  },
  {
    id: 'e72bc7d7-c34d-4fd6-8739-2e01d2c9d102',
    destination: '上海',
    durationDays: 2,
    highlights: ['本帮菜优先', '外滩夜景', 'core_attractions 不密集'],
    notes: '美食为主，core_attractions 较少',
    qualityScore: 0.88,
    inputIntent: {
      rawQuery: '上海2天，主要想吃本帮菜和逛逛城市地标',
      destination: '上海',
      durationDays: 2,
      travelStyle: 'relaxed',
      interestTags: ['food', 'shopping'],
      cuisinePreference: 'local snacks',
      includeIndustrial: false,
      contractVersion: '1.1',
    },
    expectedOutput: {
      destination: '上海',
      dates: '2026年4月5日 - 4月6日',
      budget: '约¥2600（人均¥1300/天）',
      days: [
        {
          day: 1,
          theme: '老上海地标',
          activities: [
            {
              time: '10:00',
              name: '外滩',
              description: '白天拍建筑，傍晚看夜景。',
              type: 'attraction',
              source: 'rag',
              confidence: 0.9,
              indoorOutdoor: 'outdoor',
            },
          ],
          meals: { dinner: '本帮餐馆 - 红烧肉和蟹粉菜适合作为第一顿' },
        },
      ],
      unknowns: ['部分热门餐馆需当天二次确认排队情况'],
    },
  },
  {
    id: '6cc5647d-87ef-4f3f-a469-b75541515cb9',
    destination: '北京',
    durationDays: 4,
    highlights: ['工业旅游兴趣', '工厂参观', '手作体验'],
    notes: '工业旅游兴趣（industrial slot 触发）',
    qualityScore: 0.9,
    inputIntent: {
      rawQuery: '北京4天，想看工厂和手作体验，也想顺便逛经典景点',
      destination: '北京',
      durationDays: 4,
      travelStyle: 'packed',
      interestTags: ['industrial', 'history'],
      includeIndustrial: true,
      contractVersion: '1.1',
    },
    expectedOutput: {
      destination: '北京',
      dates: '2026年4月10日 - 4月13日',
      budget: '约¥3200（人均¥800/天）',
      days: [
        {
          day: 1,
          theme: '制造与城市记忆',
          activities: [
            {
              time: '09:30',
              name: '三元牛奶工厂',
              description: '参观生产展示并安排乳制品体验。',
              type: 'attraction',
              source: 'rag',
              confidence: 0.84,
              indoorOutdoor: 'both',
            },
          ],
          meals: {},
        },
      ],
      unknowns: ['工业体验场次需按日期确认'],
    },
  },
  {
    id: 'fd98fd30-bb7b-450e-b9a8-0d0bc9b2a019',
    destination: '西安',
    durationDays: 2,
    highlights: ['RAG 数据不足', 'AMap fallback', '古城基础线'],
    notes: 'RAG 数据不足，AMap fallback 触发',
    qualityScore: 0.87,
    inputIntent: {
      rawQuery: '西安2天，想走经典历史线',
      destination: '西安',
      durationDays: 2,
      travelStyle: 'moderate',
      interestTags: ['history'],
      includeIndustrial: false,
      contractVersion: '1.1',
    },
    expectedOutput: {
      destination: '西安',
      dates: '2026年4月14日 - 4月15日',
      budget: '约¥2000（人均¥1000/天）',
      days: [
        {
          day: 1,
          theme: '秦汉史诗',
          activities: [
            {
              time: '09:00',
              name: '兵马俑',
              description: '长线通勤日，需尽量早出发。',
              type: 'attraction',
              source: 'rag+amap',
              confidence: 0.83,
              indoorOutdoor: 'both',
            },
          ],
          meals: {},
        },
      ],
      unknowns: ['部分 POI 来自 fallback，营业信息需二次确认'],
    },
  },
  {
    id: '03f34c1f-e8d9-42c4-aa8a-97b0cff7dcb9',
    destination: '北京',
    durationDays: 1,
    highlights: ['雨天重规划友好', '博物馆/商圈组合', '通勤压力低'],
    notes: '雨天场景（室内重规划触发）',
    qualityScore: 0.9,
    inputIntent: {
      rawQuery: '北京1天，下雨也能玩的室内历史文化路线',
      destination: '北京',
      durationDays: 1,
      travelStyle: 'relaxed',
      interestTags: ['history', 'art'],
      includeIndustrial: false,
      contractVersion: '1.1',
    },
    expectedOutput: {
      destination: '北京',
      dates: '2026年4月20日 - 4月20日',
      budget: '约¥1300（人均¥1300/天）',
      days: [
        {
          day: 1,
          theme: '雨天室内方案',
          activities: [
            {
              time: '10:00',
              name: '中国考古博物馆',
              description: '全天室内为主，适合恶劣天气下重规划。',
              type: 'attraction',
              source: 'rag',
              confidence: 0.91,
              indoorOutdoor: 'indoor',
            },
          ],
          meals: {},
        },
      ],
      unknowns: [],
    },
  },
];
