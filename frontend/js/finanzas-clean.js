// Finanzas Dashboard - Módulo principal
import { config } from './config.js';
import { FinancialModals } from './finanzas-modals.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('💰 Inicializando Módulo Finanzas');
    
    // Importar utilidades de autenticación
    const { AuthManager } = await import('./auth.js');
    
    // Proteger la página
    if (!AuthManager.protectPage()) {
        return;
    }

    // Estado global del módulo
    const state = {
        quotes: [],
        invoices: [],
        expenses: [],
        expenseCategories: [],
        currentTab: 'overview',
        loading: false,
        currentFilters: {
            search: '',
            status: '',
            category: ''
        },
        filteredExpenses: [],
        metrics: {
            totalQuotes: 0,
            totalInvoices: 0,
            totalExpenses: 0,
            pendingPayments: 0,
            pendingApprovals: 0,
            monthlyRevenue: 0
        }
    };

    // --- Funciones de Utilidad para Manejo de Errores ---
    /**
     * Mostrar error al usuario de manera user-friendly
     * @param {string} message - Mensaje de error a mostrar
     * @param {string} context - Contexto del error para logging
     */
    function showError(message, context = 'Finanzas') {
        console.error(`❌ ${context}:`, message);

        // Buscar elemento de error o usar notificación genérica
        const errorElement = document.getElementById('error-display');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');

            // Auto-hide después de 5 segundos
            setTimeout(() => {
                if (errorElement) errorElement.classList.add('hidden');
            }, 5000);
        } else {
            // Fallback: usar alert o console
            console.warn('⚠️ Elemento error-display no encontrado, usando alert');
            alert(message);
        }
    }

    /**
     * Mostrar mensaje de éxito al usuario
     * @param {string} message - Mensaje de éxito a mostrar
     */
    function showSuccess(message) {
        console.log(`✅ FINANZAS: ${message}`);

        // Buscar elemento de éxito o usar notificación genérica
        const successElement = document.getElementById('success-display');
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.remove('hidden');

            // Auto-hide después de 3 segundos
            setTimeout(() => {
                if (successElement) successElement.classList.add('hidden');
            }, 3000);
        }
    }

    // API wrapper con autenticación mejorado
    const api = {
        async get(endpoint) {
            try {
                console.log(`🔄 GET ${endpoint}`);
                const response = await AuthManager.authenticatedFetch(`${config.API_URL}${endpoint}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const result = await response.json();
                console.log(`✅ GET ${endpoint} exitoso`);
                return result;

            } catch (error) {
                const errorId = `FIN_GET_${Date.now()}`;
                console.error(`❌ Error GET ${endpoint} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    endpoint,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error cargando datos. Por favor intenta nuevamente. (Ref: ${errorId})`, 'api.get');
                throw error;
            }
        },

        async post(endpoint, data) {
            try {
                console.log(`🔄 POST ${endpoint}`);
                const response = await AuthManager.authenticatedFetch(`${config.API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const result = await response.json();
                console.log(`✅ POST ${endpoint} exitoso`);
                return result;

            } catch (error) {
                const errorId = `FIN_POST_${Date.now()}`;
                console.error(`❌ Error POST ${endpoint} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    endpoint,
                    data,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error guardando datos. Por favor intenta nuevamente. (Ref: ${errorId})`, 'api.post');
                throw error;
            }
        },

        async put(endpoint, data) {
            try {
                console.log(`🔄 PUT ${endpoint}`);
                const response = await AuthManager.authenticatedFetch(`${config.API_URL}${endpoint}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const result = await response.json();
                console.log(`✅ PUT ${endpoint} exitoso`);
                return result;

            } catch (error) {
                const errorId = `FIN_PUT_${Date.now()}`;
                console.error(`❌ Error PUT ${endpoint} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    endpoint,
                    data,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error actualizando datos. Por favor intenta nuevamente. (Ref: ${errorId})`, 'api.put');
                throw error;
            }
        },

        async delete(endpoint) {
            try {
                console.log(`🔄 DELETE ${endpoint}`);
                const response = await AuthManager.authenticatedFetch(`${config.API_URL}${endpoint}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const result = await response.json();
                console.log(`✅ DELETE ${endpoint} exitoso`);
                return result;

            } catch (error) {
                const errorId = `FIN_DELETE_${Date.now()}`;
                console.error(`❌ Error DELETE ${endpoint} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    endpoint,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error eliminando datos. Por favor intenta nuevamente. (Ref: ${errorId})`, 'api.delete');
                throw error;
            }
        }
    };

    // Inicializar sistema de modales
    let modals = null;

    // Cargar datos iniciales
    const loadData = async () => {
        try {
            setLoading(true);
            console.log('📊 Cargando datos financieros...');

            const [quotesResponse, invoicesResponse, expensesResponse, categoriesResponse] = await Promise.all([
                api.get('/api/quotes'),
                api.get('/api/invoices'),
                api.get('/api/expenses'),
                api.get('/api/expense-categories')
            ]);

            state.quotes = quotesResponse.data || [];
            state.invoices = invoicesResponse.data || [];
            state.expenses = expensesResponse.data || [];
            state.expenseCategories = categoriesResponse.data || [];

            // Inicializar gastos filtrados
            state.filteredExpenses = [...state.expenses];

            calculateMetrics();
            renderCurrentTab();

            console.log('✅ Datos financieros cargados:', {
                quotes: state.quotes.length,
                invoices: state.invoices.length,
                expenses: state.expenses.length,
                categories: state.expenseCategories.length
            });

        } catch (error) {
            const errorId = `FIN_LOAD_DATA_${Date.now()}`;
            console.error(`❌ Error cargando datos financieros [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            // Si el error es de gastos, cargar solo quotes e invoices
            if (error.message.includes('expenses')) {
                console.log('⚠️ Cargando sin datos de gastos...');
                try {
                    const [quotesResponse, invoicesResponse] = await Promise.all([
                        api.get('/api/quotes'),
                        api.get('/api/invoices')
                    ]);

                    state.quotes = quotesResponse.data || [];
                    state.invoices = invoicesResponse.data || [];
                    state.expenses = [];
                    state.expenseCategories = [];
                    state.filteredExpenses = [];

                    calculateMetrics();
                    renderCurrentTab();

                    console.log('✅ Datos parciales cargados (sin gastos)');
                } catch (fallbackError) {
                    console.error(`❌ Error en fallback de carga de datos [${errorId}]:`, fallbackError);
                    showError('Error al cargar los datos financieros. Por favor recarga la página. (Ref: ' + errorId + ')');
                }
            } else {
                showError('Error al cargar los datos financieros. Por favor intenta nuevamente. (Ref: ' + errorId + ')');
            }
        } finally {
            setLoading(false);
        }
    };

    // Exponer loadData globalmente para los modales
    window.loadData = loadData;

    // Calcular métricas
    const calculateMetrics = () => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Total cotizaciones
        state.metrics.totalQuotes = state.quotes.length;
        
        // Total facturas
        state.metrics.totalInvoices = state.invoices.length;
        
        // Total gastos
        state.metrics.totalExpenses = state.expenses.length;
        
        // Pagos pendientes (facturas)
        state.metrics.pendingPayments = state.invoices
            .filter(invoice => invoice.status === 'pending')
            .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
        
        // Aprobaciones pendientes (gastos)
        state.metrics.pendingApprovals = state.expenses
            .filter(expense => expense.status === 'Pendiente')
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);
        
        // Ingresos del mes
        state.metrics.monthlyRevenue = state.invoices
            .filter(invoice => {
                const invoiceDate = new Date(invoice.created_at);
                return invoiceDate.getMonth() === currentMonth && 
                       invoiceDate.getFullYear() === currentYear &&
                       invoice.status === 'paid';
            })
            .reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    };

    // Sistema de pestañas
    const initTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                
                // Actualizar botones
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Actualizar contenido
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Actualizar estado
                state.currentTab = tabId;
                renderCurrentTab();
            });
        });
    };

    // Renderizar pestaña actual
    const renderCurrentTab = () => {
        switch (state.currentTab) {
            case 'overview':
                renderOverview();
                break;
            case 'quotes':
                renderQuotes();
                break;
            case 'invoices':
                renderInvoices();
                break;
            case 'expenses':
                renderExpenses();
                break;
        }
    };

    // Renderizar overview
    const renderOverview = () => {
        const metricsContainer = document.querySelector('.metrics-grid');
        if (!metricsContainer) {
            console.warn('⚠️ No se encontró .metrics-grid');
            return;
        }

        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Cotizaciones</span>
                    <i data-lucide="file-text" class="metric-icon"></i>
                </div>
                <div class="metric-value">${state.metrics.totalQuotes}</div>
                <div class="metric-change positive">+12% este mes</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Facturas</span>
                    <i data-lucide="receipt" class="metric-icon"></i>
                </div>
                <div class="metric-value">${state.metrics.totalInvoices}</div>
                <div class="metric-change positive">+8% este mes</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Gastos</span>
                    <i data-lucide="credit-card" class="metric-icon"></i>
                </div>
                <div class="metric-value">${state.metrics.totalExpenses}</div>
                <div class="metric-change neutral">Total registrados</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Pagos Pendientes</span>
                    <i data-lucide="clock" class="metric-icon"></i>
                </div>
                <div class="metric-value">$${formatCurrency(state.metrics.pendingPayments)}</div>
                <div class="metric-change negative">Facturas pendientes</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Aprobaciones Pendientes</span>
                    <i data-lucide="alert-circle" class="metric-icon"></i>
                </div>
                <div class="metric-value">$${formatCurrency(state.metrics.pendingApprovals)}</div>
                <div class="metric-change warning">Gastos por aprobar</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-title">Ingresos del Mes</span>
                    <i data-lucide="trending-up" class="metric-icon"></i>
                </div>
                <div class="metric-value">$${formatCurrency(state.metrics.monthlyRevenue)}</div>
                <div class="metric-change positive">+15% vs mes anterior</div>
            </div>
        `;
        
        // Re-inicializar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        console.log('✅ Métricas renderizadas');
    };

    // Renderizar cotizaciones
    const renderQuotes = () => {
        const container = document.getElementById('quotes-table-body');
        if (!container) return;

        if (state.quotes.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="file-text"></i>
                        </div>
                        <h3>No hay cotizaciones</h3>
                        <p>Crea tu primera cotización para comenzar</p>
                    </td>
                </tr>
            `;
        } else {
            container.innerHTML = state.quotes.map(quote => `
                <tr>
                    <td>#${quote.id}</td>
                    <td>${quote.client_name || 'Sin cliente'}</td>
                    <td>${formatDate(quote.created_at)}</td>
                    <td>$${formatCurrency(quote.total_amount || 0)}</td>
                    <td><span class="status-badge status-${quote.status || 'pending'}">${getStatusText(quote.status)}</span></td>
                    <td>
                        <button class="btn-icon" onclick="viewQuote(${quote.id})" title="Ver cotización">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editQuote(${quote.id})" title="Editar">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon text-red-500" onclick="deleteQuote(${quote.id})" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    // Renderizar facturas
    const renderInvoices = () => {
        const container = document.getElementById('invoices-table-body');
        if (!container) return;

        if (state.invoices.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="receipt"></i>
                        </div>
                        <h3>No hay facturas</h3>
                        <p>Crea tu primera factura para comenzar</p>
                    </td>
                </tr>
            `;
        } else {
            container.innerHTML = state.invoices.map(invoice => `
                <tr>
                    <td>#${invoice.id}</td>
                    <td>${invoice.client_name || 'Sin cliente'}</td>
                    <td>${formatDate(invoice.created_at)}</td>
                    <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                    <td>$${formatCurrency(invoice.total_amount || 0)}</td>
                    <td><span class="status-badge status-${invoice.status || 'pending'}">${getStatusText(invoice.status)}</span></td>
                    <td>
                        <button class="btn-icon" onclick="viewInvoice(${invoice.id})" title="Ver factura">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editInvoice(${invoice.id})" title="Editar">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon text-red-500" onclick="deleteInvoice(${invoice.id})" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    // Renderizar gastos
    const renderExpenses = () => {
        const container = document.getElementById('expenses-content');
        if (!container) return;

        if (state.expenses && state.expenses.length === 0) {
            container.innerHTML = `
                <div class="expenses-header">
                    <h3>Gestión de Gastos</h3>
                    <button class="btn btn-primary" onclick="createExpense()">
                        <i data-lucide="plus"></i>
                        Nuevo Gasto
                    </button>
                </div>
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i data-lucide="credit-card"></i>
                    </div>
                    <h3>No hay gastos registrados</h3>
                    <p>Crea tu primer gasto para comenzar</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="expenses-header">
                    <h3>Gestión de Gastos</h3>
                    <div class="expenses-actions">
                        <div class="search-box">
                            <input type="text" id="expenses-search" placeholder="Buscar gastos..." value="${state.currentFilters.search || ''}">
                            <i data-lucide="search"></i>
                        </div>
                        <select id="expenses-status-filter" class="filter-select">
                            <option value="">Todos los estados</option>
                            <option value="Pendiente" ${state.currentFilters.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Aprobado" ${state.currentFilters.status === 'Aprobado' ? 'selected' : ''}>Aprobado</option>
                            <option value="Rechazado" ${state.currentFilters.status === 'Rechazado' ? 'selected' : ''}>Rechazado</option>
                            <option value="Pagado" ${state.currentFilters.status === 'Pagado' ? 'selected' : ''}>Pagado</option>
                        </select>
                        <button class="btn btn-primary" onclick="createExpense()">
                            <i data-lucide="plus"></i>
                            Nuevo Gasto
                        </button>
                    </div>
                </div>
                
                <div class="expenses-stats">
                    <div class="stat-card">
                        <span class="stat-label">Total Gastos</span>
                        <span class="stat-value">${state.expenses ? state.expenses.length : 0}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Pendientes</span>
                        <span class="stat-value">${state.expenses ? state.expenses.filter(e => e.status === 'Pendiente').length : 0}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Aprobados</span>
                        <span class="stat-value">${state.expenses ? state.expenses.filter(e => e.status === 'Aprobado').length : 0}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Total Monto</span>
                        <span class="stat-value">$${formatCurrency(state.expenses ? state.expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0)}</span>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Categoría</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Proveedor</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="expenses-table-body">
                            ${renderExpensesTable()}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Configurar filtros
            setupExpensesFilters();
        }
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    const renderExpensesTable = () => {
        if (!state.expenses || state.expenses.length === 0) {
            return `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="credit-card"></i>
                        </div>
                        <h3>No hay gastos</h3>
                        <p>Los gastos aparecerán aquí cuando se creen</p>
                    </td>
                </tr>
            `;
        }

        return state.filteredExpenses.map(expense => `
            <tr class="expense-row" data-status="${expense.status}">
                <td>#${expense.id}</td>
                <td>${formatDate(expense.date)}</td>
                <td class="expense-description">
                    <div class="description-text">${expense.description}</div>
                    ${expense.notes ? `<div class="description-notes">${expense.notes}</div>` : ''}
                </td>
                <td>
                    <span class="category-badge">${expense.category_name || expense.category || 'Sin categoría'}</span>
                </td>
                <td class="amount-cell">$${formatCurrency(expense.amount || 0)}</td>
                <td>
                    <span class="status-badge status-${expense.status.toLowerCase()}">${expense.status}</span>
                </td>
                <td>${expense.supplier || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="viewExpense(${expense.id})" title="Ver detalles">
                        <i data-lucide="eye"></i>
                    </button>
                    ${expense.status === 'Pendiente' ? `
                        <button class="btn-icon" onclick="editExpense(${expense.id})" title="Editar">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon btn-approve" onclick="approveExpense(${expense.id})" title="Aprobar">
                            <i data-lucide="check"></i>
                        </button>
                        <button class="btn-icon btn-reject" onclick="rejectExpense(${expense.id})" title="Rechazar">
                            <i data-lucide="x"></i>
                        </button>
                        <button class="btn-icon text-red-500" onclick="deleteExpense(${expense.id})" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    ` : ''}
                    ${expense.status === 'Aprobado' ? `
                        <button class="btn-icon btn-pay" onclick="payExpense(${expense.id})" title="Marcar como pagado">
                            <i data-lucide="credit-card"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    };

    const setupExpensesFilters = () => {
        const searchInput = document.getElementById('expenses-search');
        const statusFilter = document.getElementById('expenses-status-filter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.currentFilters.search = e.target.value;
                filterExpenses();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                state.currentFilters.status = e.target.value;
                filterExpenses();
            });
        }
    };

    const filterExpenses = () => {
        if (!state.expenses) {
            state.filteredExpenses = [];
            return;
        }

        let filtered = [...state.expenses];

        // Filtro por búsqueda
        if (state.currentFilters.search) {
            const search = state.currentFilters.search.toLowerCase();
            filtered = filtered.filter(expense => 
                expense.description.toLowerCase().includes(search) ||
                expense.category.toLowerCase().includes(search) ||
                (expense.supplier && expense.supplier.toLowerCase().includes(search))
            );
        }

        // Filtro por estado
        if (state.currentFilters.status) {
            filtered = filtered.filter(expense => expense.status === state.currentFilters.status);
        }

        state.filteredExpenses = filtered;
        
        // Actualizar solo la tabla
        const tableBody = document.getElementById('expenses-table-body');
        if (tableBody) {
            tableBody.innerHTML = renderExpensesTable();
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    };

    // Utilidades de formato
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-CL');
    };

    const getStatusText = (status) => {
        const statusMap = {
            'pending': 'Pendiente',
            'approved': 'Aprobada',
            'rejected': 'Rechazada',
            'paid': 'Pagada',
            'cancelled': 'Cancelada'
        };
        return statusMap[status] || 'Desconocido';
    };

    // Estados de carga
    const setLoading = (loading) => {
        state.loading = loading;
        const loadingElements = document.querySelectorAll('.loading-state');
        loadingElements.forEach(el => {
            el.style.display = loading ? 'block' : 'none';
        });
    };

    // Mostrar errores
    const showError = (message) => {
        // Implementar sistema de notificaciones
        console.error('💥 Error:', message);
        alert(message); // Temporal - reemplazar con toast
    };

    // Mostrar éxito
    const showSuccess = (message) => {
        console.log('✅ Éxito:', message);
        alert(message); // Temporal - reemplazar con toast
    };

    // Modales para crear/editar
    const showQuoteModal = (quoteId = null) => {
        if (modals) {
            modals.showQuoteModal(quoteId);
        }
    };

    const showInvoiceModal = (invoiceId = null) => {
        if (modals) {
            modals.showInvoiceModal(invoiceId);
        }
    };

    // Funciones globales para los botones
    window.viewQuote = (id) => {
        console.log('👁️ Ver cotización:', id);
        // Implementar vista de cotización
    };

    window.editQuote = (id) => {
        showQuoteModal(id);
    };

    window.deleteQuote = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;

        try {
            console.log(`🗑️ Eliminando cotización ID: ${id}`);
            await api.delete(`/api/quotes/${id}`);
            showSuccess('Cotización eliminada correctamente');
            await loadData();
            console.log(`✅ Cotización ${id} eliminada exitosamente`);
        } catch (error) {
            const errorId = `FIN_DEL_QUOTE_${Date.now()}`;
            console.error(`❌ Error eliminando cotización ${id} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                quoteId: id,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al eliminar la cotización. Por favor intenta nuevamente. (Ref: ${errorId})`, 'deleteQuote');
        }
    };

    window.viewInvoice = (id) => {
        console.log('👁️ Ver factura:', id);
        // Implementar vista de factura
    };

    window.editInvoice = (id) => {
        showInvoiceModal(id);
    };

    window.deleteInvoice = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

        try {
            console.log(`🗑️ Eliminando factura ID: ${id}`);
            await api.delete(`/api/invoices/${id}`);
            showSuccess('Factura eliminada correctamente');
            await loadData();
            console.log(`✅ Factura ${id} eliminada exitosamente`);
        } catch (error) {
            const errorId = `FIN_DEL_INVOICE_${Date.now()}`;
            console.error(`❌ Error eliminando factura ${id} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                invoiceId: id,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al eliminar la factura. Por favor intenta nuevamente. (Ref: ${errorId})`, 'deleteInvoice');
        }
    };

    window.createQuote = () => {
        showQuoteModal();
    };

    window.createInvoice = () => {
        showInvoiceModal();
    };

    // Funciones globales para gastos
    window.createExpense = () => {
        showExpenseModal();
    };

    window.viewExpense = (expenseId) => {
        const expense = state.expenses.find(e => e.id === expenseId);
        if (expense) {
            showExpenseModal(expense, 'view');
        }
    };

    window.editExpense = (expenseId) => {
        const expense = state.expenses.find(e => e.id === expenseId);
        if (expense) {
            showExpenseModal(expense, 'edit');
        }
    };

    window.approveExpense = async (expenseId) => {
        if (!confirm('¿Está seguro de que desea aprobar este gasto?')) return;

        try {
            console.log(`✅ Aprobando gasto ID: ${expenseId}`);
            const response = await api.put(`/api/expenses/${expenseId}/approve`, {});
            showSuccess('Gasto aprobado exitosamente');
            await loadData();
            console.log(`✅ Gasto ${expenseId} aprobado exitosamente`);
        } catch (error) {
            const errorId = `FIN_APPROVE_EXPENSE_${Date.now()}`;
            console.error(`❌ Error aprobando gasto ${expenseId} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                expenseId,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al aprobar gasto. Por favor intenta nuevamente. (Ref: ${errorId})`, 'approveExpense');
        }
    };

    window.rejectExpense = async (expenseId) => {
        const reason = prompt('Ingrese el motivo del rechazo:');
        if (!reason) return;

        try {
            console.log(`❌ Rechazando gasto ID: ${expenseId}`);
            const response = await api.put(`/api/expenses/${expenseId}/reject`, {
                notes: reason
            });
            showSuccess('Gasto rechazado exitosamente');
            await loadData();
            console.log(`✅ Gasto ${expenseId} rechazado exitosamente`);
        } catch (error) {
            const errorId = `FIN_REJECT_EXPENSE_${Date.now()}`;
            console.error(`❌ Error rechazando gasto ${expenseId} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                expenseId,
                reason,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al rechazar gasto. Por favor intenta nuevamente. (Ref: ${errorId})`, 'rejectExpense');
        }
    };

    window.payExpense = async (expenseId) => {
        const paymentMethod = prompt('Método de pago:', 'Transferencia');
        if (!paymentMethod) return;

        try {
            console.log(`💰 Pagando gasto ID: ${expenseId}`);
            const response = await api.put(`/api/expenses/${expenseId}/pay`, {
                payment_method: paymentMethod,
                payment_notes: `Pagado mediante ${paymentMethod}`
            });
            showSuccess('Gasto marcado como pagado exitosamente');
            await loadData();
            console.log(`✅ Gasto ${expenseId} pagado exitosamente`);
        } catch (error) {
            const errorId = `FIN_PAY_EXPENSE_${Date.now()}`;
            console.error(`❌ Error pagando gasto ${expenseId} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                expenseId,
                paymentMethod,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al marcar gasto como pagado. Por favor intenta nuevamente. (Ref: ${errorId})`, 'payExpense');
        }
    };

    window.deleteExpense = async (expenseId) => {
        if (!confirm('¿Está seguro de que desea eliminar este gasto?')) return;

        try {
            console.log(`🗑️ Eliminando gasto ID: ${expenseId}`);
            const response = await api.delete(`/api/expenses/${expenseId}`);
            showSuccess('Gasto eliminado exitosamente');
            await loadData();
            console.log(`✅ Gasto ${expenseId} eliminado exitosamente`);
        } catch (error) {
            const errorId = `FIN_DEL_EXPENSE_${Date.now()}`;
            console.error(`❌ Error eliminando gasto ${expenseId} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                expenseId,
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al eliminar gasto. Por favor intenta nuevamente. (Ref: ${errorId})`, 'deleteExpense');
        }
    };

    const showExpenseModal = (expense = null, mode = 'create') => {
        console.log('💸 Mostrando modal de gasto:', { expense, mode });
        // TODO: Implementar modal de gastos
        alert(`Modal de gastos - Modo: ${mode}\n${expense ? `Gasto ID: ${expense.id}` : 'Nuevo gasto'}`);
    };

    // Inicialización
    const init = async () => {
        try {
            console.log('🚀 Iniciando dashboard financiero...');

            // Renderizar información del usuario
            AuthManager.renderUserInfo();

            // Inicializar sistema de pestañas
            initTabs();

            // Inicializar modales
            modals = window.initFinancialModals(api);
            console.log('✅ Modales financieros inicializados');

            // Cargar datos
            await loadData();

            console.log('✅ Dashboard financiero inicializado correctamente');

        } catch (error) {
            const errorId = `FIN_INIT_${Date.now()}`;
            console.error(`❌ Error inicializando dashboard financiero [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            showError(`Error al inicializar el sistema. Por favor recarga la página. (Ref: ${errorId})`, 'init');
        }
    };

    // Iniciar la aplicación
    await init();
});
