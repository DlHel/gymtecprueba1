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
        // Navigation tabs
        quotesTab: document.getElementById('quotes-tab'),
        invoicesTab: document.getElementById('invoices-tab'),
        expensesTab: document.getElementById('expenses-tab'),
        
        // Views
        quotesView: document.getElementById('quotes-view'),
        invoicesView: document.getElementById('invoices-view'),
        expensesView: document.getElementById('expenses-view'),
        
        // Tables
        quotesTable: document.querySelector('#quotes-table tbody'),
        invoicesTable: document.querySelector('#invoices-table tbody'),
        expensesTable: document.querySelector('#expenses-table tbody'),
        
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
        }
    };

    // ============================================================================
    // UI FUNCTIONS
    // ============================================================================
    const ui = {
        showLoading: () => {
            state.isLoading = true;
            if (elements.loadingState) {
                elements.loadingState.classList.remove('hidden');
            }
            console.log('🔄 Loading state activated');
        },
        
        hideLoading: () => {
            state.isLoading = false;
            if (elements.loadingState) {
                elements.loadingState.classList.add('hidden');
            }
            console.log('✅ Loading state deactivated');
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
            
            state.currentView = view;
            
            // Hide all views
            if (elements.quotesView) elements.quotesView.classList.add('hidden');
            if (elements.invoicesView) elements.invoicesView.classList.add('hidden');
            if (elements.expensesView) elements.expensesView.classList.add('hidden');
            
            // Remove active class from all tabs
            if (elements.quotesTab) elements.quotesTab.classList.remove('active');
            if (elements.invoicesTab) elements.invoicesTab.classList.remove('active');
            if (elements.expensesTab) elements.expensesTab.classList.remove('active');
            
            // Show selected view and activate tab
            switch (view) {
                case 'quotes':
                    if (elements.quotesView) elements.quotesView.classList.remove('hidden');
                    if (elements.quotesTab) elements.quotesTab.classList.add('active');
                    break;
                case 'invoices':
                    if (elements.invoicesView) elements.invoicesView.classList.remove('hidden');
                    if (elements.invoicesTab) elements.invoicesTab.classList.add('active');
                    break;
                case 'expenses':
                    if (elements.expensesView) elements.expensesView.classList.remove('hidden');
                    if (elements.expensesTab) elements.expensesTab.classList.add('active');
                    break;
            }
            
            // Load data for current view
            loadCurrentViewData();
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
            if (!elements.expensesTable) return;
            
            console.log('💸 Rendering expenses table:', { count: expenses.length });
            
            if (expenses.length === 0) {
                elements.expensesTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-8 text-gray-500">
                            No hay gastos disponibles
                        </td>
                    </tr>
                `;
                return;
            }
            
            const fragment = document.createDocumentFragment();
            
            expenses.forEach(expense => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                
                const statusClass = getStatusClass(expense.status);
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatDate(expense.date)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${expense.category || 'Sin categoría'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${expense.description || 'Sin descripción'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        $${formatMoney(expense.amount)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${expense.supplier || 'No especificado'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${expense.status}
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
                `;
                
                fragment.appendChild(row);
            });
            
            elements.expensesTable.innerHTML = '';
            elements.expensesTable.appendChild(fragment);
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
            ui.showLoading();
            
            switch (state.currentView) {
                case 'quotes':
                    await loadQuotes();
                    break;
                case 'invoices':
                    await loadInvoices();
                    break;
                case 'expenses':
                    await loadExpenses();
                    break;
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
        if (elements.quotesTab) {
            elements.quotesTab.addEventListener('click', () => ui.switchView('quotes'));
        }
        if (elements.invoicesTab) {
            elements.invoicesTab.addEventListener('click', () => ui.switchView('invoices'));
        }
        if (elements.expensesTab) {
            elements.expensesTab.addEventListener('click', () => ui.switchView('expenses'));
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
    // INITIALIZATION
    // ============================================================================
    async function init() {
        try {
            console.log('🚀 Initializing finanzas module...');
            ui.showLoading();
            
            // Performance tracking
            const startTime = performance.now();
            
            // Load initial data
            await Promise.all([
                loadClients(),
                loadCurrentViewData()
            ]);
            
            // Setup event listeners
            setupEventListeners();
            
            // Set initial view
            ui.switchView('quotes');
            
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
