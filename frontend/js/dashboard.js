// dashboard.js - Dashboard Principal con KPIs en tiempo real
const CONFIG = {
    REFRESH_INTERVAL: 300000 // 5 minutos en milisegundos
};

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
            await this.loadCorrelationData(); // Nueva función para correlaciones
            this.setupAutoRefresh();
            this.setupEventListeners();
            console.log('✅ Dashboard inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
            this.showError('Error al cargar el dashboard');
        }
    }

    async loadKPIs() {
        console.log('📊 Cargando KPIs...');
        try {
            const response = await authenticatedFetch(`${API_URL}/dashboard/kpis`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.kpis = data.data;
                this.renderKPIs();
            } else {
                throw new Error('Error obteniendo KPIs');
            }
        } catch (error) {
            console.error('❌ Error cargando KPIs:', error);
            this.showError('Error al cargar las estadísticas');
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
            const response = await authenticatedFetch(`${API_URL}/dashboard/activity?limit=10`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.renderRecentActivity(data.data);
            } else {
                throw new Error('Error obteniendo actividad');
            }
        } catch (error) {
            console.error('❌ Error cargando actividad:', error);
            this.showError('Error al cargar la actividad reciente');
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
        }, CONFIG.REFRESH_INTERVAL);
    }

    setupEventListeners() {
        // Botón de actualización manual
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadKPIs();
                this.loadRecentActivity();
                this.loadCorrelationData();
            });
        }

        // Botón de generación de tareas
        const generateTasksBtn = document.getElementById('generate-tasks-btn');
        if (generateTasksBtn) {
            generateTasksBtn.addEventListener('click', () => {
                this.openTaskGeneratorModal();
            });
        }

        // Modal de generación de tareas
        this.setupTaskGeneratorModal();

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

    setupTaskGeneratorModal() {
        const modal = document.getElementById('task-generator-modal');
        const closeBtn = document.getElementById('close-task-modal');
        const cancelBtn = document.getElementById('cancel-task-generation');
        const executeBtn = document.getElementById('execute-task-generation');
        const generationTypeSelect = document.getElementById('generation-type');
        const contractSelector = document.getElementById('contract-selector');

        // Cerrar modal
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.closeTaskGeneratorModal();
                });
            }
        });

        // Mostrar/ocultar selector de contrato
        if (generationTypeSelect) {
            generationTypeSelect.addEventListener('change', () => {
                if (generationTypeSelect.value === 'single') {
                    contractSelector.classList.remove('hidden');
                    this.loadContractsForSelector();
                } else {
                    contractSelector.classList.add('hidden');
                }
            });
        }

        // Ejecutar generación
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.executeTaskGeneration();
            });
        }

        // Cerrar al hacer clic fuera del modal
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeTaskGeneratorModal();
                }
            });
        }
    }

    async openTaskGeneratorModal() {
        const modal = document.getElementById('task-generator-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Reset form
            document.getElementById('months-ahead').value = '2';
            document.getElementById('generation-type').value = 'preview';
            document.getElementById('force-regenerate').checked = false;
            document.getElementById('contract-selector').classList.add('hidden');
            document.getElementById('generation-progress').classList.add('hidden');
        }
    }

    closeTaskGeneratorModal() {
        const modal = document.getElementById('task-generator-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async loadContractsForSelector() {
        try {
            const response = await authenticatedFetch(`${API_URL}/contracts`);
            const data = await response.json();
            
            const contractSelect = document.getElementById('contract-id');
            if (contractSelect && data.message === 'success') {
                contractSelect.innerHTML = '<option value="">Seleccionar contrato...</option>';
                data.data.forEach(contract => {
                    const option = document.createElement('option');
                    option.value = contract.id;
                    option.textContent = `${contract.contract_number} - ${contract.client_name || 'Cliente'}`;
                    contractSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('❌ Error cargando contratos:', error);
            this.showError('Error al cargar la lista de contratos');
        }
    }

    async executeTaskGeneration() {
        const monthsAhead = document.getElementById('months-ahead').value;
        const generationType = document.getElementById('generation-type').value;
        const contractId = document.getElementById('contract-id').value;
        const forceRegenerate = document.getElementById('force-regenerate').checked;
        const progressDiv = document.getElementById('generation-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        // Mostrar progreso
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Iniciando generación...';

        try {
            let endpoint = '';
            let requestBody = {
                months_ahead: parseInt(monthsAhead),
                force_regenerate: forceRegenerate
            };

            switch (generationType) {
                case 'preview':
                    if (!contractId) {
                        // Usar el primer contrato disponible para preview
                        const contractsResponse = await authenticatedFetch(`${API_URL}/contracts`);
                        const contractsData = await contractsResponse.json();
                        if (contractsData.data?.length > 0) {
                            endpoint = `/contracts/${contractsData.data[0].id}/task-generation-preview`;
                        } else {
                            throw new Error('No hay contratos disponibles para preview');
                        }
                    } else {
                        endpoint = `/contracts/${contractId}/task-generation-preview`;
                    }
                    break;
                
                case 'single':
                    if (!contractId) {
                        throw new Error('Debe seleccionar un contrato');
                    }
                    endpoint = `/contracts/${contractId}/generate-tasks`;
                    break;
                
                case 'bulk':
                    endpoint = `/contracts/generate-all-tasks`;
                    requestBody.dry_run = false;
                    break;
            }

            // Simular progreso
            let progress = 10;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = 'Procesando contratos...';

            const response = await authenticatedFetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            progress = 50;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = 'Generando tareas...';

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en la generación');
            }

            const result = await response.json();

            progress = 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = 'Generación completada exitosamente';

            // Mostrar resultados
            setTimeout(() => {
                this.showGenerationResults(result.data, generationType);
                
                // Actualizar dashboard si se generaron tareas reales
                if (generationType !== 'preview') {
                    this.loadKPIs();
                    this.loadCorrelationData();
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error en generación de tareas:', error);
            progressText.textContent = `Error: ${error.message}`;
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-red-500');
            
            setTimeout(() => {
                this.showError(`Error en generación de tareas: ${error.message}`);
                this.closeTaskGeneratorModal();
            }, 2000);
        }
    }

    showGenerationResults(data, type) {
        let message = '';
        
        switch (type) {
            case 'preview':
                message = `Vista previa: ${data.preview_tasks?.length || 0} tareas programadas para los próximos ${data.months_ahead || 2} meses`;
                break;
            case 'single':
                message = `✅ Generadas ${data.generated_tasks} tareas para el contrato seleccionado`;
                break;
            case 'bulk':
                message = `✅ Procesados ${data.contracts_processed} contratos, generadas ${data.total_tasks_to_generate} tareas`;
                break;
        }

        // Crear notificación de éxito
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        this.closeTaskGeneratorModal();
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

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="error-message">
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    // =====================================================
    // CORRELACIONES INTELIGENTES - NUEVAS FUNCIONES
    // =====================================================
    
    /**
     * Cargar datos de correlación inteligente
     */
    async loadCorrelationData() {
        console.log('🧠 Cargando correlaciones inteligentes...');
        try {
            // Cargar múltiples endpoints en paralelo para mejor performance
            const [slaData, contractsData, efficiencyData] = await Promise.all([
                this.loadSLAPlanningCorrelation(),
                this.loadContractsSummary(),
                this.loadEfficiencySummary()
            ]);

            // Renderizar cada sección
            this.renderSLAPlanningCorrelation(slaData);
            this.renderContractsSummary(contractsData);
            this.renderEfficiencySummary(efficiencyData);

            console.log('✅ Correlaciones inteligentes cargadas');
        } catch (error) {
            console.error('❌ Error cargando correlaciones:', error);
            this.showCorrelationError();
        }
    }

    /**
     * Cargar correlación SLA vs Planificación
     */
    async loadSLAPlanningCorrelation() {
        try {
            const response = await authenticatedFetch(`${API_URL}/dashboard/sla-planning-correlation`);
            const data = await response.json();
            return data.data || {};
        } catch (error) {
            console.error('❌ Error cargando correlación SLA:', error);
            return {};
        }
    }

    /**
     * Cargar resumen de contratos
     */
    async loadContractsSummary() {
        try {
            const response = await authenticatedFetch(`${API_URL}/dashboard/contracts-summary`);
            const data = await response.json();
            return data.data || {};
        } catch (error) {
            console.error('❌ Error cargando resumen de contratos:', error);
            return {};
        }
    }

    /**
     * Cargar resumen de eficiencia
     */
    async loadEfficiencySummary() {
        try {
            const response = await authenticatedFetch(`${API_URL}/dashboard/efficiency-summary`);
            const data = await response.json();
            return data.data || {};
        } catch (error) {
            console.error('❌ Error cargando eficiencia:', error);
            return {};
        }
    }

    /**
     * Renderizar correlación SLA vs Planificación
     */
    renderSLAPlanningCorrelation(data) {
        const container = document.getElementById('sla-planning-summary');
        if (!container) return;

        const slaCompliance = data.sla_compliance_percentage || 0;
        const tasksOnTime = data.planned_tasks_on_time || 0;
        const riskTickets = data.sla_risk_tickets || 0;

        container.innerHTML = `
            <div class="correlation-metric">
                <span class="metric-label">Cumplimiento SLA</span>
                <span class="metric-value ${this.getStatusClass(slaCompliance, 90, 75)}">${slaCompliance}%</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">Tareas a Tiempo</span>
                <span class="metric-value ${this.getStatusClass(tasksOnTime, 85, 70)}">${tasksOnTime}%</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">Tickets en Riesgo</span>
                <span class="metric-value ${riskTickets > 5 ? 'danger' : riskTickets > 2 ? 'warning' : 'success'}">${riskTickets}</span>
            </div>
            <div class="mt-3">
                <div class="correlation-badge ${this.getCorrelationBadge(slaCompliance, tasksOnTime)}">
                    <i data-lucide="${this.getCorrelationIcon(slaCompliance, tasksOnTime)}" class="w-3 h-3"></i>
                    ${this.getCorrelationText(slaCompliance, tasksOnTime)}
                </div>
            </div>
        `;

        // Actualizar iconos
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Renderizar resumen de contratos
     */
    renderContractsSummary(data) {
        const container = document.getElementById('contracts-summary');
        if (!container) return;

        const activeContracts = data.active_contracts || 0;
        const averageSLA = data.average_sla_compliance || 0;
        const contractsExpiringSoon = data.contracts_expiring_soon || 0;

        container.innerHTML = `
            <div class="correlation-metric">
                <span class="metric-label">Contratos Activos</span>
                <span class="metric-value neutral">${activeContracts}</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">SLA Promedio</span>
                <span class="metric-value ${this.getStatusClass(averageSLA, 90, 80)}">${averageSLA}%</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">Próximos a Vencer</span>
                <span class="metric-value ${contractsExpiringSoon > 3 ? 'danger' : contractsExpiringSoon > 1 ? 'warning' : 'success'}">${contractsExpiringSoon}</span>
            </div>
            <div class="mt-3">
                <div class="correlation-badge ${contractsExpiringSoon > 3 ? 'danger' : contractsExpiringSoon > 1 ? 'warning' : 'success'}">
                    <i data-lucide="${contractsExpiringSoon > 3 ? 'alert-triangle' : contractsExpiringSoon > 1 ? 'clock' : 'check-circle'}" class="w-3 h-3"></i>
                    ${contractsExpiringSoon > 3 ? 'Revisar renovaciones' : contractsExpiringSoon > 1 ? 'Planificar renovaciones' : 'Contratos estables'}
                </div>
            </div>
        `;

        // Actualizar iconos
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Renderizar resumen de eficiencia
     */
    renderEfficiencySummary(data) {
        const container = document.getElementById('efficiency-summary');
        if (!container) return;

        const taskCompletionRate = data.task_completion_rate || 0;
        const resourceUtilization = data.resource_utilization || 0;
        const avgResolutionTime = data.avg_resolution_time_hours || 0;

        container.innerHTML = `
            <div class="correlation-metric">
                <span class="metric-label">Tasa Completado</span>
                <span class="metric-value ${this.getStatusClass(taskCompletionRate, 90, 80)}">${taskCompletionRate}%</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">Utilización Técnicos</span>
                <span class="metric-value ${this.getStatusClass(resourceUtilization, 85, 70)}">${resourceUtilization}%</span>
            </div>
            <div class="correlation-metric">
                <span class="metric-label">Tiempo Resolución</span>
                <span class="metric-value ${avgResolutionTime <= 24 ? 'success' : avgResolutionTime <= 48 ? 'warning' : 'danger'}">${avgResolutionTime}h</span>
            </div>
            <div class="mt-3">
                <div class="correlation-badge ${this.getEfficiencyBadge(taskCompletionRate, resourceUtilization)}">
                    <i data-lucide="${this.getEfficiencyIcon(taskCompletionRate, resourceUtilization)}" class="w-3 h-3"></i>
                    ${this.getEfficiencyText(taskCompletionRate, resourceUtilization)}
                </div>
            </div>
        `;

        // Actualizar iconos
        if (window.lucide) window.lucide.createIcons();
    }

    /**
     * Funciones auxiliares para determinar estilos y estados
     */
    getStatusClass(value, good, acceptable) {
        if (value >= good) return 'success';
        if (value >= acceptable) return 'warning';
        return 'danger';
    }

    getCorrelationBadge(sla, tasks) {
        const avg = (sla + tasks) / 2;
        if (avg >= 85) return 'success';
        if (avg >= 75) return 'warning';
        return 'danger';
    }

    getCorrelationIcon(sla, tasks) {
        const avg = (sla + tasks) / 2;
        if (avg >= 85) return 'trending-up';
        if (avg >= 75) return 'minus';
        return 'trending-down';
    }

    getCorrelationText(sla, tasks) {
        const avg = (sla + tasks) / 2;
        if (avg >= 85) return 'Excelente correlación';
        if (avg >= 75) return 'Correlación aceptable';
        return 'Requiere optimización';
    }

    getEfficiencyBadge(completion, utilization) {
        const avg = (completion + utilization) / 2;
        if (avg >= 85) return 'success';
        if (avg >= 70) return 'warning';
        return 'danger';
    }

    getEfficiencyIcon(completion, utilization) {
        const avg = (completion + utilization) / 2;
        if (avg >= 85) return 'zap';
        if (avg >= 70) return 'activity';
        return 'alert-circle';
    }

    getEfficiencyText(completion, utilization) {
        const avg = (completion + utilization) / 2;
        if (avg >= 85) return 'Operación óptima';
        if (avg >= 70) return 'Eficiencia media';
        return 'Oportunidades mejora';
    }

    /**
     * Mostrar error en correlaciones
     */
    showCorrelationError() {
        const containers = ['sla-planning-summary', 'contracts-summary', 'efficiency-summary'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-red-500 py-4">
                        <i data-lucide="alert-circle" class="w-5 h-5 mx-auto mb-2"></i>
                        <p class="text-sm">Error al cargar datos</p>
                    </div>
                `;
            }
        });
        
        // Actualizar iconos
        if (window.lucide) window.lucide.createIcons();
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', async function() {
    // Solo ejecutar en la página del dashboard
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('🚀 Inicializando Dashboard Manager...');
        
        // CRÍTICO: Protección de autenticación PRIMERO
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.log('❌ Usuario no autenticado en dashboard, redirigiendo a login...');
            window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
            return;
        }
        
        console.log('✅ Usuario autenticado, cargando dashboard...');
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