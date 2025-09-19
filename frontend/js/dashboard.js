// dashboard.js - Dashboard Principal con KPIs en tiempo real
class DashboardManager {
    constructor() {
        this.kpis = {};
        this.refreshInterval = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Dashboard...');
        try {
            await this.loadKPIs();
            await this.loadRecentActivity();
            this.setupAutoRefresh();
            this.setupEventListeners();
            console.log('✅ Dashboard inicializado correctamente');
        } catch (error) {
            const errorId = `DASH_INIT_${Date.now()}`;
            console.error(`❌ Error inicializando dashboard [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showError(`Error al cargar el dashboard. Por favor recarga la página. (Ref: ${errorId})`, 'init');
        }
    }

    async loadKPIs() {
        console.log('📊 Cargando KPIs...');
        try {
            const response = await authenticatedFetch(`${window.API_URL}/dashboard/stats`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
            }

            const data = await response.json();

            if (data.message === 'success') {
                this.kpis = data.data;
                this.renderKPIs();
                console.log('✅ KPIs cargados exitosamente:', {
                    totalClients: this.kpis.total_clients,
                    totalEquipment: this.kpis.total_equipment,
                    activeTickets: this.kpis.active_tickets
                });
            } else {
                throw new Error('Error obteniendo KPIs');
            }
        } catch (error) {
            const errorId = `DASH_LOAD_KPIS_${Date.now()}`;
            console.error(`❌ Error cargando KPIs [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showError(`Error al cargar las estadísticas. Por favor intenta nuevamente. (Ref: ${errorId})`, 'loadKPIs');
        }
    }

    renderKPIs() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return;

        // Limpiar contenedor
        kpiContainer.innerHTML = '';

        // KPI Cards
        const kpiCards = [
            {
                id: 'total-clients',
                title: 'Total Clientes',
                value: this.kpis.total_clients || 0,
                icon: 'users',
                color: 'blue',
                description: 'Clientes registrados'
            },
            {
                id: 'total-equipment',
                title: 'Total Equipos',
                value: this.kpis.total_equipment || 0,
                icon: 'server',
                color: 'green',
                description: 'Equipos en sistema'
            },
            {
                id: 'active-tickets',
                title: 'Tickets Activos',
                value: this.kpis.active_tickets || 0,
                icon: 'ticket',
                color: 'orange',
                description: 'Tickets sin cerrar'
            },
            {
                id: 'critical-tickets',
                title: 'Tickets Críticos',
                value: this.kpis.critical_tickets || 0,
                icon: 'alert-triangle',
                color: 'red',
                description: 'Prioridad alta'
            },
            {
                id: 'low-stock',
                title: 'Stock Bajo',
                value: this.kpis.low_stock_items || 0,
                icon: 'package',
                color: 'yellow',
                description: 'Repuestos agotándose'
            }
        ];

        // Generar HTML para KPIs
        kpiCards.forEach(kpi => {
            const kpiCard = this.createKPICard(kpi);
            kpiContainer.appendChild(kpiCard);
        });

        // Renderizar gráficos
        this.renderCharts();
    }

    createKPICard(kpi) {
        const card = document.createElement('div');
        card.className = 'kpi-card';
        card.innerHTML = `
            <div class="kpi-header">
                <div class="kpi-icon kpi-${kpi.color}">
                    <i data-lucide="${kpi.icon}"></i>
                </div>
                <div class="kpi-info">
                    <h3 class="kpi-title">${kpi.title}</h3>
                    <p class="kpi-description">${kpi.description}</p>
                </div>
            </div>
            <div class="kpi-value">${kpi.value}</div>
        `;
        return card;
    }

    renderCharts() {
        // Renderizar gráfico de tickets por estado
        this.renderTicketStatusChart();
        
        // Renderizar gráfico de actividad reciente
        this.renderActivityChart();
        
        // Renderizar gráfico de carga de técnicos
        this.renderTechnicianWorkloadChart();
    }

    renderTicketStatusChart() {
        const chartContainer = document.getElementById('ticket-status-chart');
        if (!chartContainer || !this.kpis.tickets_by_status) return;

        const ticketsByStatus = this.kpis.tickets_by_status;
        const total = ticketsByStatus.reduce((sum, item) => sum + item.count, 0);

        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Tickets por Estado</h3>
                <p>Total: ${total}</p>
            </div>
            <div class="chart-content">
                ${ticketsByStatus.map(item => `
                    <div class="chart-bar">
                        <div class="chart-bar-label">${item.status}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill" style="width: ${total > 0 ? (item.count / total) * 100 : 0}%"></div>
                            <span class="chart-bar-value">${item.count}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderActivityChart() {
        const chartContainer = document.getElementById('activity-chart');
        if (!chartContainer || !this.kpis.recent_tickets) return;

        const recentTickets = this.kpis.recent_tickets;
        const maxCount = Math.max(...recentTickets.map(item => item.count), 1);

        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Actividad Reciente (7 días)</h3>
                <p>Tickets creados por día</p>
            </div>
            <div class="chart-content">
                ${recentTickets.map(item => `
                    <div class="chart-bar">
                        <div class="chart-bar-label">${this.formatDate(item.date)}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill" style="width: ${(item.count / maxCount) * 100}%"></div>
                            <span class="chart-bar-value">${item.count}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTechnicianWorkloadChart() {
        const chartContainer = document.getElementById('technician-workload-chart');
        if (!chartContainer || !this.kpis.technician_workload) return;

        const workload = this.kpis.technician_workload;
        const maxTickets = Math.max(...workload.map(item => item.ticket_count), 1);

        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3>Carga de Técnicos</h3>
                <p>Tickets asignados activos</p>
            </div>
            <div class="chart-content">
                ${workload.map(item => `
                    <div class="chart-bar">
                        <div class="chart-bar-label">${item.username}</div>
                        <div class="chart-bar-container">
                            <div class="chart-bar-fill" style="width: ${(item.ticket_count / maxTickets) * 100}%"></div>
                            <span class="chart-bar-value">${item.ticket_count}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadRecentActivity() {
        console.log('📋 Cargando actividad reciente...');
        try {
            const response = await authenticatedFetch(`${window.API_URL}/dashboard/activity?limit=10`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
            }

            const data = await response.json();

            if (data.message === 'success') {
                this.renderRecentActivity(data.data);
                console.log('✅ Actividad reciente cargada exitosamente:', {
                    activitiesCount: data.data?.length || 0
                });
            } else {
                throw new Error('Error obteniendo actividad');
            }
        } catch (error) {
            const errorId = `DASH_LOAD_ACTIVITY_${Date.now()}`;
            console.error(`❌ Error cargando actividad reciente [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showError(`Error al cargar la actividad reciente. Por favor intenta nuevamente. (Ref: ${errorId})`, 'loadRecentActivity');
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        container.innerHTML = `
            <div class="activity-header">
                <h3>Actividad Reciente</h3>
                <a href="tickets.html" class="activity-link">Ver todos los tickets</a>
            </div>
            <div class="activity-list">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i data-lucide="ticket"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${activity.description}</div>
                            <div class="activity-meta">
                                <span class="activity-status status-${activity.status?.toLowerCase().replace(/\s+/g, '-')}">${activity.status}</span>
                                <span class="activity-priority priority-${activity.priority?.toLowerCase().replace(/\s+/g, '-')}">${activity.priority}</span>
                                <span class="activity-date">${this.formatDateTime(activity.updated_at)}</span>
                            </div>
                        </div>
                        <div class="activity-actions">
                            <a href="ticket-detail.html?id=${activity.id}" class="btn-secondary btn-sm">Ver</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            console.log('🔄 Actualizando dashboard...');
            this.loadKPIs();
            this.loadRecentActivity();
        }, 300000); // 5 minutos
    }

    setupEventListeners() {
        // Botón de actualización manual
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadKPIs();
                this.loadRecentActivity();
            });
        }

        // Enlaces rápidos
        const quickLinks = document.querySelectorAll('.quick-link');
        quickLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const target = e.target.closest('.quick-link');
                if (target) {
                    const href = target.getAttribute('href');
                    if (href) {
                        window.location.href = href;
                    }
                }
            });
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message, context = '') {
        console.error(`❌ UI Error${context ? ` (${context})` : ''}:`, message);

        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                </div>
            `;

            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorContainer) {
                    errorContainer.innerHTML = '';
                }
            }, 5000);
        }

        // Re-render icons after adding content
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // Solo ejecutar en la página del dashboard
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('🚀 Inicializando Dashboard Manager...');
        window.dashboardManager = new DashboardManager();
    }
});

// Limpiar intervalos cuando se cierra/recarga la página
window.addEventListener('beforeunload', function() {
    if (window.dashboardManager) {
        console.log('🧹 Limpiando Dashboard Manager...');
        window.dashboardManager.destroy();
    }
});