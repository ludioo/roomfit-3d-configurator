import { defineConfig, devices } from '@playwright/test';

/** M0 visual baseline only — does not replace playwright.config.js / CI e2e. */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /mobile-baseline\.spec\.js/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'en-US',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'baseline-360',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 800 },
      },
    },
    {
      name: 'baseline-390',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'baseline-375',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 667 },
      },
    },
    {
      name: 'baseline-landscape',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'baseline-se-landscape',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 667, height: 375 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
