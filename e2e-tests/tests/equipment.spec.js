const { test, expect } = require('@playwright/test');

/**
 * Test Suite: Gestión de Equipos
 * Valida CRUD completo de equipos de gimnasio
 */

test.describe('🏋️ Equipment Management @critical', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login y navegación a equipos
    await page.goto('/login.html');
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    await page.click('#login-button');
    await page.waitForURL('**/dashboard.html');
    
    // Navegar a equipos
    await page.click('#nav-equipment');
    await page.waitForURL('**/equipment.html');
    
    await expect(page.locator('#equipment-page')).toBeVisible();
  });

  test('should display equipment list and controls @smoke', async ({ page }) => {
    // Verificar elementos principales
    await expect(page.locator('#equipment-list')).toBeVisible();
    await expect(page.locator('#new-equipment-btn')).toBeVisible();
    await expect(page.locator('#equipment-filters')).toBeVisible();
    
    // Verificar filtros específicos de equipos
    await expect(page.locator('#filter-category')).toBeVisible();
    await expect(page.locator('#filter-status')).toBeVisible();
    await expect(page.locator('#filter-location')).toBeVisible();
    
    // Verificar tabla de equipos
    await expect(page.locator('#equipment-table')).toBeVisible();
    await expect(page.locator('#equipment-table thead')).toBeVisible();
  });

  test('should create new equipment successfully @critical', async ({ page }) => {
    // Abrir modal de nuevo equipo
    await page.click('#new-equipment-btn');
    await expect(page.locator('#equipment-modal')).toBeVisible();
    
    // Llenar información básica
    await page.fill('#equipment-name', 'Cinta de Correr E2E Test');
    await page.fill('#equipment-serial', 'E2E-' + Date.now());
    
    // Seleccionar modelo
    await page.selectOption('#equipment-model', { index: 1 });
    
    // Seleccionar ubicación
    await page.selectOption('#equipment-location', { index: 1 });
    
    // Fecha de instalación
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#installation-date', today);
    
    // Enviar formulario
    await page.click('#submit-equipment');
    
    // Verificar éxito
    await expect(page.locator('#equipment-modal')).not.toBeVisible();
    await page.waitForTimeout(2000);
    
    // Verificar que aparece en la lista
    await expect(page.locator('tr:has-text("Cinta de Correr E2E Test")')).toBeVisible();
  });

  test('should validate equipment form fields', async ({ page }) => {
    await page.click('#new-equipment-btn');
    await expect(page.locator('#equipment-modal')).toBeVisible();
    
    // Intentar enviar formulario vacío
    await page.click('#submit-equipment');
    
    // Modal debe permanecer abierto
    await expect(page.locator('#equipment-modal')).toBeVisible();
    
    // Verificar campos requeridos
    await expect(page.locator('#equipment-name')).toHaveAttribute('required');
    await expect(page.locator('#equipment-serial')).toHaveAttribute('required');
  });

  test('should filter equipment by category', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Filtrar por categoría Cardio
    await page.selectOption('#filter-category', 'Cardio');
    await page.waitForTimeout(1000);
    
    // Verificar que los resultados contienen equipos de cardio
    const equipmentRows = await page.locator('#equipment-table tbody tr');
    const count = await equipmentRows.count();
    
    if (count > 0) {
      // Verificar que al menos un equipo es de categoría Cardio
      await expect(page.locator('td:has-text("Cardio")')).toBeVisible();
    }
    
    // Filtrar por Fuerza
    await page.selectOption('#filter-category', 'Fuerza');
    await page.waitForTimeout(1000);
    
    // Resetear filtro
    await page.selectOption('#filter-category', '');
    await page.waitForTimeout(1000);
  });

  test('should search equipment by name or serial', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Buscar por término genérico
    await page.fill('#search-equipment', 'cinta');
    await page.waitForTimeout(1000);
    
    // Verificar que los resultados contienen el término
    const searchResults = await page.locator('#equipment-table tbody tr').count();
    
    if (searchResults > 0) {
      const firstResult = await page.locator('#equipment-table tbody tr').first().textContent();
      expect(firstResult.toLowerCase()).toContain('cinta');
    }
    
    // Limpiar búsqueda
    await page.fill('#search-equipment', '');
    await page.waitForTimeout(1000);
  });

  test('should edit equipment details @critical', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Click en el primer equipo
    const firstEquipment = page.locator('#equipment-table tbody tr').first();
    await firstEquipment.click();
    
    // Verificar modal de edición
    await expect(page.locator('#equipment-modal')).toBeVisible();
    
    // Verificar que los campos están pre-llenados
    const nameValue = await page.locator('#equipment-name').inputValue();
    expect(nameValue).toBeTruthy();
    
    // Modificar nombre
    const newName = `${nameValue} - EDITADO`;
    await page.fill('#equipment-name', newName);
    
    // Guardar cambios
    await page.click('#submit-equipment');
    
    // Verificar éxito
    await expect(page.locator('#equipment-modal')).not.toBeVisible();
    await page.waitForTimeout(2000);
    
    // Verificar cambio en lista
    await expect(page.locator(`tr:has-text("${newName}")`)).toBeVisible();
  });

  test('should view equipment maintenance history', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Buscar botón de historial de mantenimiento
    const historyButton = page.locator('.view-history-btn, .maintenance-history-btn').first();
    
    if (await historyButton.isVisible()) {
      await historyButton.click();
      
      // Verificar modal o página de historial
      await expect(page.locator('#maintenance-history-modal, #history-section')).toBeVisible();
      
      // Verificar elementos del historial
      await expect(page.locator('.maintenance-record, .history-item')).toHaveCount({ minimum: 0 });
    }
  });

  test('should schedule equipment maintenance', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Buscar botón de programar mantenimiento
    const scheduleButton = page.locator('.schedule-maintenance-btn').first();
    
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      
      // Verificar modal de programación
      await expect(page.locator('#schedule-modal')).toBeVisible();
      
      // Llenar datos de programación
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      await page.fill('#maintenance-date', futureDateStr);
      await page.fill('#maintenance-description', 'Mantenimiento programado E2E');
      
      // Enviar programación
      await page.click('#submit-schedule');
      
      // Verificar éxito
      await expect(page.locator('#schedule-modal')).not.toBeVisible();
    }
  });

  test('should display equipment statistics', async ({ page }) => {
    // Verificar tarjetas de estadísticas
    const statsCards = page.locator('.stats-card, .equipment-stats');
    
    if (await statsCards.first().isVisible()) {
      await expect(statsCards).toHaveCount({ minimum: 3 });
      
      // Verificar estadísticas específicas
      await expect(page.locator('#total-equipment, .total-equipment')).toBeVisible();
      await expect(page.locator('#active-equipment, .active-equipment')).toBeVisible();
      await expect(page.locator('#maintenance-due, .maintenance-due')).toBeVisible();
    }
  });

  test('should generate equipment QR codes', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Buscar funcionalidad de QR
    const qrButton = page.locator('.generate-qr-btn, .qr-code-btn').first();
    
    if (await qrButton.isVisible()) {
      await qrButton.click();
      
      // Verificar modal de QR
      await expect(page.locator('#qr-modal, .qr-display')).toBeVisible();
      
      // Verificar que se muestra el QR
      await expect(page.locator('.qr-code, canvas, img[src*="qr"]')).toBeVisible();
    }
  });

  test('should export equipment list', async ({ page }) => {
    // Buscar botón de exportar
    const exportButton = page.locator('#export-equipment, .export-btn');
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(1000);
      
      // Puede mostrar opciones de exportación
      const exportModal = page.locator('#export-modal');
      if (await exportModal.isVisible()) {
        await expect(exportModal).toBeVisible();
      }
    }
  });

  test('should handle equipment categories correctly', async ({ page }) => {
    await page.click('#new-equipment-btn');
    await expect(page.locator('#equipment-modal')).toBeVisible();
    
    // Verificar que el selector de modelo tiene opciones
    const modelOptions = await page.locator('#equipment-model option').count();
    expect(modelOptions).toBeGreaterThan(1); // Al menos la opción por defecto + modelos
    
    // Seleccionar un modelo
    await page.selectOption('#equipment-model', { index: 1 });
    
    // Verificar que se muestra la categoría del modelo
    const categoryDisplay = page.locator('#model-category, .category-display');
    if (await categoryDisplay.isVisible()) {
      const categoryText = await categoryDisplay.textContent();
      expect(categoryText).toMatch(/Cardio|Fuerza|Funcional|Accesorio/);
    }
  });

  test('should validate serial number uniqueness', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Obtener un serial existente
    const firstRow = page.locator('#equipment-table tbody tr').first();
    const existingSerial = await firstRow.locator('td').nth(2).textContent(); // Asumiendo que el serial está en la 3ra columna
    
    if (existingSerial) {
      // Intentar crear equipo con serial duplicado
      await page.click('#new-equipment-btn');
      await expect(page.locator('#equipment-modal')).toBeVisible();
      
      await page.fill('#equipment-name', 'Equipo Test Duplicado');
      await page.fill('#equipment-serial', existingSerial.trim());
      await page.selectOption('#equipment-model', { index: 1 });
      await page.selectOption('#equipment-location', { index: 1 });
      
      await page.click('#submit-equipment');
      
      // Debe mostrar error de duplicado
      await expect(page.locator('.error-message, .alert-error')).toBeVisible();
      await expect(page.locator('.error-message, .alert-error')).toContainText(/serial|duplicado|existe/i);
    }
  });
});
