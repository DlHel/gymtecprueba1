// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * CONFIGURACION SIMPLE para E2E Tests básicos
 * Sin configuración global que podría fallar
 */

module.exports = defineConfig({
  testDir: './tests',
  
  /* Configuración básica */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  /* Ejecutar tests en paralelo */
  fullyParallel: true,
  
  /* Configuración de reintentos */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers para ejecución */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: [
    ['html', { outputFolder: 'reports/html-report' }],
    ['list']
  ],
  
  /* Configuración global de output */
  outputDir: 'test-results/',
  
  /* SIN setup/teardown global para evitar problemas de DB */
  // globalSetup: undefined,
  // globalTeardown: undefined,
  
  /* Configuración por proyecto */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Screenshot en caso de error
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
      },
    },
  ],

  /* Configuración del servidor web local */
  webServer: {
    command: 'echo "Servidores ya ejecutándose en localhost:8080 y localhost:3000"',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 10 * 1000,
  },
});
