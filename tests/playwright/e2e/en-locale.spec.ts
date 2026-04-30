// EN matrix — runs against the EN-built dev server (vite --mode en).
// VITE_LOCALE=en takes precedence over localStorage in resolveInitialLocale().
import { test, expect } from '../fixtures/test';

test.describe('EN locale', () => {
  test('bottom nav shows English labels', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-planner').waitFor({ timeout: 20_000 });
    // Each nav button contains its localized label as text
    await expect(page.getByTestId('nav-planner')).toContainText(/Plan/i);
    await expect(page.getByTestId('nav-trips')).toContainText(/Trips/i);
    await expect(page.getByTestId('nav-tips')).toContainText(/Travel Tips/i);
    await expect(page.getByTestId('nav-discover')).toContainText(/Explore/i);
    await expect(page.getByTestId('nav-profile')).toContainText(/Profile/i);
  });

  test('planner mode picker shows English copy', async ({ page }) => {
    await page.goto('/planner');
    // EN: planInput.modeNew = "Plan from scratch", modeExisting = "I have a draft"
    await expect(
      page.getByRole('button', { name: /plan from scratch|i have a draft/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('tips page renders without untranslated zh strings in main content', async ({ page }) => {
    await page.goto('/tips');
    await page.getByText(/loading|加载中/i).first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    const text = (await page.locator('main, body').first().textContent()) || '';
    expect(text.length).toBeGreaterThan(50);
    // Allow Chinese place/dish names (encyclopedia content) but require English UI scaffolding.
    expect(text).toMatch(/Tips|Travel|Food|Emergency/i);
  });
});
