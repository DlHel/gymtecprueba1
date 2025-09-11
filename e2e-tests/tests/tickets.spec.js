const { test, expect } = require('@playwright/test');

/**
 * Test Suite: Sistema de Tickets
 * Valida flujo completo de gestión de tickets de mantenimiento
 */

test.describe('🎫 Tickets Management @critical', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como administrador
    await page.goto('/login.html');
    await page.fill('#username', 'admin@gymtec.com');
    await page.fill('#password', 'admin123');
    await page.click('#login-button');
    await page.waitForURL('**/dashboard.html');
    
    // Navegar a tickets
    await page.click('#nav-tickets');
    await page.waitForURL('**/tickets.html');
    
    // Verificar que estamos en la página correcta
    await expect(page.locator('#tickets-page')).toBeVisible();
  });

  test('should display tickets list correctly @smoke', async ({ page }) => {
    // Verificar elementos principales de la página
    await expect(page.locator('#tickets-list')).toBeVisible();
    await expect(page.locator('#new-ticket-btn')).toBeVisible();
    await expect(page.locator('#filters-container')).toBeVisible();
    
    // Verificar filtros
    await expect(page.locator('#filter-status')).toBeVisible();
    await expect(page.locator('#filter-priority')).toBeVisible();
    await expect(page.locator('#search-input')).toBeVisible();
    
    // Verificar tabla de tickets
    await expect(page.locator('#tickets-table')).toBeVisible();
    await expect(page.locator('#tickets-table thead')).toBeVisible();
  });

  test('should create new ticket successfully @critical', async ({ page }) => {
    // Click en nuevo ticket
    await page.click('#new-ticket-btn');
    
    // Verificar que se abre el modal
    await expect(page.locator('#ticket-modal')).toBeVisible();
    await expect(page.locator('#ticket-form')).toBeVisible();
    
    // Llenar formulario de ticket
    await page.fill('#ticket-title', 'Test Maintenance Ticket E2E');
    await page.fill('#ticket-description', 'Descripción detallada del problema de mantenimiento para testing E2E');
    
    // Seleccionar prioridad
    await page.selectOption('#ticket-priority', 'high');
    
    // Seleccionar cliente (esto cargará las ubicaciones)
    await page.selectOption('#client-select', { index: 1 });
    await page.waitForTimeout(1000); // Esperar carga de ubicaciones
    
    // Seleccionar ubicación (esto cargará los equipos)
    await page.selectOption('#location-select', { index: 1 });
    await page.waitForTimeout(1000); // Esperar carga de equipos
    
    // Seleccionar equipo
    await page.selectOption('#equipment-select', { index: 1 });
    
    // Enviar formulario
    await page.click('#submit-ticket');
    
    // Verificar que el modal se cierra
    await expect(page.locator('#ticket-modal')).not.toBeVisible();
    
    // Verificar que aparece el nuevo ticket en la lista
    await page.waitForTimeout(2000);
    await expect(page.locator('tr:has-text("Test Maintenance Ticket E2E")')).toBeVisible();
    
    // Verificar notificación de éxito
    await expect(page.locator('.alert-success, .notification-success')).toBeVisible();
  });

  test('should validate required fields in ticket form', async ({ page }) => {
    // Abrir modal de nuevo ticket
    await page.click('#new-ticket-btn');
    await expect(page.locator('#ticket-modal')).toBeVisible();
    
    // Intentar enviar formulario vacío
    await page.click('#submit-ticket');
    
    // Verificar que no se cierra el modal y muestra errores
    await expect(page.locator('#ticket-modal')).toBeVisible();
    
    // Verificar campos requeridos
    await expect(page.locator('#ticket-title')).toHaveAttribute('required');
    await expect(page.locator('#ticket-description')).toHaveAttribute('required');
    
    // Llenar solo título
    await page.fill('#ticket-title', 'Título de prueba');
    await page.click('#submit-ticket');
    
    // Aún debe mostrar errores para otros campos
    await expect(page.locator('#ticket-modal')).toBeVisible();
  });

  test('should filter tickets by status', async ({ page }) => {
    // Esperar a que carguen los tickets
    await page.waitForTimeout(2000);
    
    // Contar tickets iniciales
    const initialTickets = await page.locator('#tickets-table tbody tr').count();
    
    // Filtrar por estado "Abierto"
    await page.selectOption('#filter-status', 'open');
    await page.waitForTimeout(1000);
    
    // Verificar que se filtran los tickets
    const openTickets = await page.locator('#tickets-table tbody tr').count();
    
    // Cambiar filtro a "Cerrado"
    await page.selectOption('#filter-status', 'closed');
    await page.waitForTimeout(1000);
    
    const closedTickets = await page.locator('#tickets-table tbody tr').count();
    
    // Verificar que los números cambian
    expect(openTickets).not.toBe(closedTickets);
    
    // Resetear filtro a "Todos"
    await page.selectOption('#filter-status', '');
    await page.waitForTimeout(1000);
    
    const allTickets = await page.locator('#tickets-table tbody tr').count();
    expect(allTickets).toBeGreaterThanOrEqual(Math.max(openTickets, closedTickets));
  });

  test('should search tickets by text', async ({ page }) => {
    // Esperar a que carguen los tickets
    await page.waitForTimeout(2000);
    
    // Buscar un término específico
    await page.fill('#search-input', 'mantenimiento');
    await page.waitForTimeout(1000);
    
    // Verificar que los resultados contienen el término
    const ticketRows = await page.locator('#tickets-table tbody tr').all();
    
    for (const row of ticketRows) {
      const text = await row.textContent();
      expect(text.toLowerCase()).toContain('mantenimiento');
    }
    
    // Limpiar búsqueda
    await page.fill('#search-input', '');
    await page.waitForTimeout(1000);
  });

  test('should edit existing ticket @critical', async ({ page }) => {
    // Esperar a que carguen los tickets
    await page.waitForTimeout(2000);
    
    // Click en el primer ticket para editarlo
    const firstTicketRow = page.locator('#tickets-table tbody tr').first();
    await firstTicketRow.click();
    
    // Verificar que se abre el modal de edición
    await expect(page.locator('#ticket-modal')).toBeVisible();
    await expect(page.locator('#ticket-form')).toBeVisible();
    
    // Verificar que los campos están pre-llenados
    const titleValue = await page.locator('#ticket-title').inputValue();
    expect(titleValue).toBeTruthy();
    
    // Modificar el título
    const newTitle = `${titleValue} - EDITADO E2E`;
    await page.fill('#ticket-title', newTitle);
    
    // Guardar cambios
    await page.click('#submit-ticket');
    
    // Verificar que el modal se cierra
    await expect(page.locator('#ticket-modal')).not.toBeVisible();
    
    // Verificar que el título se actualizó en la lista
    await page.waitForTimeout(2000);
    await expect(page.locator(`tr:has-text("${newTitle}")`)).toBeVisible();
  });

  test('should delete ticket with confirmation', async ({ page }) => {
    // Esperar a que carguen los tickets
    await page.waitForTimeout(2000);
    
    // Contar tickets iniciales
    const initialCount = await page.locator('#tickets-table tbody tr').count();
    
    // Hacer hover en el primer ticket para mostrar acciones
    const firstTicketRow = page.locator('#tickets-table tbody tr').first();
    await firstTicketRow.hover();
    
    // Click en el botón de eliminar
    await page.click('.delete-ticket-btn');
    
    // Verificar confirmación
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('eliminar');
      await dialog.accept();
    });
    
    // Esperar a que se elimine
    await page.waitForTimeout(2000);
    
    // Verificar que se redujo el número de tickets
    const finalCount = await page.locator('#tickets-table tbody tr').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should display ticket statistics correctly', async ({ page }) => {
    // Verificar que existen las tarjetas de estadísticas
    await expect(page.locator('.stats-card')).toHaveCount(4);
    
    // Verificar estadísticas específicas
    await expect(page.locator('#total-tickets')).toBeVisible();
    await expect(page.locator('#open-tickets')).toBeVisible();
    await expect(page.locator('#high-priority-tickets')).toBeVisible();
    await expect(page.locator('#overdue-tickets')).toBeVisible();
    
    // Verificar que los números son válidos
    const totalTickets = await page.locator('#total-tickets').textContent();
    expect(parseInt(totalTickets)).toBeGreaterThanOrEqual(0);
  });

  test('should handle pagination if implemented', async ({ page }) => {
    // Esperar a que carguen los tickets
    await page.waitForTimeout(2000);
    
    // Verificar si existe paginación
    const paginationExists = await page.locator('.pagination').isVisible().catch(() => false);
    
    if (paginationExists) {
      // Verificar elementos de paginación
      await expect(page.locator('.pagination')).toBeVisible();
      
      // Test navegación si hay múltiples páginas
      const nextButton = page.locator('.pagination .next');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        // Verificar que cambió el contenido
        await expect(page.locator('#tickets-table tbody')).toBeVisible();
      }
    }
  });

  test('should export tickets data', async ({ page }) => {
    // Verificar si existe botón de exportar
    const exportButton = page.locator('#export-tickets');
    
    if (await exportButton.isVisible()) {
      // Click en exportar
      await exportButton.click();
      
      // Verificar descarga o modal de exportación
      await page.waitForTimeout(2000);
      
      // Puede aparecer un modal de opciones de exportación
      const exportModal = page.locator('#export-modal');
      if (await exportModal.isVisible()) {
        await expect(exportModal).toBeVisible();
      }
    }
  });
});
