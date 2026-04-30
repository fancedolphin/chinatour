import type { Page, Route } from '@playwright/test';

const FIXED_ITINERARY = {
  text: 'Stubbed plan',
  tripPlan: {
    destination: '北京',
    dates: '2026年5月1日 - 5月3日',
    budget: '¥3000',
    days: [
      {
        day: 1,
        theme: '故宫与天安门',
        activities: [
          {
            time: '09:00',
            name: '故宫',
            description: '中国明清两代的皇家宫殿。',
            type: 'attraction',
            source: 'rag',
            confidence: 0.9,
            location: { lat: 39.9163, lng: 116.3972, address: '北京市东城区景山前街' },
          },
          {
            time: '12:30',
            name: '全聚德烤鸭',
            description: '北京烤鸭老字号。',
            type: 'meal',
            source: 'rag',
            confidence: 0.85,
            mealType: 'lunch',
            location: { lat: 39.9079, lng: 116.4115 },
          },
        ],
        meals: { lunch: '全聚德烤鸭 - 北京烤鸭老字号' },
        alternativePlan: '雨天可前往国家博物馆。',
      },
    ],
    unknowns: [],
  },
};

export async function stubGeminiProxy(page: Page) {
  await page.route('**/functions/v1/gemini-proxy', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: JSON.stringify(FIXED_ITINERARY) }),
    });
  });
}

export async function stubAmapSearch(page: Page) {
  await page.route('**/functions/v1/amap-search', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pois: [
          {
            id: 'amap-1',
            name: '故宫',
            address: '北京市东城区景山前街4号',
            location: '116.3972,39.9163',
            type: '风景名胜',
          },
        ],
      }),
    });
  });
}

export async function stubExternalAmapSdk(page: Page) {
  // Block the heavy AMap webapi script — none of the P0 specs require real map rendering.
  await page.route('https://webapi.amap.com/**', (route) => route.abort());
  await page.route('https://restapi.amap.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"1","pois":[]}' }),
  );
}

export async function applyDefaultStubs(page: Page) {
  await stubGeminiProxy(page);
  await stubAmapSearch(page);
  await stubExternalAmapSdk(page);
}
