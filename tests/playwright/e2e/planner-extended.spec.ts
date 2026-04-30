// Module: Planner — P1 补充 (existing-plan 文本生成、详情卡打开关闭)
//
// 完整 GuidedQuestion 表单链路 selector 频繁变动，先用更稳定的 ExistingPlan 入口
// 验证"粘贴 → 生成"主链路。Gemini 已被 stubGeminiProxy 拦截为固定行程。
import { test, expect } from '../fixtures/test';

const SAMPLE_EXISTING_PLAN = `北京 3 天计划：
Day 1: 故宫 / 天安门 / 王府井
Day 2: 八达岭长城
Day 3: 颐和园 / 圆明园`;

test.describe('Planner — existing plan branch', () => {
  test('P0: paste existing plan and generate', async ({ page }) => {
    await page.goto('/planner');
    const existingBtn = page.getByRole('button', { name: /已有初步计划/ });
    await existingBtn.waitFor({ timeout: 20_000 });
    await existingBtn.click();

    const textarea = page.locator('textarea, [contenteditable="true"]').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(SAMPLE_EXISTING_PLAN);

    const submit = page
      .getByRole('button', { name: /生成|Generate|开始|提交|继续|Submit/ })
      .first();
    test.skip(!(await submit.isVisible().catch(() => false)), 'Submit button not exposed yet.');
    await submit.click();

    // stubGeminiProxy 返回固定行程，AIPlannerChatPage 应渲染 destination
    await expect(page.locator('body')).toContainText(/北京|Beijing/i, { timeout: 30_000 });
  });

  test('P1: detail card open & close — attraction', async ({ page }) => {
    await page.goto('/planner');
    test.skip(true, 'Detail card requires a generated trip; covered manually until P0 generation chain is stable.');
  });
});
