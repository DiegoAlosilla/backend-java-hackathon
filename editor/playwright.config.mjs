import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration', timeout: 60000, workers: 1,
  use: {baseURL: 'http://127.0.0.1:8080', viewport: {width: 1440, height: 1000}, headless: true, trace: 'retain-on-failure'},
  reporter: [['list'], ['json', {outputFile: 'test-results/results.json'}]],
  webServer: {command: 'npm start', url: 'http://127.0.0.1:8080/health', reuseExistingServer: true, timeout: 180000}
});
