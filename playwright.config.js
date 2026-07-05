const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8788',
    viewport: { width: 1366, height: 900 },
  },
  webServer: {
    command: 'node scripts/serve.mjs 8788',
    url: 'http://localhost:8788',
    reuseExistingServer: true,
    timeout: 15000,
  },
});
