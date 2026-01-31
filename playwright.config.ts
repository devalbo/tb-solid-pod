import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  featuresRoot: './tests/features',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
  },
  projects: [
    // Browser scenarios only (Example #1 in each outline). Terminal scenarios run via test:e2e:terminal (no browser).
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grep: /Example #1/ },
  ],
  // No webServer: start the dev server yourself (e.g. npm run dev) before running BDD/E2E tests.
});
