// Module: Planner 与 AI 规划链路 — P0 主入口分支 + Existing plan
//
// Note: 完整的"生成 → 预览地图 → 保存"链路依赖 GuidedQuestionPage 多步表单与
// AIPlannerChatPage 的具体 selector，此处先校验入口分支与基本可达性，
// 完整生成断言交给 `planner-extended.spec.ts`（对接 stubGeminiProxy 的 fixed plan）。
import { test, expect } from '../fixtures/test';

test.describe('Planner entry', () => {
  async function waitForModePicker(page: import('@playwright/test').Page) {
    await page.goto('/planner');
    await page.getByRole('button', { name: /从零开始规划/ }).waitFor({ timeout: 20_000 });
  }

  test('P0: user picks "从零开始规划" branch', async ({ page }) => {
    await waitForModePicker(page);
    await page.getByRole('button', { name: /从零开始规划/ }).click();
    await expect(page.getByTestId('guided-back')).toBeVisible();
  });

  test('P0: user picks "已有初步计划" branch', async ({ page }) => {
    await waitForModePicker(page);
    await page.getByRole('button', { name: /已有初步计划/ }).click();
    await expect(page.locator('textarea, [contenteditable="true"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('P0: back button from guided questions returns to planner mode picker', async ({ page }) => {
    await waitForModePicker(page);
    await page.getByRole('button', { name: /从零开始规划/ }).click();
    await page.getByTestId('guided-back').click();
    await expect(page.getByRole('button', { name: /从零开始规划/ })).toBeVisible();
  });
});
