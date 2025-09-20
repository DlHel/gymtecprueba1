// reportes.js - Sistema completo de reportes y informes técnicos
// ✅ CRÍTICO: Verificación de autenticación HABILITADA
console.log('🔧 Inicializando módulo de reportes con autenticación...');

if (!window.authManager || !window.authManager.isAuthenticated()) {
    console.log('❌ Usuario no autenticado en reportes, redirigiendo a login...');
    window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
    throw new Error('Acceso no autorizado - Reportes');
}

console.log('✅ Usuario autenticado, cargando módulo de reportes...');

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
        console.log('🚀 Inicializando módulo de Reportes...');
        this.setupEventListeners();
        await this.loadInitialData();
        this.updateStatistics();
        console.log('✅ Módulo de Reportes inicializado');
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
            // Cargar datos necesarios
            await Promise.all([
                this.loadReportsHistory(),
                this.loadTickets(),
                this.loadTechnicians()
            ]);
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.showNotification('Error al cargar datos iniciales', 'error');
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
            console.error('Error cargando historial:', error);
            this.showNotification('Error al cargar historial de reportes', 'error');
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
        const totalReports = this.reports.length;
        const generatedToday = this.reports.filter(r => {
            const today = new Date().toDateString();
            const reportDate = new Date(r.created_at).toDateString();
            return today === reportDate;
        }).length;

        document.getElementById('total-reports').textContent = totalReports;
        document.getElementById('generated-today').textContent = generatedToday;
        document.getElementById('scheduled-reports').textContent = '0';
        document.getElementById('avg-generation-time').textContent = '2.3s';
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
            this.showNotification('Generando reporte...', 'info');
            
            // Simular generación de reporte
            await this.generateReport(reportData);
            
            this.closeModal(document.getElementById('new-report-modal'));
            this.showNotification('Reporte generado exitosamente', 'success');
            this.loadReportsHistory();
            
        } catch (error) {
            console.error('Error generando reporte:', error);
            this.showNotification('Error al generar el reporte', 'error');
        }
    }

    async generateReport(reportData) {
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
                throw new Error('Tipo de reporte no válido');
        }
    }

    async generateTechnicalReport(data) {
        if (!data.ticket_id) {
            throw new Error('Debe seleccionar un ticket');
        }

        const ticket = this.tickets.find(t => t.id == data.ticket_id);
        const technician = this.technicians.find(t => t.id == data.technician_id);
        
        if (data.format === 'pdf') {
            return this.generateTechnicalReportPDF(ticket, technician, data);
        }
        
        // Simular generación
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: Date.now(),
                    name: `Informe Técnico #${ticket.id}`,
                    type: 'Informe Técnico',
                    format: data.format.toUpperCase(),
                    status: 'completed',
                    created_at: new Date().toISOString(),
                    size: '2.1 MB'
                });
            }, 2000);
        });
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
        const report = this.reports.find(r => r.id === reportId);
        if (report && confirm(`¿Está seguro de eliminar "${report.name}"?`)) {
            this.reports = this.reports.filter(r => r.id !== reportId);
            this.renderReportsHistory();
            this.updateStatistics();
            this.showNotification('Reporte eliminado', 'success');
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