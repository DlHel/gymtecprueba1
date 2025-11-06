// dashboard.js - Dashboard Principal Consolidado v2.0
// Integra información de todos los módulos del sistema

const CONFIG = {
    REFRESH_INTERVAL: 300000 // 5 minutos
};

class DashboardManager {
    constructor() {
        this.kpis = {};
        this.refreshInterval = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Dashboard Consolidado v2.0...');
        try {
            // Cargar todos los datos en paralelo
            await Promise.all([
                this.loadKPIsEnhanced(),
                this.loadCriticalAlerts(),
                this.loadResourcesSummary(),
                this.loadFinancialSummary(),
                this.loadInventorySummary(),
                this.loadContractsSLASummary(),
                this.loadRecentActivity()
            ]);
            
            this.setupAutoRefresh();
            this.setupEventListeners();
            console.log('✅ Dashboard consolidado inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
            this.showError('Error al cargar el dashboard');
        }
    }

    // =====================================================
    // CARGA DE DATOS
    // =====================================================

    async loadKPIsEnhanced() {
        console.log('📊 Cargando KPIs mejorados...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/kpis-enhanced`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.kpis = data.data;
                this.renderKPIs();
                this.renderTicketsCharts();
            }
        } catch (error) {
            console.error('❌ Error cargando KPIs:', error);
        }
    }

    async loadCriticalAlerts() {
        console.log('🚨 Cargando alertas críticas...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/critical-alerts`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderCriticalAlerts(data.data, data.total_alerts);
            }
        } catch (error) {
            console.error('❌ Error cargando alertas:', error);
        }
    }

    async loadResourcesSummary() {
        console.log('👥 Cargando resumen de recursos...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/resources-summary`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderResourcesPanel(data.data);
            }
        } catch (error) {
            console.error('❌ Error cargando recursos:', error);
        }
    }

    async loadFinancialSummary() {
        console.log('💰 Cargando resumen financiero...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/financial-summary`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderFinancialPanel(data.data);
            }
        } catch (error) {
            console.error('❌ Error cargando finanzas:', error);
        }
    }

    async loadInventorySummary() {
        console.log('📦 Cargando resumen de inventario...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/inventory-summary`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderInventoryPanel(data.data);
            }
        } catch (error) {
            console.error('❌ Error cargando inventario:', error);
        }
    }

    async loadContractsSLASummary() {
        console.log('📋 Cargando resumen de contratos y SLA...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/contracts-sla-summary`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderContractsSLAPanel(data.data);
            }
        } catch (error) {
            console.error('❌ Error cargando contratos y SLA:', error);
        }
    }

    async loadRecentActivity() {
        console.log('📋 Cargando actividad reciente...');
        try {
            const response = await window.authManager.authenticatedFetch(`${API_URL}/dashboard/activity?limit=10`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderRecentActivity(data.data);
            }
        } catch (error) {
            console.error('❌ Error cargando actividad:', error);
        }
    }

    // =====================================================
    // RENDERIZADO DE KPIs
    // =====================================================

    renderKPIs() {
        const kpiContainer = document.getElementById('kpi-container');
        if (!kpiContainer) return;

        kpiContainer.innerHTML = '';

        const kpiCards = [
            {
                title: 'Clientes Totales',
                value: this.kpis.total_clients || 0,
                icon: 'users',
                color: 'blue',
                link: 'clientes.html'
            },
            {
                title: 'Equipos Totales',
                value: this.kpis.total_equipment || 0,
                icon: 'server',
                color: 'green',
                link: 'equipo.html'
            },
            {
                title: 'Tickets Activos',
                value: this.kpis.active_tickets || 0,
                icon: 'ticket',
                color: 'orange',
                link: 'tickets.html'
            },
            {
                title: 'Tickets Críticos',
                value: this.kpis.critical_tickets || 0,
                icon: 'alert-triangle',
                color: 'red',
                link: 'tickets.html?priority=critica'
            },
            {
                title: 'Stock Bajo',
                value: this.kpis.low_stock_items || 0,
                icon: 'package',
                color: 'yellow',
                link: 'inventario.html'
            },
            {
                title: 'Contratos Activos',
                value: this.kpis.active_contracts || 0,
                icon: 'file-text',
                color: 'purple',
                link: 'contratos.html'
            },
            {
                title: 'Personal Activo',
                value: this.kpis.active_staff || 0,
                icon: 'user-check',
                color: 'indigo',
                link: 'personal.html'
            },
            {
                title: 'Asistencia Hoy',
                value: this.kpis.attendance_today || 0,
                icon: 'clock',
                color: 'teal',
                link: 'asistencia.html'
            }
        ];

        kpiCards.forEach(kpi => {
            const card = this.createKPICard(kpi);
            kpiContainer.appendChild(card);
        });

        // Actualizar iconos Lucide
        if (window.lucide) window.lucide.createIcons();
    }

    createKPICard(kpi) {
        const card = document.createElement('div');
        card.className = 'kpi-card cursor-pointer hover:shadow-lg transition-shadow';
        if (kpi.link) {
            card.onclick = () => window.location.href = kpi.link;
        }
        
        card.innerHTML = `
            <div class="kpi-header">
                <div class="kpi-icon kpi-${kpi.color}">
                    <i data-lucide="${kpi.icon}"></i>
                </div>
                <div class="kpi-info">
                    <h3 class="kpi-title">${kpi.title}</h3>
                </div>
            </div>
            <div class="kpi-value">${kpi.value}</div>
        `;
        return card;
    }

    // =====================================================
    // ALERTAS CRÍTICAS
    // =====================================================

    renderCriticalAlerts(alerts, totalAlerts) {
        const container = document.getElementById('critical-alerts-widget');
        if (!container) return;

        const hasAlerts = totalAlerts > 0;
        const alertColor = totalAlerts > 10 ? 'red' : totalAlerts > 5 ? 'orange' : 'yellow';

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md border-l-4 ${hasAlerts ? 'border-'+alertColor+'-500' : 'border-green-500'} p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="p-3 ${hasAlerts ? 'bg-'+alertColor+'-100' : 'bg-green-100'} rounded-lg">
                            <i data-lucide="${hasAlerts ? 'alert-circle' : 'check-circle'}" class="w-8 h-8 ${hasAlerts ? 'text-'+alertColor+'-600' : 'text-green-600'}"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">Alertas Críticas</h3>
                            <p class="text-sm text-gray-600">Requieren atención inmediata</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-4xl font-bold ${hasAlerts ? 'text-'+alertColor+'-600' : 'text-green-600'}">${totalAlerts}</div>
                        <div class="text-sm text-gray-500">Total</div>
                    </div>
                </div>

                ${hasAlerts ? `
                    <div class="space-y-3">
                        ${this.renderAlertItem('Tickets sin asignar > 24h', alerts.unassigned_tickets_24h?.length || 0, 'user-x', 'tickets.html')}
                        ${this.renderAlertItem('SLA crítico (< 2h)', alerts.sla_critical_2h?.length || 0, 'clock', 'tickets.html?filter=sla_critical')}
                        ${this.renderAlertItem('Stock en 0', alerts.zero_stock_items?.length || 0, 'package-x', 'inventario.html')}
                        ${this.renderAlertItem('Contratos vencen esta semana', alerts.contracts_expiring_week?.length || 0, 'file-warning', 'contratos.html')}
                        ${this.renderAlertItem('Equipos fuera de servicio', alerts.equipment_out_of_service?.length || 0, 'power-off', 'equipo.html')}
                        ${this.renderAlertItem('Gastos pendientes > 7 días', alerts.expenses_pending_7days?.length || 0, 'dollar-sign', 'finanzas.html')}
                    </div>
                ` : `
                    <div class="text-center py-4 text-green-600">
                        <i data-lucide="smile" class="w-12 h-12 mx-auto mb-2"></i>
                        <p class="font-semibold">¡Todo bajo control!</p>
                        <p class="text-sm text-gray-500">No hay alertas críticas en este momento</p>
                    </div>
                `}
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    renderAlertItem(label, count, icon, link) {
        if (count === 0) return '';
        
        return `
            <a href="${link}" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-3">
                    <i data-lucide="${icon}" class="w-5 h-5 text-orange-500"></i>
                    <span class="text-sm font-medium text-gray-700">${label}</span>
                </div>
                <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">${count}</span>
            </a>
        `;
    }

    // =====================================================
    // PANEL DE RECURSOS HUMANOS
    // =====================================================

    renderResourcesPanel(data) {
        const container = document.getElementById('resources-panel');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i data-lucide="users" class="w-6 h-6 text-indigo-600"></i>
                        Recursos Humanos
                    </h3>
                    <a href="personal.html" class="text-sm text-indigo-600 hover:text-indigo-700">Ver todo →</a>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="text-center p-4 bg-indigo-50 rounded-lg">
                        <div class="text-3xl font-bold text-indigo-600">${data.active_staff || 0}</div>
                        <div class="text-sm text-gray-600">Personal Total</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="text-3xl font-bold text-green-600">${data.attendance_today || 0}</div>
                        <div class="text-sm text-gray-600">Asistencia Hoy</div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Técnicos Activos</span>
                        <span class="font-semibold">${data.active_technicians || 0}</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Horas Extras (Mes)</span>
                        <span class="font-semibold">${data.overtime_hours_month || 0}h</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Utilización</span>
                        <span class="font-semibold ${this.getUtilizationColor(data.resource_utilization)}">${data.resource_utilization || 0}%</span>
                    </div>
                </div>

                ${data.technician_workload && data.technician_workload.length > 0 ? `
                    <div class="mt-6 pt-6 border-t">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Carga de Técnicos</h4>
                        ${data.technician_workload.slice(0, 5).map(tech => `
                            <div class="flex items-center justify-between py-2 text-sm">
                                <span class="text-gray-700">${tech.username}</span>
                                <div class="flex items-center gap-2">
                                    ${tech.critical_count > 0 ? `<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">${tech.critical_count} críticos</span>` : ''}
                                    <span class="font-semibold">${tech.ticket_count} tickets</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    getUtilizationColor(value) {
        if (value >= 85) return 'text-green-600';
        if (value >= 70) return 'text-yellow-600';
        return 'text-red-600';
    }

    // =====================================================
    // PANEL FINANCIERO
    // =====================================================

    renderFinancialPanel(data) {
        const container = document.getElementById('financial-panel');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i data-lucide="dollar-sign" class="w-6 h-6 text-green-600"></i>
                        Finanzas
                    </h3>
                    <a href="finanzas.html" class="text-sm text-green-600 hover:text-green-700">Ver todo →</a>
                </div>

                <div class="mb-6">
                    <div class="text-sm text-gray-500 mb-1">Gastos este Mes</div>
                    <div class="text-3xl font-bold text-gray-800">$${this.formatNumber(data.expenses_this_month || 0)}</div>
                </div>

                <div class="space-y-4">
                    <div class="p-4 bg-yellow-50 rounded-lg">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-gray-700">Pendientes Aprobación</span>
                            <span class="font-bold text-yellow-700">${data.pending_expenses?.count || 0}</span>
                        </div>
                        <div class="text-sm text-gray-600">$${this.formatNumber(data.pending_expenses?.amount || 0)}</div>
                    </div>

                    <div class="p-4 bg-red-50 rounded-lg">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-gray-700">Facturas Pendientes</span>
                            <span class="font-bold text-red-700">${data.pending_invoices?.count || 0}</span>
                        </div>
                        <div class="text-sm text-gray-600">$${this.formatNumber(data.pending_invoices?.amount || 0)}</div>
                    </div>

                    <div class="p-4 bg-blue-50 rounded-lg">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-sm font-medium text-gray-700">Cotizaciones Activas</span>
                            <span class="font-bold text-blue-700">${data.active_quotes?.count || 0}</span>
                        </div>
                        <div class="text-sm text-gray-600">$${this.formatNumber(data.active_quotes?.amount || 0)}</div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    // =====================================================
    // PANEL DE INVENTARIO
    // =====================================================

    renderInventoryPanel(data) {
        const container = document.getElementById('inventory-panel');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i data-lucide="package" class="w-6 h-6 text-purple-600"></i>
                        Inventario
                    </h3>
                    <a href="inventario.html" class="text-sm text-purple-600 hover:text-purple-700">Ver todo →</a>
                </div>

                <div class="grid grid-cols-3 gap-3 mb-6">
                    <div class="text-center p-3 bg-yellow-50 rounded-lg">
                        <div class="text-2xl font-bold text-yellow-600">${data.low_stock_items || 0}</div>
                        <div class="text-xs text-gray-600">Stock Bajo</div>
                    </div>
                    <div class="text-center p-3 bg-red-50 rounded-lg">
                        <div class="text-2xl font-bold text-red-600">${data.critical_stock_items || 0}</div>
                        <div class="text-xs text-gray-600">Stock 0</div>
                    </div>
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${data.movements_today || 0}</div>
                        <div class="text-xs text-gray-600">Mov. Hoy</div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-600">Órdenes Pendientes</span>
                        <span class="font-semibold">${data.pending_purchase_orders?.count || 0}</span>
                    </div>
                </div>

                ${data.top_used_parts && data.top_used_parts.length > 0 ? `
                    <div class="mt-6 pt-6 border-t">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Top Repuestos Usados</h4>
                        ${data.top_used_parts.slice(0, 5).map((part, index) => `
                            <div class="flex items-center justify-between py-2 text-sm">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400 font-bold">${index + 1}.</span>
                                    <span class="text-gray-700">${part.item_name}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-xs text-gray-500">Usado: ${part.usage_count}</span>
                                    <span class="font-semibold ${part.current_stock <= 5 ? 'text-red-600' : 'text-green-600'}">${part.current_stock}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    // =====================================================
    // PANEL DE CONTRATOS & SLA
    // =====================================================

    renderContractsSLAPanel(data) {
        const container = document.getElementById('contracts-sla-panel');
        if (!container) return;

        const slaPercentage = data.sla_compliance?.percentage || 0;
        const slaColor = slaPercentage >= 90 ? 'green' : slaPercentage >= 75 ? 'yellow' : 'red';

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-6 h-6 text-blue-600"></i>
                        Contratos & SLA
                    </h3>
                    <a href="contratos.html" class="text-sm text-blue-600 hover:text-blue-700">Ver todo →</a>
                </div>

                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-gray-600">Cumplimiento SLA</span>
                        <span class="text-2xl font-bold text-${slaColor}-600">${slaPercentage}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-${slaColor}-500 h-2 rounded-full transition-all" style="width: ${slaPercentage}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">${data.sla_compliance?.met_sla || 0} de ${data.sla_compliance?.total_tickets || 0} tickets (últimos 30 días)</div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="p-4 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${data.active_contracts || 0}</div>
                        <div class="text-sm text-gray-600">Activos</div>
                    </div>
                    <div class="p-4 bg-red-50 rounded-lg">
                        <div class="text-2xl font-bold text-red-600">${data.expired_contracts || 0}</div>
                        <div class="text-sm text-gray-600">Vencidos</div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 ${data.contracts_expiring_soon > 0 ? 'bg-yellow-50' : 'bg-gray-50'} rounded-lg">
                        <span class="text-sm font-medium text-gray-700">Próximos a vencer (30d)</span>
                        <span class="font-bold ${data.contracts_expiring_soon > 0 ? 'text-yellow-700' : 'text-gray-700'}">${data.contracts_expiring_soon || 0}</span>
                    </div>

                    <div class="flex justify-between items-center p-3 ${data.tickets_outside_sla > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg">
                        <span class="text-sm font-medium text-gray-700">Tickets fuera de SLA</span>
                        <span class="font-bold ${data.tickets_outside_sla > 0 ? 'text-red-700' : 'text-gray-700'}">${data.tickets_outside_sla || 0}</span>
                    </div>

                    <div class="flex justify-between items-center p-3 ${data.tickets_at_risk_sla > 0 ? 'bg-orange-50' : 'bg-gray-50'} rounded-lg">
                        <span class="text-sm font-medium text-gray-700">Tickets en riesgo SLA</span>
                        <span class="font-bold ${data.tickets_at_risk_sla > 0 ? 'text-orange-700' : 'text-gray-700'}">${data.tickets_at_risk_sla || 0}</span>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    // =====================================================
    // GRÁFICOS DE TICKETS
    // =====================================================

    renderTicketsCharts() {
        this.renderTicketStatusChart();
        this.renderTicketPriorityChart();
    }

    renderTicketStatusChart() {
        const chartContainer = document.getElementById('ticket-status-chart');
        if (!chartContainer || !this.kpis.tickets_by_status) return;

        const ticketsByStatus = this.kpis.tickets_by_status;
        const total = ticketsByStatus.reduce((sum, item) => sum + item.count, 0);

        chartContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Tickets por Estado</h3>
                    <span class="text-sm text-gray-500">Total: ${total}</span>
                </div>
                <div class="space-y-3">
                    ${ticketsByStatus.map(item => `
                        <div class="flex items-center gap-3">
                            <div class="flex-1">
                                <div class="flex justify-between mb-1">
                                    <span class="text-sm font-medium text-gray-700">${item.status}</span>
                                    <span class="text-sm font-bold text-gray-900">${item.count}</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full transition-all" style="width: ${total > 0 ? (item.count / total) * 100 : 0}%"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTicketPriorityChart() {
        const chartContainer = document.getElementById('ticket-priority-chart');
        if (!chartContainer || !this.kpis.tickets_by_priority) return;

        const ticketsByPriority = this.kpis.tickets_by_priority;
        const total = ticketsByPriority.reduce((sum, item) => sum + item.count, 0);

        const priorityColors = {
            'Crítica': 'red',
            'Alta': 'orange',
            'Media': 'yellow',
            'Baja': 'green'
        };

        chartContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Tickets por Prioridad</h3>
                    <span class="text-sm text-gray-500">Activos: ${total}</span>
                </div>
                <div class="space-y-3">
                    ${ticketsByPriority.map(item => {
                        const color = priorityColors[item.priority] || 'gray';
                        return `
                            <div class="flex items-center gap-3">
                                <div class="flex-1">
                                    <div class="flex justify-between mb-1">
                                        <span class="text-sm font-medium text-gray-700">${item.priority}</span>
                                        <span class="text-sm font-bold text-gray-900">${item.count}</span>
                                    </div>
                                    <div class="w-full bg-gray-200 rounded-full h-2">
                                        <div class="bg-${color}-500 h-2 rounded-full transition-all" style="width: ${total > 0 ? (item.count / total) * 100 : 0}%"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // =====================================================
    // ACTIVIDAD RECIENTE
    // =====================================================

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Actividad Reciente</h3>
                    <div class="text-center py-8 text-gray-500">
                        <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-2"></i>
                        <p>No hay actividad reciente</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Actividad Reciente</h3>
                    <a href="tickets.html" class="text-sm text-blue-600 hover:text-blue-700">Ver todos →</a>
                </div>
                <div class="space-y-3">
                    ${activities.map(activity => `
                        <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div class="p-2 bg-blue-100 rounded-lg">
                                <i data-lucide="activity" class="w-4 h-4 text-blue-600"></i>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-800">${activity.description}</div>
                                <div class="flex items-center gap-2 mt-1">
                                    ${activity.status ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${activity.status}</span>` : ''}
                                    ${activity.priority ? `<span class="text-xs px-2 py-1 ${this.getPriorityClass(activity.priority)} rounded">${activity.priority}</span>` : ''}
                                    <span class="text-xs text-gray-500">${this.formatDateTime(activity.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    getPriorityClass(priority) {
        const classes = {
            'Crítica': 'bg-red-100 text-red-700',
            'Alta': 'bg-orange-100 text-orange-700',
            'Media': 'bg-yellow-100 text-yellow-700',
            'Baja': 'bg-green-100 text-green-700'
        };
        return classes[priority] || 'bg-gray-100 text-gray-700';
    }

    // =====================================================
    // UTILIDADES
    // =====================================================

    formatNumber(num) {
        return new Intl.NumberFormat('es-CL').format(num);
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        
        return date.toLocaleDateString('es-ES', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                    <div class="flex items-center">
                        <i data-lucide="alert-circle" class="w-5 h-5 text-red-500 mr-3"></i>
                        <span class="text-red-700">${message}</span>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    // =====================================================
    // EVENTOS Y AUTO-REFRESH
    // =====================================================

    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            console.log('🔄 Actualizando dashboard...');
            this.init();
        }, CONFIG.REFRESH_INTERVAL);
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.init();
            });
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

document.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('🚀 Inicializando Dashboard Consolidado...');
        
        // CRÍTICO: Verificar autenticación
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.log('❌ Usuario no autenticado, redirigiendo...');
            window.location.href = 'login.html?return=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        console.log('✅ Usuario autenticado, cargando dashboard...');
        window.dashboardManager = new DashboardManager();
    }
});

// Limpiar al salir
window.addEventListener('beforeunload', function() {
    if (window.dashboardManager) {
        window.dashboardManager.destroy();
    }
});
