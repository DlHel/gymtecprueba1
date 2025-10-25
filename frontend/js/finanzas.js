// ============================================================================
// FINANZAS MODULE - Sistema de Gestión Financiera
// Cotizaciones, Facturas y Gastos
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ✅ CRÍTICO: Verificar que AuthManager está disponible
    console.log('🔍 Debug - AuthManager disponible:', typeof window.AuthManager);
    console.log('🔍 Debug - authManager disponible:', typeof window.authManager);
    console.log('🔍 Debug - AuthManager.isAuthenticated:', typeof window.AuthManager?.isAuthenticated);
    console.log('🔍 Debug - authManager.isAuthenticated:', typeof window.authManager?.isAuthenticated);
    
    // Usar authManager (minúscula) que es la instancia correcta
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.warn('❌ No autenticado, redirigiendo a login...');
        window.location.href = '/login.html';
        return;
    }

    console.log('💰 Inicializando módulo de finanzas...');

    // ============================================================================
    // CONFIGURACIÓN Y UTILIDADES
    // ============================================================================
    const API_URL = window.API_URL;
    const authenticatedFetch = window.authManager.authenticatedFetch.bind(window.authManager);

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
                        <td colspan="7" class="text-center py-8 text-gray-500">
                            No hay cotizaciones disponibles
                        </td>
                    </tr>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            quotes.forEach(quote => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const statusClass = getStatusClass(quote.status);
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${quote.quote_number || 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${quote.client_name || 'Cliente no especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatDate(quote.quote_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        $${formatMoney(quote.total)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${quote.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${formatDate(quote.valid_until) || 'No especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="viewQuote(${quote.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                            Ver
                        </button>
                        <button onclick="editQuote(${quote.id})" class="text-yellow-600 hover:text-yellow-900 mr-3">
                            Editar
                        </button>
                        <button onclick="deleteQuote(${quote.id})" class="text-red-600 hover:text-red-900">
                            Eliminar
                        </button>
                    </td>
                `;
                
                fragment.appendChild(row);
            });
            
            elements.quotesTable.innerHTML = '';
            elements.quotesTable.appendChild(fragment);
        },
        
        renderInvoices: (invoices) => {
            if (!elements.invoicesTable) return;
            
            console.log('🧾 Rendering invoices table:', { count: invoices.length });
            
            if (invoices.length === 0) {
                elements.invoicesTable.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-8 text-gray-500">
                            No hay facturas disponibles
                        </td>
                    </tr>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            invoices.forEach(invoice => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const statusClass = getStatusClass(invoice.status);
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${invoice.invoice_number || 'N/A'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.client_name || 'Cliente no especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatDate(invoice.invoice_date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatDate(invoice.due_date) || 'No especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        $${formatMoney(invoice.total)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${invoice.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${invoice.paid_date ? formatDate(invoice.paid_date) : '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onclick="viewInvoice(${invoice.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                            Ver
                        </button>
                        <button onclick="editInvoice(${invoice.id})" class="text-yellow-600 hover:text-yellow-900 mr-3">
                            Editar
                        </button>
                        ${invoice.status !== 'Pagada' ? 
                            `<button onclick="markInvoicePaid(${invoice.id})" class="text-green-600 hover:text-green-900 mr-3">
                                Marcar Pagada
                            </button>` : ''
                        }
                        <button onclick="deleteInvoice(${invoice.id})" class="text-red-600 hover:text-red-900">
                            Eliminar
                        </button>
                    </td>
                `;
                
                fragment.appendChild(row);
            });
            
            elements.invoicesTable.innerHTML = '';
            elements.invoicesTable.appendChild(fragment);
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
                    <div class="financial-table">
                        <div class="financial-table-header">
                            <h3 class="financial-table-title">Gastos</h3>
                            <div class="financial-table-actions">
                                <button class="btn btn-secondary" onclick="window.print()">
                                    <i data-lucide="printer" class="w-4 h-4 mr-2"></i>
                                    Imprimir
                                </button>
                                <button class="btn btn-primary" onclick="createExpense()">
                                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
                                    Nuevo Gasto
                                </button>
                            </div>
                        </div>
                        <div class="table-container">
                            <div class="text-center py-8">
                                <p class="text-gray-500 mb-4">No hay gastos registrados</p>
                                <button class="btn btn-primary" onclick="createExpense()">
                                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
                                    Registrar Primer Gasto
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                // Re-initialize lucide icons
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }
            
            // Crear tabla con datos
            let html = `
                <div class="financial-table">
                    <div class="financial-table-header">
                        <h3 class="financial-table-title">Gastos</h3>
                        <div class="financial-table-actions">
                            <button class="btn btn-secondary" onclick="window.print()">
                                <i data-lucide="printer" class="w-4 h-4 mr-2"></i>
                                Imprimir
                            </button>
                            <button class="btn btn-primary" onclick="createExpense()">
                                <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
                                Nuevo Gasto
                            </button>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Categoría</th>
                                    <th>Descripción</th>
                                    <th>Monto</th>
                                    <th>Proveedor</th>
                                    <th>Tipo</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            expenses.forEach(expense => {
                const referenceType = expense.reference_type || 'general';
                const typeClass = referenceType === 'ticket' ? 'bg-blue-100 text-blue-800' : 
                                 referenceType === 'purchase_order' ? 'bg-purple-100 text-purple-800' : 
                                 'bg-gray-100 text-gray-800';
                
                html += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${formatDate(expense.expense_date)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${expense.category || 'Sin categoría'}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-900">
                            ${expense.description || 'Sin descripción'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            $${formatMoney(expense.amount)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${expense.supplier_name || 'No especificado'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClass}">
                                ${referenceType === 'ticket' ? 'Ticket' : referenceType === 'purchase_order' ? 'Orden Compra' : 'General'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="viewExpense(${expense.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                                Ver
                            </button>
                            <button onclick="editExpense(${expense.id})" class="text-yellow-600 hover:text-yellow-900 mr-3">
                                Editar
                            </button>
                            <button onclick="deleteExpense(${expense.id})" class="text-red-600 hover:text-red-900">
                                Eliminar
                            </button>
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
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }
    
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
            state.expenses = expenses;
            ui.renderExpenses(expenses);
            console.log('✅ Expenses loaded successfully:', { count: expenses.length });
        } catch (error) {
            console.error('❌ Error loading expenses:', error);
            throw error;
        }
    }
    
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
    // MODAL FUNCTIONS (placeholders - to be connected with finanzas-modals.js)
    // ============================================================================
    window.openNewQuoteModal = function() {
        console.log('📋 Opening new quote modal...');
        // This will be connected to finanzas-modals.js
        if (typeof showQuoteModal === 'function') {
            showQuoteModal();
        } else {
            console.warn('⚠️ Quote modal function not available');
        }
    };
    
    window.openNewInvoiceModal = function() {
        console.log('🧾 Opening new invoice modal...');
        // This will be connected to finanzas-modals.js
        if (typeof showInvoiceModal === 'function') {
            showInvoiceModal();
        } else {
            console.warn('⚠️ Invoice modal function not available');
        }
    };
    
    window.openNewExpenseModal = function() {
        console.log('💸 Opening new expense modal...');
        // This will be connected to finanzas-modals.js
        if (typeof showExpenseModal === 'function') {
            showExpenseModal();
        } else {
            console.warn('⚠️ Expense modal function not available');
        }
    };

    // ============================================================================
    // ALIASES para compatibilidad con HTML (nombres usados en onclick)
    // ============================================================================
    window.createQuote = window.openNewQuoteModal;
    window.createInvoice = window.openNewInvoiceModal;
    window.createExpense = window.openNewExpenseModal;

    // Funciones para cerrar modales
    window.closeQuoteModal = function() {
        const modal = document.getElementById('quote-modal');
        if (modal) modal.classList.remove('active');
    };

    window.closeInvoiceModal = function() {
        const modal = document.getElementById('invoice-modal');
        if (modal) modal.classList.remove('active');
    };

    window.closeExpenseModal = function() {
        const modal = document.getElementById('expense-modal');
        if (modal) modal.classList.remove('active');
    };

    // ============================================================================
    // CRUD OPERATIONS (Global functions for table buttons)
    // ============================================================================
    
    // Quotes CRUD
    window.viewQuote = async function(id) {
        try {
            ui.showLoading();
            const quote = await api.quotes.getById(id);
            // Open view modal (to be implemented in finanzas-modals.js)
            console.log('👁️ Viewing quote:', quote);
        } catch (error) {
            ui.showError('Error al cargar la cotización');
        } finally {
            ui.hideLoading();
        }
    };
    
    window.editQuote = async function(id) {
        try {
            ui.showLoading();
            const quote = await api.quotes.getById(id);
            // Open edit modal (to be implemented in finanzas-modals.js)
            console.log('✏️ Editing quote:', quote);
        } catch (error) {
            ui.showError('Error al cargar la cotización para editar');
        } finally {
            ui.hideLoading();
        }
    };
    
    window.deleteQuote = async function(id) {
        if (!confirm('¿Está seguro de que desea eliminar esta cotización?')) {
            return;
        }
        
        try {
            ui.showLoading();
            await api.quotes.delete(id);
            showNotification('Cotización eliminada exitosamente', 'success');
            await loadQuotes();
        } catch (error) {
            ui.showError('Error al eliminar la cotización');
        } finally {
            ui.hideLoading();
        }
    };
    
    // Invoices CRUD
    window.viewInvoice = async function(id) {
        try {
            ui.showLoading();
            const invoice = await api.invoices.getById(id);
            console.log('👁️ Viewing invoice:', invoice);
        } catch (error) {
            ui.showError('Error al cargar la factura');
        } finally {
            ui.hideLoading();
        }
    };
    
    window.editInvoice = async function(id) {
        try {
            ui.showLoading();
            const invoice = await api.invoices.getById(id);
            console.log('✏️ Editing invoice:', invoice);
        } catch (error) {
            ui.showError('Error al cargar la factura para editar');
        } finally {
            ui.hideLoading();
        }
    };
    
    window.deleteInvoice = async function(id) {
        if (!confirm('¿Está seguro de que desea eliminar esta factura?')) {
            return;
        }
        
        try {
            ui.showLoading();
            await api.invoices.delete(id);
            showNotification('Factura eliminada exitosamente', 'success');
            await loadInvoices();
        } catch (error) {
            ui.showError('Error al eliminar la factura');
        } finally {
            ui.hideLoading();
        }
    };
    
    window.markInvoicePaid = async function(id) {
        const paymentData = {
            paid_amount: prompt('Monto pagado:'),
            paid_date: new Date().toISOString().split('T')[0],
            payment_method: prompt('Método de pago:') || 'Efectivo'
        };
        
        if (!paymentData.paid_amount) return;
        
        try {
            ui.showLoading();
            await api.invoices.markPaid(id, paymentData);
            showNotification('Factura marcada como pagada', 'success');
            await loadInvoices();
        } catch (error) {
            ui.showError('Error al marcar la factura como pagada');
        } finally {
            ui.hideLoading();
        }
    };
    
    // Expenses CRUD (basic placeholders)
    window.viewExpense = function(id) {
        console.log('👁️ Viewing expense:', id);
    };
    
    window.editExpense = function(id) {
        console.log('✏️ Editing expense:', id);
    };
    
    window.deleteExpense = function(id) {
        console.log('🗑️ Deleting expense:', id);
    };

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
            modal.classList.add('active');
            
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
            modal.classList.remove('active');
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
