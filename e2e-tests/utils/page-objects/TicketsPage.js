/**
 * Page Object Model: Tickets Page
 * Encapsula interacciones con la página de gestión de tickets
 */

class TicketsPage {
  constructor(page) {
    this.page = page;
    
    // Selectores principales
    this.ticketsPage = '#tickets-page';
    this.ticketsList = '#tickets-list';
    this.ticketsTable = '#tickets-table';
    this.newTicketButton = '#new-ticket-btn';
    this.ticketModal = '#ticket-modal';
    this.ticketForm = '#ticket-form';
    
    // Formulario de ticket
    this.titleInput = '#ticket-title';
    this.descriptionInput = '#ticket-description';
    this.prioritySelect = '#ticket-priority';
    this.clientSelect = '#client-select';
    this.locationSelect = '#location-select';
    this.equipmentSelect = '#equipment-select';
    this.submitButton = '#submit-ticket';
    this.cancelButton = '#cancel-ticket';
    
    // Filtros y búsqueda
    this.filtersContainer = '#filters-container';
    this.statusFilter = '#filter-status';
    this.priorityFilter = '#filter-priority';
    this.searchInput = '#search-input';
    
    // Elementos de la tabla
    this.tableRows = '#tickets-table tbody tr';
    this.tableHeaders = '#tickets-table thead th';
    
    // Estadísticas
    this.statsCards = '.stats-card';
    this.totalTickets = '#total-tickets';
    this.openTickets = '#open-tickets';
    this.highPriorityTickets = '#high-priority-tickets';
    this.overdueTickets = '#overdue-tickets';
    
    // Acciones
    this.editButtons = '.edit-ticket-btn';
    this.deleteButtons = '.delete-ticket-btn';
    this.viewButtons = '.view-ticket-btn';
    
    // Notificaciones
    this.successAlert = '.alert-success, .notification-success';
    this.errorAlert = '.alert-error, .notification-error';
  }

  // Navegación
  async goto() {
    await this.page.goto('/tickets.html');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.ticketsPage);
  }

  // Verificaciones de página
  async isPageLoaded() {
    return await this.page.isVisible(this.ticketsPage);
  }

  async areControlsVisible() {
    const controls = {
      newButton: await this.page.isVisible(this.newTicketButton),
      filters: await this.page.isVisible(this.filtersContainer),
      table: await this.page.isVisible(this.ticketsTable),
      search: await this.page.isVisible(this.searchInput)
    };
    return controls;
  }

  // Gestión de tickets
  async clickNewTicket() {
    await this.page.click(this.newTicketButton);
    await this.page.waitForSelector(this.ticketModal);
  }

  async fillTicketForm(ticketData) {
    await this.page.fill(this.titleInput, ticketData.title);
    await this.page.fill(this.descriptionInput, ticketData.description);
    
    if (ticketData.priority) {
      await this.page.selectOption(this.prioritySelect, ticketData.priority);
    }
    
    if (ticketData.clientId) {
      await this.page.selectOption(this.clientSelect, ticketData.clientId.toString());
      // Esperar a que se carguen las ubicaciones
      await this.page.waitForTimeout(1000);
    }
    
    if (ticketData.locationId) {
      await this.page.selectOption(this.locationSelect, ticketData.locationId.toString());
      // Esperar a que se carguen los equipos
      await this.page.waitForTimeout(1000);
    }
    
    if (ticketData.equipmentId) {
      await this.page.selectOption(this.equipmentSelect, ticketData.equipmentId.toString());
    }
  }

  async submitTicket() {
    await this.page.click(this.submitButton);
    await this.page.waitForSelector(this.ticketModal, { state: 'hidden' });
  }

  async cancelTicket() {
    await this.page.click(this.cancelButton);
    await this.page.waitForSelector(this.ticketModal, { state: 'hidden' });
  }

  async createTicket(ticketData) {
    await this.clickNewTicket();
    await this.fillTicketForm(ticketData);
    await this.submitTicket();
  }

  // Búsqueda y filtros
  async searchTickets(searchTerm) {
    await this.page.fill(this.searchInput, searchTerm);
    await this.page.waitForTimeout(1000); // Esperar debounce
  }

  async filterByStatus(status) {
    await this.page.selectOption(this.statusFilter, status);
    await this.page.waitForTimeout(1000);
  }

  async filterByPriority(priority) {
    await this.page.selectOption(this.priorityFilter, priority);
    await this.page.waitForTimeout(1000);
  }

  async clearFilters() {
    await this.page.selectOption(this.statusFilter, '');
    await this.page.selectOption(this.priorityFilter, '');
    await this.page.fill(this.searchInput, '');
    await this.page.waitForTimeout(1000);
  }

  // Interacciones con tabla
  async getTicketsCount() {
    return await this.page.locator(this.tableRows).count();
  }

  async getTicketByIndex(index) {
    const row = this.page.locator(this.tableRows).nth(index);
    const cells = await row.locator('td').allTextContents();
    
    return {
      title: cells[0] || '',
      status: cells[1] || '',
      priority: cells[2] || '',
      equipment: cells[3] || '',
      created: cells[4] || ''
    };
  }

  async clickTicketByIndex(index) {
    await this.page.locator(this.tableRows).nth(index).click();
    await this.page.waitForSelector(this.ticketModal);
  }

  async editTicketByIndex(index) {
    const editButton = this.page.locator(this.tableRows).nth(index).locator(this.editButtons);
    await editButton.click();
    await this.page.waitForSelector(this.ticketModal);
  }

  async deleteTicketByIndex(index) {
    const deleteButton = this.page.locator(this.tableRows).nth(index).locator(this.deleteButtons);
    
    // Setup dialog handler for confirmation
    this.page.on('dialog', dialog => dialog.accept());
    
    await deleteButton.click();
    await this.page.waitForTimeout(1000);
  }

  // Estadísticas
  async getStatistics() {
    const stats = {};
    
    if (await this.page.isVisible(this.totalTickets)) {
      stats.total = await this.page.textContent(this.totalTickets);
    }
    
    if (await this.page.isVisible(this.openTickets)) {
      stats.open = await this.page.textContent(this.openTickets);
    }
    
    if (await this.page.isVisible(this.highPriorityTickets)) {
      stats.highPriority = await this.page.textContent(this.highPriorityTickets);
    }
    
    if (await this.page.isVisible(this.overdueTickets)) {
      stats.overdue = await this.page.textContent(this.overdueTickets);
    }
    
    return stats;
  }

  // Validaciones
  async isModalOpen() {
    return await this.page.isVisible(this.ticketModal);
  }

  async isFormValid() {
    const title = await this.page.inputValue(this.titleInput);
    const description = await this.page.inputValue(this.descriptionInput);
    
    return title.length > 0 && description.length > 0;
  }

  async getSuccessMessage() {
    if (await this.page.isVisible(this.successAlert)) {
      return await this.page.textContent(this.successAlert);
    }
    return null;
  }

  async getErrorMessage() {
    if (await this.page.isVisible(this.errorAlert)) {
      return await this.page.textContent(this.errorAlert);
    }
    return null;
  }

  // Métodos de utilidad
  async waitForTicketsToLoad() {
    await this.page.waitForSelector(this.tableRows, { timeout: 10000 });
    await this.page.waitForTimeout(1000); // Buffer adicional
  }

  async getTableHeaders() {
    return await this.page.locator(this.tableHeaders).allTextContents();
  }

  async sortByColumn(columnIndex) {
    await this.page.locator(this.tableHeaders).nth(columnIndex).click();
    await this.page.waitForTimeout(1000);
  }

  // Navegación a tickets específicos
  async searchAndOpenTicket(ticketTitle) {
    await this.searchTickets(ticketTitle);
    
    const ticketRow = this.page.locator(`${this.tableRows}:has-text("${ticketTitle}")`);
    if (await ticketRow.isVisible()) {
      await ticketRow.click();
      return true;
    }
    
    return false;
  }

  // Bulk operations
  async selectAllTickets() {
    const selectAllCheckbox = this.page.locator('#select-all-tickets');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
    }
  }

  async getSelectedTicketsCount() {
    return await this.page.locator('input[name="ticket-checkbox"]:checked').count();
  }
}

module.exports = TicketsPage;
