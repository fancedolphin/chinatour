import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { TEST_USER } from './fixtures/test';

const FIXTURE_TRIP_DESTINATION = 'E2E Fixture · 北京';

setup('authenticate and seed fixture trip', async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const storagePath =
    projectName === 'setup-en'
      ? path.join(__dirname, '.auth/user-en.json')
      : path.join(__dirname, '.auth/user.json');
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

  // 1. Log in
  await page.goto('/login');
  await page.getByPlaceholder(/邮箱|email/i).fill(TEST_USER.email);
  await page.getByPlaceholder(/密码|password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /登\s*录|^login$|^log in$|^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  // 2. Idempotently seed one fixture trip via the dev-mode window.__supabase client.
  const seedOutcome = await page.evaluate(async (destination) => {
    const client = (window as unknown as { __supabase?: any }).__supabase;
    if (!client) return { skipped: 'no-client' };

    const { data: user } = await client.auth.getUser();
    if (!user?.user?.id) return { skipped: 'no-user' };

    const existing = await client
      .from('trips')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('destination', destination)
      .limit(1)
      .maybeSingle();
    if (existing.data) return { ok: true, tripId: existing.data.id, action: 'reuse' };

    const trip = {
      user_id: user.user.id,
      destination,
      start_date: '2026-05-01',
      end_date: '2026-05-03',
      duration: '3天',
      budget: '¥3000',
      image_url: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800',
      status: 'planning',
      source: 'ai',
    };
    const inserted = await client.from('trips').insert(trip).select().single();
    if (inserted.error) return { skipped: `insert-error:${inserted.error.message}` };
    return { ok: true, tripId: inserted.data.id, action: 'created' };
  }, FIXTURE_TRIP_DESTINATION);

  console.log(`[auth.setup:${projectName}] seed outcome:`, seedOutcome);

  await page.context().storageState({ path: storagePath });
});

export { FIXTURE_TRIP_DESTINATION };
