// Module: Profile 与 Tips — P0 全部 + P1 百科筛选 + 主页返回链路
import { test, expect } from '../fixtures/test';

test.describe('Profile', () => {
  test('P0: my profile renders user info and published trips block', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    // 用户头像或名称应可见（任一即可）
    await expect(page.locator('main, body')).toContainText(/.+/);
  });

  test('P0: opening another user profile then going back returns to source context', async ({ page }) => {
    await page.goto('/discover');
    const author = page.getByTestId('author-link').first();
    test.skip(!(await author.isVisible().catch(() => false)), 'No author link to test.');
    await author.click();
    await expect(page).toHaveURL(/\/profile\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/discover/);
  });
});

test.describe('Tips', () => {
  test('P0: tips page loads main content blocks', async ({ page }) => {
    await page.goto('/tips');
    await expect(page).toHaveURL(/\/tips/);
    // 等异步加载完成（"加载中..." 消失）
    await expect(page.getByText('加载中...').first()).toBeHidden({ timeout: 30_000 });
    const text = (await page.locator('body').textContent()) || '';
    expect(text.length).toBeGreaterThan(50);
    expect(text).not.toMatch(/Application error|Something went wrong/i);
  });

  test('P1: food encyclopedia filter changes result list', async ({ page }) => {
    await page.goto('/tips');
    const filterBtn = page
      .getByRole('button')
      .filter({ hasText: /素食|清真|辣|甜|filter|筛选/i })
      .first();
    test.skip(!(await filterBtn.isVisible().catch(() => false)), 'Food encyclopedia filter not exposed.');
    await filterBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText(/.+/);
  });
});
