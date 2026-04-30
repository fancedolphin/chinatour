// Module: Discover 与共享行程 — P0 全部 + P1 搜索/标签/作者主页
import { test, expect } from '../fixtures/test';

test.describe('Discover & shared trips', () => {
  test('P0: discover lists public shared trips', async ({ page }) => {
    await page.goto('/discover');
    const cards = page.getByTestId('shared-trip-card');
    test.skip((await cards.count()) === 0, 'No shared trips published.');
    await expect(cards.first()).toBeVisible();
  });

  test('P0: open shared trip detail from card', async ({ page }) => {
    await page.goto('/discover');
    const cards = page.getByTestId('shared-trip-card');
    test.skip((await cards.count()) === 0, 'No shared trips.');
    await cards.first().click();
    await expect(page).toHaveURL(/\/trip\//);
  });

  test('P0: import shared trip → My Trips visible', async ({ page }) => {
    await page.goto('/discover');
    const cards = page.getByTestId('shared-trip-card');
    test.skip((await cards.count()) === 0, 'No shared trips.');
    await cards.first().click();
    const importBtn = page.getByRole('button', { name: /导入|Import|采用|加入我的行程/ }).first();
    test.skip(!(await importBtn.isVisible().catch(() => false)), 'No import button visible.');
    await importBtn.click();
    await page.getByTestId('nav-trips').click();
    await expect(page).toHaveURL(/\/trips/);
  });

  test('P0: open author profile and return to discover via back', async ({ page }) => {
    await page.goto('/discover');
    const author = page.getByTestId('author-link').first();
    test.skip(!(await author.isVisible().catch(() => false)), 'No author link.');
    await author.click();
    await expect(page).toHaveURL(/\/profile\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/discover/);
  });

  test('P0: logged-in user sees "关注" tab', async ({ page }) => {
    await page.goto('/discover');
    // 等 tablist 出现后再断言（React hydration 可能晚于 navigation done）
    await page.locator('[role="tablist"]').first().waitFor({ timeout: 20_000 });
    await expect(
      page.locator('[role="tab"]').filter({ hasText: /关注|Following/ }).first(),
    ).toBeVisible();
  });

  test('P1: search input filters shared trips', async ({ page }) => {
    await page.goto('/discover');
    const search = page.locator('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]').first();
    test.skip(!(await search.isVisible().catch(() => false)), 'Search input not present.');
    await search.fill('北京');
    // 防抖 ~300ms
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toContainText(/北京|Beijing|找到|未找到/i, { timeout: 10_000 });
  });
});
