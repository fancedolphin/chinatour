import { defineConfig, devices } from '@playwright/test';

const ZH_PORT = Number(process.env.PLAYWRIGHT_PORT || 5173);
const EN_PORT = Number(process.env.PLAYWRIGHT_EN_PORT || 5174);
const ZH_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${ZH_PORT}`;
const EN_URL = process.env.PLAYWRIGHT_EN_URL || `http://127.0.0.1:${EN_PORT}`;

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: ZH_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'setup-zh',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], locale: 'zh-CN', baseURL: ZH_URL },
    },
    {
      name: 'setup-en',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], locale: 'en-US', baseURL: EN_URL },
      metadata: { storageStateOverride: 'tests/playwright/.auth/user-en.json' },
    },
    {
      name: 'zh',
      testMatch: /e2e\/.*\.spec\.ts/,
      testIgnore: /e2e\/en-locale\.spec\.ts/,
      dependencies: ['setup-zh'],
      use: {
        ...devices['Desktop Chrome'],
        locale: 'zh-CN',
        baseURL: ZH_URL,
        storageState: 'tests/playwright/.auth/user.json',
      },
    },
    {
      name: 'en',
      testMatch: /e2e\/(p0-auth-guard|en-locale)\.spec\.ts/,
      dependencies: ['setup-en'],
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-US',
        baseURL: EN_URL,
        storageState: 'tests/playwright/.auth/user-en.json',
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: `npm run dev:zh -- --port ${ZH_PORT} --strictPort`,
          url: ZH_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `npm run dev:en -- --port ${EN_PORT} --strictPort`,
          url: EN_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
