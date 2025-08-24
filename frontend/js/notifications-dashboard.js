/**
 * GYMTEC ERP - DASHBOARD DE NOTIFICACIONES INTELIGENTES
 * 
 * Funcionalidades:
 * ✅ Monitoreo en tiempo real de notificaciones
 * ✅ Gestión de templates
 * ✅ Visualización de logs
 * ✅ Control de alertas automáticas
 * ✅ Estado del scheduler
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado global del dashboard
    const state = {
        currentTab: 'queue',
        refreshInterval: null,
        lastUpdate: null,
        stats: {
            notificationsSent: 0,
            notificationsPending: 0,
            successRate: 0,
            slaAlerts: 0
        },
        queue: [],
        templates: [],
        logs: [],
        alerts: [],
        schedulerStats: null
    };

    // APIs del sistema
    const api = {
        // Estadísticas generales
        getStats: async (period = '24h') => {
            return await authenticatedFetch(`${API_URL}/notifications/stats?period=${period}`);
        },

        // Cola de notificaciones
        getQueue: async (status = '', priority = '') => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (priority) params.append('priority', priority);
            return await authenticatedFetch(`${API_URL}/notifications/queue?${params.toString()}`);
        },

        // Templates
        getTemplates: async () => {
            return await authenticatedFetch(`${API_URL}/notifications/templates`);
        },

        createTemplate: async (data) => {
            return await authenticatedFetch(`${API_URL}/notifications/templates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        updateTemplate: async (id, data) => {
            return await authenticatedFetch(`${API_URL}/notifications/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        deleteTemplate: async (id) => {
            return await authenticatedFetch(`${API_URL}/notifications/templates/${id}`, {
                method: 'DELETE'
            });
        },

        // Logs
        getLogs: async (dateFrom = '', dateTo = '') => {
            const params = new URLSearchParams({ limit: 100 });
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            return await authenticatedFetch(`${API_URL}/notifications/logs?${params.toString()}`);
        },

        // Envío manual
        sendNotification: async (data) => {
            return await authenticatedFetch(`${API_URL}/notifications/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        },

        // Sistema de alertas
        processAlerts: async () => {
            return await authenticatedFetch(`${API_URL}/system/alerts/process`, {
                method: 'POST'
            });
        },

        // Scheduler
        getSchedulerStats: async () => {
            return await authenticatedFetch(`${API_URL}/system/scheduler/stats`);
        }
    };

    // UI Controllers
    const ui = {
        showLoading: (elementId) => {
            const element = document.getElementById(elementId);
            if (element) element.classList.remove('hidden');
        },

        hideLoading: (elementId) => {
            const element = document.getElementById(elementId);
            if (element) element.classList.add('hidden');
        },

        showError: (message) => {
            console.error('Dashboard Error:', message);
            // Implementar notificación toast
            alert(`Error: ${message}`);
        },

        showSuccess: (message) => {
            console.log('Dashboard Success:', message);
            // Implementar notificación toast
        },

        updateStats: (stats) => {
            document.getElementById('notifications-sent').textContent = stats.notificationsSent || 0;
            document.getElementById('notifications-pending').textContent = stats.notificationsPending || 0;
            document.getElementById('success-rate').textContent = `${stats.successRate || 0}%`;
            document.getElementById('sla-alerts').textContent = stats.slaAlerts || 0;
        },

        updateLastUpdate: () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-CL');
            document.getElementById('last-update').textContent = `Última actualización: ${timeString}`;
        },

        renderQueue: (queue) => {
            const tbody = document.getElementById('queue-table-body');
            const container = document.getElementById('queue-table-container');
            const empty = document.getElementById('queue-empty');

            if (queue.length === 0) {
                container.classList.add('hidden');
                empty.classList.remove('hidden');
                return;
            }

            container.classList.remove('hidden');
            empty.classList.add('hidden');

            tbody.innerHTML = queue.map(item => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#${item.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.template_name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                            <div class="font-medium">${item.recipient_identifier}</div>
                            <div class="text-xs text-gray-400">${item.recipient_type}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full notification-status-${item.status}">
                            ${this.getStatusText(item.status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded priority-${item.priority}">
                            ${this.getPriorityText(item.priority)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${new Date(item.scheduled_at).toLocaleString('es-CL')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.attempts}/${item.max_attempts}
                        ${item.error_message ? `<div class="text-xs text-red-600 mt-1">${item.error_message}</div>` : ''}
                    </td>
                </tr>
            `).join('');
        },

        renderTemplates: (templates) => {
            const container = document.getElementById('templates-grid');
            
            container.innerHTML = templates.map(template => `
                <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="text-lg font-medium text-gray-900">${template.name}</h4>
                            <p class="text-sm text-gray-500">${template.trigger_event}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="editTemplate(${template.id})" class="text-blue-600 hover:text-blue-800">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button onclick="deleteTemplate(${template.id})" class="text-red-600 hover:text-red-800">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Tipo:</span>
                            <span class="text-sm font-medium">${template.type}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Prioridad:</span>
                            <span class="px-2 py-1 text-xs font-medium rounded priority-${template.priority}">
                                ${this.getPriorityText(template.priority)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Estado:</span>
                            <span class="text-sm ${template.is_active ? 'text-green-600' : 'text-red-600'}">
                                ${template.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">En cola:</span>
                            <span class="text-sm font-medium">${template.queue_count || 0}</span>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-gray-200">
                        <p class="text-sm text-gray-600 truncate" title="${template.subject_template}">
                            ${template.subject_template || 'Sin asunto definido'}
                        </p>
                    </div>
                </div>
            `).join('');
        },

        renderLogs: (logs) => {
            const tbody = document.getElementById('logs-table-body');
            
            tbody.innerHTML = logs.map(log => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${new Date(log.sent_at).toLocaleString('es-CL')}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.template_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                            <div class="font-medium">${log.recipient_identifier}</div>
                            <div class="text-xs text-gray-400">${log.recipient_type}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            ${log.delivery_method}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getLogStatusClass(log.status)}">
                            ${this.getLogStatusText(log.status)}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.trigger_event}</td>
                </tr>
            `).join('');
        },

        renderSchedulerStats: (stats) => {
            const container = document.getElementById('scheduler-content');
            
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Estadísticas del Scheduler -->
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Estado General</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Estado:</span>
                                <span class="text-sm font-medium ${stats.scheduler.isInitialized ? 'text-green-600' : 'text-red-600'}">
                                    ${stats.scheduler.isInitialized ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Jobs Activos:</span>
                                <span class="text-sm font-medium">${stats.scheduler.activeJobs || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Total Ejecutados:</span>
                                <span class="text-sm font-medium">${stats.scheduler.totalJobs || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Exitosos:</span>
                                <span class="text-sm font-medium text-green-600">${stats.scheduler.successfulJobs || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Fallidos:</span>
                                <span class="text-sm font-medium text-red-600">${stats.scheduler.failedJobs || 0}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Procesador de Alertas -->
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Procesador de Alertas</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Estado:</span>
                                <span class="text-sm font-medium ${stats.alertProcessor.isProcessing ? 'text-yellow-600' : 'text-green-600'}">
                                    ${stats.alertProcessor.isProcessing ? 'Procesando' : 'Listo'}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Verificadas:</span>
                                <span class="text-sm font-medium">${stats.alertProcessor.totalChecked || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Alertas Disparadas:</span>
                                <span class="text-sm font-medium">${stats.alertProcessor.alertsTriggered || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Notificaciones:</span>
                                <span class="text-sm font-medium">${stats.alertProcessor.notificationsSent || 0}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-sm text-gray-600">Errores:</span>
                                <span class="text-sm font-medium text-red-600">${stats.alertProcessor.errors || 0}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Jobs Activos -->
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <h4 class="text-lg font-medium text-gray-900 mb-4">Jobs Programados</h4>
                        <div class="space-y-3">
                            ${stats.activeJobs.map(job => `
                                <div class="border-l-4 border-blue-500 pl-3">
                                    <div class="text-sm font-medium text-gray-900">${job.name}</div>
                                    <div class="text-xs text-gray-500">${job.type} - ${job.schedule}</div>
                                </div>
                            `).join('') || '<p class="text-sm text-gray-500">No hay jobs activos</p>'}
                        </div>
                    </div>
                </div>
            `;
        },

        // Helper methods
        getStatusText: (status) => {
            const statusMap = {
                'pending': 'Pendiente',
                'processing': 'Procesando',
                'sent': 'Enviado',
                'failed': 'Fallido',
                'cancelled': 'Cancelado'
            };
            return statusMap[status] || status;
        },

        getPriorityText: (priority) => {
            const priorityMap = {
                'critical': 'Crítica',
                'high': 'Alta',
                'medium': 'Media',
                'low': 'Baja'
            };
            return priorityMap[priority] || priority;
        },

        getLogStatusClass: (status) => {
            const classMap = {
                'delivered': 'bg-green-100 text-green-800',
                'failed': 'bg-red-100 text-red-800',
                'bounced': 'bg-yellow-100 text-yellow-800',
                'opened': 'bg-blue-100 text-blue-800',
                'clicked': 'bg-purple-100 text-purple-800'
            };
            return classMap[status] || 'bg-gray-100 text-gray-800';
        },

        getLogStatusText: (status) => {
            const statusMap = {
                'delivered': 'Entregado',
                'failed': 'Fallido',
                'bounced': 'Rebotado',
                'opened': 'Abierto',
                'clicked': 'Clic'
            };
            return statusMap[status] || status;
        }
    };

    // Funciones principales
    async function loadStats() {
        try {
            const response = await api.getStats();
            if (response.ok) {
                const result = await response.json();
                const stats = result.data;
                
                // Mapear estadísticas
                state.stats = {
                    notificationsSent: stats.success_rate?.total || 0,
                    notificationsPending: stats.queue_status?.pending || 0,
                    successRate: stats.success_rate?.success_rate || 0,
                    slaAlerts: Object.values(stats.status_distribution || {}).reduce((a, b) => a + b, 0)
                };
                
                ui.updateStats(state.stats);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    async function loadQueue() {
        try {
            ui.showLoading('queue-loading');
            
            const statusFilter = document.getElementById('filter-status').value;
            const priorityFilter = document.getElementById('filter-priority').value;
            
            const response = await api.getQueue(statusFilter, priorityFilter);
            if (response.ok) {
                const result = await response.json();
                state.queue = result.data;
                ui.renderQueue(state.queue);
            }
        } catch (error) {
            ui.showError('Error cargando cola de notificaciones');
        } finally {
            ui.hideLoading('queue-loading');
        }
    }

    async function loadTemplates() {
        try {
            ui.showLoading('templates-loading');
            
            const response = await api.getTemplates();
            if (response.ok) {
                const result = await response.json();
                state.templates = result.data;
                ui.renderTemplates(state.templates);
            }
        } catch (error) {
            ui.showError('Error cargando templates');
        } finally {
            ui.hideLoading('templates-loading');
        }
    }

    async function loadLogs() {
        try {
            ui.showLoading('logs-loading');
            
            const dateFrom = document.getElementById('logs-date-from').value;
            const dateTo = document.getElementById('logs-date-to').value;
            
            const response = await api.getLogs(dateFrom, dateTo);
            if (response.ok) {
                const result = await response.json();
                state.logs = result.data;
                ui.renderLogs(state.logs);
            }
        } catch (error) {
            ui.showError('Error cargando logs');
        } finally {
            ui.hideLoading('logs-loading');
        }
    }

    async function loadSchedulerStats() {
        try {
            ui.showLoading('scheduler-loading');
            
            const response = await api.getSchedulerStats();
            if (response.ok) {
                const result = await response.json();
                state.schedulerStats = result.data;
                ui.renderSchedulerStats(state.schedulerStats);
            }
        } catch (error) {
            ui.showError('Error cargando estadísticas del scheduler');
        } finally {
            ui.hideLoading('scheduler-loading');
        }
    }

    async function processAlerts() {
        try {
            const btn = document.getElementById('process-alerts-btn');
            btn.disabled = true;
            btn.innerHTML = '⏳ Procesando...';
            
            const response = await api.processAlerts();
            if (response.ok) {
                const result = await response.json();
                ui.showSuccess(`Alertas procesadas: ${result.data.stats.alertsTriggered} disparadas`);
                await loadStats();
                await loadQueue();
            } else {
                throw new Error('Error procesando alertas');
            }
        } catch (error) {
            ui.showError('Error procesando alertas automáticas');
        } finally {
            const btn = document.getElementById('process-alerts-btn');
            btn.disabled = false;
            btn.innerHTML = '🚨 Procesar Alertas';
        }
    }

    // Gestión de tabs
    function switchTab(tabName) {
        // Actualizar estado
        state.currentTab = tabName;
        
        // Actualizar UI de tabs
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        
        document.getElementById(`tab-${tabName}`).classList.remove('border-transparent', 'text-gray-500');
        document.getElementById(`tab-${tabName}`).classList.add('border-blue-500', 'text-blue-600');
        
        // Mostrar/ocultar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        document.getElementById(`content-${tabName}`).classList.remove('hidden');
        
        // Cargar datos del tab
        switch (tabName) {
            case 'queue':
                loadQueue();
                break;
            case 'templates':
                loadTemplates();
                break;
            case 'logs':
                loadLogs();
                break;
            case 'alerts':
                // Los datos de alertas se cargan con las estadísticas
                break;
            case 'scheduler':
                loadSchedulerStats();
                break;
        }
    }

    // Auto-refresh
    function startAutoRefresh() {
        state.refreshInterval = setInterval(async () => {
            await loadStats();
            if (state.currentTab === 'queue') {
                await loadQueue();
            }
            ui.updateLastUpdate();
        }, 30000); // Cada 30 segundos
    }

    // Event listeners
    function setupEventListeners() {
        // Tabs
        document.getElementById('tab-queue').addEventListener('click', () => switchTab('queue'));
        document.getElementById('tab-templates').addEventListener('click', () => switchTab('templates'));
        document.getElementById('tab-logs').addEventListener('click', () => switchTab('logs'));
        document.getElementById('tab-alerts').addEventListener('click', () => switchTab('alerts'));
        document.getElementById('tab-scheduler').addEventListener('click', () => switchTab('scheduler'));
        
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', async () => {
            await loadStats();
            switch (state.currentTab) {
                case 'queue': await loadQueue(); break;
                case 'templates': await loadTemplates(); break;
                case 'logs': await loadLogs(); break;
                case 'scheduler': await loadSchedulerStats(); break;
            }
            ui.updateLastUpdate();
        });
        
        // Process alerts
        document.getElementById('process-alerts-btn').addEventListener('click', processAlerts);
        document.getElementById('manual-process-btn')?.addEventListener('click', processAlerts);
        
        // Filtros
        document.getElementById('filter-status').addEventListener('change', loadQueue);
        document.getElementById('filter-priority').addEventListener('change', loadQueue);
        document.getElementById('filter-logs-btn').addEventListener('click', loadLogs);
    }

    // Inicialización
    async function init() {
        console.log('🚀 Inicializando Dashboard de Notificaciones...');
        
        setupEventListeners();
        await loadStats();
        await loadQueue(); // Tab por defecto
        startAutoRefresh();
        ui.updateLastUpdate();
        
        console.log('✅ Dashboard de Notificaciones inicializado');
    }

    // Funciones globales para templates
    window.editTemplate = (id) => {
        // Implementar modal de edición
        console.log('Editar template:', id);
    };

    window.deleteTemplate = async (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este template?')) {
            try {
                const response = await api.deleteTemplate(id);
                if (response.ok) {
                    ui.showSuccess('Template eliminado exitosamente');
                    await loadTemplates();
                } else {
                    throw new Error('Error eliminando template');
                }
            } catch (error) {
                ui.showError('Error eliminando template');
            }
        }
    };

    // Iniciar la aplicación
    init().catch(error => {
        console.error('💥 Error inicializando dashboard:', error);
        ui.showError('Error inicializando dashboard');
    });
});
