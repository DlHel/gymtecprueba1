// Finanzas Modals - Sistema de modales para cotizaciones y facturas
class FinancialModals {
    constructor(apiWrapper) {
        this.api = apiWrapper;
        this.currentQuote = null;
        this.currentInvoice = null;
        this.clients = [];
        this.locations = [];
        
        this.init();
    }

    async init() {
        try {
            // Cargar datos de clientes y ubicaciones
            await this.loadBaseData();
            
            // Configurar event listeners para modales
            this.setupModalEvents();
            
            console.log('📋 Modales financieros inicializados');
        } catch (error) {
            console.error('❌ Error inicializando modales:', error);
        }
    }

    async loadBaseData() {
        try {
            const [clientsResponse, locationsResponse] = await Promise.all([
                this.api.get('/api/clients'),
                this.api.get('/api/locations')
            ]);
            
            this.clients = clientsResponse.data || [];
            this.locations = locationsResponse.data || [];
        } catch (error) {
            console.error('❌ Error cargando datos base:', error);
        }
    }

    setupModalEvents() {
        // Configurar eventos de cierre de modales con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeQuoteModal();
                this.closeInvoiceModal();
            }
        });

        // Configurar clics fuera del modal para cerrar
        const quoteModal = document.getElementById('quote-modal');
        const invoiceModal = document.getElementById('invoice-modal');

        if (quoteModal) {
            quoteModal.addEventListener('click', (e) => {
                if (e.target === quoteModal) {
                    this.closeQuoteModal();
                }
            });
        }

        if (invoiceModal) {
            invoiceModal.addEventListener('click', (e) => {
                if (e.target === invoiceModal) {
                    this.closeInvoiceModal();
                }
            });
        }

        console.log('🔧 Event listeners de modales configurados');
    }

    // === MODAL COTIZACIÓN ===
    showQuoteModal(quoteId = null) {
        this.currentQuote = quoteId;
        const modal = document.getElementById('quote-modal');
        const title = document.getElementById('quote-modal-title');
        
        title.textContent = quoteId ? 'Editar Cotización' : 'Nueva Cotización';
        
        this.renderQuoteForm(quoteId);
        modal.classList.add('is-open');
        
        // Autofocus en primer campo
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    closeQuoteModal() {
        const modal = document.getElementById('quote-modal');
        modal.classList.remove('is-open');
        this.currentQuote = null;
        
        // Limpiar formulario
        const form = document.getElementById('quote-form');
        if (form) form.reset();
    }

    renderQuoteForm(quoteId = null) {
        const formContainer = document.getElementById('quote-form');
        
        formContainer.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label for="quote-client">Cliente *</label>
                    <select id="quote-client" name="client_id" required>
                        <option value="">Seleccionar cliente...</option>
                        ${this.clients.map(client => 
                            `<option value="${client.id}">${client.name} (${client.rut})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="quote-location">Ubicación</label>
                    <select id="quote-location" name="location_id">
                        <option value="">Seleccionar ubicación...</option>
                        ${this.locations.map(location => 
                            `<option value="${location.id}">${location.name}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="quote-title">Título *</label>
                    <input type="text" id="quote-title" name="title" required 
                           placeholder="Ej: Mantenimiento equipos cardiovasculares">
                </div>
                <div class="form-group">
                    <label for="quote-status">Estado</label>
                    <select id="quote-status" name="status">
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobada</option>
                        <option value="rejected">Rechazada</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="quote-description">Descripción</label>
                <textarea id="quote-description" name="description" rows="3"
                          placeholder="Descripción detallada de los trabajos a realizar..."></textarea>
            </div>

            <!-- Sección de Items -->
            <div class="items-section">
                <div class="items-header">
                    <h4>Items de la Cotización</h4>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addQuoteItem()">
                        <i data-lucide="plus" class="w-4 h-4 mr-1"></i>
                        Agregar Item
                    </button>
                </div>
                <div id="quote-items-container">
                    <!-- Items se agregan dinámicamente -->
                </div>
            </div>

            <!-- Totales -->
            <div class="total-section">
                <div class="total-row">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-value" id="quote-subtotal">$0</span>
                </div>
                <div class="total-row">
                    <span class="total-label">IVA (19%):</span>
                    <span class="total-value" id="quote-iva">$0</span>
                </div>
                <div class="total-row grand-total">
                    <span class="total-label">Total:</span>
                    <span class="total-value" id="quote-total">$0</span>
                </div>
            </div>
        `;

        // Agregar primer item por defecto
        this.addQuoteItem();

        // Si es edición, cargar datos
        if (quoteId) {
            this.loadQuoteData(quoteId);
        }

        // Event listeners
        this.setupQuoteFormEvents();
    }

    addQuoteItem() {
        const container = document.getElementById('quote-items-container');
        const itemIndex = container.children.length;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <input type="text" placeholder="Descripción del item" 
                   name="items[${itemIndex}][description]" class="item-description">
            <input type="number" placeholder="Cantidad" step="1" min="1" value="1"
                   name="items[${itemIndex}][quantity]" class="item-quantity">
            <input type="number" placeholder="Precio unitario" step="0.01" min="0"
                   name="items[${itemIndex}][unit_price]" class="item-price amount-input">
            <span class="item-total">$0</span>
            <button type="button" class="remove-item-btn" onclick="removeQuoteItem(this)">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        
        container.appendChild(itemRow);
        
        // Event listeners para cálculos
        const quantityInput = itemRow.querySelector('.item-quantity');
        const priceInput = itemRow.querySelector('.item-price');
        
        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', () => this.calculateQuoteTotal());
        });

        // Re-inicializar iconos
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    removeQuoteItem(button) {
        const itemRow = button.closest('.item-row');
        itemRow.remove();
        this.calculateQuoteTotal();
    }

    calculateQuoteTotal() {
        const items = document.querySelectorAll('#quote-items-container .item-row');
        let subtotal = 0;
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(item.querySelector('.item-price').value) || 0;
            const total = quantity * price;
            
            item.querySelector('.item-total').textContent = `$${this.formatCurrency(total)}`;
            subtotal += total;
        });
        
        const iva = subtotal * 0.19;
        const total = subtotal + iva;
        
        document.getElementById('quote-subtotal').textContent = `$${this.formatCurrency(subtotal)}`;
        document.getElementById('quote-iva').textContent = `$${this.formatCurrency(iva)}`;
        document.getElementById('quote-total').textContent = `$${this.formatCurrency(total)}`;
    }

    setupQuoteFormEvents() {
        const form = document.getElementById('quote-form');
        form.addEventListener('submit', (e) => this.handleQuoteSubmit(e));
        
        // Filtrar ubicaciones por cliente
        const clientSelect = document.getElementById('quote-client');
        const locationSelect = document.getElementById('quote-location');
        
        clientSelect.addEventListener('change', () => {
            const clientId = clientSelect.value;
            this.filterLocationsByClient(clientId, locationSelect);
        });
    }

    filterLocationsByClient(clientId, locationSelect) {
        // Limpiar opciones
        locationSelect.innerHTML = '<option value="">Seleccionar ubicación...</option>';
        
        if (clientId) {
            const clientLocations = this.locations.filter(loc => loc.client_id == clientId);
            clientLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                locationSelect.appendChild(option);
            });
        }
    }

    async handleQuoteSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const data = {
                client_id: formData.get('client_id'),
                location_id: formData.get('location_id') || null,
                title: formData.get('title'),
                description: formData.get('description'),
                status: formData.get('status'),
                items: []
            };

            // Procesar items
            const itemRows = document.querySelectorAll('#quote-items-container .item-row');
            itemRows.forEach((row, index) => {
                const description = row.querySelector('.item-description').value;
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const unit_price = parseFloat(row.querySelector('.item-price').value) || 0;
                
                if (description && quantity > 0 && unit_price > 0) {
                    data.items.push({
                        description,
                        quantity,
                        unit_price,
                        total: quantity * unit_price
                    });
                }
            });

            // Calcular total
            const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
            data.total_amount = subtotal * 1.19; // Incluir IVA

            // Validaciones
            if (!data.client_id || !data.title || data.items.length === 0) {
                throw new Error('Debe completar cliente, título y al menos un item');
            }

            // Enviar datos
            const endpoint = this.currentQuote ? 
                `/api/quotes/${this.currentQuote}` : '/api/quotes';
            const method = this.currentQuote ? 'put' : 'post';
            
            await this.api[method](endpoint, data);
            
            this.showSuccess(this.currentQuote ? 'Cotización actualizada' : 'Cotización creada');
            this.closeQuoteModal();
            
            // Recargar datos
            if (window.loadData) {
                await window.loadData();
            }
            
        } catch (error) {
            console.error('❌ Error guardando cotización:', error);
            this.showError('Error al guardar la cotización: ' + error.message);
        }
    }

    // === MODAL FACTURA ===
    showInvoiceModal(invoiceId = null) {
        this.currentInvoice = invoiceId;
        const modal = document.getElementById('invoice-modal');
        const title = document.getElementById('invoice-modal-title');
        
        title.textContent = invoiceId ? 'Editar Factura' : 'Nueva Factura';
        
        this.renderInvoiceForm(invoiceId);
        modal.classList.add('is-open');
        
        // Autofocus en primer campo
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    closeInvoiceModal() {
        const modal = document.getElementById('invoice-modal');
        modal.classList.remove('is-open');
        this.currentInvoice = null;
        
        // Limpiar formulario
        const form = document.getElementById('invoice-form');
        if (form) form.reset();
    }

    renderInvoiceForm(invoiceId = null) {
        const formContainer = document.getElementById('invoice-form');
        
        formContainer.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label for="invoice-number">Número de Factura *</label>
                    <input type="text" id="invoice-number" name="invoice_number" required 
                           placeholder="Ej: F-2024-001">
                </div>
                <div class="form-group">
                    <label for="invoice-due-date">Fecha de Vencimiento</label>
                    <input type="date" id="invoice-due-date" name="due_date">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="invoice-client">Cliente *</label>
                    <select id="invoice-client" name="client_id" required>
                        <option value="">Seleccionar cliente...</option>
                        ${this.clients.map(client => 
                            `<option value="${client.id}">${client.name} (${client.rut})</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="invoice-location">Ubicación</label>
                    <select id="invoice-location" name="location_id">
                        <option value="">Seleccionar ubicación...</option>
                        ${this.locations.map(location => 
                            `<option value="${location.id}">${location.name}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="invoice-title">Título *</label>
                    <input type="text" id="invoice-title" name="title" required 
                           placeholder="Ej: Factura por servicios de mantenimiento">
                </div>
                <div class="form-group">
                    <label for="invoice-status">Estado</label>
                    <select id="invoice-status" name="status">
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                </div>
            </div>

            <div class="form-group">
                <label for="invoice-description">Descripción</label>
                <textarea id="invoice-description" name="description" rows="3"
                          placeholder="Descripción detallada de los servicios facturados..."></textarea>
            </div>

            <!-- Sección de Items -->
            <div class="items-section">
                <div class="items-header">
                    <h4>Items de la Factura</h4>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="addInvoiceItem()">
                        <i data-lucide="plus" class="w-4 h-4 mr-1"></i>
                        Agregar Item
                    </button>
                </div>
                <div id="invoice-items-container">
                    <!-- Items se agregan dinámicamente -->
                </div>
            </div>

            <!-- Totales -->
            <div class="total-section">
                <div class="total-row">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-value" id="invoice-subtotal">$0</span>
                </div>
                <div class="total-row">
                    <span class="total-label">IVA (19%):</span>
                    <span class="total-value" id="invoice-iva">$0</span>
                </div>
                <div class="total-row grand-total">
                    <span class="total-label">Total:</span>
                    <span class="total-value" id="invoice-total">$0</span>
                </div>
            </div>
        `;

        // Agregar primer item por defecto
        this.addInvoiceItem();

        // Si es edición, cargar datos
        if (invoiceId) {
            this.loadInvoiceData(invoiceId);
        }

        // Event listeners
        this.setupInvoiceFormEvents();
    }

    addInvoiceItem() {
        const container = document.getElementById('invoice-items-container');
        const itemIndex = container.children.length;
        
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <input type="text" placeholder="Descripción del item" 
                   name="items[${itemIndex}][description]" class="item-description">
            <input type="number" placeholder="Cantidad" step="1" min="1" value="1"
                   name="items[${itemIndex}][quantity]" class="item-quantity">
            <input type="number" placeholder="Precio unitario" step="0.01" min="0"
                   name="items[${itemIndex}][unit_price]" class="item-price amount-input">
            <span class="item-total">$0</span>
            <button type="button" class="remove-item-btn" onclick="removeInvoiceItem(this)">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        
        container.appendChild(itemRow);
        
        // Event listeners para cálculos
        const quantityInput = itemRow.querySelector('.item-quantity');
        const priceInput = itemRow.querySelector('.item-price');
        
        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', () => this.calculateInvoiceTotal());
        });

        // Re-inicializar iconos
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    removeInvoiceItem(button) {
        const itemRow = button.closest('.item-row');
        itemRow.remove();
        this.calculateInvoiceTotal();
    }

    calculateInvoiceTotal() {
        const items = document.querySelectorAll('#invoice-items-container .item-row');
        let subtotal = 0;
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(item.querySelector('.item-price').value) || 0;
            const total = quantity * price;
            
            item.querySelector('.item-total').textContent = `$${this.formatCurrency(total)}`;
            subtotal += total;
        });
        
        const iva = subtotal * 0.19;
        const total = subtotal + iva;
        
        document.getElementById('invoice-subtotal').textContent = `$${this.formatCurrency(subtotal)}`;
        document.getElementById('invoice-iva').textContent = `$${this.formatCurrency(iva)}`;
        document.getElementById('invoice-total').textContent = `$${this.formatCurrency(total)}`;
    }

    setupInvoiceFormEvents() {
        const form = document.getElementById('invoice-form');
        form.addEventListener('submit', (e) => this.handleInvoiceSubmit(e));
        
        // Filtrar ubicaciones por cliente
        const clientSelect = document.getElementById('invoice-client');
        const locationSelect = document.getElementById('invoice-location');
        
        clientSelect.addEventListener('change', () => {
            const clientId = clientSelect.value;
            this.filterLocationsByClient(clientId, locationSelect);
        });
    }

    async handleInvoiceSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const data = {
                client_id: formData.get('client_id'),
                location_id: formData.get('location_id') || null,
                invoice_number: formData.get('invoice_number'),
                title: formData.get('title'),
                description: formData.get('description'),
                due_date: formData.get('due_date') || null,
                status: formData.get('status'),
                items: []
            };

            // Procesar items
            const itemRows = document.querySelectorAll('#invoice-items-container .item-row');
            itemRows.forEach((row, index) => {
                const description = row.querySelector('.item-description').value;
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const unit_price = parseFloat(row.querySelector('.item-price').value) || 0;
                
                if (description && quantity > 0 && unit_price > 0) {
                    data.items.push({
                        description,
                        quantity,
                        unit_price,
                        total: quantity * unit_price
                    });
                }
            });

            // Calcular total
            const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
            data.total_amount = subtotal * 1.19; // Incluir IVA

            // Validaciones
            if (!data.client_id || !data.invoice_number || !data.title || data.items.length === 0) {
                throw new Error('Debe completar cliente, número de factura, título y al menos un item');
            }

            // Enviar datos
            const endpoint = this.currentInvoice ? 
                `/api/invoices/${this.currentInvoice}` : '/api/invoices';
            const method = this.currentInvoice ? 'put' : 'post';
            
            await this.api[method](endpoint, data);
            
            this.showSuccess(this.currentInvoice ? 'Factura actualizada' : 'Factura creada');
            this.closeInvoiceModal();
            
            // Recargar datos
            if (window.loadData) {
                await window.loadData();
            }
            
        } catch (error) {
            console.error('❌ Error guardando factura:', error);
            this.showError('Error al guardar la factura: ' + error.message);
        }
    }

    // === UTILIDADES ===
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    showSuccess(message) {
        console.log('✅ Éxito:', message);
        // TODO: Implementar sistema de toast notifications
        alert(message);
    }

    showError(message) {
        console.error('💥 Error:', message);
        // TODO: Implementar sistema de toast notifications
        alert(message);
    }

    async loadQuoteData(quoteId) {
        try {
            const response = await this.api.get(`/api/quotes/${quoteId}`);
            const quote = response.data;
            
            // Llenar formulario con datos
            document.getElementById('quote-client').value = quote.client_id || '';
            document.getElementById('quote-location').value = quote.location_id || '';
            document.getElementById('quote-title').value = quote.title || '';
            document.getElementById('quote-description').value = quote.description || '';
            document.getElementById('quote-status').value = quote.status || 'pending';
            
            // Cargar items si existen
            if (quote.items && quote.items.length > 0) {
                // Limpiar items por defecto
                document.getElementById('quote-items-container').innerHTML = '';
                
                quote.items.forEach(item => {
                    this.addQuoteItem();
                    const lastRow = document.querySelector('#quote-items-container .item-row:last-child');
                    lastRow.querySelector('.item-description').value = item.description || '';
                    lastRow.querySelector('.item-quantity').value = item.quantity || 1;
                    lastRow.querySelector('.item-price').value = item.unit_price || 0;
                });
                
                this.calculateQuoteTotal();
            }
            
        } catch (error) {
            console.error('❌ Error cargando cotización:', error);
            this.showError('Error al cargar los datos de la cotización');
        }
    }

    async loadInvoiceData(invoiceId) {
        try {
            const response = await this.api.get(`/api/invoices/${invoiceId}`);
            const invoice = response.data;
            
            // Llenar formulario con datos
            document.getElementById('invoice-number').value = invoice.invoice_number || '';
            document.getElementById('invoice-due-date').value = invoice.due_date || '';
            document.getElementById('invoice-client').value = invoice.client_id || '';
            document.getElementById('invoice-location').value = invoice.location_id || '';
            document.getElementById('invoice-title').value = invoice.title || '';
            document.getElementById('invoice-description').value = invoice.description || '';
            document.getElementById('invoice-status').value = invoice.status || 'pending';
            
            // Cargar items si existen
            if (invoice.items && invoice.items.length > 0) {
                // Limpiar items por defecto
                document.getElementById('invoice-items-container').innerHTML = '';
                
                invoice.items.forEach(item => {
                    this.addInvoiceItem();
                    const lastRow = document.querySelector('#invoice-items-container .item-row:last-child');
                    lastRow.querySelector('.item-description').value = item.description || '';
                    lastRow.querySelector('.item-quantity').value = item.quantity || 1;
                    lastRow.querySelector('.item-price').value = item.unit_price || 0;
                });
                
                this.calculateInvoiceTotal();
            }
            
        } catch (error) {
            console.error('❌ Error cargando factura:', error);
            this.showError('Error al cargar los datos de la factura');
        }
    }
}

// Funciones globales para los modales
let financialModals = null;

// Inicialización
window.initFinancialModals = (apiWrapper) => {
    financialModals = new FinancialModals(apiWrapper);
    return financialModals;
};

// Funciones globales para cotizaciones
window.createQuote = () => financialModals?.showQuoteModal();
window.editQuote = (id) => financialModals?.showQuoteModal(id);
window.closeQuoteModal = () => financialModals?.closeQuoteModal();
window.addQuoteItem = () => financialModals?.addQuoteItem();
window.removeQuoteItem = (button) => financialModals?.removeQuoteItem(button);

// Funciones globales para facturas
window.createInvoice = () => financialModals?.showInvoiceModal();
window.editInvoice = (id) => financialModals?.showInvoiceModal(id);
window.closeInvoiceModal = () => financialModals?.closeInvoiceModal();
window.addInvoiceItem = () => financialModals?.addInvoiceItem();
window.removeInvoiceItem = (button) => financialModals?.removeInvoiceItem(button);

// Hacer la clase disponible globalmente
window.FinancialModals = FinancialModals;
