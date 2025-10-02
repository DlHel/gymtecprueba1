/**
 * Módulo de Gestión de Inventario - Fase 3
 * @description Sistema inteligente de inventario con categorías, proveedores y analíticas
 * @version 3.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // 1. PROTECCIÓN DE AUTENTICACIÓN (CRÍTICO)
    // ============================================
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en inventario-fase3, redirigiendo a login...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    console.log('✅ Usuario autenticado, inicializando inventario fase 3...');

    // ============================================
    // 2. STATE MANAGEMENT
    // ============================================
    const state = {
        currentTab: 'inventory',
        inventory: [],
        categories: [],
        suppliers: [],
        movements: [],
        isLoading: false
    };

    // ============================================
    // 3. CONSTANTS
    // ============================================
    const API_BASE = API_URL || 'http://localhost:3000/api';

    // ============================================
    // 4. API FUNCTIONS
    // ============================================
    const api = {
        async call(endpoint, options = {}) {
            try {
                const response = await window.authManager.authenticatedFetch(`${API_BASE}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('❌ API call error:', error);
                ui.showError(`Error en API: ${error.message}`);
                return null;
            }
        },

        async loadInventory() {
            // TODO: Implementar cuando el endpoint esté disponible
            // const result = await this.call('/inventory');
            // return result?.data || [];
            
            // Simulación temporal
            return [
                {
                    id: 1,
                    name: 'Correa de transmisión TR-500',
                    sku: 'BT-TR500-001',
                    category: 'Repuestos Cardiovascular',
                    current_stock: 15,
                    min_stock: 5,
                    max_stock: 50,
                    status: 'normal'
                },
                {
                    id: 2,
                    name: 'Cable de acero 2mm',
                    sku: 'CB-AC2MM-100',
                    category: 'Repuestos Fuerza',
                    current_stock: 3,
                    min_stock: 5,
                    max_stock: 25,
                    status: 'low'
                },
                {
                    id: 3,
                    name: 'Lubricante multiuso',
                    sku: 'LUB-MULT-500',
                    category: 'Mantenimiento',
                    current_stock: 28,
                    min_stock: 10,
                    max_stock: 40,
                    status: 'normal'
                }
            ];
        },

        async loadCategories() {
            // TODO: Implementar cuando el endpoint esté disponible
            // const result = await this.call('/inventory/categories');
            // return result?.data || [];
            
            // Simulación temporal
            return [
                { id: 1, name: 'Repuestos Cardiovascular', description: 'Componentes para equipos cardiovasculares', item_count: 45 },
                { id: 2, name: 'Repuestos Fuerza', description: 'Componentes para equipos de fuerza', item_count: 38 },
                { id: 3, name: 'Mantenimiento', description: 'Productos para mantenimiento general', item_count: 22 },
                { id: 4, name: 'Herramientas', description: 'Herramientas especializadas', item_count: 15 },
                { id: 5, name: 'Electrónica', description: 'Componentes electrónicos', item_count: 12 },
                { id: 6, name: 'Consumibles', description: 'Productos de uso frecuente', item_count: 8 },
                { id: 7, name: 'Seguridad', description: 'Equipos de protección personal', item_count: 5 }
            ];
        },

        async loadSuppliers() {
            // TODO: Implementar cuando el endpoint esté disponible
            // const result = await this.call('/suppliers');
            // return result?.data || [];
            
            // Simulación temporal
            return [
                { 
                    id: 1, 
                    name: 'TechnoGym Chile', 
                    contact_email: 'ventas@technogym.cl',
                    phone: '+56 2 2345 6789',
                    status: 'Activo'
                },
                { 
                    id: 2, 
                    name: 'Life Fitness Corp', 
                    contact_email: 'info@lifefitness.com',
                    phone: '+56 2 2876 5432',
                    status: 'Activo'
                },
                { 
                    id: 3, 
                    name: 'Matrix Fitness', 
                    contact_email: 'soporte@matrixfitness.cl',
                    phone: '+56 2 2654 3210',
                    status: 'Activo'
                }
            ];
        },

        async loadMovements() {
            const result = await this.call('/inventory/movements?limit=50');
            return result?.data || [];
        },

        async loadStockAlerts() {
            // TODO: Implementar cuando el endpoint esté disponible
            
            // Simulación temporal
            return [
                { item: 'Cable de acero 2mm', current: 3, min: 5, level: 'critical' },
                { item: 'Rodamiento 6201', current: 7, min: 10, level: 'warning' },
                { item: 'Sensor HR', current: 2, min: 5, level: 'critical' }
            ];
        }
    };

    // ============================================
    // 5. UI FUNCTIONS
    // ============================================
    const ui = {
        showError(message) {
            console.error(message);
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 5000);
        },

        showSuccess(message) {
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 fade-in';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 3000);
        },

        updateDashboard() {
            const totalItems = state.inventory.length;
            const lowStockItems = state.inventory.filter(item => item.status === 'low').length;
            const totalCategories = state.categories.length;
            const totalSuppliers = state.suppliers.length;

            const totalItemsEl = document.getElementById('totalItems');
            const lowStockItemsEl = document.getElementById('lowStockItems');
            const totalCategoriesEl = document.getElementById('totalCategories');
            const totalSuppliersEl = document.getElementById('totalSuppliers');

            if (totalItemsEl) totalItemsEl.textContent = totalItems || '-';
            if (lowStockItemsEl) lowStockItemsEl.textContent = lowStockItems || '0';
            if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories || '-';
            if (totalSuppliersEl) totalSuppliersEl.textContent = totalSuppliers || '-';
        },

        renderInventoryTable() {
            const tbody = document.getElementById('inventoryTableBody');
            if (!tbody) return;

            if (state.inventory.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                            No hay items de inventario
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = state.inventory.map(item => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${item.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${item.sku}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            ${item.category}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${item.current_stock}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-500">${item.min_stock} / ${item.max_stock}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'low' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                        }">
                            ${item.status === 'low' ? '⚠️ Stock Bajo' : '✅ Normal'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex space-x-2">
                            <button onclick="window.inventoryModule.editItem(${item.id})" 
                                    class="text-blue-600 hover:text-blue-900">✏️</button>
                            <button onclick="window.inventoryModule.adjustStock(${item.id})" 
                                    class="text-green-600 hover:text-green-900">📦</button>
                            <button onclick="window.inventoryModule.deleteItem(${item.id})" 
                                    class="text-red-600 hover:text-red-900">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        },

        renderCategoriesGrid() {
            const grid = document.getElementById('categoriesGrid');
            if (!grid) return;

            if (state.categories.length === 0) {
                grid.innerHTML = `<div class="text-center text-gray-500 col-span-full">No hay categorías</div>`;
                return;
            }

            grid.innerHTML = state.categories.map(category => `
                <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">${category.name}</h3>
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                            ${category.item_count} items
                        </span>
                    </div>
                    <p class="text-gray-600 text-sm mb-4">${category.description}</p>
                    <div class="flex space-x-2">
                        <button onclick="window.inventoryModule.editCategory(${category.id})" 
                                class="text-blue-600 hover:text-blue-900 text-sm">✏️ Editar</button>
                        <button onclick="window.inventoryModule.viewCategoryItems(${category.id})" 
                                class="text-green-600 hover:text-green-900 text-sm">👁️ Ver Items</button>
                    </div>
                </div>
            `).join('');
        },

        renderSuppliersGrid() {
            const grid = document.getElementById('suppliersGrid');
            if (!grid) return;

            if (state.suppliers.length === 0) {
                grid.innerHTML = `<div class="text-center text-gray-500 col-span-full">No hay proveedores</div>`;
                return;
            }

            grid.innerHTML = state.suppliers.map(supplier => `
                <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">${supplier.name}</h3>
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                            ${supplier.status}
                        </span>
                    </div>
                    <div class="space-y-2 text-sm text-gray-600">
                        <div class="flex items-center">
                            <span class="w-4 h-4 mr-2">📧</span>
                            ${supplier.contact_email}
                        </div>
                        <div class="flex items-center">
                            <span class="w-4 h-4 mr-2">📞</span>
                            ${supplier.phone}
                        </div>
                    </div>
                    <div class="flex space-x-2 mt-4">
                        <button onclick="window.inventoryModule.editSupplier(${supplier.id})" 
                                class="text-blue-600 hover:text-blue-900 text-sm">✏️ Editar</button>
                        <button onclick="window.inventoryModule.viewSupplierOrders(${supplier.id})" 
                                class="text-green-600 hover:text-green-900 text-sm">📋 Órdenes</button>
                    </div>
                </div>
            `).join('');
        },

        async renderAnalytics() {
            const movementsDiv = document.getElementById('recentMovements');
            const alertsDiv = document.getElementById('stockAlerts');

            if (!movementsDiv || !alertsDiv) return;

            try {
                // Load data
                const movements = await api.loadMovements();
                const alerts = await api.loadStockAlerts();

                // Render movements - usando datos reales de la API
                movementsDiv.innerHTML = movements.map(movement => {
                    const movementDate = new Date(movement.movement_date).toLocaleDateString('es-ES');
                    const movementType = movement.movement_type === 'in' ? 'Entrada' : 'Salida';
                    const itemName = movement.item_name || 'Item desconocido';
                    const userName = movement.performed_by_name || 'Usuario';
                    
                    return `
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-900">${itemName}</div>
                                <div class="text-xs text-gray-500">${movementDate} - ${userName}</div>
                            </div>
                            <div class="text-right">
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    movement.movement_type === 'in' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }">
                                    ${movement.movement_type === 'in' ? '+' : '-'}${movement.quantity}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');

                // Render alerts
                alertsDiv.innerHTML = alerts.map(alert => `
                    <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">${alert.item}</div>
                            <div class="text-xs text-gray-500">Stock actual: ${alert.current} / Mínimo: ${alert.min}</div>
                        </div>
                        <div class="text-right">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                alert.level === 'critical' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }">
                                ${alert.level === 'critical' ? '🚨 Crítico' : '⚠️ Bajo'}
                            </span>
                        </div>
                    </div>
                `).join('');

            } catch (error) {
                movementsDiv.innerHTML = `<div class="text-center text-red-500">Error: ${error.message}</div>`;
                alertsDiv.innerHTML = `<div class="text-center text-red-500">Error: ${error.message}</div>`;
            }
        }
    };

    // ============================================
    // 6. TAB NAVIGATION
    // ============================================
    const tabs = {
        showTab(tabName) {
            state.currentTab = tabName;

            // Update tab buttons
            document.querySelectorAll('[data-tab]').forEach(button => {
                const isActive = button.getAttribute('data-tab') === tabName;
                if (isActive) {
                    button.classList.add('border-blue-500', 'text-blue-600');
                    button.classList.remove('border-transparent', 'text-gray-500');
                } else {
                    button.classList.remove('border-blue-500', 'text-blue-600');
                    button.classList.add('border-transparent', 'text-gray-500');
                }
            });

            // Update content visibility
            document.querySelectorAll('[data-content]').forEach(content => {
                const contentName = content.getAttribute('data-content');
                if (contentName === tabName) {
                    content.classList.remove('hidden');
                    content.classList.add('fade-in');
                } else {
                    content.classList.add('hidden');
                }
            });

            // Load data for specific tab
            this.loadTabData(tabName);
        },

        async loadTabData(tabName) {
            switch(tabName) {
                case 'inventory':
                    state.inventory = await api.loadInventory();
                    ui.renderInventoryTable();
                    break;
                case 'categories':
                    state.categories = await api.loadCategories();
                    ui.renderCategoriesGrid();
                    break;
                case 'suppliers':
                    state.suppliers = await api.loadSuppliers();
                    ui.renderSuppliersGrid();
                    break;
                case 'analytics':
                    await ui.renderAnalytics();
                    break;
            }
        }
    };

    // ============================================
    // 7. ACTION HANDLERS
    // ============================================
    const actions = {
        addItem() {
            ui.showError('🚀 Función de agregar producto - Por implementar en Fase 3');
        },

        editItem(id) {
            ui.showError(`✏️ Editar producto ID: ${id} - Por implementar en Fase 3`);
        },

        adjustStock(id) {
            ui.showError(`📦 Ajustar stock ID: ${id} - Por implementar en Fase 3`);
        },

        deleteItem(id) {
            if (confirm('¿Está seguro de eliminar este producto?')) {
                ui.showError(`🗑️ Eliminar producto ID: ${id} - Por implementar en Fase 3`);
            }
        },

        addCategory() {
            ui.showError('🏷️ Agregar nueva categoría - Por implementar en Fase 3');
        },

        editCategory(id) {
            ui.showError(`✏️ Editar categoría ID: ${id} - Por implementar en Fase 3`);
        },

        viewCategoryItems(id) {
            ui.showError(`👁️ Ver items de categoría ID: ${id} - Por implementar en Fase 3`);
        },

        addSupplier() {
            ui.showError('🏢 Agregar nuevo proveedor - Por implementar en Fase 3');
        },

        editSupplier(id) {
            ui.showError(`✏️ Editar proveedor ID: ${id} - Por implementar en Fase 3`);
        },

        viewSupplierOrders(id) {
            ui.showError(`📋 Ver órdenes de proveedor ID: ${id} - Por implementar en Fase 3`);
        },

        exportReport() {
            ui.showError('📊 Exportar reporte - Por implementar en Fase 3');
        },

        async refreshDashboard() {
            console.log('🔄 Actualizando dashboard...');
            await init();
            ui.showSuccess('Dashboard actualizado correctamente');
        }
    };

    // ============================================
    // 8. TIME UPDATER
    // ============================================
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-CL');
        const dateString = now.toLocaleDateString('es-CL');
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            currentTimeEl.innerHTML = `${dateString}<br>${timeString}`;
        }
    }

    // ============================================
    // 9. EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                tabs.showTab(tabName);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshButton');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                actions.refreshDashboard();
            });
        }
    }

    // ============================================
    // 10. INITIALIZATION
    // ============================================
    async function init() {
        try {
            console.log('🚀 Inicializando módulo de inventario...');

            // Load initial data
            const [inventory, categories, suppliers] = await Promise.all([
                api.loadInventory(),
                api.loadCategories(),
                api.loadSuppliers()
            ]);

            state.inventory = inventory;
            state.categories = categories;
            state.suppliers = suppliers;

            // Update UI
            ui.updateDashboard();
            setupEventListeners();

            // Show default tab
            tabs.showTab('inventory');

            // Start time updater
            updateTime();
            setInterval(updateTime, 1000);

            console.log('✅ Sistema de Inventario Inteligente - Fase 3 Inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando inventario:', error);
            ui.showError('Error al inicializar el sistema de inventario');
        }
    }

    // ============================================
    // 11. EXPOSE PUBLIC API
    // ============================================
    window.inventoryModule = {
        ...actions,
        showTab: (tabName) => tabs.showTab(tabName),
        refresh: () => actions.refreshDashboard(),
        exportReport: () => actions.exportReport()
    };

    // Iniciar la aplicación
    init();
});
