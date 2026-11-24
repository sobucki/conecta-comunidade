import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
