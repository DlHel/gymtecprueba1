const { test, expect } = require('@playwright/test');

/**
 * Test Suite: Autenticación de Usuario
 * Valida el flujo completo de login/logout del sistema Gymtec ERP
 */

test.describe('🔐 Authentication Flow @critical @smoke', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de login
    await page.goto('/login.html');
    
    // Verificar que estamos en la página correcta
    await expect(page).toHaveTitle(/Login.*Gymtec/i);
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('should display login form correctly', async ({ page }) => {
    // Verificar elementos del formulario de login
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#login-button')).toBeVisible();
    
    // Verificar placeholders y labels
    await expect(page.locator('#username')).toHaveAttribute('placeholder', 'Usuario');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    
    // Verificar que el botón está habilitado
    await expect(page.locator('#login-button')).toBeEnabled();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Intentar login sin datos
    await page.click('#login-button');
    
    // Verificar que aparecen mensajes de error
    await expect(page.locator('.error-message')).toBeVisible();
    
    // Verificar que seguimos en la página de login
    await expect(page.url()).toContain('/login.html');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Llenar formulario con credenciales inválidas
    await page.fill('#username', 'invalid@user.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('#login-button');
    
    // Esperar respuesta del servidor
    await page.waitForTimeout(1000);
    
    // Verificar mensaje de error
    await expect(page.locator('.alert-error, .error-message')).toBeVisible();
    await expect(page.locator('.alert-error, .error-message')).toContainText(/credenciales|inválido|error/i);
  });

  test('should login successfully with valid admin credentials @critical', async ({ page }) => {
    // Llenar formulario con credenciales válidas
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    
    // Hacer click en login
    await page.click('#login-button');
    
    // Esperar redirección al dashboard
    await page.waitForURL('**/dashboard.html', { timeout: 10000 });
    
    // Verificar que estamos en el dashboard
    await expect(page).toHaveTitle(/Dashboard.*Gymtec/i);
    await expect(page.locator('#main-dashboard')).toBeVisible();
    
    // Verificar elementos del dashboard
    await expect(page.locator('.stats-card')).toHaveCount(4); // Estadísticas principales
    await expect(page.locator('#user-menu')).toBeVisible(); // Menú de usuario
    await expect(page.locator('#main-nav')).toBeVisible(); // Navegación principal
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Login exitoso
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    await page.click('#login-button');
    
    await page.waitForURL('**/dashboard.html');
    
    // Refrescar página
    await page.reload();
    
    // Verificar que seguimos autenticados
    await expect(page.url()).toContain('/dashboard.html');
    await expect(page.locator('#main-dashboard')).toBeVisible();
  });

  test('should logout successfully @critical', async ({ page }) => {
    // Login primero
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    await page.click('#login-button');
    
    await page.waitForURL('**/dashboard.html');
    
    // Hacer logout
    await page.click('#user-menu');
    await page.click('#logout-button');
    
    // Verificar redirección al login
    await page.waitForURL('**/login.html', { timeout: 5000 });
    
    // Verificar que estamos en login y no hay sesión
    await expect(page.locator('#login-form')).toBeVisible();
    
    // Intentar acceder a página protegida debe redirigir
    await page.goto('/dashboard.html');
    await page.waitForURL('**/login.html');
  });

  test('should handle session timeout', async ({ page }) => {
    // Login exitoso
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    await page.click('#login-button');
    
    await page.waitForURL('**/dashboard.html');
    
    // Simular token expirado eliminando del localStorage
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
    });
    
    // Intentar navegar a otra página
    await page.goto('/tickets.html');
    
    // Debe redirigir al login
    await page.waitForURL('**/login.html');
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('should prevent access to protected pages without authentication', async ({ page }) => {
    const protectedPages = [
      '/dashboard.html',
      '/tickets.html',
      '/equipment.html',
      '/clients.html',
      '/inventory.html',
      '/expenses.html',
      '/users.html'
    ];

    for (const pageUrl of protectedPages) {
      await page.goto(pageUrl);
      
      // Debe redirigir al login
      await page.waitForURL('**/login.html');
      await expect(page.locator('#login-form')).toBeVisible();
    }
  });

  test('should show loading state during login', async ({ page }) => {
    // Llenar formulario
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    
    // Hacer click y verificar loading state
    await page.click('#login-button');
    
    // Verificar que el botón muestra loading
    await expect(page.locator('#login-button')).toBeDisabled();
    
    // Esperar a que termine el loading
    await page.waitForURL('**/dashboard.html');
  });
});
