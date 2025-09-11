// reportes-enhanced.js - Sistema completo de reportes con mejoras visuales
// ✅ CRÍTICO: Verificación de autenticación TEMPORALMENTE DESHABILITADA
console.log('🔧 DEBUG: reportes-enhanced.js - Verificación de autenticación deshabilitada temporalmente');

const CONFIG = {
    API_BASE_URL: window.API_URL || 'http://localhost:3000/api'
};

class ReportsManager {
    constructor() {
        this.reports = [];
        this.tickets = [];
        this.technicians = [];
        this.currentReport = null;
        this.selectedReportType = null;
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando módulo de Reportes mejorado...');
            this.setupEventListeners();
            this.initializeAnimations();
            await this.loadInitialData();
            this.updateStatistics();
            this.animateCounters();
            console.log('✅ Módulo de Reportes inicializado correctamente');
        } catch (error) {
            const errorId = `REP_INIT_${Date.now()}`;
            console.error(`❌ Error inicializando módulo de reportes [${errorId}]:`, error);
            this.showNotification(`Error al inicializar el módulo de reportes. (Ref: ${errorId})`, 'error');
        }
    }

    initializeAnimations() {
        // Activar animaciones de las tarjetas de estadísticas
        const statCards = document.querySelectorAll('.reports-stat-card');
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-fade-in-up');
            }, index * 100);
        });

        // Activar animaciones de las tarjetas de tipos de reportes
        const typeCards = document.querySelectorAll('.report-type-card');
        typeCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-fade-in-scale');
            }, (index * 100) + 200);
        });
    }

    animateCounters() {
        const counters = document.querySelectorAll('.reports-stat-value[data-target]');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000; // 2 segundos
            const step = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += step;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                    counter.classList.add('pulse-glow');
                    setTimeout(() => {
                        counter.classList.remove('pulse-glow');
                    }, 1000);
                }
            };

            // Comenzar animación después de un delay
            setTimeout(() => {
                updateCounter();
            }, 500);
        });
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('new-report-btn').addEventListener('click', () => this.openNewReportModal());
        document.getElementById('schedule-report-btn').addEventListener('click', () => this.scheduleReport());
        document.getElementById('refresh-reports').addEventListener('click', () => this.loadReportsHistory());
        document.getElementById('filter-reports').addEventListener('click', () => this.showFilterModal());

        // Tarjetas de tipos de reportes
        document.querySelectorAll('.report-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectReportType(card.dataset.type);
            });
        });

        // Modales
        document.querySelectorAll('.base-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.base-modal');
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('base-modal')) {
                this.closeModal(e.target);
            }
        });
    }

    async loadInitialData() {
        try {
            console.log('📊 Cargando datos iniciales de reportes...');
            await this.loadReportsHistory();
            console.log('✅ Datos iniciales cargados');
        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            throw error;
        }
    }

    async loadReportsHistory() {
        try {
            console.log('📄 Cargando historial de reportes...');
            const historyContainer = document.getElementById('reports-history');
            
            // Mostrar skeleton loading
            this.showSkeletonLoading(historyContainer);
            
            // Simular carga de datos
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Datos simulados para demostrar la interfaz mejorada
            const reports = [
                {
                    id: 1,
                    title: 'Informe Técnico - Ticket #258',
                    type: 'technical-ticket',
                    format: 'pdf',
                    status: 'completed',
                    created_at: '2025-09-11 09:30:00',
                    size: '2.4 MB'
                },
                {
                    id: 2,
                    title: 'Reporte de Equipos - Septiembre',
                    type: 'equipment',
                    format: 'excel',
                    status: 'completed',
                    created_at: '2025-09-10 16:45:00',
                    size: '1.8 MB'
                },
                {
                    id: 3,
                    title: 'Análisis de Tickets - Último Mes',
                    type: 'tickets',
                    format: 'csv',
                    status: 'processing',
                    created_at: '2025-09-11 10:15:00',
                    size: '856 KB'
                }
            ];
            
            this.reports = reports;
            this.renderReportsHistory(reports);
            this.showNotification('Historial de reportes cargado exitosamente', 'success');
            
        } catch (error) {
            console.error('❌ Error cargando historial:', error);
            this.showNotification('Error al cargar el historial de reportes', 'error');
        }
    }

    showSkeletonLoading(container) {
        const skeletonHTML = `
            ${Array(3).fill().map(() => `
                <div class="skeleton-item">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-line medium"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `).join('')}
        `;
        container.innerHTML = skeletonHTML;
    }

    renderReportsHistory(reports) {
        const container = document.getElementById('reports-history');
        
        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i data-lucide="file-x" class="h-6 w-6"></i>
                    </div>
                    <h3 class="empty-state-title">No hay reportes disponibles</h3>
                    <p class="empty-state-description">
                        Crea tu primer reporte usando el botón "Nuevo Reporte" arriba.
                    </p>
                </div>
            `;
            
            // Inicializar íconos de Lucide
            if (window.lucide) {
                window.lucide.createIcons();
            }
            return;
        }

        const reportsHTML = reports.map(report => `
            <div class="report-item animate-fade-in-up">
                <div class="report-item-icon ${report.format}">
                    <i data-lucide="${this.getFormatIcon(report.format)}" class="h-4 w-4"></i>
                </div>
                <div class="report-item-content">
                    <h4 class="report-item-title">${report.title}</h4>
                    <p class="report-item-subtitle">${this.getTypeLabel(report.type)} • ${report.format.toUpperCase()}</p>
                    <div class="report-item-meta">
                        <span>${this.formatDate(report.created_at)}</span>
                        <span>•</span>
                        <span>${report.size}</span>
                    </div>
                </div>
                <div class="report-item-status">
                    <span class="status-badge ${report.status}">${this.getStatusLabel(report.status)}</span>
                </div>
                <div class="report-item-actions">
                    <button class="action-btn download" title="Descargar reporte">
                        <i data-lucide="download" class="h-3 w-3"></i>
                    </button>
                    <button class="action-btn delete" title="Eliminar reporte">
                        <i data-lucide="trash-2" class="h-3 w-3"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = reportsHTML;
        
        // Inicializar íconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    updateStatistics() {
        try {
            // Simular datos dinámicos para demostrar las mejoras visuales
            const stats = {
                totalReports: 47,
                generatedToday: 8,
                scheduledReports: 3,
                avgGenerationTime: 2.3
            };

            // Actualizar los data-target para la animación
            document.getElementById('total-reports').setAttribute('data-target', stats.totalReports);
            document.getElementById('generated-today').setAttribute('data-target', stats.generatedToday);
            document.getElementById('scheduled-reports').setAttribute('data-target', stats.scheduledReports);
            
            // El tiempo promedio se maneja diferente
            const avgTimeElement = document.getElementById('avg-generation-time');
            avgTimeElement.setAttribute('data-target', Math.floor(stats.avgGenerationTime));
            
            console.log('📊 Estadísticas actualizadas:', stats);
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container') || document.body;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    ${this.getNotificationIcon(type)}
                </div>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-lucide="x" class="h-4 w-4"></i>
                </button>
            </div>
        `;

        container.appendChild(notification);

        // Mostrar notificación
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-remover
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);

        // Inicializar íconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '<i data-lucide="check-circle" class="h-5 w-5"></i>',
            error: '<i data-lucide="alert-circle" class="h-5 w-5"></i>',
            warning: '<i data-lucide="alert-triangle" class="h-5 w-5"></i>',
            info: '<i data-lucide="info" class="h-5 w-5"></i>'
        };
        return icons[type] || icons.info;
    }

    getFormatIcon(format) {
        const icons = {
            pdf: 'file-text',
            excel: 'file-spreadsheet',
            csv: 'file-bar-chart'
        };
        return icons[format] || 'file';
    }

    getTypeLabel(type) {
        const labels = {
            'technical-ticket': 'Informe Técnico',
            'tickets': 'Reporte de Tickets',
            'clients': 'Reporte de Clientes',
            'equipment': 'Reporte de Equipos',
            'inventory': 'Reporte de Inventario',
            'financial': 'Reporte Financiero'
        };
        return labels[type] || 'Reporte General';
    }

    getStatusLabel(status) {
        const labels = {
            completed: 'Completado',
            processing: 'Procesando',
            failed: 'Fallido'
        };
        return labels[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    selectReportType(type) {
        // Limpiar selección anterior
        document.querySelectorAll('.report-type-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Seleccionar nueva tarjeta
        const selectedCard = document.querySelector(`[data-type="${type}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            this.selectedReportType = type;
            this.openNewReportModal(type);
        }
    }

    openNewReportModal(preselectedType = null) {
        const modal = document.getElementById('new-report-modal');
        if (preselectedType) {
            const typeSelect = modal.querySelector('select[name="type"]');
            typeSelect.value = preselectedType;
        }
        this.openModal(modal);
    }

    openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    scheduleReport() {
        this.showNotification('Función de programación de reportes disponible próximamente', 'info');
    }

    showFilterModal() {
        this.showNotification('Filtros avanzados disponibles próximamente', 'info');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que estamos en la página de reportes
    if (document.getElementById('reports-history')) {
        window.reportsManager = new ReportsManager();
    }
});
