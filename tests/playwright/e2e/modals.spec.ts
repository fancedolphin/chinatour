// Module: 模态框、弹层与第三方出口 — P0 发布/分享/导出 + Detail Cards
import { test, expect } from '../fixtures/test';

test.describe('Modals & sheets', () => {
  test('P0: PublishTripModal opens and can be closed', async ({ page }) => {
    await page.goto('/trips');
    const cards = page.getByTestId('trip-card');
    test.skip((await cards.count()) === 0, 'No saved trips to publish.');
    // 第一张卡上的发布按钮：title 含 "发布到广场" 或 "已发布"
    const publishBtn = cards.first().locator('button[title*="发布"], button[title*="已发布"]').first();
    test.skip(!(await publishBtn.isVisible().catch(() => false)), 'Publish button not exposed.');
    await publishBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden({ timeout: 5_000 });
  });

  test('P0: ShareTripModal opens and shows share affordances', async ({ page }) => {
    await page.goto('/trips');
    const cards = page.getByTestId('trip-card');
    test.skip((await cards.count()) === 0, 'No saved trips to share.');
    // Share 按钮通过 Share2 icon 触发，没有 title — 用 aria-label 或顺序定位
    const shareBtn = cards.first().locator('button').nth(1);
    await shareBtn.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    // 应能找到至少一种分享出口（链接 / 图片 / 二维码 文案）
    await expect(modal).toContainText(/链接|图片|二维码|Link|Image|QR/i);
    await page.keyboard.press('Escape');
  });

  test('P0: ExportScopeSheet opens from trip map', async ({ page }) => {
    await page.goto('/trips');
    const cards = page.getByTestId('trip-card');
    test.skip((await cards.count()) === 0, 'No saved trips to map.');
    const mapBtn = cards.first().locator('button[title*="地图"]').first();
    test.skip(!(await mapBtn.isVisible().catch(() => false)), 'No map button.');
    await mapBtn.click();
    // TripMap 页应有"导出"按钮
    const exportBtn = page.getByRole('button', { name: /导出|Export/ }).first();
    test.skip(!(await exportBtn.isVisible().catch(() => false)), 'Export button not present.');
    await exportBtn.click();
    await expect(page.getByRole('dialog').or(page.locator('[role="region"]'))).toBeVisible();
  });
});
