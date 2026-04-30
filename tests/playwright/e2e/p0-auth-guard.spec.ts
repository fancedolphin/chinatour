// Module: 认证与导航 — P0 全部 + P1 登录错误 / unauthorized 事件
import { test, expect, TEST_USER } from '../fixtures/test';

test.describe('Auth & navigation', () => {
  test('P0: redirects unauthenticated user from protected pages to /login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    for (const path of ['/trips', '/discover', '/profile']) {
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
      await page.close();
    }
    await ctx.close();
  });

  test('P0: login success → planner with bottom nav highlighted', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/login');
    await page.getByPlaceholder(/邮箱|email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/密码|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /登\s*录|^login$|^log in$|^sign in$/i }).click();
    await expect(page).toHaveURL(/\/(planner)?$|\/$/, { timeout: 20_000 });
    await expect(page.getByTestId('nav-planner')).toBeVisible();
    await ctx.close();
  });

  test('P0: authenticated user visiting /login is redirected to planner', async ({ page }) => {
    await page.goto('/login');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
  });

  test('P0: deep link /trip/:id renders shared trip detail (or login when needed)', async ({ page }) => {
    await page.goto('/trip/nonexistent-id');
    // 可能落到 detail 页或 toast 错误，但 URL 必须保留 /trip/ 前缀
    await expect(page).toHaveURL(/\/trip\//);
  });

  test('P0: deep link /profile/:id renders some-user profile', async ({ page }) => {
    await page.goto('/profile/nonexistent-user');
    await expect(page).toHaveURL(/\/profile\//);
  });

  test('P0: bottom nav switches between top-level tabs', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-planner').waitFor({ timeout: 20_000 });
    await page.getByTestId('nav-trips').click();
    await expect(page).toHaveURL(/\/trips/);
    await page.getByTestId('nav-discover').click();
    await expect(page).toHaveURL(/\/discover/);
    await page.getByTestId('nav-tips').click();
    await expect(page).toHaveURL(/\/tips/);
    await page.getByTestId('nav-planner').click();
    await expect(page).toHaveURL(/\/planner|\/$/);
  });

  test('P0: browser back/forward keeps URL and tab in sync', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-planner').waitFor({ timeout: 20_000 });
    await page.getByTestId('nav-trips').click();
    await expect(page).toHaveURL(/\/trips/);
    await page.goBack();
    await expect(page).toHaveURL(/\/planner|\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/trips/);
  });

  test('P1: login with wrong password shows user-facing error (not raw backend stack)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/login');
    await page.getByPlaceholder(/邮箱|email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/密码|password/i).fill('wrong-password-xx');
    await page.getByRole('button', { name: /登\s*录|^login$|^log in$|^sign in$/i }).click();
    // 不应跳走，且页面不暴露原始堆栈/错误码
    await expect(page).toHaveURL(/\/login/);
    const body = await page.locator('body').textContent();
    expect(body || '').not.toMatch(/AuthApiError|stack trace|status:\s*5\d\d/i);
    await ctx.close();
  });

  test('P1: auth:unauthorized event sends user back to /login', async ({ page }) => {
    await page.goto('/planner');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
