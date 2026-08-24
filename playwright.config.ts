import { defineConfig } from '@playwright/test'

const port = 3210

export default defineConfig({
  testDir: './tests/scenarios',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 1100 },
  },
  webServer: {
    command: `pnpm dev --port ${port}`,
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      ONEIMG_ENABLE_STUDIO: '1',
      ONEIMG_ENABLE_SCENARIOS: '1',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: `http://127.0.0.1:${port}`,
  },
})
