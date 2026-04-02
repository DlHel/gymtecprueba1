// Dashboard de Notificaciones - Versión Corporativa Corregida
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que todos los scripts estén cargados
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                if (window.authManager && 
                    window.authManager.authenticatedFetch && 
                    window.API_URL &&
                    document.getElementById('total-notifications')) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            checkDependencies();
        });
    }

    // Inicializar después de que las dependencias estén listas
    waitForDependencies().then(() => {
        // 🚀 Protección de autenticación PRIMERO
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.log('❌ Usuario no autenticado, redirigiendo al login...');
            window.location.href = '/login.html';
            return;
        }

        console.log('🚀 Inicializando Dashboard de Notificaciones Corporativo...');

        // Continuar con la inicialización...

    // State management
    const state = {
        notifications: [],
        filteredNotifications: [],
        currentTab: 'queue',
        isLoading: false,
        error: null,
        stats: {
            total: 0,
            sent: 0,
            pending: 0,
            successRate: 0
        }
    };

    // API functions con autenticación
    const api = {
        getStats: async () => {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/notifications/stats`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || {};
            } catch (error) {
                console.error('❌ API Error - getStats:', error);
                throw error;
            }
        },

        getNotifications: async () => {
            try {
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/notifications`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const result = await response.json();
                return result.data || [];
            } catch (error) {
                console.error('❌ API Error - getNotifications:', error);
                throw error;
            }
        }
    };

    // UI functions
    const ui = {
        showLoading: () => {
            state.isLoading = true;
            const loadingElements = document.querySelectorAll('[id$="-loading"]');
            loadingElements.forEach(el => el.classList.remove('hidden'));
        },

        hideLoading: () => {
            state.isLoading = false;
            const loadingElements = document.querySelectorAll('[id$="-loading"]');
            loadingElements.forEach(el => el.classList.add('hidden'));
        },

        showError: (message) => {
            console.error('❌ Dashboard Error:', message);
            // Mostrar error visual al usuario
            const errorHtml = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div class="flex">
                        <svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                        </svg>
                        <div>
                            <h3 class="text-sm font-medium text-red-800">Error del Sistema</h3>
                            <p class="text-sm text-red-700 mt-1">${message}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Insertar error en el contenido activo
            const activeContent = document.querySelector(`#content-${state.currentTab}`);
            if (activeContent) {
                activeContent.insertAdjacentHTML('afterbegin', errorHtml);
            }
        },

        updateStats: (stats) => {
            // Actualizar métricas en el dashboard
            const elements = {
                'total-notifications': stats.total || 0,
                'notifications-sent': stats.sent || 0,
                'notifications-pending': stats.pending || 0,
                'success-rate': `${stats.successRate || 0}%`
            };

            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    // Animación de actualización
                    element.classList.add('fade-in');
                }
            });

            console.log('📊 Estadísticas actualizadas:', stats);
        },

        updateLastUpdate: () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit' 
            });
            
            // Actualizar ambos elementos de last-update
            const updateElements = [
                document.getElementById('last-update'),
                document.getElementById('last-update-main')
            ];
            
            updateElements.forEach(el => {
                if (el) {
                    el.textContent = timeString;
                }
            });
        },

        renderNotifications: (notifications) => {
            const container = document.getElementById('queue-table-body');
            if (!container) return;

            if (notifications.length === 0) {
                const emptyElement = document.getElementById('queue-empty');
                const tableContainer = document.getElementById('queue-container');
                if (emptyElement && tableContainer) {
                    emptyElement.classList.remove('hidden');
                    tableContainer.classList.add('hidden');
                }
                return;
            }

            const emptyElement = document.getElementById('queue-empty');
            const tableContainer = document.getElementById('queue-container');
            if (emptyElement && tableContainer) {
                emptyElement.classList.add('hidden');
                tableContainer.classList.remove('hidden');
            }

            const notificationRows = notifications.map(notification => {
                const priorityClass = {
                    'critical': 'bg-red-100 text-red-800',
                    'high': 'bg-orange-100 text-orange-800',
                    'medium': 'bg-yellow-100 text-yellow-800',
                    'low': 'bg-gray-100 text-gray-800'
                }[notification.priority] || 'bg-gray-100 text-gray-800';

                const statusClass = {
                    'pending': 'bg-yellow-100 text-yellow-800',
                    'sent': 'bg-green-100 text-green-800',
                    'failed': 'bg-red-100 text-red-800',
                    'processing': 'bg-blue-100 text-blue-800'
                }[notification.status] || 'bg-gray-100 text-gray-800';

                return `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">${notification.title}</div>
                            <div class="text-sm text-gray-500">${notification.message}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityClass}">
                                ${notification.priority}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                                ${notification.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${new Date(notification.created_at).toLocaleString('es-ES')}
                        </td>
                    </tr>
                `;
            }).join('');

            container.innerHTML = notificationRows;
            console.log('📋 Notificaciones renderizadas:', notifications.length);
        }
    };

    // Tab management
    function switchTab(tabName) {
        // Actualizar estado
        state.currentTab = tabName;

        // Actualizar botones de tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('text-primary-700', 'border-accent-500', 'bg-accent-50');
            btn.classList.add('text-primary-600', 'hover:text-primary-700', 'hover:bg-gray-50');
            btn.setAttribute('aria-selected', 'false');
        });

        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) {
            activeTab.classList.remove('text-primary-600', 'hover:text-primary-700', 'hover:bg-gray-50');
            activeTab.classList.add('text-primary-700', 'border-accent-500', 'bg-accent-50');
            activeTab.setAttribute('aria-selected', 'true');
        }

        // Mostrar contenido correspondiente
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        const activeContent = document.getElementById(`content-${tabName}`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
        }

        // Cargar datos según el tab
        loadTabData(tabName);

        console.log(`📑 Tab cambiado a: ${tabName}`);
    }

    // Load data for specific tab
    async function loadTabData(tabName) {
        try {
            ui.showLoading();

            switch (tabName) {
                case 'queue':
                    const notifications = await api.getNotifications();
                    state.notifications = notifications;
                    ui.renderNotifications(notifications);
                    break;
                
                case 'templates':
                    // Cargar plantillas (por implementar)
                    console.log('📝 Cargando plantillas...');
                    break;
                
                case 'analytics':
                    // Cargar analíticas avanzadas (por implementar)
                    console.log('📊 Cargando analíticas...');
                    break;
            }
        } catch (error) {
            console.error(`❌ Error cargando datos del tab ${tabName}:`, error);
            ui.showError(`Error cargando ${tabName}`);
        } finally {
            ui.hideLoading();
        }
    }

    // Event listeners
    function setupEventListeners() {
        // Tabs
        const tabQueue = document.getElementById('tab-queue');
        const tabTemplates = document.getElementById('tab-templates');
        const tabAnalytics = document.getElementById('tab-analytics');

        if (tabQueue) {
            tabQueue.addEventListener('click', () => switchTab('queue'));
        }
        if (tabTemplates) {
            tabTemplates.addEventListener('click', () => switchTab('templates'));
        }
        if (tabAnalytics) {
            tabAnalytics.addEventListener('click', () => switchTab('analytics'));
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                console.log('🔄 Actualizando dashboard...');
                await loadStats();
                await loadTabData(state.currentTab);
                ui.updateLastUpdate();
            });
        }

        // Mobile sidebar toggle
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                // Funcionalidad del menú móvil manejada por nav-loader.js
                console.log('📱 Toggle menú móvil');
            });
        }

        console.log('👂 Event listeners configurados');
    }

    // Load initial stats
    async function loadStats() {
        try {
            const stats = await api.getStats();
            state.stats = stats;
            ui.updateStats(stats);
            console.log('📊 Estadísticas cargadas:', stats);
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            ui.showError('Error cargando estadísticas del sistema');
        }
    }

    // Auto-refresh functionality
    function startAutoRefresh() {
        setInterval(async () => {
            await loadStats();
            if (state.currentTab === 'queue') {
                await loadTabData('queue');
            }
            ui.updateLastUpdate();
        }, 30000); // Cada 30 segundos

        console.log('🔄 Auto-refresh activado (30s)');
    }

    // Inicialización principal
    async function init() {
        try {
            console.log('🚀 Inicializando Dashboard de Notificaciones...');
            
            setupEventListeners();
            await loadStats();
            await loadTabData('queue'); // Tab por defecto
            startAutoRefresh();
            ui.updateLastUpdate();
            
            console.log('✅ Dashboard de Notificaciones inicializado correctamente');
        } catch (error) {
            console.error('💥 Error inicializando dashboard:', error);
            ui.showError('Error inicializando dashboard');
        }
    }

    // Inicializar con error handling
    init().catch(error => {
        console.error('💥 Error crítico en inicialización:', error);
    });

    }); // Cierre de waitForDependencies().then()
});
