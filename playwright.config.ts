import { defineConfig, devices } from '@playwright/test';

/**
 * DHRUV end-to-end smoke tests.  Run:  npm run test:e2e
 * Uses an already-running app at E2E_BASE_URL (default http://localhost:3000), or starts `npm run dev`.
 * Tests tagged @ai call the live AI provider and are slower; skip them with:  npm run test:e2e -- --grep-invert @ai
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Dev-server first compiles and AI answers can take a while.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
