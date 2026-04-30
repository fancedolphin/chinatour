import { test as base, expect } from '@playwright/test';
import { applyDefaultStubs } from './stubs';

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@test123.com',
  password: process.env.E2E_TEST_PASSWORD || 'Test123!',
};

type Fixtures = {
  stubsApplied: void;
};

export const test = base.extend<Fixtures>({
  stubsApplied: [
    async ({ page }, use) => {
      await applyDefaultStubs(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
