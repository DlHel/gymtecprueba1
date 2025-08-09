// Finanzas Dashboard - Módulo principal
document.addEventListener('DOMContentLoaded', async () => {
    console.log('💰 Inicializando Módulo Finanzas');
    
    // Esperar a que se cargue la configuración y authManager global
    while (!window.config || !window.authManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Proteger la página
    if (!await window.authManager.protectPage()) {
        return;
    }

    // Estado global del módulo
    const state = {
        quotes: [],
        invoices: [],
        currentTab: 'overview',
        loading: false,
        metrics: {
            totalQuotes: 0,
            totalInvoices: 0,
            pendingPayments: 0,
            monthlyRevenue: 0
        }
    };

    // API wrapper con autenticación
    const api = {
        async get(endpoint) {
            const response = await window.authManager.authenticatedFetch(`${window.config.API_URL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        },

        async post(endpoint, data) {
            const response = await window.authManager.authenticatedFetch(`${window.config.API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        },

        async put(endpoint, data) {
            const response = await window.authManager.authenticatedFetch(`${window.config.API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        },

        async delete(endpoint) {
            const response = await window.authManager.authenticatedFetch(`${window.config.API_URL}${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        }
    };

    // Inicializar sistema de modales
    let modals = null;

    // Cargar datos iniciales
    const loadData = async () => {
        try {
            setLoading(true);
            console.log('📊 Cargando datos financieros...');
            
            const [quotesResponse, invoicesResponse] = await Promise.all([
                api.get('/quotes'),
                api.get('/invoices')
            ]);

            state.quotes = quotesResponse.data || [];
            state.invoices = invoicesResponse.data || [];
            
            calculateMetrics();
            renderCurrentTab();
            
            console.log('✅ Datos financieros cargados:', {
                quotes: state.quotes.length,
                invoices: state.invoices.length
            });
            
        } catch (error) {
            console.error('❌ Error cargando datos financieros:', error);
            showError('Error al cargar los datos financieros: ' + error.message);
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
        
        // Pagos pendientes
        state.metrics.pendingPayments = state.invoices
            .filter(invoice => invoice.status === 'pending')
            .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        
        // Ingresos del mes
        state.metrics.monthlyRevenue = state.invoices
            .filter(invoice => {
                const invoiceDate = new Date(invoice.created_at);
                return invoiceDate.getMonth() === currentMonth && 
                       invoiceDate.getFullYear() === currentYear &&
                       invoice.status === 'paid';
            })
            .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
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
        if (!metricsContainer) return;

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
                    <span class="metric-title">Pagos Pendientes</span>
                    <i data-lucide="clock" class="metric-icon"></i>
                </div>
                <div class="metric-value">$${formatCurrency(state.metrics.pendingPayments)}</div>
                <div class="metric-change negative">-5% este mes</div>
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
                    <td>$${formatCurrency(quote.total || 0)}</td>
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
                    <td>$${formatCurrency(invoice.total || 0)}</td>
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

    // Renderizar gastos (placeholder)
    const renderExpenses = () => {
        const container = document.getElementById('expenses-content');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="credit-card"></i>
                </div>
                <h3>Gestión de Gastos</h3>
                <p>Funcionalidad en desarrollo</p>
            </div>
        `;
        
        if (window.lucide) {
            window.lucide.createIcons();
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
        console.error('💥 Error Financiero:', message);
        // TODO: Implementar sistema de notificaciones toast
        alert('Error: ' + message);
    };

    // Mostrar éxito
    const showSuccess = (message) => {
        console.log('✅ Éxito Financiero:', message);
        // TODO: Implementar sistema de notificaciones toast
        alert('Éxito: ' + message);
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
        // TODO: Implementar vista de cotización
    };

    window.editQuote = (id) => {
        if (modals) {
            modals.showQuoteModal(id);
        } else {
            console.error('❌ Modales no inicializados');
        }
    };

    window.deleteQuote = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;
        
        try {
            await api.delete(`/quotes/${id}`);
            showSuccess('Cotización eliminada correctamente');
            await loadData();
        } catch (error) {
            showError('Error al eliminar la cotización: ' + error.message);
        }
    };

    window.viewInvoice = (id) => {
        console.log('👁️ Ver factura:', id);
        // TODO: Implementar vista de factura
    };

    window.editInvoice = (id) => {
        if (modals) {
            modals.showInvoiceModal(id);
        } else {
            console.error('❌ Modales no inicializados');
        }
    };

    window.deleteInvoice = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta factura?')) return;
        
        try {
            await api.delete(`/invoices/${id}`);
            showSuccess('Factura eliminada correctamente');
            await loadData();
        } catch (error) {
            showError('Error al eliminar la factura: ' + error.message);
        }
    };

    window.createQuote = () => {
        if (modals) {
            modals.showQuoteModal();
        } else {
            console.error('❌ Modales no inicializados');
        }
    };

    window.createInvoice = () => {
        if (modals) {
            modals.showInvoiceModal();
        } else {
            console.error('❌ Modales no inicializados');
        }
    };

    // Inicialización
    const init = async () => {
        try {
            console.log('🚀 Iniciando dashboard financiero...');
            
            // Renderizar información del usuario
            window.authManager.renderUserInfo();
            
            // Inicializar sistema de pestañas
            initTabs();
            
            // Esperar a que se cargue FinancialModals
            while (!window.FinancialModals) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Inicializar modales
            modals = new window.FinancialModals(api);
            console.log('✅ Modales financieros inicializados');
            
            // Cargar datos
            await loadData();
            
            console.log('✅ Dashboard financiero inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando dashboard financiero:', error);
            showError('Error al inicializar el sistema: ' + error.message);
        }
    };

    // Iniciar la aplicación
    await init();
});
