// reportes.js - Sistema completo de reportes y informes técnicos
// ✅ CRÍTICO: Verificación de autenticación TEMPORALMENTE DESHABILITADA
console.log('🔧 DEBUG: reportes.js - Verificación de autenticación deshabilitada temporalmente');
/*
if (!window.AuthManager || !AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
    throw new Error('Acceso no autorizado');
}
*/

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
            console.log('🚀 Inicializando módulo de Reportes...');
            this.setupEventListeners();
            this.initializeAnimations();
            await this.loadInitialData();
            this.updateStatistics();
            this.animateCounters();
            console.log('✅ Módulo de Reportes inicializado correctamente');
        } catch (error) {
            const errorId = `REP_INIT_${Date.now()}`;
            console.error(`❌ Error inicializando módulo de reportes [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showNotification(`Error al inicializar el módulo de reportes. Por favor recarga la página. (Ref: ${errorId})`, 'error');
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

    setupEventListeners() {
        // Botones principales
        document.getElementById('new-report-btn').addEventListener('click', () => this.openNewReportModal());
        document.getElementById('schedule-report-btn').addEventListener('click', () => this.scheduleReport());
        document.getElementById('refresh-reports').addEventListener('click', () => this.loadReportsHistory());
        document.getElementById('filter-reports').addEventListener('click', () => this.showFilterModal());

        // Modales
        document.querySelectorAll('.base-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.base-modal');
                if (modal) {
                    this.closeModal(modal);
                }
            });
        });

        document.querySelector('#new-report-modal .base-btn-cancel').addEventListener('click', () => {
            this.closeModal(document.getElementById('new-report-modal'));
        });

        document.querySelector('#new-report-modal .base-btn-secondary').addEventListener('click', () => {
            this.showPreview();
        });

        // Formulario de nuevo reporte
        document.getElementById('new-report-form').addEventListener('submit', (e) => this.handleReportSubmit(e));

        // Cambio de tipo de reporte
        document.querySelector('select[name="type"]').addEventListener('change', (e) => {
            this.handleReportTypeChange(e.target.value);
        });

        // Tarjetas de tipos de reportes
        document.querySelectorAll('.report-type-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectReportType(card.dataset.type);
            });
        });

        // Vista previa
        document.getElementById('confirm-generate').addEventListener('click', () => {
            this.generateReportFromPreview();
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
            // Cargar datos necesarios
            await Promise.all([
                this.loadReportsHistory(),
                this.loadTickets(),
                this.loadTechnicians()
            ]);

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
                this.loadReportsHistory(),
                this.loadTickets(),
                this.loadTechnicians()
            ]);
            console.log('✅ Datos iniciales cargados exitosamente');
        } catch (error) {
            const errorId = `REP_LOAD_INITIAL_${Date.now()}`;
            console.error(`❌ Error cargando datos iniciales [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showNotification(`Error al cargar datos iniciales. Por favor intenta nuevamente. (Ref: ${errorId})`, 'error');
        }
    }

    async loadReportsHistory() {
        try {
            // Simular carga de historial de reportes
            this.reports = [
                {
                    id: 1,
                    name: 'Informe Técnico #183',
                    type: 'Informe Técnico',
                    format: 'PDF',
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '2.3 MB'
                },
                {
                    id: 2,
                    name: 'Reporte de Tickets - Noviembre',
                    type: 'Reporte de Tickets',
                    format: 'Excel',
                    status: 'completed',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    size: '1.8 MB'
                },
                {
                    id: 3,
                    name: 'Análisis de Equipos Q4',
                    type: 'Reporte de Equipos',
                    format: 'PDF',
                    status: 'processing',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    size: 'Procesando...'
                }
            ];

            this.renderReportsHistory();
        } catch (error) {
            const errorId = `REP_LOAD_HISTORY_${Date.now()}`;
            console.error(`❌ Error cargando historial de reportes [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                user: AuthManager.getCurrentUser()?.username
            });

            this.showNotification(`Error al cargar historial de reportes. Por favor intenta nuevamente. (Ref: ${errorId})`, 'error');
        }
    }

    async loadTickets() {
        try {
            // Simular carga de tickets
            this.tickets = [
                { id: 183, title: 'Mantenimiento Preventivo Equipo A1', status: 'Resuelto', client: 'Gimnasio Central' },
                { id: 243, title: 'Reparación Motor Cinta B2', status: 'Resuelto', client: 'Fitness Plus' },
                { id: 258, title: 'Calibración Sistema Control', status: 'Resuelto', client: 'SportCenter' }
            ];

            this.populateTicketSelect();
        } catch (error) {
            console.error('Error cargando tickets:', error);
        }
    }

    async loadTechnicians() {
        try {
            // Simular carga de técnicos
            this.technicians = [
                { id: 1, name: 'Juan Pérez', email: 'juan.perez@gymtec.com' },
                { id: 2, name: 'María González', email: 'maria.gonzalez@gymtec.com' },
                { id: 3, name: 'Carlos Rodríguez', email: 'carlos.rodriguez@gymtec.com' }
            ];

            this.populateTechnicianSelect();
        } catch (error) {
            console.error('Error cargando técnicos:', error);
        }
    }

    populateTicketSelect() {
        const select = document.querySelector('select[name="ticket_id"]');
        select.innerHTML = '<option value="">Seleccionar ticket</option>';
        
        this.tickets.forEach(ticket => {
            const option = document.createElement('option');
            option.value = ticket.id;
            option.textContent = `#${ticket.id} - ${ticket.title}`;
            select.appendChild(option);
        });
    }

    populateTechnicianSelect() {
        const select = document.querySelector('select[name="technician_id"]');
        select.innerHTML = '<option value="">Seleccionar técnico</option>';
        
        this.technicians.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.id;
            option.textContent = tech.name;
            select.appendChild(option);
        });
    }

    renderReportsHistory() {
        const container = document.getElementById('reports-history');
        
        if (this.reports.length === 0) {
            container.innerHTML = `
                <div class="reports-empty-state">
                    <i data-lucide="file-text"></i>
                    <h3>No hay reportes generados</h3>
                    <p>Los reportes que generes aparecerán aquí</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = this.reports.map(report => `
            <div class="report-item">
                <div class="report-icon ${report.format.toLowerCase()}">
                    <i data-lucide="${this.getFormatIcon(report.format)}"></i>
                </div>
                
                <div class="report-info">
                    <div class="report-basic">
                        <div class="report-name">${report.name}</div>
                        <div class="report-type">${report.type} • ${report.size}</div>
                    </div>
                    
                    <div class="report-status ${report.status}">
                        ${this.getStatusText(report.status)}
                    </div>
                </div>
                
                <div class="report-meta">
                    <div>${this.formatDate(report.created_at)}</div>
                    <div>${this.formatTime(report.created_at)}</div>
                </div>
                
                <div class="report-actions">
                    ${report.status === 'completed' ? `
                        <button class="report-action-btn download" onclick="reportsManager.downloadReport(${report.id})" title="Descargar">
                            <i data-lucide="download"></i>
                        </button>
                        <button class="report-action-btn view" onclick="reportsManager.viewReport(${report.id})" title="Ver">
                            <i data-lucide="eye"></i>
                        </button>
                    ` : ''}
                    <button class="report-action-btn delete" onclick="reportsManager.deleteReport(${report.id})" title="Eliminar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Re-inicializar iconos
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    updateStatistics() {
        try {
            // Simular datos dinámicos para demostrar las mejoras visuales
            const stats = {
                totalReports: Math.max(47, this.reports.length),
                generatedToday: Math.max(8, this.reports.filter(r => {
                    const today = new Date().toDateString();
                    const reportDate = new Date(r.created_at).toDateString();
                    return today === reportDate;
                }).length),
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
            
            // Abrir modal con tipo preseleccionado
            this.openNewReportModal(type);
        }
    }

    openNewReportModal(preselectedType = null) {
        const modal = document.getElementById('new-report-modal');
        const form = document.getElementById('new-report-form');
        
        // Limpiar formulario
        form.reset();
        
        // Preseleccionar tipo si se proporciona
        if (preselectedType) {
            document.querySelector('select[name="type"]').value = preselectedType;
            this.handleReportTypeChange(preselectedType);
        }

        // Establecer fecha por defecto
        const today = new Date().toISOString().split('T')[0];
        document.querySelector('input[name="end_date"]').value = today;
        
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        document.querySelector('input[name="start_date"]').value = startDate.toISOString().split('T')[0];

        this.showModal(modal);
    }

    handleReportTypeChange(type) {
        const technicalSection = document.getElementById('technical-section');
        
        if (type === 'technical-ticket') {
            technicalSection.classList.remove('hidden');
        } else {
            technicalSection.classList.add('hidden');
        }
    }

    async handleReportSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const reportData = Object.fromEntries(formData.entries());

        try {
            console.log('📄 Generando reporte:', { type: reportData.type, format: reportData.format });
            this.showNotification('Generando reporte...', 'info');

            // Simular generación de reporte
            const report = await this.generateReport(reportData);

            this.closeModal(document.getElementById('new-report-modal'));
            this.showNotification('Reporte generado exitosamente', 'success');
            this.loadReportsHistory();

            console.log('✅ Reporte generado exitosamente:', {
                reportId: report.id,
                reportName: report.name,
                format: report.format
            });

        } catch (error) {
            const errorId = `REP_SUBMIT_${Date.now()}`;
            console.error(`❌ Error generando reporte [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                reportData,
                user: AuthManager.getCurrentUser()?.username
            });

            this.showNotification(`Error al generar el reporte. Por favor intenta nuevamente. (Ref: ${errorId})`, 'error');
        }
    }

    async generateReport(reportData) {
        try {
            console.log('🔧 Iniciando generación de reporte:', reportData.type);

            switch (reportData.type) {
                case 'technical-ticket':
                    return await this.generateTechnicalReport(reportData);
                case 'tickets':
                    return await this.generateTicketsReport(reportData);
                case 'clients':
                    return await this.generateClientsReport(reportData);
                case 'equipment':
                    return await this.generateEquipmentReport(reportData);
                case 'inventory':
                    return await this.generateInventoryReport(reportData);
                case 'financial':
                    return await this.generateFinancialReport(reportData);
                default:
                    throw new Error(`Tipo de reporte no válido: ${reportData.type}`);
            }
        } catch (error) {
            const errorId = `REP_GENERATE_${Date.now()}`;
            console.error(`❌ Error generando reporte [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                reportType: reportData.type,
                user: AuthManager.getCurrentUser()?.username
            });

            throw error; // Re-throw para que sea manejado por handleReportSubmit
        }
    }

    async generateTechnicalReport(data) {
        try {
            console.log('🔧 Generando reporte técnico:', { ticketId: data.ticket_id, technicianId: data.technician_id });

            if (!data.ticket_id) {
                throw new Error('Debe seleccionar un ticket');
            }

            const ticket = this.tickets.find(t => t.id == data.ticket_id);
            const technician = this.technicians.find(t => t.id == data.technician_id);

            if (!ticket) {
                throw new Error(`Ticket con ID ${data.ticket_id} no encontrado`);
            }

            if (data.format === 'pdf') {
                return this.generateTechnicalReportPDF(ticket, technician, data);
            }

            // Simular generación
            return new Promise(resolve => {
                setTimeout(() => {
                    const report = {
                        id: Date.now(),
                        name: `Informe Técnico #${ticket.id}`,
                        type: 'Informe Técnico',
                        format: data.format.toUpperCase(),
                        status: 'completed',
                        created_at: new Date().toISOString(),
                        size: '2.1 MB'
                    };
                    console.log('✅ Reporte técnico simulado generado:', report);
                    resolve(report);
                }, 2000);
            });
        } catch (error) {
            const errorId = `REP_TECH_REPORT_${Date.now()}`;
            console.error(`❌ Error generando reporte técnico [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                ticketId: data.ticket_id,
                technicianId: data.technician_id,
                user: AuthManager.getCurrentUser()?.username
            });

            throw error; // Re-throw para que sea manejado por generateReport
        }
    }

    generateTechnicalReportPDF(ticket, technician, data) {
        // ✅ CORREGIDO: Verificar existencia de jsPDF antes de usar destructuring
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error('❌ jsPDF library not loaded');
            alert('Error: jsPDF library is not available. Please refresh the page.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar fuentes
        doc.setFont('helvetica');
        
        // Header del documento
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('INFORME TÉCNICO', 105, 25, { align: 'center' });
        
        // Línea decorativa
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(2);
        doc.line(20, 30, 190, 30);
        
        // Información del reporte
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Informe N°: ${ticket.id}`, 20, 45);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 130, 45);
        doc.text(`Técnico: ${technician ? technician.name : 'No asignado'}`, 20, 55);
        doc.text(`Cliente: ${ticket.client}`, 130, 55);

        // Información del ticket
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('INFORMACIÓN DEL SERVICIO', 20, 75);
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 78, 190, 78);
        
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Ticket: #${ticket.id}`, 20, 90);
        doc.text(`Descripción: ${ticket.title}`, 20, 100);
        doc.text(`Estado: ${ticket.status}`, 20, 110);
        
        // Trabajo realizado
        if (data.work_description) {
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('TRABAJO REALIZADO', 20, 130);
            
            doc.line(20, 133, 190, 133);
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const workLines = doc.splitTextToSize(data.work_description, 170);
            doc.text(workLines, 20, 145);
        }
        
        // Observaciones
        if (data.observations) {
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('OBSERVACIONES', 20, 180);
            
            doc.line(20, 183, 190, 183);
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const obsLines = doc.splitTextToSize(data.observations, 170);
            doc.text(obsLines, 20, 195);
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Gymtec ERP - Sistema de Gestión Técnica', 105, 280, { align: 'center' });
        doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 105, 285, { align: 'center' });
        
        // Guardar el PDF
        doc.save(`Informe_Tecnico_${ticket.id}.pdf`);
        
        return Promise.resolve({
            id: Date.now(),
            name: `Informe Técnico #${ticket.id}`,
            type: 'Informe Técnico',
            format: 'PDF',
            status: 'completed',
            created_at: new Date().toISOString(),
            size: '2.1 MB'
        });
    }

    async generateTicketsReport(data) {
        // Simular generación de reporte de tickets
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Reporte de Tickets - ${this.getCurrentPeriodName(data.period)}`,
                    type: 'Reporte de Tickets',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '1.8 MB'
                });
            }, 1500);
        });
    }

    async generateClientsReport(data) {
        // Simular generación de reporte de clientes
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Reporte de Clientes - ${this.getCurrentPeriodName(data.period)}`,
                    type: 'Reporte de Clientes',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '3.2 MB'
                });
            }, 1800);
        });
    }

    async generateEquipmentReport(data) {
        // Simular generación de reporte de equipos
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Reporte de Equipos - ${this.getCurrentPeriodName(data.period)}`,
                    type: 'Reporte de Equipos',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '2.7 MB'
                });
            }, 2200);
        });
    }

    async generateInventoryReport(data) {
        // Simular generación de reporte de inventario
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Reporte de Inventario - ${this.getCurrentPeriodName(data.period)}`,
                    type: 'Reporte de Inventario',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '1.5 MB'
                });
            }, 1200);
        });
    }

    async generateFinancialReport(data) {
        // Simular generación de reporte financiero
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Reporte Financiero - ${this.getCurrentPeriodName(data.period)}`,
                    type: 'Reporte Financiero',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '4.1 MB'
                });
            }, 2500);
        });
    }

    showPreview() {
        const formData = new FormData(document.getElementById('new-report-form'));
        const data = Object.fromEntries(formData.entries());
        
        if (!data.type) {
            this.showNotification('Debe seleccionar un tipo de reporte', 'warning');
            return;
        }
        
        this.generatePreviewContent(data);
        this.showModal(document.getElementById('preview-modal'));
    }

    generatePreviewContent(data) {
        const container = document.getElementById('report-preview');
        const ticket = data.ticket_id ? this.tickets.find(t => t.id == data.ticket_id) : null;
        const technician = data.technician_id ? this.technicians.find(t => t.id == data.technician_id) : null;
        
        if (data.type === 'technical-ticket' && ticket) {
            container.innerHTML = `
                <div class="report-preview-header">
                    <h1 class="report-preview-title">INFORME TÉCNICO</h1>
                    <p class="report-preview-subtitle">Informe N° ${ticket.id}</p>
                </div>
                
                <div class="report-preview-info">
                    <div class="report-preview-field">
                        <div class="report-preview-label">Fecha</div>
                        <div class="report-preview-value">${new Date().toLocaleDateString('es-ES')}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Técnico</div>
                        <div class="report-preview-value">${technician ? technician.name : 'No asignado'}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Cliente</div>
                        <div class="report-preview-value">${ticket.client}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Estado</div>
                        <div class="report-preview-value">${ticket.status}</div>
                    </div>
                </div>
                
                <div class="report-preview-content">
                    <div class="report-preview-section">
                        <h3 class="report-preview-section-title">Información del Servicio</h3>
                        <p><strong>Ticket:</strong> #${ticket.id}</p>
                        <p><strong>Descripción:</strong> ${ticket.title}</p>
                    </div>
                    
                    ${data.work_description ? `
                        <div class="report-preview-section">
                            <h3 class="report-preview-section-title">Trabajo Realizado</h3>
                            <p>${data.work_description}</p>
                        </div>
                    ` : ''}
                    
                    ${data.observations ? `
                        <div class="report-preview-section">
                            <h3 class="report-preview-section-title">Observaciones</h3>
                            <p>${data.observations}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="report-preview-header">
                    <h1 class="report-preview-title">${this.getReportTypeTitle(data.type)}</h1>
                    <p class="report-preview-subtitle">${this.getCurrentPeriodName(data.period)}</p>
                </div>
                
                <div class="report-preview-info">
                    <div class="report-preview-field">
                        <div class="report-preview-label">Tipo</div>
                        <div class="report-preview-value">${this.getReportTypeTitle(data.type)}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Formato</div>
                        <div class="report-preview-value">${data.format.toUpperCase()}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Período</div>
                        <div class="report-preview-value">${this.getCurrentPeriodName(data.period)}</div>
                    </div>
                    <div class="report-preview-field">
                        <div class="report-preview-label">Fecha</div>
                        <div class="report-preview-value">${new Date().toLocaleDateString('es-ES')}</div>
                    </div>
                </div>
                
                <div class="report-preview-content">
                    <div class="report-preview-section">
                        <h3 class="report-preview-section-title">Contenido del Reporte</h3>
                        <p>Este reporte incluirá un análisis detallado de ${this.getReportTypeTitle(data.type).toLowerCase()} para el período seleccionado.</p>
                        ${data.include_charts ? '<p>• Gráficos y estadísticas visuales</p>' : ''}
                        ${data.include_images ? '<p>• Imágenes relacionadas</p>' : ''}
                        ${data.detailed_analysis ? '<p>• Análisis detallado y recomendaciones</p>' : ''}
                    </div>
                </div>
            `;
        }
    }

    generateReportFromPreview() {
        const formData = new FormData(document.getElementById('new-report-form'));
        this.closeModal(document.getElementById('preview-modal'));
        document.getElementById('new-report-form').dispatchEvent(new Event('submit'));
    }

    downloadReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (report) {
            this.showNotification(`Descargando ${report.name}...`, 'info');
            // Simular descarga
            setTimeout(() => {
                this.showNotification('Descarga completada', 'success');
            }, 1000);
        }
    }

    viewReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (report) {
            this.showNotification(`Abriendo ${report.name}...`, 'info');
            // Simular apertura
        }
    }

    deleteReport(reportId) {
        try {
            console.log(`🗑️ Eliminando reporte ID: ${reportId}`);
            const report = this.reports.find(r => r.id === reportId);

            if (!report) {
                throw new Error(`Reporte con ID ${reportId} no encontrado`);
            }

            if (confirm(`¿Está seguro de eliminar "${report.name}"?`)) {
                this.reports = this.reports.filter(r => r.id !== reportId);
                this.renderReportsHistory();
                this.updateStatistics();
                this.showNotification('Reporte eliminado exitosamente', 'success');
                console.log(`✅ Reporte ${reportId} eliminado exitosamente`);
            }
        } catch (error) {
            const errorId = `REP_DELETE_${Date.now()}`;
            console.error(`❌ Error eliminando reporte ${reportId} [${errorId}]:`, {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                reportId,
                user: AuthManager.getCurrentUser()?.username
            });

            this.showNotification(`Error al eliminar reporte. Por favor intenta nuevamente. (Ref: ${errorId})`, 'error');
        }
    }

    scheduleReport() {
        this.showNotification('Función de programación en desarrollo', 'info');
    }

    showFilterModal() {
        this.showNotification('Filtros en desarrollo', 'info');
    }

    // Utility methods
    getFormatIcon(format) {
        const icons = {
            'PDF': 'file-text',
            'Excel': 'file-spreadsheet',
            'CSV': 'file-text'
        };
        return icons[format] || 'file';
    }

    getStatusText(status) {
        const statuses = {
            'completed': 'Completado',
            'processing': 'Procesando',
            'failed': 'Error'
        };
        return statuses[status] || status;
    }

    getReportTypeTitle(type) {
        const types = {
            'technical-ticket': 'Informe Técnico',
            'tickets': 'Reporte de Tickets',
            'clients': 'Reporte de Clientes',
            'equipment': 'Reporte de Equipos',
            'inventory': 'Reporte de Inventario',
            'financial': 'Reporte Financiero'
        };
        return types[type] || type;
    }

    getCurrentPeriodName(period) {
        const periods = {
            'today': 'Hoy',
            'yesterday': 'Ayer',
            'this-week': 'Esta semana',
            'last-week': 'Semana pasada',
            'this-month': 'Este mes',
            'last-month': 'Mes pasado',
            'this-quarter': 'Este trimestre',
            'this-year': 'Este año',
            'custom': 'Personalizado'
        };
        return periods[period] || 'Sin especificar';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-ES');
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    showModal(modal) {
        modal.classList.add('active');
    }

    closeModal(modal) {
        modal.classList.remove('active');
    }

    showNotification(message, type) {
        console.log(`📢 Notificación ${type}:`, message);

        const notification = document.createElement('div');
        notification.className = `reports-alert ${type}`;
        notification.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
            <span>${message}</span>
        `;

        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(notification, main.firstChild);
        } else {
            document.body.appendChild(notification);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'reportes.html' || document.getElementById('reports-history')) {
        console.log('🚀 Inicializando Reports Manager...');
        
        // Inicializar iconos de Lucide primero
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Crear instancia del manager
        window.reportsManager = new ReportsManager();
    }
}); 