// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuración Playwright para Gymtec ERP E2E Testing
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000, // 30 segundos por test
  expect: {
    timeout: 5000 // 5 segundos para assertions
  },
  fullyParallel: true, // Ejecutar tests en paralelo
  forbidOnly: !!process.env.CI, // Prevenir test.only en CI
  retries: process.env.CI ? 2 : 0, // Reintentos en CI
  workers: process.env.CI ? 1 : undefined, // Workers en CI vs local
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['junit', { outputFile: 'reports/test-results.xml' }],
    ['line'] // Console output
  ],
  
  // Global test configuration
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry', // Trace en reintentos
    screenshot: 'only-on-failure', // Screenshots solo en fallos
    video: 'retain-on-failure', // Videos solo en fallos
    actionTimeout: 0,
    navigationTimeout: 30000,
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Custom headers for testing
    extraHTTPHeaders: {
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }
  },

  // Projects for multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet testing
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    }
  ],

  // Web server configuration
  webServer: [
    {
      command: 'cd ../backend && npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30000
    },
    {
      command: 'cd ../frontend && python -m http.server 8080',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 15000
    }
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./utils/global-setup.js'),
  globalTeardown: require.resolve('./utils/global-teardown.js'),
  
  // Test output directory
  outputDir: 'test-results/',
  
  // Test files patterns
  testMatch: [
    '**/*.spec.js',
    '**/*.test.js',
    '**/*.e2e.js'
  ],
  
  // Files to ignore
  testIgnore: [
    '**/.git/**',
    '**/node_modules/**',
    '**/test-results/**',
    '**/reports/**'
  ]
});
