// Sistema de Inventario - Gymtec ERP

class InventoryManager {
    constructor() {
        // ============================================
        // PROTECCIÓN DE AUTENTICACIÓN (CRÍTICO)
        // Verificación ANTES de inicializar (patrón @bitacora)
        // ============================================
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.error('❌ INVENTARIO: Usuario no autenticado, redirigiendo a login...');
            // Usar redirectToLogin() para preservar returnUrl
            if (window.authManager && typeof window.authManager.redirectToLogin === 'function') {
                window.authManager.redirectToLogin();
            } else {
                // Fallback: construir returnUrl manualmente
                const currentPage = window.location.pathname;
                const returnUrl = encodeURIComponent(currentPage + window.location.search);
                window.location.href = `login.html?return=${returnUrl}`;
            }
            return; // Detener la inicialización
        }
        
        console.log('✅ INVENTARIO: Usuario autenticado, inicializando módulo...');
        
        this.currentTab = 'central';
        this.data = {
            centralInventory: [],
            technicianInventory: [],
            purchaseOrders: [],
            transactions: [],
            technicians: [],
            spareParts: []
        };
        
        // Usar la configuración global de API URL
        this.apiBaseUrl = window.API_URL || 'http://localhost:3000/api';
        console.log('📡 Inventario usando API URL:', this.apiBaseUrl);
        
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando InventoryManager...');
        this.setupEventListeners();
        this.loadInitialData();
        console.log('✅ InventoryManager inicializado');
    }

    setupEventListeners() {
        // Pestañas de navegación
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(btn.dataset.tab);
            });
        });

        // Botones principales
        document.getElementById('add-inventory-btn').addEventListener('click', () => {
            this.openInventoryModal();
        });

        document.getElementById('add-purchase-order-btn').addEventListener('click', () => {
            this.openPurchaseOrderModal();
        });

        document.getElementById('assign-to-technician-btn').addEventListener('click', () => {
            this.openAssignTechnicianModal();
        });

        // Filtros y búsqueda
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.handleFilter('category', e.target.value);
        });

        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.handleFilter('status', e.target.value);
        });

        document.getElementById('technician-filter').addEventListener('change', (e) => {
            this.handleFilter('technician', e.target.value);
        });

        // Modales
        this.setupModalEvents();

        // Delegación de eventos para botones dinámicos
        document.body.addEventListener('click', this.handleDynamicClicks.bind(this));
    }

    setupModalEvents() {
        // Modal de inventario
        const inventoryModal = document.getElementById('inventory-modal');
        const inventoryForm = document.getElementById('inventory-form');
        
        inventoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInventoryItem();
        });

        // Modal de orden de compra
        const purchaseOrderModal = document.getElementById('purchase-order-modal');
        const purchaseOrderForm = document.getElementById('purchase-order-form');
        
        purchaseOrderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePurchaseOrder();
        });

        // Modal de asignar técnico
        const assignModal = document.getElementById('assign-technician-modal');
        const assignForm = document.getElementById('assign-technician-form');
        
        assignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.assignToTechnician();
        });

        // Botones de cerrar modales
        document.querySelectorAll('.base-modal-close, .base-btn-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.base-modal');
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Cerrar modal al hacer clic fuera
        document.querySelectorAll('.base-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Agregar ítem a orden de compra
        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.addOrderItem();
        });
    }

    handleDynamicClicks(e) {
        const target = e.target.closest('button');
        if (!target) return;

        // Botones de inventario
        if (target.classList.contains('edit-inventory-btn')) {
            const id = target.dataset.id;
            this.editInventoryItem(id);
        } else if (target.classList.contains('delete-inventory-btn')) {
            const id = target.dataset.id;
            this.deleteInventoryItem(id);
        }
        // Botones de órdenes de compra
        else if (target.classList.contains('receive-order-btn')) {
            const id = target.dataset.id;
            this.receiveOrder(id);
        } else if (target.classList.contains('cancel-order-btn')) {
            const id = target.dataset.id;
            this.cancelOrder(id);
        }
        // Botones de asignaciones
        else if (target.classList.contains('return-item-btn')) {
            const technicianId = target.dataset.technicianId;
            const itemId = target.dataset.itemId;
            this.returnFromTechnician(technicianId, itemId);
        }
        // Remover ítem de orden
        else if (target.classList.contains('order-item-remove')) {
            target.closest('.order-item').remove();
        }
    }

    switchTab(tabName) {
        // Actualizar botones de pestañas
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`content-${tabName}`).classList.add('active');

        // Mostrar/ocultar filtro de técnico
        const technicianFilter = document.getElementById('technician-filter-container');
        if (tabName === 'technicians') {
            technicianFilter.classList.remove('hidden');
        } else {
            technicianFilter.classList.add('hidden');
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadInitialData() {
        try {
            // Cargar datos básicos
            await Promise.all([
                this.loadTechnicians(),
                this.loadSpareParts()
            ]);

            // Cargar contenido de la pestaña actual
            this.loadTabData(this.currentTab);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showNotification('Error al cargar datos del sistema', 'error');
        }
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'central':
                await this.loadCentralInventory();
                break;
            case 'technicians':
                await this.loadTechnicianInventory();
                break;
            case 'orders':
                await this.loadPurchaseOrders();
                break;
            case 'transactions':
                await this.loadTransactions();
                break;
        }
    }

    async loadCentralInventory() {
        try {
            console.log('📦 Cargando inventario central desde:', `${this.apiBaseUrl}/inventory`);
            const container = document.getElementById('central-inventory-container');
            
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error HTTP:', response.status, errorData);
                throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
            }
            
            const result = await response.json();
            console.log('✅ Respuesta del servidor:', result);
            
            this.data.centralInventory = result.data || [];
            console.log(`📊 Total items cargados: ${this.data.centralInventory.length}`);
            
            this.renderCentralInventory();
            this.updateStats('central', this.data.centralInventory.length);
            
            console.log(`✅ Inventario central cargado: ${this.data.centralInventory.length} items`);
        } catch (error) {
            console.error('❌ Error loading central inventory:', error);
            this.showErrorState('central-inventory-container', `Error al cargar el inventario central: ${error.message}`);
        }
    }

    async loadTechnicianInventory() {
        try {
            console.log('👥 Cargando inventario de técnicos...');
            
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/technicians`);
            if (!response.ok) throw new Error('Error al cargar inventario de técnicos');
            
            const result = await response.json();
            this.data.technicianInventory = result.data || [];
            
            this.renderTechnicianInventory();
            this.updateStats('technicians', this.data.technicianInventory.length);
            
            console.log(`✅ Inventario de técnicos cargado: ${this.data.technicianInventory.length} asignaciones`);
        } catch (error) {
            console.error('Error loading technician inventory:', error);
            this.showErrorState('technicians-inventory-container', 'Error al cargar inventario de técnicos');
        }
    }

    async loadPurchaseOrders() {
        try {
            console.log('🚚 Cargando órdenes de compra...');
            
            const response = await authenticatedFetch(`${this.apiBaseUrl}/purchase-orders`);
            if (!response.ok) throw new Error('Error al cargar órdenes de compra');
            
            const result = await response.json();
            this.data.purchaseOrders = result.data || [];
            
            this.renderPurchaseOrders();
            this.updateStats('orders', this.data.purchaseOrders.length);
            
            console.log(`✅ Órdenes de compra cargadas: ${this.data.purchaseOrders.length} órdenes`);
        } catch (error) {
            console.error('Error loading purchase orders:', error);
            this.showErrorState('orders-container', 'Error al cargar órdenes de compra');
        }
    }

    async loadTransactions() {
        try {
            console.log('📊 Cargando movimientos de inventario...');
            
            // CORRECCIÓN: Backend usa /movements no /transactions
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/movements`);
            if (!response.ok) throw new Error('Error al cargar movimientos');
            
            const result = await response.json();
            this.data.transactions = result.data || [];
            
            this.renderTransactions();
            this.updateStats('transactions', this.data.transactions.length);
            
            console.log(`✅ Transacciones cargadas: ${this.data.transactions.length} movimientos`);
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showErrorState('transactions-container', 'Error al cargar transacciones');
        }
    }

    async loadTechnicians() {
        try {
            const response = await authenticatedFetch(`${this.apiBaseUrl}/users?role=technician`);
            if (!response.ok) throw new Error('Error al cargar técnicos');
            
            const result = await response.json();
            this.data.technicians = result.data || [];
            
            // Poblar filtros y selects
            this.populateTechnicianSelects();
        } catch (error) {
            console.error('Error loading technicians:', error);
        }
    }

    async loadSpareParts() {
        try {
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory`);
            if (!response.ok) throw new Error('Error al cargar repuestos');
            
            const result = await response.json();
            this.data.spareParts = result.data || [];
            
            // Poblar selects de repuestos
            this.populateSparePartSelects();
        } catch (error) {
            console.error('Error loading spare parts:', error);
        }
    }

    renderCentralInventory() {
        const container = document.getElementById('central-inventory-container');
        
        if (!this.data.centralInventory || this.data.centralInventory.length === 0) {
            container.innerHTML = this.getEmptyState('inventario central', 'warehouse');
            return;
        }

        const itemsHtml = this.data.centralInventory.map(item => {
            const status = this.getItemStatus(item);
            return `
                <div class="inventory-item-card">
                    <div class="inventory-item-header">
                        <div>
                            <h4 class="inventory-item-name">${item.item_name || 'Sin nombre'}</h4>
                            <div class="inventory-item-sku">SKU: ${item.item_code || 'N/A'}</div>
                        </div>
                        <div class="inventory-item-status ${status.class}">${status.text}</div>
                    </div>
                    
                    <div class="inventory-item-details">
                        <div class="inventory-item-detail">
                            <div class="inventory-item-detail-label">Categoría</div>
                            <div class="inventory-item-detail-value">${item.category_name || 'N/A'}</div>
                        </div>
                        <div class="inventory-item-detail">
                            <div class="inventory-item-detail-label">Stock Actual</div>
                            <div class="inventory-item-detail-value">${item.current_stock || 0}</div>
                        </div>
                        <div class="inventory-item-detail">
                            <div class="inventory-item-detail-label">Stock Mínimo</div>
                            <div class="inventory-item-detail-value">${item.minimum_stock || 0}</div>
                        </div>
                        <div class="inventory-item-detail">
                            <div class="inventory-item-detail-label">Precio</div>
                            <div class="inventory-item-detail-value">${this.formatCurrency(item.unit_cost || 0)}</div>
                        </div>
                        <div class="inventory-item-detail">
                            <div class="inventory-item-detail-label">Ubicación</div>
                            <div class="inventory-item-detail-value">${item.location_name || 'N/A'}</div>
                        </div>
                    </div>
                    
                    <div class="inventory-item-actions">
                        <button class="inventory-action-btn outline edit-inventory-btn" data-id="${item.id}">
                            <i data-lucide="edit" class="w-3 h-3"></i>
                            Editar
                        </button>
                        <button class="inventory-action-btn danger delete-inventory-btn" data-id="${item.id}">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = itemsHtml;
        lucide.createIcons();
    }

    renderTechnicianInventory() {
        const container = document.getElementById('technicians-inventory-container');
        
        if (!this.data.technicianInventory || this.data.technicianInventory.length === 0) {
            container.innerHTML = this.getEmptyState('asignaciones de técnicos', 'users');
            return;
        }

        // Agrupar por técnico
        const groupedByTechnician = this.data.technicianInventory.reduce((acc, assignment) => {
            const techId = assignment.technician_id;
            if (!acc[techId]) {
                acc[techId] = {
                    technician: assignment.technician,
                    items: []
                };
            }
            acc[techId].items.push(assignment);
            return acc;
        }, {});

        const techniciansHtml = Object.values(groupedByTechnician).map(group => {
            const itemsHtml = group.items.map(item => `
                <div class="inventory-item-card">
                    <div class="inventory-item-header">
                        <div>
                            <h5 class="inventory-item-name">${item.spare_part_name}</h5>
                            <div class="inventory-item-sku">Cantidad: ${item.quantity}</div>
                        </div>
                        <button class="inventory-action-btn secondary return-item-btn" 
                                data-technician-id="${item.technician_id}" 
                                data-item-id="${item.spare_part_id}">
                            <i data-lucide="corner-up-left" class="w-3 h-3"></i>
                            Devolver
                        </button>
                    </div>
                </div>
            `).join('');

            return `
                <div class="technician-inventory-card">
                    <div class="technician-inventory-header">
                        <h3 class="technician-name">${group.technician.name}</h3>
                        <div class="technician-role">${group.technician.role || 'Técnico'}</div>
                        <div class="technician-stats">
                            <div class="technician-stat">
                                <i data-lucide="package" class="w-3 h-3"></i>
                                <span>${group.items.length} repuestos</span>
                            </div>
                        </div>
                    </div>
                    <div class="technician-inventory-content">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = techniciansHtml;
        lucide.createIcons();
    }

    renderPurchaseOrders() {
        const container = document.getElementById('orders-container');
        
        if (!this.data.purchaseOrders || this.data.purchaseOrders.length === 0) {
            container.innerHTML = this.getEmptyState('órdenes de compra', 'truck');
            return;
        }

        const ordersHtml = this.data.purchaseOrders.map(order => {
            const itemsHtml = (order.items || []).map(item => `
                <div class="purchase-order-item">
                    <div class="purchase-order-item-name">${item.name}</div>
                    <div class="purchase-order-item-quantity">${item.quantity} unidades</div>
                </div>
            `).join('');

            return `
                <div class="purchase-order-card">
                    <div class="purchase-order-header">
                        <div>
                            <h4 class="purchase-order-number">Orden #${order.id}</h4>
                            <div class="purchase-order-supplier">Proveedor: ${order.supplier}</div>
                            <div class="text-sm text-gray-500">Fecha esperada: ${this.formatDate(order.expected_date)}</div>
                        </div>
                        <div class="purchase-order-status ${order.status}">${this.getOrderStatusText(order.status)}</div>
                    </div>
                    
                    <div class="purchase-order-items">
                        ${itemsHtml}
                    </div>
                    
                    <div class="purchase-order-actions">
                        ${order.status === 'pendiente' ? `
                            <button class="inventory-action-btn primary receive-order-btn" data-id="${order.id}">
                                <i data-lucide="check" class="w-3 h-3"></i>
                                Marcar como Recibida
                            </button>
                            <button class="inventory-action-btn danger cancel-order-btn" data-id="${order.id}">
                                <i data-lucide="x" class="w-3 h-3"></i>
                                Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = ordersHtml;
        lucide.createIcons();
    }

    renderTransactions() {
        const container = document.getElementById('transactions-container');
        
        if (!this.data.transactions || this.data.transactions.length === 0) {
            container.innerHTML = this.getEmptyState('movimientos de inventario', 'activity');
            return;
        }

        const transactionsHtml = this.data.transactions.map(transaction => {
            const movementType = transaction.movement_type || 'unknown';
            const isPendingRequest = transaction.is_pending_request === 1 || transaction.movement_type === 'pending_request';
            
            return `
                <div class="transaction-card ${isPendingRequest ? 'pending-approval' : ''}">
                    <div class="transaction-header">
                        <div class="transaction-type ${movementType}">
                            <i data-lucide="${this.getTransactionIcon(movementType)}" class="w-4 h-4"></i>
                            ${isPendingRequest ? '🔔 SOLICITUD PENDIENTE' : this.getTransactionTypeText(movementType)}
                        </div>
                        <div class="transaction-date">${this.formatDateTime(transaction.performed_at)}</div>
                    </div>
                    <div class="transaction-details">
                        <strong>${transaction.item_name || transaction.spare_part_name || 'Item desconocido'}</strong>
                        ${transaction.notes ? `<br>${transaction.notes}` : ''}
                        ${transaction.quantity ? `<br>📦 Cantidad solicitada: ${transaction.quantity} unidades` : ''}
                        ${!isPendingRequest && transaction.stock_before !== undefined && transaction.stock_after !== undefined ? 
                            `<br>📊 Stock: ${transaction.stock_before} → ${transaction.stock_after}` : ''}
                        ${transaction.performed_by_name ? `<br>👤 Solicitado por: ${transaction.performed_by_name}` : ''}
                        ${transaction.related_ticket_id ? 
                            `<br>🎫 <a href="tickets.html?id=${transaction.related_ticket_id}" target="_blank" class="ticket-link">
                                Ticket #${transaction.related_ticket_id}${transaction.related_ticket_title ? ': ' + transaction.related_ticket_title : ''}
                            </a>` : ''}
                        ${isPendingRequest && transaction.request_id ? 
                            `<br><div class="request-actions">
                                <button class="btn-approve-request" data-request-id="${transaction.request_id}" data-item-name="${transaction.item_name || transaction.spare_part_name || ''}">
                                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                                    Aprobar
                                </button>
                                <button class="btn-reject-request" data-request-id="${transaction.request_id}" data-item-name="${transaction.item_name || transaction.spare_part_name || ''}">
                                    <i data-lucide="x-circle" class="w-4 h-4"></i>
                                    Rechazar
                                </button>
                            </div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = transactionsHtml;
        lucide.createIcons();
        
        // Agregar event listeners para botones de aprobar
        document.querySelectorAll('.btn-approve-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.currentTarget.dataset.requestId;
                const itemName = e.currentTarget.dataset.itemName;
                this.approveRequest(requestId, itemName);
            });
        });
        
        // Agregar event listeners para botones de rechazar
        document.querySelectorAll('.btn-reject-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.currentTarget.dataset.requestId;
                const itemName = e.currentTarget.dataset.itemName;
                this.rejectRequest(requestId, itemName);
            });
        });
    }

    // Modal handlers
    openInventoryModal(item = null) {
        const modal = document.getElementById('inventory-modal');
        const form = document.getElementById('inventory-form');
        const title = document.getElementById('inventory-modal-title');
        
        form.reset();
        
        if (item) {
            title.textContent = 'Editar Repuesto';
            this.populateForm(form, item);
        } else {
            title.textContent = 'Nuevo Repuesto';
        }
        
        this.showModal(modal);
    }

    openPurchaseOrderModal() {
        const modal = document.getElementById('purchase-order-modal');
        const form = document.getElementById('purchase-order-form');
        
        form.reset();
        document.getElementById('order-items-container').innerHTML = '';
        
        this.showModal(modal);
    }

    openAssignTechnicianModal() {
        const modal = document.getElementById('assign-technician-modal');
        const form = document.getElementById('assign-technician-form');
        
        form.reset();
        this.populateTechnicianSelects();
        this.populateSparePartSelects();
        
        this.showModal(modal);
    }

    // Utility methods
    getItemStatus(item) {
        if (item.current_stock <= 0) {
            return { class: 'agotado', text: 'AGOTADO' };
        } else if (item.current_stock <= item.minimum_stock) {
            return { class: 'bajo-stock', text: 'BAJO STOCK' };
        } else if (item.stock_status === 'overstock') {
            return { class: 'en-pedido', text: 'SOBRESTOCK' };
        } else {
            return { class: 'disponible', text: 'DISPONIBLE' };
        }
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(value || 0);
    }

    getEmptyState(type, icon) {
        return `
            <div class="inventory-empty-state">
                <i data-lucide="${icon}" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">No hay ${type}</h3>
                <p class="text-gray-500 mb-4">Comienza agregando el primer elemento</p>
            </div>
        `;
    }

    showErrorState(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="inventory-empty-state">
                <i data-lucide="alert-circle" class="w-16 h-16 text-red-400 mx-auto mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">Error</h3>
                <p class="text-red-500 mb-4">${message}</p>
                <button onclick="location.reload()" class="inventory-action-btn primary">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    Reintentar
                </button>
            </div>
        `;
        lucide.createIcons();
    }

    updateStats(tab, count) {
        const statsElement = document.getElementById(`${tab}-stats`);
        if (statsElement) {
            let text = '';
            switch (tab) {
                case 'central': text = `${count} repuestos`; break;
                case 'technicians': text = `${count} asignaciones`; break;
                case 'orders': text = `${count} órdenes`; break;
                case 'transactions': text = `${count} movimientos`; break;
            }
            statsElement.textContent = text;
        }
    }

    showModal(modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10);
    }

    closeModal(modal) {
        modal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    populateForm(form, data) {
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = data[key] || '';
            }
        });
    }

    populateTechnicianSelects() {
        const selects = document.querySelectorAll('select[name="technician_id"], #technician-filter');
        selects.forEach(select => {
            if (select.id === 'technician-filter') {
                select.innerHTML = '<option value="">Todos los técnicos</option>';
            } else {
                select.innerHTML = '<option value="">Seleccionar técnico</option>';
            }
            
            this.data.technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.name;
                select.appendChild(option);
            });
        });
    }

    populateSparePartSelects() {
        const selects = document.querySelectorAll('select[name="spare_part_id"]');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar repuesto</option>';
            
            this.data.spareParts.forEach(part => {
                const option = document.createElement('option');
                option.value = part.id;
                option.textContent = `${part.name} (Stock: ${part.current_stock})`;
                select.appendChild(option);
            });
        });
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-CL');
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('es-CL');
    }

    getOrderStatusText(status) {
        const statusMap = {
            'pendiente': 'Pendiente',
            'en-transito': 'En Tránsito',
            'recibida': 'Recibida',
            'cancelada': 'Cancelada'
        };
        return statusMap[status] || status;
    }

    getTransactionTypeText(type) {
        const typeMap = {
            // Tipos en español (legacy)
            'entrada': 'Entrada',
            'salida': 'Salida',
            'asignacion': 'Asignación',
            'devolucion': 'Devolución',
            // Tipos en inglés (base de datos)
            'in': 'Entrada',
            'out': 'Salida',
            'adjustment': 'Ajuste',
            'transfer': 'Transferencia',
            'return': 'Devolución',
            'migration': 'Migración Inicial',
            'pending_request': 'SOLICITUD PENDIENTE'
        };
        return typeMap[type] || type.toUpperCase();
    }

    getTransactionIcon(type) {
        const iconMap = {
            // Tipos en español (legacy)
            'entrada': 'plus-circle',
            'salida': 'minus-circle',
            'asignacion': 'user-plus',
            'devolucion': 'corner-up-left',
            // Tipos en inglés (base de datos)
            'in': 'plus-circle',
            'out': 'minus-circle',
            'adjustment': 'sliders',
            'transfer': 'arrow-right-left',
            'return': 'corner-up-left',
            'migration': 'database',
            'pending_request': 'clock'
        };
        return iconMap[type] || 'circle';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `inventory-alert ${type}`;
        notification.innerHTML = `
            <i data-lucide="${type === 'error' ? 'alert-circle' : 'info'}" class="w-5 h-5"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        lucide.createIcons();
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Placeholder methods for API calls (to be implemented)
    async saveInventoryItem() {
        console.log('💾 Guardando repuesto...');
        
        const form = document.getElementById('inventory-form');
        const formData = new FormData(form);
        
        const itemId = form.dataset.itemId; // Si es edición
        const method = itemId ? 'PUT' : 'POST';
        const url = itemId 
            ? `${this.apiBaseUrl}/inventory/${itemId}` 
            : `${this.apiBaseUrl}/inventory`;
        
        const data = {
            item_name: formData.get('name'),
            item_code: formData.get('sku'),
            category_id: parseInt(formData.get('category')) || null,
            current_stock: parseInt(formData.get('current_stock')) || 0,
            minimum_stock: parseInt(formData.get('min_stock')) || 0,
            unit_cost: parseFloat(formData.get('unit_price')) || 0,
            location_id: parseInt(formData.get('location')) || null,
            description: formData.get('description') || null,
            unit_of_measure: formData.get('unit_of_measure') || 'unit',
            is_critical: formData.get('is_critical') === 'on' ? 1 : 0
        };
        
        try {
            const response = await authenticatedFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar');
            }
            
            const result = await response.json();
            
            this.showNotification(
                itemId ? 'Repuesto actualizado exitosamente' : 'Repuesto creado exitosamente', 
                'success'
            );
            
            this.closeModal(document.getElementById('inventory-modal'));
            form.removeAttribute('data-item-id'); // Limpiar flag de edición
            await this.loadCentralInventory(); // Recargar lista
            
        } catch (error) {
            console.error('Error guardando repuesto:', error);
            this.showNotification('Error al guardar repuesto: ' + error.message, 'error');
        }
    }

    async savePurchaseOrder() {
        console.log('💾 Guardando orden de compra...');
        this.showNotification('Sistema de órdenes de compra en desarrollo. Próximamente disponible.', 'info');
    }

    async assignToTechnician() {
        console.log('💾 Asignando a técnico...');
        this.showNotification('Sistema de asignación a técnicos en desarrollo. Próximamente disponible.', 'info');
    }

    async editInventoryItem(id) {
        console.log(`✏️ Editando repuesto ${id}...`);
        
        try {
            // Cargar datos del item
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/${id}`);
            
            if (!response.ok) {
                throw new Error('Error al cargar datos del repuesto');
            }
            
            const result = await response.json();
            const item = result.data;
            
            // Abrir modal en modo edición
            const modal = document.getElementById('inventory-modal');
            const form = document.getElementById('inventory-form');
            const title = document.getElementById('inventory-modal-title');
            
            title.textContent = 'Editar Repuesto';
            form.dataset.itemId = id; // Guardar ID para saveInventoryItem()
            
            // Pre-llenar formulario
            if (form.elements['name']) form.elements['name'].value = item.item_name || '';
            if (form.elements['sku']) form.elements['sku'].value = item.item_code || '';
            if (form.elements['category']) form.elements['category'].value = item.category_id || '';
            if (form.elements['current_stock']) form.elements['current_stock'].value = item.current_stock || 0;
            if (form.elements['min_stock']) form.elements['min_stock'].value = item.minimum_stock || 0;
            if (form.elements['unit_price']) form.elements['unit_price'].value = item.unit_cost || 0;
            if (form.elements['location']) form.elements['location'].value = item.location_id || '';
            if (form.elements['description']) form.elements['description'].value = item.description || '';
            
            this.showModal(modal);
            
        } catch (error) {
            console.error('Error al editar repuesto:', error);
            this.showNotification('Error al cargar datos: ' + error.message, 'error');
        }
    }

    async deleteInventoryItem(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este repuesto? Esta acción no se puede deshacer.')) {
            return;
        }
        
        console.log(`🗑️ Eliminando repuesto ${id}...`);
        
        try {
            const response = await authenticatedFetch(`${this.apiBaseUrl}/inventory/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar');
            }
            
            this.showNotification('Repuesto eliminado exitosamente', 'success');
            await this.loadCentralInventory(); // Recargar lista
            
        } catch (error) {
            console.error('Error eliminando repuesto:', error);
            this.showNotification('Error al eliminar repuesto: ' + error.message, 'error');
        }
    }

    async receiveOrder(id) {
        console.log(`📦 Marcando orden ${id} como recibida...`);
        this.showNotification('Sistema de órdenes de compra en desarrollo. Próximamente disponible.', 'info');
    }

    async cancelOrder(id) {
        if (confirm('¿Estás seguro de que quieres cancelar esta orden?')) {
            console.log(`❌ Cancelando orden ${id}...`);
            this.showNotification('Sistema de órdenes de compra en desarrollo. Próximamente disponible.', 'info');
        }
    }

    async returnFromTechnician(technicianId, itemId) {
        console.log(`↩️ Devolviendo repuesto ${itemId} del técnico ${technicianId}...`);
        this.showNotification('Sistema de asignación a técnicos en desarrollo. Próximamente disponible.', 'info');
    }

    addOrderItem() {
        const container = document.getElementById('order-items-container');
        const itemHtml = `
            <div class="order-item">
                <div class="order-item-content">
                    <select name="spare_part_id" class="base-form-input" required>
                        <option value="">Seleccionar repuesto</option>
                        ${this.data.spareParts.map(part => 
                            `<option value="${part.id}">${part.name}</option>`
                        ).join('')}
                    </select>
                    <input type="number" name="quantity" placeholder="Cantidad" class="base-form-input" min="1" required>
                    <input type="number" name="unit_price" placeholder="Precio unitario" class="base-form-input" min="0" step="0.01">
                </div>
                <button type="button" class="order-item-remove">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHtml);
        lucide.createIcons();
    }

    handleSearch(searchTerm) {
        console.log(`🔍 Buscando: ${searchTerm}`);
        // Implementar lógica de búsqueda
    }

    handleFilter(filterType, value) {
        console.log(`🔽 Filtro ${filterType}: ${value}`);
        // Implementar lógica de filtrado
    }

    async approveRequest(requestId, itemName) {
        console.log(`✅ Aprobando solicitud #${requestId}...`);
        
        const confirmMessage = `¿Aprobar solicitud de "${itemName}"?\n\n` +
            `El sistema verificará:\n` +
            `• Si hay stock: Se descontará automáticamente\n` +
            `• Si NO hay stock: Se creará una orden de compra`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const response = await authenticatedFetch(
                `${this.apiBaseUrl}/inventory/requests/${requestId}/approve`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: `Aprobado desde módulo de inventario`
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al aprobar solicitud');
            }
            
            const result = await response.json();
            
            // Mostrar resultado
            if (result.data.action === 'stock_deducted') {
                this.showNotification(
                    `✅ Solicitud aprobada. Stock descontado. Nuevo stock: ${result.data.new_stock}`,
                    'success'
                );
            } else if (result.data.action === 'purchase_order_created') {
                this.showNotification(
                    `✅ Solicitud aprobada. Orden de compra creada: ${result.data.purchase_order_number}`,
                    'success'
                );
            }
            
            // Recargar movimientos para reflejar cambios
            console.log('🔄 Recargando movimientos...');
            await this.loadTransactions();
            
        } catch (error) {
            console.error('Error aprobando solicitud:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }
    
    async rejectRequest(requestId, itemName) {
        console.log(`❌ Rechazando solicitud #${requestId}...`);
        
        const reason = prompt(`¿Por qué rechazas la solicitud de "${itemName}"?\n\nEscribe el motivo del rechazo:`);
        
        if (!reason || reason.trim() === '') {
            this.showNotification('Rechazo cancelado. Debes proporcionar un motivo.', 'info');
            return;
        }
        
        try {
            const response = await authenticatedFetch(
                `${this.apiBaseUrl}/inventory/requests/${requestId}/reject`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        rejection_reason: reason.trim()
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al rechazar solicitud');
            }
            
            const result = await response.json();
            
            this.showNotification(
                `❌ Solicitud rechazada correctamente. ${result.message || ''}`,
                'success'
            );
            
            // Recargar movimientos para reflejar cambios
            console.log('🔄 Recargando movimientos...');
            await this.loadTransactions();
            
        } catch (error) {
            console.error('Error rechazando solicitud:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 INVENTARIO: Iniciando verificación de autenticación...');
    
    // ============================================
    // 1. PROTECCIÓN DE AUTENTICACIÓN (CRÍTICO)
    // Usar verificación local simple (patrón recomendado @bitacora)
    // ============================================
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.error('❌ INVENTARIO: Usuario no autenticado, redirigiendo a login...');
        // Usar redirectToLogin() para preservar returnUrl
        if (window.authManager && typeof window.authManager.redirectToLogin === 'function') {
            window.authManager.redirectToLogin();
        } else {
            // Fallback: construir returnUrl manualmente
            const currentPage = window.location.pathname;
            const returnUrl = encodeURIComponent(currentPage + window.location.search);
            window.location.href = `login.html?return=${returnUrl}`;
        }
        return;
    }

    console.log('✅ INVENTARIO: Usuario autenticado, cargando módulo de inventario...');
    console.log('👤 Usuario actual:', window.authManager.getUser()?.username);

    // Inicializar los iconos de Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Inicializar el manager de inventario
    if (typeof InventoryManager !== 'undefined') {
        window.inventoryManager = new InventoryManager();
    } else {
        console.error('❌ InventoryManager no está disponible');
    }
});

 