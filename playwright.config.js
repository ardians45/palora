// Test end-to-end di browser asli (Microsoft Edge bawaan Windows, tidak perlu download browser).
// Database PocketBase sementara dibuat di tests/e2e/global-setup.js; frontend dijalankan Vite (proxy ke DB test).
import { defineConfig, devices } from '@playwright/test';

const PB_PORT = 18555;
const WEB_PORT = 5199;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    channel: process.env.PW_CHANNEL || 'msedge',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    viewport: { width: 1366, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Edge'], viewport: { width: 1366, height: 860 } } }],
  webServer: {
    command: `npx vite --port ${WEB_PORT} --strictPort`,
    url: `http://127.0.0.1:${WEB_PORT}`,
    reuseExistingServer: false,
    env: { PB_URL: `http://127.0.0.1:${PB_PORT}` },
    timeout: 60_000,
  },
  metadata: { PB_PORT },
});
