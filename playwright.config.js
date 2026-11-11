import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testIgnore: /mobile-baseline\.spec\.js/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'en-US',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-pixel7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-iphone13',
      // Device preset defaults to WebKit; force Chromium (D-QA-06) with iPhone viewport/UA.
      // Bump iOS/Safari in UA to 18.2+ so native bottom-sheet is used (D-UI-02); stock
      // iPhone 13 preset is iOS 15 → fallback sheet whose short-panel peek cannot scroll.
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        userAgent: devices['iPhone 13'].userAgent
          .replace(/iPhone OS 15_\d+/, 'iPhone OS 18_2')
          .replace(/Version\/[\d.]+/, 'Version/18.2'),
      },
    },
    {
      name: 'mobile-iphone-se',
      // 375×667 (not 1st-gen 320×568); Chromium-only like iPhone 13.
      use: { ...devices['iPhone SE (3rd gen)'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'mobile-landscape',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
