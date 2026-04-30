// P1: Trips/详情/地图 — 加载失败 overlay + 返回按钮
//
// 通过 page.route() 让 amap-config edge function 返回错误，TripMapPage 应进入
// configError 分支，展示 "configErrorTitle" + 返回按钮，而不是白屏。
import { test, expect } from '../fixtures/test';

test.describe('TripMap error overlay', () => {
  test('P1: amap-config failure shows error overlay with back button', async ({ page }) => {
    // 拦截 amap-config 让它失败
    await page.route('**/functions/v1/amap-config', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"forced"}' }),
    );

    await page.goto('/trips');
    // 先等加载态消失
    await page.getByText('加载中...').first().waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
    const cards = page.getByTestId('trip-card');
    await cards.first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    test.skip((await cards.count()) === 0, 'No saved trips for test account.');

    const mapBtn = cards.first().locator('button[title*="地图"]').first();
    await mapBtn.waitFor({ timeout: 10_000 });
    await mapBtn.click();

    // 应展示错误 overlay 文案（"地图配置错误"标题 + AMAP_JS_API_KEY hint）
    await expect(page.getByText('地图配置错误')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('code').filter({ hasText: 'AMAP_JS_API_KEY' })).toBeVisible();
    // 返回按钮可点
    const back = page.getByRole('button', { name: /返回|Back/ }).first();
    await expect(back).toBeVisible();
  });
});
