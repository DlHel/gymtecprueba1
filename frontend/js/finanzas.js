// ============================================================================
// FINANZAS MODULE - Sistema de Gestión Financiera
// Cotizaciones, Facturas y Gastos
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ✅ PROTECCIÓN: Verificar autenticación
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.warn('❌ No autenticado, redirigiendo a login...');
        window.location.href = '/login.html';
        return;
    }

    // ✅ PROTECCIÓN: Verificar permisos de la página
    if (!window.checkPagePermissions()) {
        return; // checkPagePermissions ya maneja la redirección
    }

    console.log('💰 Inicializando módulo de finanzas...');

    // ============================================================================
    // CONFIGURACIÓN Y UTILIDADES
    // ============================================================================
    const API_URL = window.API_URL;
    const authenticatedFetch = window.authManager.authenticatedFetch.bind(window.authManager);

    // Función para formatear moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Función para formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    const state = {
        quotes: [],
        invoices: [],
        expenses: [],
        clients: [],
        currentView: 'quotes', // quotes, invoices, expenses
        currentItem: null,
        isLoading: false,
        error: null,
        filters: {
            search: '',
            status: '',
            client: '',
            dateFrom: '',
            dateTo: ''
        },
        pagination: {
            page: 1,
            limit: 20,
            total: 0
        }
    };

    // ============================================================================
    // DOM ELEMENTS  
    // ============================================================================
    const elements = {
        // Navigation tabs (using data-tab attribute selectors)
        quotesTab: document.querySelector('button[data-tab="quotes"]'),
        invoicesTab: document.querySelector('button[data-tab="invoices"]'),
        expensesTab: document.querySelector('button[data-tab="expenses"]'),
        overviewTab: document.querySelector('button[data-tab="overview"]'),
        payrollTab: document.querySelector('button[data-tab="payroll"]'),
        
        // Tab content views
        quotesView: document.getElementById('quotes-tab'),
        invoicesView: document.getElementById('invoices-tab'),
        expensesView: document.getElementById('expenses-tab'),
        overviewView: document.getElementById('overview-tab'),
        payrollView: document.getElementById('payroll-tab'),
        
        // Tables (usar IDs correctos del HTML)
        quotesTable: document.getElementById('quotes-table-body'),
        invoicesTable: document.getElementById('invoices-table-body'),
        expensesContent: document.getElementById('expenses-content'),
        
        // Buttons
        newQuoteBtn: document.getElementById('new-quote-btn'),
        newInvoiceBtn: document.getElementById('new-invoice-btn'),
        newExpenseBtn: document.getElementById('new-expense-btn'),
        
        // Filters
        searchInput: document.getElementById('search-filter'),
        statusFilter: document.getElementById('status-filter'),
        clientFilter: document.getElementById('client-filter'),
        dateFromFilter: document.getElementById('date-from-filter'),
        dateToFilter: document.getElementById('date-to-filter'),
        
        // Loading and error states
        loadingState: document.getElementById('loading-state'),
        errorDisplay: document.getElementById('error-display'),
        
        // Statistics
        statsContainer: document.getElementById('stats-container')
    };

    // ============================================================================
    // API FUNCTIONS CON AUTENTICACIÓN
    // ============================================================================
    const api = {
        // Quotes API
        quotes: {
            getAll: async (params = {}) => {
                try {
                    const queryString = new URLSearchParams(params).toString();
                    const response = await authenticatedFetch(`${API_URL}/quotes?${queryString}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - fetchQuotes:', error);
                    throw error;
                }
            },
            
            getById: async (id) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/quotes/${id}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - getQuote:', error);
                    throw error;
                }
            },
            
            create: async (data) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/quotes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error creating quote');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - createQuote:', error);
                    throw error;
                }
            },
            
            update: async (id, data) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/quotes/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error updating quote');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - updateQuote:', error);
                    throw error;
                }
            },
            
            delete: async (id) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/quotes/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error deleting quote');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - deleteQuote:', error);
                    throw error;
                }
            }
        },
        
        // Invoices API
        invoices: {
            getAll: async (params = {}) => {
                try {
                    const queryString = new URLSearchParams(params).toString();
                    const response = await authenticatedFetch(`${API_URL}/invoices?${queryString}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - fetchInvoices:', error);
                    throw error;
                }
            },
            
            getById: async (id) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/invoices/${id}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - getInvoice:', error);
                    throw error;
                }
            },
            
            create: async (data) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/invoices`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error creating invoice');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - createInvoice:', error);
                    throw error;
                }
            },
            
            update: async (id, data) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/invoices/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error updating invoice');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - updateInvoice:', error);
                    throw error;
                }
            },
            
            delete: async (id) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/invoices/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error deleting invoice');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - deleteInvoice:', error);
                    throw error;
                }
            },
            
            markPaid: async (id, paymentData) => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/invoices/${id}/mark-paid`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(paymentData)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error marking invoice as paid');
                    }
                    return await response.json();
                } catch (error) {
                    console.error('❌ API Error - markInvoicePaid:', error);
                    throw error;
                }
            }
        },
        
        // Expenses API 
        expenses: {
            getAll: async (params = {}) => {
                try {
                    const queryString = new URLSearchParams(params).toString();
                    const response = await authenticatedFetch(`${API_URL}/expenses?${queryString}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - fetchExpenses:', error);
                    throw error;
                }
            }
        },
        
        // Clients API (for dropdowns)
        clients: {
            getAll: async () => {
                try {
                    const response = await authenticatedFetch(`${API_URL}/clients`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - fetchClients:', error);
                    throw error;
                }
            }
        },
        
        // ============================================================================
        // PAYROLL API - Sistema de Nómina Chile
        // ============================================================================
        payroll: {
            // Obtener todos los períodos de nómina
            getPeriods: async () => {
                try {
                    console.log('📋 Fetching payroll periods...');
                    const response = await authenticatedFetch(`${API_URL}/payroll/periods`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll periods fetched:', result.data?.length || 0);
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - getPeriods:', error);
                    throw error;
                }
            },
            
            // Crear nuevo período de nómina
            createPeriod: async (data) => {
                try {
                    console.log('➕ Creating payroll period:', data);
                    const response = await authenticatedFetch(`${API_URL}/payroll/periods`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll period created:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - createPeriod:', error);
                    throw error;
                }
            },
            
            // Generar nómina automática para un período
            generatePayroll: async (periodId) => {
                try {
                    console.log(`🔄 Generating payroll for period ${periodId}...`);
                    const response = await authenticatedFetch(
                        `${API_URL}/payroll/periods/${periodId}/generate`,
                        { method: 'POST' }
                    );
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll generated:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - generatePayroll:', error);
                    throw error;
                }
            },
            
            // Obtener liquidaciones de un período
            getDetails: async (periodId) => {
                try {
                    console.log(`📄 Fetching payroll details for period ${periodId}...`);
                    const response = await authenticatedFetch(
                        `${API_URL}/payroll/details?period_id=${periodId}`
                    );
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll details fetched:', result.data?.length || 0);
                    return result.data || [];
                } catch (error) {
                    console.error('❌ API Error - getDetails:', error);
                    throw error;
                }
            },
            
            // Obtener una liquidación específica
            getDetail: async (detailId) => {
                try {
                    console.log(`📄 Fetching payroll detail ${detailId}...`);
                    const response = await authenticatedFetch(
                        `${API_URL}/payroll/details/${detailId}`
                    );
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll detail fetched:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - getDetail:', error);
                    throw error;
                }
            },
            
            // Aprobar una liquidación
            approveDetail: async (detailId) => {
                try {
                    console.log(`✅ Approving payroll detail ${detailId}...`);
                    const response = await authenticatedFetch(
                        `${API_URL}/payroll/details/${detailId}/approve`,
                        { method: 'PUT' }
                    );
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Payroll detail approved:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - approveDetail:', error);
                    throw error;
                }
            },
            
            // Obtener tasas de cambio actuales
            getCurrencyRates: async () => {
                try {
                    console.log('💱 Fetching currency rates...');
                    const response = await authenticatedFetch(`${API_URL}/currency/rates`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const result = await response.json();
                    console.log('✅ Currency rates fetched:', result.data);
                    return result.data;
                } catch (error) {
                    console.error('❌ API Error - getCurrencyRates:', error);
                    throw error;
                }
            }
        }
    };

    // ============================================================================
    // UI FUNCTIONS
    // ============================================================================
    const ui = {
        showLoading: () => {
            state.isLoading = true;
            console.log('🔄 Loading state activated');
            // El loading se muestra en las tablas individuales
        },
        
        hideLoading: () => {
            state.isLoading = false;
            console.log('✅ Loading state deactivated');
            // El loading se oculta cuando se renderizan los datos
        },
        
        showError: (message) => {
            console.error('❌ UI Error:', message);
            state.error = message;
            
            if (elements.errorDisplay) {
                elements.errorDisplay.textContent = message;
                elements.errorDisplay.classList.remove('hidden');
                
                // Auto-hide error after 5 seconds
                setTimeout(() => {
                    elements.errorDisplay.classList.add('hidden');
                    state.error = null;
                }, 5000);
            }
            
            // Show notification
            showNotification(message, 'error');
        },
        
        switchView: (view) => {
            console.log(`🔄 Switching to ${view} view`);
            console.log(`📍 Current state.currentView: ${state.currentView}`);
            
            state.currentView = view;
            
            // Ocultar todas las vistas (tab-content)
            const allTabs = document.querySelectorAll('.tab-content');
            console.log(`📋 Found ${allTabs.length} tab-content elements`);
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Desactivar todos los botones de tabs
            const allButtons = document.querySelectorAll('.tab-button');
            console.log(`🔘 Found ${allButtons.length} tab-button elements`);
            allButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Mostrar vista seleccionada y activar tab
            console.log(`✅ Activating view: ${view}`);
            switch (view) {
                case 'overview':
                    if (elements.overviewView) {
                        elements.overviewView.classList.add('active');
                        console.log('✅ Overview view activated');
                        // Cargar balance cuando se activa la vista
                        calculateAndDisplayBalance().catch(err => {
                            console.error('Error loading balance:', err);
                        });
                    } else {
                        console.warn('⚠️ overviewView element not found');
                    }
                    if (elements.overviewTab) {
                        elements.overviewTab.classList.add('active');
                        console.log('✅ Overview tab button activated');
                    } else {
                        console.warn('⚠️ overviewTab button not found');
                    }
                    break;
                case 'quotes':
                    if (elements.quotesView) {
                        elements.quotesView.classList.add('active');
                        console.log('✅ Quotes view activated');
                    } else {
                        console.warn('⚠️ quotesView element not found');
                    }
                    if (elements.quotesTab) {
                        elements.quotesTab.classList.add('active');
                        console.log('✅ Quotes tab button activated');
                    } else {
                        console.warn('⚠️ quotesTab button not found');
                    }
                    break;
                case 'invoices':
                    if (elements.invoicesView) {
                        elements.invoicesView.classList.add('active');
                        console.log('✅ Invoices view activated');
                    } else {
                        console.warn('⚠️ invoicesView element not found');
                    }
                    if (elements.invoicesTab) {
                        elements.invoicesTab.classList.add('active');
                        console.log('✅ Invoices tab button activated');
                    } else {
                        console.warn('⚠️ invoicesTab button not found');
                    }
                    break;
                case 'expenses':
                    if (elements.expensesView) {
                        elements.expensesView.classList.add('active');
                        console.log('✅ Expenses view activated');
                    } else {
                        console.warn('⚠️ expensesView element not found');
                    }
                    if (elements.expensesTab) {
                        elements.expensesTab.classList.add('active');
                        console.log('✅ Expenses tab button activated');
                    } else {
                        console.warn('⚠️ expensesTab button not found');
                    }
                    break;
                case 'payroll':
                    if (elements.payrollView) {
                        elements.payrollView.classList.add('active');
                        console.log('✅ Payroll view activated');
                    } else {
                        console.warn('⚠️ payrollView element not found');
                    }
                    if (elements.payrollTab) {
                        elements.payrollTab.classList.add('active');
                        console.log('✅ Payroll tab button activated');
                    } else {
                        console.warn('⚠️ payrollTab button not found');
                    }
                    // Cargar datos de nómina
                    loadPayroll().catch(err => console.error('Error loading payroll:', err));
                    break;
            }
            
            // Cargar datos para la vista actual (solo si no es overview)
            if (view !== 'overview') {
                console.log(`🔄 Loading data for view: ${view}`);
                loadCurrentViewData();
            } else {
                console.log('ℹ️ Overview view - loading recent activity...');
                loadRecentActivity();
            }
        },
        
        renderQuotes: (quotes) => {
            if (!elements.quotesTable) return;
            
            console.log('📋 Rendering quotes table:', { count: quotes.length });
            
            if (quotes.length === 0) {
                elements.quotesTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="border px-4 py-8 text-center text-gray-500">
                            No hay cotizaciones disponibles. Crea una nueva desde el botón "Nueva Cotización"
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            
            quotes.forEach(quote => {
                // Determinar clase de estado
                const statusConfig = {
                    'pending': { class: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
                    'approved': { class: 'bg-green-100 text-green-800', text: 'Aprobada' },
                    'rejected': { class: 'bg-red-100 text-red-800', text: 'Rechazada' },
                    'enviada': { class: 'bg-blue-100 text-blue-800', text: 'Enviada' },
                    'borrador': { class: 'bg-gray-100 text-gray-800', text: 'Borrador' }
                };
                
                const status = statusConfig[quote.status?.toLowerCase()] || { class: 'bg-gray-100 text-gray-800', text: quote.status || 'Sin estado' };
                
                html += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="border px-4 py-3 text-sm font-semibold text-gray-900">
                            ${quote.quote_number || 'N/A'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${quote.client_name || 'Cliente no especificado'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${quote.quote_date ? formatDate(quote.quote_date) : formatDate(quote.created_at) || '-'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            ${formatCurrency(quote.total || 0)}
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.class}">
                                ${status.text}
                            </span>
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="viewQuote(${quote.id})" 
                                        class="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Ver cotización">
                                    Ver
                                </button>
                                <button onclick="editQuote(${quote.id})" 
                                        class="text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Editar cotización">
                                    Editar
                                </button>
                                <button onclick="deleteQuote(${quote.id})" 
                                        class="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Eliminar cotización">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            elements.quotesTable.innerHTML = html;
        },
        
        renderInvoices: (invoices) => {
            if (!elements.invoicesTable) return;
            
            console.log('🧾 Rendering invoices table:', { count: invoices.length });
            
            if (invoices.length === 0) {
                elements.invoicesTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="border px-4 py-8 text-center text-gray-500">
                            No hay facturas disponibles. Crea una nueva desde el botón "Nueva Factura"
                        </td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            
            invoices.forEach(invoice => {
                // Determinar clase de estado
                const statusConfig = {
                    'paid': { class: 'bg-green-100 text-green-800', text: 'Pagada' },
                    'pagada': { class: 'bg-green-100 text-green-800', text: 'Pagada' },
                    'pending': { class: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
                    'pendiente': { class: 'bg-yellow-100 text-yellow-800', text: 'Pendiente' },
                    'overdue': { class: 'bg-red-100 text-red-800', text: 'Vencida' },
                    'vencida': { class: 'bg-red-100 text-red-800', text: 'Vencida' },
                    'vendida': { class: 'bg-blue-100 text-blue-800', text: 'Vendida' },
                    'cancelled': { class: 'bg-gray-100 text-gray-800', text: 'Cancelada' }
                };
                
                const status = statusConfig[invoice.status?.toLowerCase()] || { class: 'bg-gray-100 text-gray-800', text: invoice.status || 'Sin estado' };
                
                html += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="border px-4 py-3 text-sm font-semibold text-gray-900">
                            ${invoice.invoice_number || 'N/A'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${invoice.client_name || 'Cliente no especificado'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${invoice.issue_date ? formatDate(invoice.issue_date) : (invoice.invoice_date ? formatDate(invoice.invoice_date) : '-')}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${invoice.due_date ? formatDate(invoice.due_date) : '-'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            ${formatCurrency(invoice.total || 0)}
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.class}">
                                ${status.text}
                            </span>
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="viewInvoice(${invoice.id})" 
                                        class="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Ver factura">
                                    Ver
                                </button>
                                <button onclick="editInvoice(${invoice.id})" 
                                        class="text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Editar factura">
                                    Editar
                                </button>
                                <button onclick="deleteInvoice(${invoice.id})" 
                                        class="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Eliminar factura">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            elements.invoicesTable.innerHTML = html;
        },
        
        renderExpenses: (expenses) => {
            const expensesContent = elements.expensesContent;
            if (!expensesContent) {
                console.warn('⚠️ expenses-content element not found');
                return;
            }
            
            console.log('💸 Rendering expenses:', { count: expenses.length });
            
            if (expenses.length === 0) {
                expensesContent.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-semibold text-gray-800">Gastos</h3>
                            <div class="flex gap-3">
                                <button class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2" onclick="window.print()">
                                    <i data-lucide="printer" class="w-4 h-4"></i>
                                    Imprimir
                                </button>
                                <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2" onclick="createExpense()">
                                    <i data-lucide="plus" class="w-4 h-4"></i>
                                    Nuevo Gasto
                                </button>
                            </div>
                        </div>
                        <div class="text-center py-8">
                            <p class="text-gray-500 mb-4">No hay gastos registrados</p>
                            <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto" onclick="createExpense()">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                                Registrar Primer Gasto
                            </button>
                        </div>
                    </div>
                `;
                // Re-initialize lucide icons
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            // Crear tabla con datos
            let html = `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-semibold text-gray-800">Gastos</h3>
                        <div class="flex gap-3">
                            <button class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2" onclick="window.print()">
                                <i data-lucide="printer" class="w-4 h-4"></i>
                                Imprimir
                            </button>
                            <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2" onclick="createExpense()">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                                Nuevo Gasto
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="border px-4 py-2 text-left">Fecha</th>
                                    <th class="border px-4 py-2 text-left">Categoría</th>
                                    <th class="border px-4 py-2 text-left">Descripción</th>
                                    <th class="border px-4 py-2 text-right">Monto</th>
                                    <th class="border px-4 py-2 text-left">Proveedor</th>
                                    <th class="border px-4 py-2 text-center">Tipo</th>
                                    <th class="border px-4 py-2 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            expenses.forEach(expense => {
                // Tipo de gasto
                const referenceType = expense.reference_type || 'General';
                const typeConfig = {
                    'ticket': { class: 'bg-blue-100 text-blue-800', text: 'Ticket' },
                    'purchase_order': { class: 'bg-purple-100 text-purple-800', text: 'Orden Compra' },
                    'general': { class: 'bg-gray-100 text-gray-800', text: 'General' }
                };
                const typeInfo = typeConfig[referenceType.toLowerCase()] || typeConfig['general'];
                
                html += `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            ${expense.date ? formatDate(expense.date) : (expense.expense_date ? formatDate(expense.expense_date) : (expense.created_at ? formatDate(expense.created_at) : '-'))}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium">
                                ${expense.category || expense.category_name || 'Sin categoría'}
                            </span>
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-700 max-w-md truncate" title="${expense.description || 'Sin descripción'}">
                            ${expense.description || 'Sin descripción'}
                        </td>
                        <td class="border px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            ${formatCurrency(expense.amount || 0)}
                        </td>
                        <td class="border px-4 py-3 text-sm text-gray-600">
                            ${expense.supplier || expense.supplier_name || 'No especificado'}
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.class}">
                                ${typeInfo.text}
                            </span>
                        </td>
                        <td class="border px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <button onclick="viewExpense(${expense.id})" 
                                        class="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Ver gasto">
                                    Ver
                                </button>
                                <button onclick="editExpense(${expense.id})" 
                                        class="text-amber-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Editar gasto">
                                    Editar
                                </button>
                                <button onclick="deleteExpense(${expense.id})" 
                                        class="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                                        title="Eliminar gasto">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            expensesContent.innerHTML = html;
            
            // Re-initialize lucide icons
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            console.log('✅ Expenses rendered successfully');
        },
        
        populateClientDropdown: (clients) => {
            const clientSelects = document.querySelectorAll('select[name="client_id"], #client-filter');
            
            clientSelects.forEach(select => {
                if (select.id === 'client-filter') {
                    select.innerHTML = '<option value="">Todos los clientes</option>';
                } else {
                    select.innerHTML = '<option value="">Seleccionar cliente</option>';
                }
                
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.name;
                    select.appendChild(option);
                });
            });
        }
    };

    // ============================================================================
    // PAYROLL UI FUNCTIONS - Renderizado de Nómina
    // ============================================================================
    const payrollUI = {
        // Estado de la moneda actual
        currentCurrency: 'CLP',
        currencyRates: null,
        
        // Renderizar lista de períodos
        renderPeriods: (periods) => {
            console.log('🎨 Rendering payroll periods:', periods?.length || 0);
            const tbody = document.getElementById('payroll-periods-tbody');
            
            if (!tbody) {
                console.error('❌ payroll-periods-tbody not found');
                return;
            }
            
            if (!periods || periods.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-8 text-secondary">
                            <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                            <p>No hay períodos de nómina creados</p>
                            <p class="text-sm mt-1">Crea el primero haciendo clic en "Nuevo Período"</p>
                        </td>
                    </tr>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            tbody.innerHTML = periods.map(p => {
                const statusClasses = {
                    'draft': 'bg-gray-100 text-gray-700',
                    'generated': 'bg-blue-100 text-blue-700',
                    'approved': 'bg-green-100 text-green-700',
                    'paid': 'bg-purple-100 text-purple-700'
                };
                
                const statusLabels = {
                    'draft': '📝 Borrador',
                    'generated': '📊 Generada',
                    'approved': '✅ Aprobada',
                    'paid': '💰 Pagada'
                };
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="border px-4 py-2 font-medium">${p.period_name || 'Sin nombre'}</td>
                        <td class="border px-4 py-2">${formatDate(p.payment_date)}</td>
                        <td class="border px-4 py-2 text-center">${p.employee_count || 0}</td>
                        <td class="border px-4 py-2 text-right font-semibold">
                            ${payrollUI.formatCurrency(p.total_payroll || 0)}
                        </td>
                        <td class="border px-4 py-2 text-center">
                            <span class="px-3 py-1 rounded-full text-sm font-medium ${statusClasses[p.status] || statusClasses.draft}">
                                ${statusLabels[p.status] || p.status}
                            </span>
                        </td>
                        <td class="border px-4 py-2 text-center">
                            <div class="flex gap-2 justify-center">
                                <button onclick="loadPayrollDetails(${p.id}, '${p.period_name}')" 
                                        class="btn btn-sm btn-info" title="Ver liquidaciones">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                    Ver
                                </button>
                                ${p.status === 'draft' ? `
                                    <button onclick="generatePayroll(${p.id})" 
                                            class="btn btn-sm btn-success" title="Generar nómina">
                                        <i data-lucide="play-circle" class="w-4 h-4"></i>
                                        Generar
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log('✅ Payroll periods rendered');
        },
        
        // Renderizar detalles de liquidaciones
        renderDetails: (details, periodName) => {
            console.log('🎨 Rendering payroll details:', details?.length || 0);
            const section = document.getElementById('payroll-details-section');
            const tbody = document.getElementById('payroll-details-tbody');
            const periodNameSpan = document.getElementById('current-period-name');
            
            if (!section || !tbody) {
                console.error('❌ Payroll details elements not found');
                return;
            }
            
            if (periodNameSpan) {
                periodNameSpan.textContent = periodName;
            }
            
            if (!details || details.length === 0) {
                section.style.display = 'block';
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-8 text-secondary">
                            <i data-lucide="file-x" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                            <p>No hay liquidaciones para este período</p>
                            <p class="text-sm mt-1">Genera la nómina para crear las liquidaciones automáticamente</p>
                        </td>
                    </tr>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            section.style.display = 'block';
            tbody.innerHTML = details.map(d => `
                <tr class="hover:bg-gray-50">
                    <td class="border px-4 py-2">
                        <div class="font-medium">${d.full_name || d.username}</div>
                        <div class="text-sm text-gray-500">${d.username}</div>
                    </td>
                    <td class="border px-4 py-2 text-center">
                        <div class="text-sm">
                            <span class="font-medium">${(d.regular_hours || 0).toFixed(1)}h</span>
                            ${d.overtime_hours > 0 ? `<span class="text-blue-600"> + ${(d.overtime_hours || 0).toFixed(1)}h</span>` : ''}
                        </div>
                    </td>
                    <td class="border px-4 py-2 text-right text-green-600 font-semibold">
                        ${payrollUI.formatCurrency(d.total_haberes || 0)}
                    </td>
                    <td class="border px-4 py-2 text-right text-red-600 font-semibold">
                        ${payrollUI.formatCurrency(d.total_descuentos || 0)}
                    </td>
                    <td class="border px-4 py-2 text-right text-lg font-bold text-primary">
                        ${payrollUI.formatCurrency(d.liquido_a_pagar || 0)}
                    </td>
                    <td class="border px-4 py-2 text-center">
                        ${d.approved ? 
                            '<span class="text-green-600 font-medium">✅ Aprobada</span>' : 
                            '<span class="text-yellow-600 font-medium">⏳ Pendiente</span>'
                        }
                    </td>
                    <td class="border px-4 py-2 text-center">
                        <div class="flex gap-2 justify-center">
                            <button onclick="viewLiquidation(${d.id})" 
                                    class="btn btn-sm btn-info" title="Ver detalle">
                                <i data-lucide="file-text" class="w-4 h-4"></i>
                            </button>
                            ${!d.approved ? `
                                <button onclick="approveLiquidation(${d.id})" 
                                        class="btn btn-sm btn-success" title="Aprobar">
                                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log('✅ Payroll details rendered');
        },
        
        // Renderizar detalle completo de liquidación en modal
        renderLiquidationDetail: (detail) => {
            console.log('🎨 Rendering liquidation detail:', detail);
            const content = document.getElementById('liquidation-detail-content');
            const title = document.getElementById('liquidation-detail-title');
            
            if (!content) return;
            
            if (title) {
                title.textContent = `Liquidación de Sueldo - ${detail.full_name || detail.username}`;
            }
            
            content.innerHTML = `
                <div class="space-y-4">
                    <!-- Información del Empleado -->
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold mb-2">Información del Empleado</h4>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div><span class="text-gray-600">Nombre:</span> <strong>${detail.full_name || detail.username}</strong></div>
                            <div><span class="text-gray-600">Período:</span> <strong>${detail.period_name}</strong></div>
                            <div><span class="text-gray-600">Horas Regulares:</span> <strong>${(detail.regular_hours || 0).toFixed(1)}h</strong></div>
                            <div><span class="text-gray-600">Horas Extras:</span> <strong class="text-blue-600">${(detail.overtime_hours || 0).toFixed(1)}h</strong></div>
                        </div>
                    </div>
                    
                    <!-- HABERES -->
                    <div class="border-2 border-green-200 rounded-lg p-4">
                        <h4 class="font-semibold text-green-700 mb-3 flex items-center">
                            <i data-lucide="plus-circle" class="w-5 h-5 mr-2"></i>
                            HABERES (Ingresos)
                        </h4>
                        <table class="w-full text-sm">
                            <tbody>
                                <tr class="border-b">
                                    <td class="py-2">Sueldo Base</td>
                                    <td class="py-2 text-right font-semibold">${payrollUI.formatCurrency(detail.base_salary || 0)}</td>
                                </tr>
                                ${detail.overtime_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Horas Extras (${(detail.overtime_hours || 0).toFixed(1)}h)</td>
                                    <td class="py-2 text-right font-semibold">${payrollUI.formatCurrency(detail.overtime_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.colacion_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Colación</td>
                                    <td class="py-2 text-right font-semibold">${payrollUI.formatCurrency(detail.colacion_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.movilizacion_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Movilización</td>
                                    <td class="py-2 text-right font-semibold">${payrollUI.formatCurrency(detail.movilizacion_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.bonos_adicionales > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Bonos Adicionales</td>
                                    <td class="py-2 text-right font-semibold">${payrollUI.formatCurrency(detail.bonos_adicionales)}</td>
                                </tr>
                                ` : ''}
                                <tr class="bg-green-50 font-bold">
                                    <td class="py-3">TOTAL HABERES</td>
                                    <td class="py-3 text-right text-green-700 text-lg">${payrollUI.formatCurrency(detail.total_haberes || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- DESCUENTOS -->
                    <div class="border-2 border-red-200 rounded-lg p-4">
                        <h4 class="font-semibold text-red-700 mb-3 flex items-center">
                            <i data-lucide="minus-circle" class="w-5 h-5 mr-2"></i>
                            DESCUENTOS LEGALES
                        </h4>
                        <table class="w-full text-sm">
                            <tbody>
                                ${detail.afp_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">AFP (${(detail.afp_percentage || 0).toFixed(2)}%)</td>
                                    <td class="py-2 text-right font-semibold text-red-600">${payrollUI.formatCurrency(detail.afp_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.salud_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Salud (${(detail.salud_percentage || 0).toFixed(2)}%)</td>
                                    <td class="py-2 text-right font-semibold text-red-600">${payrollUI.formatCurrency(detail.salud_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.seguro_cesantia_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Seguro de Cesantía (0.6%)</td>
                                    <td class="py-2 text-right font-semibold text-red-600">${payrollUI.formatCurrency(detail.seguro_cesantia_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.impuesto_unico_amount > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Impuesto Único</td>
                                    <td class="py-2 text-right font-semibold text-red-600">${payrollUI.formatCurrency(detail.impuesto_unico_amount)}</td>
                                </tr>
                                ` : ''}
                                ${detail.otros_descuentos > 0 ? `
                                <tr class="border-b">
                                    <td class="py-2">Otros Descuentos</td>
                                    <td class="py-2 text-right font-semibold text-red-600">${payrollUI.formatCurrency(detail.otros_descuentos)}</td>
                                </tr>
                                ` : ''}
                                <tr class="bg-red-50 font-bold">
                                    <td class="py-3">TOTAL DESCUENTOS</td>
                                    <td class="py-3 text-right text-red-700 text-lg">${payrollUI.formatCurrency(detail.total_descuentos || 0)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- LÍQUIDO A PAGAR -->
                    <div class="bg-primary text-white p-6 rounded-lg text-center">
                        <div class="text-sm font-medium mb-2">LÍQUIDO A PAGAR</div>
                        <div class="text-4xl font-bold">${payrollUI.formatCurrency(detail.liquido_a_pagar || 0)}</div>
                        ${detail.liquido_a_pagar_words ? `
                            <div class="text-sm mt-2 opacity-90">${detail.liquido_a_pagar_words}</div>
                        ` : ''}
                    </div>
                    
                    ${detail.approved ? `
                        <div class="bg-green-50 p-4 rounded-lg text-center">
                            <div class="flex items-center justify-center gap-2 text-green-700">
                                <i data-lucide="check-circle" class="w-6 h-6"></i>
                                <span class="font-semibold">Liquidación Aprobada</span>
                            </div>
                            <div class="text-sm text-green-600 mt-1">
                                Aprobada el ${formatDate(detail.approved_at)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log('✅ Liquidation detail rendered');
        },
        
        // Formatear moneda según la selección actual
        formatCurrency: (amount) => {
            if (!amount) amount = 0;
            
            switch (payrollUI.currentCurrency) {
                case 'UTM':
                    if (payrollUI.currencyRates?.utm_value) {
                        const utm = amount / payrollUI.currencyRates.utm_value;
                        return `${utm.toFixed(2)} UTM`;
                    }
                    break;
                case 'UF':
                    if (payrollUI.currencyRates?.uf_value) {
                        const uf = amount / payrollUI.currencyRates.uf_value;
                        return `${uf.toFixed(2)} UF`;
                    }
                    break;
                default: // CLP
                    return new Intl.NumberFormat('es-CL', {
                        style: 'currency',
                        currency: 'CLP',
                        minimumFractionDigits: 0
                    }).format(amount);
            }
            
            // Fallback a CLP si no hay tasas
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0
            }).format(amount);
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    // formatDate ya está declarado arriba en la sección de CONFIGURACIÓN Y UTILIDADES
    
    function formatMoney(amount) {
        if (!amount) return '0.00';
        return parseFloat(amount).toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    function getStatusClass(status) {
        const statusClasses = {
            'Borrador': 'bg-gray-100 text-gray-800',
            'Enviada': 'bg-blue-100 text-blue-800',
            'Aprobada': 'bg-green-100 text-green-800',
            'Rechazada': 'bg-red-100 text-red-800',
            'Pendiente': 'bg-yellow-100 text-yellow-800',
            'Pagada': 'bg-green-100 text-green-800',
            'Vencida': 'bg-red-100 text-red-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500 text-white' : 
            type === 'success' ? 'bg-green-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // Exponer showNotification como global
    window.showNotification = showNotification;

    // ============================================================================
    // DATA LOADING FUNCTIONS
    // ============================================================================
    async function loadCurrentViewData() {
        try {
            console.log(`📊 loadCurrentViewData called for: ${state.currentView}`);
            ui.showLoading();
            
            switch (state.currentView) {
                case 'quotes':
                    console.log('🔄 Loading quotes...');
                    await loadQuotes();
                    break;
                case 'invoices':
                    console.log('🔄 Loading invoices...');
                    await loadInvoices();
                    break;
                case 'expenses':
                    console.log('🔄 Loading expenses...');
                    await loadExpenses();
                    break;
                default:
                    console.warn(`⚠️ Unknown view: ${state.currentView}`);
            }
            
        } catch (error) {
            console.error(`❌ Error loading ${state.currentView} data:`, error);
            ui.showError(`Error cargando datos de ${state.currentView}`);
        } finally {
            ui.hideLoading();
        }
    }
    
    async function loadQuotes() {
        try {
            const filters = getActiveFilters();
            const quotes = await api.quotes.getAll(filters);
            state.quotes = quotes;
            ui.renderQuotes(quotes);
            console.log('✅ Quotes loaded successfully:', { count: quotes.length });
        } catch (error) {
            console.error('❌ Error loading quotes:', error);
            throw error;
        }
    }
    
    async function loadInvoices() {
        try {
            const filters = getActiveFilters();
            const invoices = await api.invoices.getAll(filters);
            state.invoices = invoices;
            ui.renderInvoices(invoices);
            console.log('✅ Invoices loaded successfully:', { count: invoices.length });
        } catch (error) {
            console.error('❌ Error loading invoices:', error);
            throw error;
        }
    }
    
    async function loadExpenses() {
        try {
            const filters = getActiveFilters();
            const expenses = await api.expenses.getAll(filters);
            
            // Ordenar por fecha descendente (más reciente primero)
            expenses.sort((a, b) => {
                const dateA = new Date(a.date || a.expense_date || a.created_at || 0);
                const dateB = new Date(b.date || b.expense_date || b.created_at || 0);
                return dateB - dateA; // Descendente
            });
            
            state.expenses = expenses;
            ui.renderExpenses(expenses);
            console.log('✅ Expenses loaded successfully:', { count: expenses.length });
        } catch (error) {
            console.error('❌ Error loading expenses:', error);
            throw error;
        }
    }
    
    // Exponer funciones de carga como globales para uso en botones
    window.loadQuotes = loadQuotes;
    window.loadInvoices = loadInvoices;
    window.loadExpenses = loadExpenses;
    
    async function loadClients() {
        try {
            const clients = await api.clients.getAll();
            state.clients = clients;
            ui.populateClientDropdown(clients);
            console.log('✅ Clients loaded successfully:', { count: clients.length });
        } catch (error) {
            console.error('❌ Error loading clients:', error);
            ui.showError('Error cargando lista de clientes');
        }
    }
    
    function getActiveFilters() {
        const filters = {};
        
        if (state.filters.search) filters.search = state.filters.search;
        if (state.filters.status) filters.status = state.filters.status;
        if (state.filters.client) filters.client_id = state.filters.client;
        if (state.filters.dateFrom) filters.date_from = state.filters.dateFrom;
        if (state.filters.dateTo) filters.date_to = state.filters.dateTo;
        
        filters.limit = state.pagination.limit;
        filters.offset = (state.pagination.page - 1) * state.pagination.limit;
        
        return filters;
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    function setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Tab navigation
        if (elements.overviewTab) {
            elements.overviewTab.addEventListener('click', () => ui.switchView('overview'));
        }
        if (elements.quotesTab) {
            elements.quotesTab.addEventListener('click', () => ui.switchView('quotes'));
        }
        if (elements.invoicesTab) {
            elements.invoicesTab.addEventListener('click', () => ui.switchView('invoices'));
        }
        if (elements.expensesTab) {
            elements.expensesTab.addEventListener('click', () => ui.switchView('expenses'));
        }
        if (elements.payrollTab) {
            elements.payrollTab.addEventListener('click', () => ui.switchView('payroll'));
        }
        
        // New item buttons
        if (elements.newQuoteBtn) {
            elements.newQuoteBtn.addEventListener('click', () => openNewQuoteModal());
        }
        if (elements.newInvoiceBtn) {
            elements.newInvoiceBtn.addEventListener('click', () => openNewInvoiceModal());
        }
        if (elements.newExpenseBtn) {
            elements.newExpenseBtn.addEventListener('click', () => openNewExpenseModal());
        }
        
        // Filter inputs
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(handleFilterChange, 300));
        }
        if (elements.statusFilter) {
            elements.statusFilter.addEventListener('change', handleFilterChange);
        }
        if (elements.clientFilter) {
            elements.clientFilter.addEventListener('change', handleFilterChange);
        }
        if (elements.dateFromFilter) {
            elements.dateFromFilter.addEventListener('change', handleFilterChange);
        }
        if (elements.dateToFilter) {
            elements.dateToFilter.addEventListener('change', handleFilterChange);
        }
    }
    
    function handleFilterChange() {
        console.log('🔄 Filters changed, updating data...');
        
        // Update state filters
        if (elements.searchInput) state.filters.search = elements.searchInput.value;
        if (elements.statusFilter) state.filters.status = elements.statusFilter.value;
        if (elements.clientFilter) state.filters.client = elements.clientFilter.value;
        if (elements.dateFromFilter) state.filters.dateFrom = elements.dateFromFilter.value;
        if (elements.dateToFilter) state.filters.dateTo = elements.dateToFilter.value;
        
        // Reset pagination
        state.pagination.page = 1;
        
        // Reload current view data
        loadCurrentViewData();
    }
    
    // Debounce utility for search input
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ============================================================================
    // ============================================================================
    // RECENT ACTIVITY
    // ============================================================================
    async function loadRecentActivity() {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;

        try {
            activityContainer.innerHTML = '<div class="loading-spinner"></div><p class="text-center text-secondary">Cargando actividad reciente...</p>';
            
            // Cargar últimas cotizaciones, facturas y gastos
            const [quotes, invoices, expenses] = await Promise.all([
                api.quotes.getAll({ limit: 3 }).catch(() => []),
                api.invoices.getAll({ limit: 3 }).catch(() => []),
                api.expenses.getAll({ limit: 3 }).catch(() => [])
            ]);

            // Combinar y ordenar por fecha
            const activities = [
                ...quotes.map(q => ({ type: 'quote', data: q, date: q.created_at || q.quote_date })),
                ...invoices.map(i => ({ type: 'invoice', data: i, date: i.created_at || i.invoice_date })),
                ...expenses.map(e => ({ type: 'expense', data: e, date: e.created_at || e.expense_date }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

            if (activities.length === 0) {
                activityContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-500 mb-4">No hay actividad reciente</p>
                        <p class="text-sm text-gray-400">Las cotizaciones, facturas y gastos aparecerán aquí</p>
                    </div>
                `;
                return;
            }

            // Renderizar actividades
            let html = '<div class="space-y-3">';
            activities.forEach(activity => {
                const icon = activity.type === 'quote' ? '📋' : activity.type === 'invoice' ? '🧾' : '💸';
                const typeText = activity.type === 'quote' ? 'Cotización' : activity.type === 'invoice' ? 'Factura' : 'Gasto';
                const title = activity.data.quote_number || activity.data.invoice_number || activity.data.description || 'Sin título';
                const amount = activity.data.total || activity.data.amount || 0;
                
                html += `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div class="flex items-center space-x-3">
                            <span class="text-2xl">${icon}</span>
                            <div>
                                <p class="font-medium text-gray-900">${typeText}: ${title}</p>
                                <p class="text-sm text-gray-500">${formatDate(activity.date)}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-gray-900">$${formatMoney(amount)}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            
            activityContainer.innerHTML = html;
            console.log('✅ Recent activity loaded:', { count: activities.length });
            
        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Error al cargar la actividad reciente</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    }

    // ============================================================================
    // BALANCE FINANCIERO
    // ============================================================================
    async function calculateAndDisplayBalance() {
        try {
            console.log('💰 Calculando balance financiero...');
            
            // Obtener facturas pagadas del mes actual
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            // Obtener datos con manejo de errores individual
            let invoices = [];
            let expenses = [];
            let quotes = [];
            
            try {
                invoices = await api.invoices.getAll() || [];
                console.log('✅ Facturas obtenidas:', invoices.length);
            } catch (err) {
                console.warn('⚠️ No se pudieron obtener facturas:', err.message);
                invoices = [];
            }
            
            try {
                expenses = await api.expenses.getAll() || [];
                console.log('✅ Gastos obtenidos:', expenses.length);
            } catch (err) {
                console.warn('⚠️ No se pudieron obtener gastos:', err.message);
                expenses = [];
            }
            
            try {
                quotes = await api.quotes.getAll() || [];
                console.log('✅ Cotizaciones obtenidas:', quotes.length);
            } catch (err) {
                console.warn('⚠️ No se pudieron obtener cotizaciones:', err.message);
                quotes = [];
            }
            
            // Calcular ingresos (facturas pagadas o completadas)
            // Incluir múltiples estados válidos de pago
            const paidStatuses = ['paid', 'completed', 'vendida', 'pagada', 'pagado'];
            const facturasPagadas = invoices.filter(inv => 
                paidStatuses.includes(inv.status?.toLowerCase())
            );
            
            console.log('📊 Análisis de facturas:', {
                total: invoices.length,
                pagadas: facturasPagadas.length,
                estados: invoices.map(inv => inv.status)
            });
            
            // LOG DETALLADO: Mostrar cada factura con su fecha y estado
            console.table(invoices.map(inv => ({
                numero: inv.invoice_number,
                cliente: inv.client_name || 'N/A',
                fecha: inv.issue_date,
                monto: inv.total,
                estado: inv.status,
                '¿Pagada?': paidStatuses.includes(inv.status?.toLowerCase()) ? '✅ SÍ' : '❌ NO'
            })));
            
            const ingresosTotales = facturasPagadas
                .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
            
            // Calcular gastos totales
            const gastosTotales = expenses
                .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            
            // LOG DETALLADO: Mostrar gastos
            console.log('💸 Análisis de gastos:');
            console.table(expenses.slice(0, 10).map(exp => ({
                descripcion: exp.description || 'N/A',
                fecha: exp.date || exp.expense_date || exp.movement_date || exp.created_at,
                monto: exp.amount,
                categoria: exp.category || 'N/A'
            })));
            
            // LOG: Mostrar todas las propiedades del primer gasto
            if (expenses.length > 0) {
                console.log('🔍 Propiedades del primer gasto:', Object.keys(expenses[0]));
                console.log('📝 Primer gasto completo:', expenses[0]);
            }
            
            // Gastos del mes actual (usar exp.date en lugar de exp.expense_date)
            const gastosDelMes = expenses
                .filter(exp => {
                    const dateValue = exp.date || exp.expense_date || exp.movement_date || exp.created_at;
                    if (!dateValue) return false;
                    const expDate = new Date(dateValue);
                    return expDate >= firstDayOfMonth && expDate <= lastDayOfMonth;
                })
                .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            
            // Balance neto
            const balanceNeto = ingresosTotales - gastosTotales;
            
            // Estadísticas adicionales
            const facturasPendientes = invoices.filter(inv => inv.status === 'pending').length;
            const cotizacionesActivas = quotes.filter(q => q.status === 'pending' || q.status === 'approved').length;
            
            // Actualizar UI
            const balanceIngresosEl = document.getElementById('balance-ingresos');
            const balanceGastosEl = document.getElementById('balance-gastos');
            const balanceNetoEl = document.getElementById('balance-neto');
            const facturasPendientesEl = document.getElementById('facturas-pendientes');
            const cotizacionesActivasEl = document.getElementById('cotizaciones-activas');
            const gastosMesEl = document.getElementById('gastos-mes');
            
            if (balanceIngresosEl) balanceIngresosEl.textContent = formatCurrency(ingresosTotales);
            if (balanceGastosEl) balanceGastosEl.textContent = formatCurrency(gastosTotales);
            if (balanceNetoEl) {
                balanceNetoEl.textContent = formatCurrency(balanceNeto);
                balanceNetoEl.className = `text-2xl font-bold ${balanceNeto >= 0 ? 'text-green-600' : 'text-red-600'}`;
            }
            if (facturasPendientesEl) facturasPendientesEl.textContent = facturasPendientes;
            if (cotizacionesActivasEl) cotizacionesActivasEl.textContent = cotizacionesActivas;
            if (gastosMesEl) gastosMesEl.textContent = formatCurrency(gastosDelMes);
            
            console.log('✅ Balance calculado:', {
                ingresos: ingresosTotales,
                gastos: gastosTotales,
                neto: balanceNeto,
                facturasPendientes,
                cotizacionesActivas,
                gastosDelMes
            });
            
            // Generar gráfico simple de flujo de caja
            generateCashFlowChart(invoices, expenses);
            
            // Mostrar actividad reciente
            displayRecentActivity(invoices, expenses, quotes);
            
        } catch (error) {
            console.error('❌ Error calculando balance:', error);
        }
    }
    
    function displayRecentActivity(invoices, expenses, quotes) {
        const activityContainer = document.getElementById('recent-activity');
        if (!activityContainer) return;
        
        // Combinar todas las actividades recientes
        const activities = [];
        
        // Agregar facturas recientes (últimas 5)
        invoices.slice(0, 5).forEach(inv => {
            activities.push({
                date: new Date(inv.issue_date),
                type: 'invoice',
                icon: 'file-text',
                color: 'blue',
                title: `Factura #${inv.invoice_number}`,
                subtitle: inv.client_name || 'Cliente',
                amount: parseFloat(inv.total || 0),
                status: inv.status
            });
        });
        
        // Agregar gastos recientes (últimos 5)
        expenses.slice(0, 5).forEach(exp => {
            const dateValue = exp.date || exp.expense_date || exp.movement_date || exp.created_at;
            activities.push({
                date: dateValue ? new Date(dateValue) : new Date(),
                type: 'expense',
                icon: 'credit-card',
                color: 'red',
                title: exp.description || 'Gasto',
                subtitle: exp.category || '',
                amount: -parseFloat(exp.amount || 0),
                status: 'completed'
            });
        });
        
        // Agregar cotizaciones recientes (últimas 3)
        quotes.slice(0, 3).forEach(quote => {
            activities.push({
                date: new Date(quote.quote_date),
                type: 'quote',
                icon: 'file-check',
                color: 'purple',
                title: `Cotización #${quote.quote_number}`,
                subtitle: quote.client_name || 'Cliente',
                amount: parseFloat(quote.total || 0),
                status: quote.status
            });
        });
        
        // Ordenar por fecha (más reciente primero)
        activities.sort((a, b) => b.date - a.date);
        
        // Tomar solo las últimas 8 actividades
        const recentActivities = activities.slice(0, 8);
        
        if (recentActivities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p class="text-sm">No hay actividad reciente</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        
        let html = '<div class="space-y-2.5">';
        recentActivities.forEach(activity => {
            const statusColors = {
                'paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'pending': 'bg-amber-50 text-amber-700 border-amber-200',
                'cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
                'approved': 'bg-sky-50 text-sky-700 border-sky-200',
                'rejected': 'bg-gray-50 text-gray-700 border-gray-200',
                'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'vendida': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'pagada': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                'vencida': 'bg-rose-50 text-rose-700 border-rose-200'
            };
            
            const statusText = {
                'paid': 'Pagado',
                'pending': 'Pendiente',
                'cancelled': 'Cancelado',
                'approved': 'Aprobado',
                'rejected': 'Rechazado',
                'completed': 'Completado',
                'vendida': 'Vendida',
                'pagada': 'Pagada',
                'vencida': 'Vencida'
            };
            
            // Configuración por tipo de actividad
            const typeConfig = {
                'invoice': {
                    bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
                    iconBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    borderColor: '#3b82f6'
                },
                'expense': {
                    bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                    iconBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderColor: '#ef4444'
                },
                'quote': {
                    bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)',
                    iconBg: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                    borderColor: '#a855f7'
                }
            };
            
            const config = typeConfig[activity.type] || typeConfig['invoice'];
            
            html += `
                <div class="group relative overflow-hidden rounded-xl border-2 hover:shadow-lg transition-all duration-300" 
                     style="background: ${config.bgGradient}; border-color: ${config.borderColor}20;">
                    <!-- Barra lateral de color -->
                    <div class="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2" 
                         style="background: ${config.iconBg};"></div>
                    
                    <div class="flex items-center gap-4 p-4 pl-5">
                        <!-- Icono con gradiente -->
                        <div class="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center shadow-md" 
                             style="background: ${config.iconBg};">
                            <i data-lucide="${activity.icon}" class="w-7 h-7 text-white"></i>
                        </div>
                        
                        <!-- Contenido principal -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-3 mb-2">
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-base font-bold text-gray-900 truncate leading-tight">${activity.title}</h4>
                                    <p class="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                                        <span class="font-medium">${activity.subtitle}</span>
                                    </p>
                                </div>
                                <div class="flex flex-col items-end gap-2 flex-shrink-0">
                                    <div class="text-right">
                                        <div class="text-xl font-bold ${activity.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
                                            ${activity.amount >= 0 ? '+' : ''}${formatCurrency(activity.amount)}
                                        </div>
                                    </div>
                                    ${activity.status ? `
                                        <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColors[activity.status.toLowerCase()] || 'bg-gray-50 text-gray-700 border-gray-200'}">
                                            ${statusText[activity.status.toLowerCase()] || activity.status}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 text-xs font-medium" style="color: ${config.borderColor};">
                                <i data-lucide="clock" class="w-4 h-4"></i>
                                <span>${formatTimeAgo(activity.date)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        activityContainer.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }
    
    function formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
    
    function generateCashFlowChart(invoices, expenses) {
        const chartContainer = document.getElementById('flujo-caja-chart');
        if (!chartContainer) return;
        
        // Estados válidos para considerar una factura como pagada
        const paidStatuses = ['paid', 'completed', 'vendida', 'pagada', 'pagado'];
        
        // Obtener datos de los últimos 6 meses
        const months = [];
        const currentDate = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
            
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const ingresos = invoices
                .filter(inv => {
                    const invDate = new Date(inv.issue_date);
                    return paidStatuses.includes(inv.status?.toLowerCase()) && 
                           invDate >= monthStart && invDate <= monthEnd;
                })
                .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
            
            const gastos = expenses
                .filter(exp => {
                    const dateValue = exp.date || exp.expense_date || exp.movement_date || exp.created_at;
                    if (!dateValue) return false;
                    const expDate = new Date(dateValue);
                    return expDate >= monthStart && expDate <= monthEnd;
                })
                .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
            
            months.push({
                name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                ingresos,
                gastos,
                balance: ingresos - gastos
            });
        }
        
        console.log('📊 Datos de flujo de caja por mes:', months);
        
        // Calcular máximo para escala
        const maxValue = Math.max(...months.map(m => Math.max(m.ingresos, m.gastos)), 1); // Mínimo 1 para evitar división por 0
        const hasData = maxValue > 1;
        
        let chartHTML = '<div class="w-full">';
        
        if (!hasData) {
            chartHTML += `
                <div class="text-center py-8 text-gray-400">
                    <i data-lucide="bar-chart-3" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p class="text-sm">No hay datos de flujo de caja para mostrar</p>
                    <p class="text-xs mt-1">Los datos aparecerán cuando tengas facturas pagadas y gastos registrados</p>
                </div>
            `;
        } else {
            months.forEach(month => {
                const ingresosWidth = maxValue > 0 ? Math.max((month.ingresos / maxValue * 100), 2) : 0;
                const gastosWidth = maxValue > 0 ? Math.max((month.gastos / maxValue * 100), 2) : 0;
                
                chartHTML += `
                    <div class="mb-6 pb-4 border-b border-gray-200 last:border-0">
                        <!-- Header del mes -->
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-base font-bold text-gray-800">${month.name}</h4>
                            <div class="text-right">
                                <div class="text-lg font-bold ${month.balance >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${formatCurrency(month.balance)}
                                </div>
                                <div class="text-xs text-gray-500">Balance</div>
                            </div>
                        </div>
                        
                        <!-- Barra de Ingresos -->
                        <div class="mb-3">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
                                    <span class="text-sm font-medium text-gray-700">Ingresos</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-800">${formatCurrency(month.ingresos)}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-lg h-6 overflow-hidden">
                                <div class="h-6 rounded-lg transition-all duration-500" 
                                     style="width: ${ingresosWidth}%; min-width: ${month.ingresos > 0 ? '20px' : '0'}; background: linear-gradient(90deg, #10b981 0%, #059669 100%);">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Barra de Gastos -->
                        <div class="mb-2">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                                    <span class="text-sm font-medium text-gray-700">Gastos</span>
                                </div>
                                <span class="text-sm font-semibold text-gray-800">${formatCurrency(month.gastos)}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-lg h-6 overflow-hidden">
                                <div class="h-6 rounded-lg transition-all duration-500" 
                                     style="width: ${gastosWidth}%; min-width: ${month.gastos > 0 ? '20px' : '0'}; background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        chartHTML += '</div>';
        
        chartContainer.innerHTML = chartHTML;
        
        // Re-inicializar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    async function init() {
        try {
            console.log('🚀 Initializing finanzas module...');
            console.log('📍 API_URL:', API_URL);
            console.log('🔑 authenticatedFetch disponible:', typeof authenticatedFetch);
            console.log('📋 Elements:', {
                quotesTab: !!elements.quotesTab,
                quotesView: !!elements.quotesView,
                quotesTable: !!elements.quotesTable,
                invoicesTab: !!elements.invoicesTab,
                invoicesView: !!elements.invoicesView,
                invoicesTable: !!elements.invoicesTable
            });
            
            ui.showLoading();
            
            // Performance tracking
            const startTime = performance.now();
            
            console.log('🔄 Loading clients...');
            await loadClients();
            console.log('✅ Clients loaded');
            
            console.log('🔄 Setting up event listeners...');
            setupEventListeners();
            console.log('✅ Event listeners setup complete');
            
            console.log('🔄 Switching to overview view...');
            ui.switchView('overview');
            console.log('✅ View switched to overview');
            
            // Calcular y mostrar balance
            console.log('🔄 Calculating financial balance...');
            await calculateAndDisplayBalance();
            console.log('✅ Balance calculated and displayed');
            
            const endTime = performance.now();
            console.log('✅ Finanzas module initialized successfully', {
                initTime: `${(endTime - startTime).toFixed(2)}ms`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Finanzas initialization failed:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            ui.showError('Error al inicializar el módulo de finanzas. Por favor, recarga la página.');
        } finally {
            ui.hideLoading();
        }
    }

    // Initialize the module
    init().catch(error => {
        console.error('💥 Critical finanzas initialization error:', error);
    });
    
    // ============================================================================
    // GLOBAL PAYROLL FUNCTIONS - Funciones accesibles desde HTML
    // ============================================================================
    
    // Abrir modal para crear nuevo período
    window.openPayrollPeriodModal = function() {
        console.log('📝 Opening payroll period modal');
        const modal = document.getElementById('payroll-period-modal');
        if (modal) {
            modal.classList.add('is-open');
            
            // Set default dates (current month)
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const paymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
            
            document.getElementById('period-start-date').value = startOfMonth.toISOString().split('T')[0];
            document.getElementById('period-end-date').value = endOfMonth.toISOString().split('T')[0];
            document.getElementById('payment-date').value = paymentDate.toISOString().split('T')[0];
            
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            document.getElementById('period-name').value = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        }
    };
    
    // Cerrar modal de período
    window.closePayrollPeriodModal = function() {
        console.log('❌ Closing payroll period modal');
        const modal = document.getElementById('payroll-period-modal');
        if (modal) {
            modal.classList.remove('is-open');
            document.getElementById('payroll-period-form').reset();
        }
    };
    
    // Cargar períodos de nómina
    window.loadPayroll = async function() {
        try {
            console.log('🔄 Loading payroll periods...');
            const loading = document.getElementById('payroll-periods-loading');
            const container = document.getElementById('payroll-periods-container');
            
            if (loading) loading.style.display = 'block';
            if (container) container.style.display = 'none';
            
            const periods = await api.payroll.getPeriods();
            payrollUI.renderPeriods(periods);
            
            if (loading) loading.style.display = 'none';
            if (container) container.style.display = 'block';
            
            console.log('✅ Payroll periods loaded');
        } catch (error) {
            console.error('❌ Error loading payroll:', error);
            showNotification('Error al cargar períodos de nómina', 'error');
        }
    };
    
    // Cargar detalles de liquidaciones de un período
    window.loadPayrollDetails = async function(periodId, periodName) {
        try {
            console.log(`🔄 Loading payroll details for period ${periodId}...`);
            const loading = document.getElementById('payroll-details-loading');
            
            if (loading) loading.style.display = 'block';
            
            const details = await api.payroll.getDetails(periodId);
            payrollUI.renderDetails(details, periodName);
            
            if (loading) loading.style.display = 'none';
            
            // Scroll to details section
            document.getElementById('payroll-details-section')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            console.log('✅ Payroll details loaded');
        } catch (error) {
            console.error('❌ Error loading payroll details:', error);
            showNotification('Error al cargar liquidaciones', 'error');
        }
    };
    
    // Cerrar sección de detalles
    window.closePayrollDetails = function() {
        const section = document.getElementById('payroll-details-section');
        if (section) {
            section.style.display = 'none';
        }
    };
    
    // Generar nómina automática
    window.generatePayroll = async function(periodId) {
        if (!confirm('¿Generar nómina automática para todos los empleados?\n\nEsto calculará las liquidaciones desde el Control de Asistencia y Horas Extras.')) {
            return;
        }
        
        try {
            console.log(`🔄 Generating payroll for period ${periodId}...`);
            showNotification('Generando nómina...', 'info');
            
            const result = await api.payroll.generatePayroll(periodId);
            
            showNotification(
                `✅ Nómina generada: ${result.employees_processed}/${result.employees_total} empleados procesados`,
                'success'
            );
            
            if (result.errors && result.errors.length > 0) {
                console.warn('⚠️  Errors during payroll generation:', result.errors);
                showNotification(
                    `⚠️  ${result.errors.length} empleados con errores. Revisa la consola.`,
                    'warning'
                );
            }
            
            // Recargar períodos y mostrar detalles
            await loadPayroll();
            
            // Buscar el nombre del período para mostrarlo
            const periods = await api.payroll.getPeriods();
            const period = periods.find(p => p.id === periodId);
            if (period) {
                await loadPayrollDetails(periodId, period.period_name);
            }
            
            console.log('✅ Payroll generation complete');
        } catch (error) {
            console.error('❌ Error generating payroll:', error);
            showNotification('Error al generar nómina: ' + error.message, 'error');
        }
    };
    
    // Ver detalle completo de liquidación
    window.viewLiquidation = async function(detailId) {
        try {
            console.log(`🔍 Viewing liquidation ${detailId}...`);
            const modal = document.getElementById('liquidation-detail-modal');
            
            if (modal) {
                modal.classList.add('active');
                
                const detail = await api.payroll.getDetail(detailId);
                payrollUI.renderLiquidationDetail(detail);
                
                // Store detail ID for export
                modal.dataset.detailId = detailId;
            }
        } catch (error) {
            console.error('❌ Error viewing liquidation:', error);
            showNotification('Error al cargar liquidación', 'error');
        }
    };
    
    // Cerrar modal de detalle de liquidación
    window.closeLiquidationDetailModal = function() {
        const modal = document.getElementById('liquidation-detail-modal');
        if (modal) {
            modal.classList.remove('active');
            delete modal.dataset.detailId;
        }
    };
    
    // Aprobar liquidación
    window.approveLiquidation = async function(detailId) {
        if (!confirm('¿Aprobar esta liquidación?\n\nUna vez aprobada, no podrá ser modificada.')) {
            return;
        }
        
        try {
            console.log(`✅ Approving liquidation ${detailId}...`);
            await api.payroll.approveDetail(detailId);
            
            showNotification('✅ Liquidación aprobada exitosamente', 'success');
            
            // Recargar la vista actual (encontrar el período actual)
            const section = document.getElementById('payroll-details-section');
            if (section && section.style.display !== 'none') {
                const periodName = document.getElementById('current-period-name')?.textContent;
                // Buscar el ID del período por el nombre (no ideal pero funcional)
                const periods = await api.payroll.getPeriods();
                const period = periods.find(p => p.period_name === periodName);
                if (period) {
                    await loadPayrollDetails(period.id, periodName);
                }
            }
            
            console.log('✅ Liquidation approved');
        } catch (error) {
            console.error('❌ Error approving liquidation:', error);
            showNotification('Error al aprobar liquidación: ' + error.message, 'error');
        }
    };
    
    // Cambiar moneda de visualización
    window.switchCurrency = async function(currency) {
        try {
            console.log(`💱 Switching currency to ${currency}...`);
            payrollUI.currentCurrency = currency;
            
            // Cargar tasas de cambio si es necesario
            if (currency !== 'CLP' && !payrollUI.currencyRates) {
                const rates = await api.payroll.getCurrencyRates();
                payrollUI.currencyRates = rates;
            }
            
            // Recargar períodos con nueva moneda
            const periods = await api.payroll.getPeriods();
            payrollUI.renderPeriods(periods);
            
            // Si hay detalles abiertos, recargarlos también
            const section = document.getElementById('payroll-details-section');
            if (section && section.style.display !== 'none') {
                const periodName = document.getElementById('current-period-name')?.textContent;
                const periodsData = await api.payroll.getPeriods();
                const period = periodsData.find(p => p.period_name === periodName);
                if (period) {
                    const details = await api.payroll.getDetails(period.id);
                    payrollUI.renderDetails(details, periodName);
                }
            }
            
            showNotification(`Moneda cambiada a ${currency}`, 'success');
            console.log('✅ Currency switched');
        } catch (error) {
            console.error('❌ Error switching currency:', error);
            showNotification('Error al cambiar moneda', 'error');
        }
    };
    
    // Exportar liquidación a PDF (placeholder)
    window.exportLiquidationPDF = function() {
        showNotification('🚧 Exportación a PDF en desarrollo. Próximamente con jsPDF.', 'info');
        console.log('TODO: Implement PDF export with jsPDF library');
    };
    
    // Handle form submission for creating payroll period
    document.getElementById('payroll-period-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            console.log('📝 Submitting payroll period form...');
            const formData = new FormData(e.target);
            const data = {
                period_name: formData.get('period_name'),
                start_date: formData.get('start_date'),
                end_date: formData.get('end_date'),
                payment_date: formData.get('payment_date')
            };
            
            console.log('📤 Creating period:', data);
            await api.payroll.createPeriod(data);
            
            showNotification('✅ Período de nómina creado exitosamente', 'success');
            closePayrollPeriodModal();
            await loadPayroll();
            
            console.log('✅ Period created successfully');
        } catch (error) {
            console.error('❌ Error creating period:', error);
            showNotification('Error al crear período: ' + error.message, 'error');
        }
    });
});

// ============================================================================
// GLOBAL FUNCTIONS - Disponibles desde HTML onclick
// ============================================================================

// ============================================================================
// MODALES - Funciones para crear/editar cotizaciones y facturas
// ============================================================================

// Función para crear/editar cotización
window.createQuote = async function(quoteId = null) {
    console.log('📋 Opening quote modal...', quoteId ? `Edit ID: ${quoteId}` : 'New');
    const modal = document.getElementById('quote-modal');
    const form = document.getElementById('quote-form');
    const title = document.getElementById('quote-modal-title');
    
    if (!modal) {
        console.error('❌ Modal quote-modal no encontrado');
        return;
    }
    
    // Actualizar título
    if (title) title.textContent = quoteId ? 'Editar Cotización' : 'Nueva Cotización';
    
    // Renderizar formulario
    await renderQuoteForm(form, quoteId);
    
    // Mostrar modal (usar clase is-open según CSS)
    modal.classList.add('is-open', 'active');
    modal.style.display = 'flex';
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    console.log('✅ Quote modal opened');
};

// Función para crear/editar factura
window.createInvoice = async function(invoiceId = null) {
    console.log('🧾 Opening invoice modal...', invoiceId ? `Edit ID: ${invoiceId}` : 'New');
    const modal = document.getElementById('invoice-modal');
    const form = document.getElementById('invoice-form');
    const title = document.getElementById('invoice-modal-title');
    
    if (!modal) {
        console.error('❌ Modal invoice-modal no encontrado');
        return;
    }
    
    // Actualizar título
    if (title) title.textContent = invoiceId ? 'Editar Factura' : 'Nueva Factura';
    
    // Renderizar formulario
    await renderInvoiceForm(form, invoiceId);
    
    // Mostrar modal (usar clase is-open según CSS)
    modal.classList.add('is-open', 'active');
    modal.style.display = 'flex';
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    console.log('✅ Invoice modal opened');
};

// Renderizar formulario de cotización
async function renderQuoteForm(formElement, quoteId = null) {
    if (!formElement) return;
    
    // Obtener clientes directamente desde API
    let clients = [];
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/clients`);
        if (response.ok) {
            const result = await response.json();
            clients = result.data || [];
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
    
    formElement.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Cliente *
                    </label>
                    <select id="quote-client" name="client_id" required 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar cliente...</option>
                        ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Número de Cotización *
                    </label>
                    <input type="text" id="quote-number" name="quote_number" required
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="Ej: COT-2025-001">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                </label>
                <textarea id="quote-description" name="description" rows="3" required
                          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Descripción de la cotización..."></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Monto Total *
                    </label>
                    <input type="number" id="quote-total" name="total" required step="0.01" min="0"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="0.00">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                    </label>
                    <select id="quote-status" name="status"
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobada</option>
                        <option value="rejected">Rechazada</option>
                    </select>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                </label>
                <input type="date" id="quote-date" name="quote_date"
                       class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                       value="${new Date().toISOString().split('T')[0]}">
            </div>
        </div>
    `;
    
    // Si es edición, cargar datos
    if (quoteId) {
        try {
            const response = await window.authManager.authenticatedFetch(`${window.API_URL}/quotes/${quoteId}`);
            if (response.ok) {
                const result = await response.json();
                const quote = result.data;
                document.getElementById('quote-client').value = quote.client_id || '';
                document.getElementById('quote-number').value = quote.quote_number || '';
                document.getElementById('quote-description').value = quote.description || '';
                document.getElementById('quote-total').value = quote.total || '';
                document.getElementById('quote-status').value = quote.status || 'pending';
                document.getElementById('quote-date').value = quote.quote_date?.split('T')[0] || '';
            }
        } catch (error) {
            console.error('Error loading quote data:', error);
        }
    }
    
    // Event handler para submit
    formElement.onsubmit = async (e) => {
        e.preventDefault();
        await handleQuoteSubmit(quoteId);
    };
}

// Renderizar formulario de factura
async function renderInvoiceForm(formElement, invoiceId = null) {
    if (!formElement) return;
    
    // Obtener clientes directamente desde API
    let clients = [];
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/clients`);
        if (response.ok) {
            const result = await response.json();
            clients = result.data || [];
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
    
    formElement.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Cliente *
                    </label>
                    <select id="invoice-client" name="client_id" required 
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar cliente...</option>
                        ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Número de Factura *
                    </label>
                    <input type="text" id="invoice-number" name="invoice_number" required
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="Ej: F-2025-001">
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                </label>
                <textarea id="invoice-description" name="description" rows="3" required
                          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Descripción de la factura..."></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Monto Total *
                    </label>
                    <input type="number" id="invoice-total" name="total" required step="0.01" min="0"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="0.00">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                    </label>
                    <select id="invoice-status" name="status"
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="pending">Pendiente</option>
                        <option value="paid">Pagada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Emisión
                    </label>
                    <input type="date" id="invoice-date" name="issue_date"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Vencimiento
                    </label>
                    <input type="date" id="invoice-due-date" name="due_date"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
        </div>
    `;
    
    // Si es edición, cargar datos
    if (invoiceId) {
        try {
            const response = await window.authManager.authenticatedFetch(`${window.API_URL}/invoices/${invoiceId}`);
            if (response.ok) {
                const result = await response.json();
                const invoice = result.data;
                document.getElementById('invoice-client').value = invoice.client_id || '';
                document.getElementById('invoice-number').value = invoice.invoice_number || '';
                document.getElementById('invoice-description').value = invoice.description || '';
                document.getElementById('invoice-total').value = invoice.total || '';
                document.getElementById('invoice-status').value = invoice.status || 'pending';
                document.getElementById('invoice-date').value = invoice.issue_date?.split('T')[0] || '';
                document.getElementById('invoice-due-date').value = invoice.due_date?.split('T')[0] || '';
            }
        } catch (error) {
            console.error('Error loading invoice data:', error);
        }
    }
    
    // Event handler para submit
    formElement.onsubmit = async (e) => {
        e.preventDefault();
        await handleInvoiceSubmit(invoiceId);
    };
}

// Handler para submit de cotización
async function handleQuoteSubmit(quoteId = null) {
    try {
        const data = {
            client_id: document.getElementById('quote-client').value,
            quote_number: document.getElementById('quote-number').value,
            description: document.getElementById('quote-description').value,
            total: parseFloat(document.getElementById('quote-total').value),
            status: document.getElementById('quote-status').value,
            quote_date: document.getElementById('quote-date').value
        };
        
        console.log('Submitting quote data:', data);
        
        const url = quoteId ? 
            `${window.API_URL}/quotes/${quoteId}` : 
            `${window.API_URL}/quotes`;
        const method = quoteId ? 'PUT' : 'POST';
        
        const response = await window.authManager.authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        showNotification(
            quoteId ? 'Cotización actualizada exitosamente' : 'Cotización creada exitosamente', 
            'success'
        );
        closeQuoteModal();
        
        // Recargar cotizaciones si la función existe
        if (typeof window.loadQuotes === 'function') {
            await window.loadQuotes();
        }
    } catch (error) {
        console.error('Error saving quote:', error);
        showNotification('Error al guardar la cotización: ' + error.message, 'error');
    }
}

// Handler para submit de factura
async function handleInvoiceSubmit(invoiceId = null) {
    try {
        const data = {
            client_id: document.getElementById('invoice-client').value,
            invoice_number: document.getElementById('invoice-number').value,
            description: document.getElementById('invoice-description').value,
            total: parseFloat(document.getElementById('invoice-total').value),
            status: document.getElementById('invoice-status').value,
            issue_date: document.getElementById('invoice-date').value,
            due_date: document.getElementById('invoice-due-date').value
        };
        
        console.log('Submitting invoice data:', data);
        
        const url = invoiceId ? 
            `${window.API_URL}/invoices/${invoiceId}` : 
            `${window.API_URL}/invoices`;
        const method = invoiceId ? 'PUT' : 'POST';
        
        const response = await window.authManager.authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        showNotification(
            invoiceId ? 'Factura actualizada exitosamente' : 'Factura creada exitosamente', 
            'success'
        );
        closeInvoiceModal();
        
        // Recargar facturas si la función existe
        if (typeof window.loadInvoices === 'function') {
            await window.loadInvoices();
        }
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error al guardar la factura: ' + error.message, 'error');
    }
}

// Renderizar formulario de gasto
async function renderExpenseForm(formElement, expenseId = null) {
    if (!formElement) return;
    
    // Obtener categorías de gastos desde API
    let categories = [];
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/expense-categories`);
        if (response.ok) {
            const result = await response.json();
            categories = result.data || [];
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
    
    formElement.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="calendar" class="w-4 h-4 inline"></i>
                        Fecha *
                    </label>
                    <input type="date" id="expense-date" name="expense_date" required
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="tag" class="w-4 h-4 inline"></i>
                        Categoría *
                    </label>
                    <select id="expense-category" name="category_id" required
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar categoría...</option>
                        ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    <i data-lucide="file-text" class="w-4 h-4 inline"></i>
                    Descripción *
                </label>
                <textarea id="expense-description" name="description" rows="3" required
                          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Descripción detallada del gasto..."></textarea>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="dollar-sign" class="w-4 h-4 inline"></i>
                        Monto *
                    </label>
                    <input type="number" id="expense-amount" name="amount" required step="0.01" min="0"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="0.00">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="building" class="w-4 h-4 inline"></i>
                        Proveedor
                    </label>
                    <input type="text" id="expense-supplier" name="supplier"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="Nombre del proveedor">
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="list" class="w-4 h-4 inline"></i>
                        Tipo de Referencia
                    </label>
                    <select id="expense-reference-type" name="reference_type"
                            class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="general">General</option>
                        <option value="ticket">Ticket</option>
                        <option value="purchase_order">Orden de Compra</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i data-lucide="hash" class="w-4 h-4 inline"></i>
                        ID de Referencia
                    </label>
                    <input type="number" id="expense-reference-id" name="reference_id"
                           class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                           placeholder="ID del ticket u orden">
                </div>
            </div>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i data-lucide="info" class="w-5 h-5 text-blue-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-blue-700">
                            Los gastos pueden estar asociados a tickets específicos o ser gastos generales de operación.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Si es edición, cargar datos
    if (expenseId) {
        try {
            const response = await window.authManager.authenticatedFetch(`${window.API_URL}/expenses/${expenseId}`);
            if (response.ok) {
                const result = await response.json();
                const expense = result.data;
                document.getElementById('expense-date').value = expense.expense_date?.split('T')[0] || '';
                document.getElementById('expense-category').value = expense.category_id || '';
                document.getElementById('expense-description').value = expense.description || '';
                document.getElementById('expense-amount').value = expense.amount || '';
                document.getElementById('expense-supplier').value = expense.supplier || '';
                document.getElementById('expense-reference-type').value = expense.reference_type || 'general';
                document.getElementById('expense-reference-id').value = expense.reference_id || '';
            }
        } catch (error) {
            console.error('Error loading expense data:', error);
        }
    }
    
    // Event handler para submit
    formElement.onsubmit = async (e) => {
        e.preventDefault();
        await handleExpenseSubmit(expenseId);
    };
    
    // Re-inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Handler para submit de gasto
async function handleExpenseSubmit(expenseId = null) {
    try {
        const data = {
            expense_date: document.getElementById('expense-date').value,
            category_id: parseInt(document.getElementById('expense-category').value, 10),
            description: document.getElementById('expense-description').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            supplier: document.getElementById('expense-supplier').value || null,
            reference_type: document.getElementById('expense-reference-type').value,
            reference_id: document.getElementById('expense-reference-id').value ? 
                         parseInt(document.getElementById('expense-reference-id').value, 10) : null
        };
        
        console.log('Submitting expense data:', data);
        
        const url = expenseId ? 
            `${window.API_URL}/expenses/${expenseId}` : 
            `${window.API_URL}/expenses`;
        const method = expenseId ? 'PUT' : 'POST';
        
        const response = await window.authManager.authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        showNotification(
            expenseId ? 'Gasto actualizado exitosamente' : 'Gasto creado exitosamente', 
            'success'
        );
        closeExpenseModal();
        
        // Recargar gastos si la función existe
        if (typeof window.loadExpenses === 'function') {
            await window.loadExpenses();
        }
    } catch (error) {
        console.error('Error saving expense:', error);
        showNotification('Error al guardar el gasto: ' + error.message, 'error');
    }
}

window.createExpense = async function(expenseId = null) {
    console.log('💸 Opening expense modal...', expenseId ? `Edit ID: ${expenseId}` : 'New');
    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');
    const title = document.getElementById('expense-modal-title');
    
    if (!modal) {
        console.error('❌ Modal expense-modal no encontrado');
        return;
    }
    
    // Actualizar título
    if (title) title.textContent = expenseId ? 'Editar Gasto' : 'Nuevo Gasto';
    
    // Renderizar formulario
    await renderExpenseForm(form, expenseId);
    
    // Mostrar modal (usar clase is-open según CSS)
    modal.classList.add('is-open', 'active');
    modal.style.display = 'flex';
    
    // Inicializar iconos de Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    console.log('✅ Expense modal opened');
};

// Funciones para cerrar modales
window.closeQuoteModal = function() {
    console.log('❌ Closing quote modal');
    const modal = document.getElementById('quote-modal');
    if (modal) {
        modal.classList.remove('is-open', 'active');
        modal.style.display = 'none';
        const form = document.getElementById('quote-form');
        if (form) form.reset();
    }
};

window.closeInvoiceModal = function() {
    console.log('❌ Closing invoice modal');
    const modal = document.getElementById('invoice-modal');
    if (modal) {
        modal.classList.remove('is-open', 'active');
        modal.style.display = 'none';
        const form = document.getElementById('invoice-form');
        if (form) form.reset();
    }
};

window.closeExpenseModal = function() {
    console.log('❌ Closing expense modal');
    const modal = document.getElementById('expense-modal');
    if (modal) {
        modal.classList.remove('is-open', 'active');
        modal.style.display = 'none';
        const form = document.getElementById('expense-form');
        if (form) form.reset();
    }
};

// Funciones CRUD para botones de tablas
window.viewQuote = async function(id) {
    console.log('👁️ Viewing quote:', id);
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/quotes/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const quote = result.data;
        
        // Función auxiliar para formatear fechas
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CL');
        };
        
        // Función auxiliar para formatear moneda
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        };
        
        const details = `
Cotización: ${quote.quote_number || 'N/A'}
Cliente: ${quote.client_name || 'N/A'}
Fecha: ${formatDate(quote.quote_date)}
Total: ${formatCurrency(quote.total)}
Estado: ${quote.status}
Descripción: ${quote.description || 'Sin descripción'}
        `;
        alert(details.trim());
    } catch (error) {
        console.error('Error viewing quote:', error);
        showNotification('Error al cargar la cotización', 'error');
    }
};

window.editQuote = async function(id) {
    console.log('✏️ Editing quote:', id);
    await createQuote(id);
};

window.deleteQuote = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta cotización?')) {
        return;
    }
    try {
        console.log('🗑️ Deleting quote:', id);
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/quotes/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        showNotification('Cotización eliminada exitosamente', 'success');
        
        // Recargar cotizaciones si la función existe
        if (typeof window.loadQuotes === 'function') {
            await window.loadQuotes();
        }
    } catch (error) {
        console.error('Error deleting quote:', error);
        showNotification('Error al eliminar la cotización', 'error');
    }
};

window.viewInvoice = async function(id) {
    console.log('👁️ Viewing invoice:', id);
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/invoices/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const invoice = result.data;
        
        // Función auxiliar para formatear fechas
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CL');
        };
        
        // Función auxiliar para formatear moneda
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        };
        
        const details = `
Factura: ${invoice.invoice_number || 'N/A'}
Cliente: ${invoice.client_name || 'N/A'}
Fecha Emisión: ${formatDate(invoice.issue_date)}
Fecha Vencimiento: ${formatDate(invoice.due_date)}
Total: ${formatCurrency(invoice.total)}
Estado: ${invoice.status}
Descripción: ${invoice.description || 'Sin descripción'}
        `;
        alert(details.trim());
    } catch (error) {
        console.error('Error viewing invoice:', error);
        showNotification('Error al cargar la factura', 'error');
    }
};

window.editInvoice = async function(id) {
    console.log('✏️ Editing invoice:', id);
    await createInvoice(id);
};

window.deleteInvoice = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar esta factura?')) {
        return;
    }
    try {
        console.log('🗑️ Deleting invoice:', id);
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/invoices/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        showNotification('Factura eliminada exitosamente', 'success');
        
        // Recargar facturas si la función existe
        if (typeof window.loadInvoices === 'function') {
            await window.loadInvoices();
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Error al eliminar la factura', 'error');
    }
};

window.viewExpense = async function(id) {
    console.log('👁️ Viewing expense:', id);
    try {
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/expenses/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        const expense = result.data;
        
        // Función auxiliar para formatear fechas
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CL');
        };
        
        // Función auxiliar para formatear moneda
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: 'CLP',
                minimumFractionDigits: 0
            }).format(amount || 0);
        };
        
        const details = `
Gasto ID: ${expense.id}
Fecha: ${formatDate(expense.expense_date || expense.date)}
Categoría: ${expense.category_name || 'Sin categoría'}
Descripción: ${expense.description || 'Sin descripción'}
Monto: ${formatCurrency(expense.amount)}
Proveedor: ${expense.supplier || 'No especificado'}
Tipo: ${expense.reference_type || 'General'}
        `;
        alert(details.trim());
    } catch (error) {
        console.error('Error viewing expense:', error);
        showNotification('Error al cargar el gasto', 'error');
    }
};

window.editExpense = async function(id) {
    console.log('✏️ Editing expense:', id);
    await createExpense(id);
};

window.deleteExpense = async function(id) {
    if (!confirm('¿Está seguro de que desea eliminar este gasto?')) {
        return;
    }
    try {
        console.log('🗑️ Deleting expense:', id);
        const response = await window.authManager.authenticatedFetch(`${window.API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        showNotification('Gasto eliminado exitosamente', 'success');
        
        // Recargar gastos si la función existe
        if (typeof window.loadExpenses === 'function') {
            await window.loadExpenses();
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Error al eliminar el gasto', 'error');
    }
};

// ============================================================================
// GLOBAL ERROR HANDLING FOR FINANZAS MODULE
// ============================================================================
window.addEventListener('error', (event) => {
    console.error('💥 Global finanzas error:', {
        message: event.error?.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
    });
});
