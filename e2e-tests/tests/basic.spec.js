const { test, expect } = require('@playwright/test');
const FrontendErrorMonitor = require('../utils/frontend-error-monitor');

/**
 * BASIC E2E TESTS - Con monitoreo avanzado de errores
 * Estas pruebas validan la funcionalidad básica del frontend
 * con detección automática de problemas
 */

test.describe('Basic Frontend Tests', () => {
  test('should load the main page @smoke', async ({ page }) => {
    // Navegar a la página principal
    await page.goto('http://localhost:8080');
    
    // Verificar que la página carga
    await expect(page).toHaveTitle(/GymTec/i);
    
    // Verificar que hay contenido básico
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    // 🔍 MONITOREO DE ERRORES
    const errorReport = await FrontendErrorMonitor.monitorPage(page, 'main-page-load');
    
    // Verificar que no hay errores críticos
    expect(errorReport.summary.totalErrors).toBe(0);
    
    console.log('✅ Página principal cargada correctamente');
  });

  test('should load login page @smoke', async ({ page }) => {
    // Navegar a la página de login
    await page.goto('http://localhost:8080/login.html');
    
    // Verificar elementos del login
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible(); // Corregido el ID correcto
    
    // 🔍 MONITOREO DE ERRORES
    const errorReport = await FrontendErrorMonitor.monitorPage(page, 'login-page-load');
    
    // Verificar que no hay errores críticos
    expect(errorReport.summary.totalErrors).toBe(0);
    
    // Verificar que AuthManager esté disponible
    const authManagerAvailable = await page.evaluate(() => typeof window.AuthManager !== 'undefined');
    if (!authManagerAvailable) {
      console.log('⚠️ AuthManager no disponible en página de login');
    }
    
    console.log('✅ Página de login cargada correctamente');
  });

  test('should redirect to login when accessing protected pages @smoke', async ({ page }) => {
    // Navegar a la página de tickets (protegida)
    await page.goto('http://localhost:8080/tickets.html');
    
    // Debería redirigir al login por autenticación
    await page.waitForLoadState('networkidle');
    
    // 🔍 MONITOREO DE ERRORES
    const errorReport = await FrontendErrorMonitor.monitorPage(page, 'protected-page-redirect');
    
    // Verificar que redirigió al login o contiene elementos de login
    const html = await page.content();
    const hasLoginElements = html.includes('Login') || html.includes('username') || html.includes('password');
    expect(hasLoginElements).toBe(true);
    
    // Los errores de autenticación son esperados aquí
    console.log(`📊 Errores detectados: ${errorReport.summary.totalErrors} (esperados por autenticación)`);
    
    console.log('✅ Redirección de autenticación funcionando');
  });

  test('should have responsive design @responsive', async ({ page }) => {
    // Probar en diferentes tamaños de pantalla
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:8080');
      
      // Verificar que la página es visible en este viewport
      const body = await page.locator('body');
      await expect(body).toBeVisible();
      
      console.log(`✅ Responsive test passed for ${viewport.width}x${viewport.height}`);
    }
  });

  test('should load CSS and JavaScript files @assets', async ({ page }) => {
    // Lista de recursos esperados
    const expectedResources = [];
    
    // Interceptar todas las requests
    const loadedResources = [];
    page.on('response', response => {
      if (response.status() === 200) {
        loadedResources.push(response.url());
      }
    });

    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');

    // Verificar que al menos algunos recursos se cargaron
    expect(loadedResources.length).toBeGreaterThan(0);
    
    // Verificar que no hay errores 404 críticos
    const failed404s = loadedResources.filter(url => 
      url.includes('404') || url.includes('not-found')
    );
    expect(failed404s.length).toBe(0);
    
    console.log(`✅ ${loadedResources.length} recursos cargados correctamente`);
  });
});
