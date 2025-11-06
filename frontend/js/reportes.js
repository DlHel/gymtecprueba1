// reportes.js - Sistema completo de reportes y informes técnicos
// ✅ CRÍTICO: Verificación de autenticación HABILITADA según patrón @bitacora
console.log('🔒 Inicializando módulo de reportes con autenticación...');

document.addEventListener('DOMContentLoaded', function() {
    // CRÍTICO: Proteger página antes que nada
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en reportes, redirigiendo a login...');
        window.authManager.redirectToLogin();
        return;
    }

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
            console.log(' Inicializando módulo de Reportes...');
            this.setupEventListeners();
            await this.loadInitialData();
            this.updateStatistics();
            console.log(' Módulo de Reportes inicializado');
        }

        setupEventListeners() {
            // Verificar que los elementos existan antes de agregar listeners
            const newReportBtn = document.getElementById('new-report-btn');
            if (newReportBtn) {
                newReportBtn.addEventListener('click', () => this.openNewReportModal());
            }

            const scheduleReportBtn = document.getElementById('schedule-report-btn');
            if (scheduleReportBtn) {
                scheduleReportBtn.addEventListener('click', () => this.scheduleReport());
            }

            const refreshReports = document.getElementById('refresh-reports');
            if (refreshReports) {
                refreshReports.addEventListener('click', () => this.loadReportsHistory());
            }

            const filterReports = document.getElementById('filter-reports');
            if (filterReports) {
                filterReports.addEventListener('click', () => this.showFilterModal());
            }

            // Modales
            document.querySelectorAll('.base-modal-close').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.base-modal');
                    if (modal) {
                        this.closeModal(modal);
                    }
                });
            });

            // Formulario de nuevo reporte
            const newReportForm = document.getElementById('new-report-form');
            if (newReportForm) {
                newReportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
            }

            // Cambio de tipo de reporte
            const typeSelect = document.querySelector('select[name="type"]');
            if (typeSelect) {
                typeSelect.addEventListener('change', (e) => {
                    this.handleReportTypeChange(e.target.value);
                });
            }

            // Click en cards de tipo de reporte (compactas)
            document.querySelectorAll('.report-type-card-compact').forEach(card => {
                card.addEventListener('click', () => {
                    const type = card.dataset.type;
                    console.log('📊 Generando reporte tipo:', type);
                    
                    switch(type) {
                        case 'technical-ticket':
                            this.openInformeTecnicoModal();
                            break;
                        case 'tickets-monthly':
                            this.generateTicketsMonthlyReport();
                            break;
                        case 'clients-report':
                            this.generateClientsReport();
                            break;
                        case 'equipment-report':
                            this.generateEquipmentReport();
                            break;
                        case 'maintenance-report':
                            this.generateMaintenanceReport();
                            break;
                        case 'financial-report':
                            this.generateFinancialReport();
                            break;
                        default:
                            this.showNotification('Tipo de reporte no implementado', 'warning');
                    }
                });
            });

            // DEPRECATED: Click en cards antiguas (por compatibilidad)
            document.querySelectorAll('.report-type-card').forEach(card => {
                card.addEventListener('click', () => {
                    const type = card.dataset.type;
                    if (type === 'technical-ticket') {
                        this.openInformeTecnicoModal();
                    } else {
                        this.openNewReportModal(type);
                    }
                });
            });

            // Modal de Informe Técnico
            const informeTicketSelect = document.getElementById('informe-ticket-select');
            if (informeTicketSelect) {
                informeTicketSelect.addEventListener('change', (e) => this.onInformeTicketChange(e.target.value));
            }

            const generateInformeBtn = document.getElementById('generate-informe-btn');
            if (generateInformeBtn) {
                generateInformeBtn.addEventListener('click', () => this.handleGenerateInforme());
            }

            // Cerrar modales al hacer clic fuera
            window.addEventListener('click', (e) => {
                if (e.target.classList.contains('base-modal')) {
                    this.closeModal(e.target);
                }
            });
        }

        async loadInitialData() {
            try {
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
                this.reports = [
                    {
                        id: 1,
                        name: 'Informe Técnico #183',
                        type: 'Informe Técnico',
                        format: 'PDF',
                        status: 'completed',
                        created_at: new Date().toISOString(),
                        size: '2.3 MB',
                        ticketId: 1  // Agregar ticketId para cargar datos reales
                    },
                    {
                        id: 2,
                        name: 'Reporte de Tickets - Noviembre',
                        type: 'Reporte de Tickets',
                        format: 'Excel',
                        status: 'completed',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        size: '1.8 MB'
                    }
                ];

                this.renderReportsHistory();
            } catch (error) {
                console.error('Error cargando historial de reportes:', error);
            }
        }

        async loadTickets() {
            try {
                const response = await authenticatedFetch(`${API_URL}/tickets`);
                if (response && response.ok) {
                    const result = await response.json();
                    this.tickets = result.data || [];
                } else {
                    this.tickets = [
                        { id: 183, title: 'Mantenimiento Preventivo Equipo A1', status: 'Resuelto', client: 'Gimnasio Central' },
                        { id: 243, title: 'Reparación Motor Cinta B2', status: 'Resuelto', client: 'Fitness Plus' }
                    ];
                }
                this.populateTicketSelect();
            } catch (error) {
                console.error('Error cargando tickets:', error);
                this.tickets = [
                    { id: 183, title: 'Mantenimiento Preventivo Equipo A1', status: 'Resuelto', client: 'Gimnasio Central' }
                ];
                this.populateTicketSelect();
            }
        }

        async loadTechnicians() {
            try {
                const response = await authenticatedFetch(`${API_URL}/users?role=technician`);
                if (response && response.ok) {
                    const result = await response.json();
                    this.technicians = result.data || [];
                } else {
                    this.technicians = [
                        { id: 1, name: 'Juan Pérez', email: 'juan.perez@gymtec.com' },
                        { id: 2, name: 'María González', email: 'maria.gonzalez@gymtec.com' }
                    ];
                }
                this.populateTechnicianSelect();
            } catch (error) {
                console.error('Error cargando técnicos:', error);
                this.technicians = [
                    { id: 1, name: 'Juan Pérez', email: 'juan.perez@gymtec.com' }
                ];
                this.populateTechnicianSelect();
            }
        }

        populateTicketSelect() {
            const select = document.querySelector('select[name="ticket_id"]');
            if (select) {
                select.innerHTML = '<option value="">Seleccionar ticket...</option>';
                this.tickets.forEach(ticket => {
                    const option = document.createElement('option');
                    option.value = ticket.id;
                    option.textContent = `#${ticket.id} - ${ticket.title}`;
                    select.appendChild(option);
                });
            }
        }

        populateTechnicianSelect() {
            const select = document.querySelector('select[name="technician_id"]');
            if (select) {
                select.innerHTML = '<option value="">Seleccionar técnico...</option>';
                this.technicians.forEach(technician => {
                    const option = document.createElement('option');
                    option.value = technician.id;
                    option.textContent = technician.name;
                    select.appendChild(option);
                });
            }
        }

        renderReportsHistory() {
            const container = document.getElementById('reports-history');
            if (!container) return;

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
                            <div class="report-type">${report.type}  ${report.size}</div>
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

            if (window.lucide) window.lucide.createIcons();
        }

        updateStatistics() {
            const totalReports = this.reports.length;
            const completedReports = this.reports.filter(r => r.status === 'completed').length;
            const processingReports = this.reports.filter(r => r.status === 'processing').length;

            const totalEl = document.getElementById('total-reports');
            const completedEl = document.getElementById('completed-reports');
            const processingEl = document.getElementById('processing-reports');

            if (totalEl) totalEl.textContent = totalReports;
            if (completedEl) completedEl.textContent = completedReports;
            if (processingEl) processingEl.textContent = processingReports;
        }

        handleReportTypeChange(type) {
            const technicalSection = document.getElementById('technical-section');
            if (technicalSection) {
                if (type === 'technical-ticket') {
                    technicalSection.classList.remove('hidden');
                } else {
                    technicalSection.classList.add('hidden');
                }
            }
        }

        async handleReportSubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const reportData = Object.fromEntries(formData.entries());
            
            try {
                this.showNotification('Generando reporte...', 'info');
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
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        id: Date.now(),
                        name: `Reporte - ${new Date().toLocaleDateString()}`,
                        type: 'Reporte General',
                        format: 'PDF',
                        status: 'completed',
                        created_at: new Date().toISOString(),
                        size: '2.1 MB'
                    });
                }, 1500);
            });
        }

        openNewReportModal() {
            const modal = document.getElementById('new-report-modal');
            if (modal) {
                this.showModal(modal);
            }
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

        formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('es-ES');
        }

        formatTime(dateString) {
            return new Date(dateString).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        downloadReport(reportId) {
            const report = this.reports.find(r => r.id === reportId);
            if (report) {
                this.showNotification(`Descargando ${report.name}...`, 'info');
                setTimeout(() => {
                    this.showNotification('Descarga completada', 'success');
                }, 1000);
            }
        }

        viewReport(reportId) {
            const report = this.reports.find(r => r.id === reportId);
            if (report) {
                this.showNotification(`Abriendo ${report.name}...`, 'info');
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

        // ==========================================
        // MÉTODOS PARA INFORMES TÉCNICOS
        // ==========================================

        async openInformeTecnicoModal() {
            console.log('📄 Abriendo modal de informe técnico');
            const modal = document.getElementById('informe-tecnico-modal');
            if (!modal) {
                console.error('Modal de informe técnico no encontrado');
                return;
            }

            // Cargar tickets completados
            await this.loadCompletedTickets();
            
            // Mostrar modal
            modal.classList.add('active');
            
            // Reinicializar iconos de Lucide
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        async loadCompletedTickets() {
            try {
                const response = await authenticatedFetch(`${API_URL}/tickets?status=completed,closed`);
                
                if (!response || !response.ok) {
                    throw new Error('Error al cargar tickets');
                }

                const result = await response.json();
                const tickets = result.data || [];

                const select = document.getElementById('informe-ticket-select');
                if (!select) return;

                // Limpiar opciones existentes
                select.innerHTML = '<option value="">Seleccionar ticket completado...</option>';

                // Agregar tickets
                tickets.forEach(ticket => {
                    const option = document.createElement('option');
                    option.value = ticket.id;
                    option.textContent = `#${ticket.id} - ${ticket.title} (${ticket.client_name || 'Sin cliente'})`;
                    select.appendChild(option);
                });

                console.log(`✅ Cargados ${tickets.length} tickets completados`);

            } catch (error) {
                console.error('Error cargando tickets:', error);
                this.showNotification('Error al cargar tickets completados', 'error');
            }
        }

        async onInformeTicketChange(ticketId) {
            const previewSection = document.getElementById('informe-preview');
            const generateBtn = document.getElementById('generate-informe-btn');

            if (!ticketId) {
                previewSection?.classList.add('hidden');
                generateBtn?.setAttribute('disabled', 'true');
                return;
            }

            try {
                console.log(`📄 Cargando datos del ticket ${ticketId}`);
                
                // Cargar datos del ticket para preview
                const response = await authenticatedFetch(`${API_URL}/tickets/${ticketId}/informe-data`);
                
                if (!response || !response.ok) {
                    throw new Error('Error al cargar datos del ticket');
                }

                const result = await response.json();
                
                if (result.message === 'success' && result.data) {
                    this.currentInformeData = result.data;
                    this.renderInformePreview(result.data);
                    previewSection?.classList.remove('hidden');
                    generateBtn?.removeAttribute('disabled');
                } else {
                    throw new Error('Datos inválidos recibidos');
                }

            } catch (error) {
                console.error('Error:', error);
                this.showNotification('Error al cargar datos del ticket', 'error');
                previewSection?.classList.add('hidden');
                generateBtn?.setAttribute('disabled', 'true');
            }
        }

        renderInformePreview(data) {
            const { ticket, comments, photos } = data;

            // Extraer comentarios etiquetados
            const contenido = this.extractTaggedCommentsPreview(comments);

            // Renderizar resumen
            const resumenEl = document.getElementById('informe-resumen');
            if (resumenEl) {
                resumenEl.innerHTML = `
                    <div class="grid grid-cols-2 gap-2">
                        <div><strong>Ticket:</strong> #${ticket.id}</div>
                        <div><strong>Cliente:</strong> ${ticket.client_name || 'N/A'}</div>
                        <div><strong>Equipo:</strong> ${ticket.equipment_model || 'N/A'}</div>
                        <div><strong>Ubicación:</strong> ${ticket.location_name || 'N/A'}</div>
                        <div><strong>Técnico:</strong> ${ticket.technician_name || 'N/A'}</div>
                        <div><strong>Prioridad:</strong> ${ticket.priority || 'Media'}</div>
                    </div>
                `;
            }

            // Renderizar cada sección
            this.renderSection('informe-diagnostico', contenido.diagnostico);
            this.renderSection('informe-trabajo', contenido.trabajo);
            this.renderSection('informe-solucion', contenido.solucion);
            this.renderSection('informe-recomendaciones', contenido.recomendaciones);

            // Renderizar comentario de cierre
            const cierreSection = document.getElementById('informe-cierre-section');
            const cierreEl = document.getElementById('informe-cierre');
            if (contenido.cierre) {
                cierreEl.textContent = contenido.cierre;
                cierreSection?.classList.remove('hidden');
            } else {
                cierreSection?.classList.add('hidden');
            }

            // Renderizar fotos
            const fotosSection = document.getElementById('informe-fotos-section');
            const fotosEl = document.getElementById('informe-fotos');
            const fotosCountEl = document.getElementById('informe-fotos-count');
            
            if (photos && photos.length > 0) {
                fotosCountEl.textContent = photos.length;
                fotosEl.innerHTML = photos.slice(0, 8).map(photo => `
                    <img src="${photo.photo_base64}" alt="Foto" class="w-full h-20 object-cover rounded border border-gray-300">
                `).join('');
                fotosSection?.classList.remove('hidden');
            } else {
                fotosSection?.classList.add('hidden');
            }

            // Mostrar advertencia si no hay comentarios etiquetados
            const warningEl = document.getElementById('informe-warning');
            const hasContent = contenido.diagnostico.length > 0 || 
                              contenido.trabajo.length > 0 || 
                              contenido.solucion.length > 0 || 
                              contenido.cierre;
            
            if (!hasContent && warningEl) {
                warningEl.classList.remove('hidden');
            } else if (warningEl) {
                warningEl.classList.add('hidden');
            }

            // Reinicializar iconos
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }

        renderSection(elementId, items) {
            const sectionId = elementId + '-section';
            const section = document.getElementById(sectionId);
            const list = document.getElementById(elementId);

            if (!section || !list) return;

            if (Array.isArray(items) && items.length > 0) {
                list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
                section.classList.remove('hidden');
            } else if (typeof items === 'string' && items) {
                list.innerHTML = `<li>${items}</li>`;
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        }

        extractTaggedCommentsPreview(comments) {
            const contenido = {
                diagnostico: [],
                trabajo: [],
                solucion: [],
                recomendaciones: [],
                cierre: null
            };

            if (!Array.isArray(comments)) return contenido;

            comments.forEach(comment => {
                const texto = comment.comment_text || '';

                if (texto.includes('#diagnostico')) {
                    const clean = texto.replace('#diagnostico', '').trim();
                    if (clean) contenido.diagnostico.push(clean);
                }
                if (texto.includes('#trabajo')) {
                    const clean = texto.replace('#trabajo', '').trim();
                    if (clean) contenido.trabajo.push(clean);
                }
                if (texto.includes('#solucion')) {
                    const clean = texto.replace('#solucion', '').trim();
                    if (clean) contenido.solucion.push(clean);
                }
                if (texto.includes('#recomendacion')) {
                    const clean = texto.replace('#recomendacion', '').trim();
                    if (clean) contenido.recomendaciones.push(clean);
                }
                if (texto.includes('#cierre')) {
                    const clean = texto.replace('#cierre', '').trim();
                    if (clean) contenido.cierre = clean;
                }
            });

            return contenido;
        }

        async handleGenerateInforme() {
            const ticketSelect = document.getElementById('informe-ticket-select');
            const notasTextarea = document.getElementById('informe-notas-adicionales');
            
            if (!ticketSelect || !ticketSelect.value) {
                this.showNotification('Por favor selecciona un ticket', 'warning');
                return;
            }

            const ticketId = parseInt(ticketSelect.value);
            const notasAdicionales = notasTextarea?.value || '';

            try {
                console.log(`📄 Generando informe para ticket ${ticketId}`);
                this.showNotification('Generando informe PDF...', 'info');

                // Si tenemos informes-tecnicos.js cargado, usar su método
                if (this.generateInformeTecnico) {
                    // Agregar notas adicionales al data
                    if (this.currentInformeData) {
                        this.currentInformeData.notasAdicionales = notasAdicionales;
                    }
                    
                    await this.generateInformeTecnico(ticketId);
                } else {
                    console.error('Módulo de informes técnicos no cargado');
                    this.showNotification('Error: Módulo no disponible', 'error');
                    return;
                }

                // Cerrar modal
                const modal = document.getElementById('informe-tecnico-modal');
                this.closeModal(modal);

                // Limpiar formulario
                ticketSelect.value = '';
                if (notasTextarea) notasTextarea.value = '';
                document.getElementById('informe-preview')?.classList.add('hidden');

            } catch (error) {
                console.error('Error generando informe:', error);
                this.showNotification('Error al generar informe: ' + error.message, 'error');
            }
        }

        // ============ GENERADORES DE REPORTES ============

        async generateTicketsMonthlyReport() {
            // Mostrar modal con opciones de reporte
            this.showTicketsReportOptionsModal();
        }

        async showTicketsReportOptionsModal() {
            try {
                // Obtener lista de clientes para el selector
                const response = await window.authManager.authenticatedFetch(`${window.API_URL}/clients`);
                const result = await response.json();
                const clients = result.data || [];

                const modal = document.createElement('div');
                modal.id = 'tickets-report-options-modal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;

                modal.innerHTML = `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            padding: 20px;
                            border-bottom: 1px solid #e0e0e0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        ">
                            <h2 style="margin: 0; color: white; display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="calendar" style="width: 24px; height: 24px;"></i>
                                Opciones de Reporte de Tickets
                            </h2>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                                Personaliza tu reporte seleccionando las opciones
                            </p>
                        </div>
                        
                        <div style="flex: 1; overflow-y: auto; padding: 24px;">
                            
                            <!-- Tipo de Reporte -->
                            <div style="margin-bottom: 24px;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937;">
                                    <i data-lucide="file-text" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                    Tipo de Reporte
                                </label>
                                <select id="ticket-report-type" style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    cursor: pointer;
                                ">
                                    <option value="single">Informe de Ticket Individual</option>
                                    <option value="general" selected>Reporte General de Tickets</option>
                                    <option value="by-client">Reporte Agrupado por Cliente</option>
                                </select>
                                <small style="color: #6b7280; margin-top: 4px; display: block;">
                                    Selecciona el tipo de informe que deseas generar
                                </small>
                            </div>

                            <!-- Ticket Individual (solo si tipo = single) -->
                            <div id="single-ticket-section" style="margin-bottom: 24px; display: none;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937;">
                                    <i data-lucide="hash" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                    Número de Ticket
                                </label>
                                <input type="number" id="single-ticket-id" placeholder="Ej: 183" style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                ">
                            </div>

                            <!-- Período -->
                            <div style="margin-bottom: 24px;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937;">
                                    <i data-lucide="calendar-range" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                    Período
                                </label>
                                <select id="ticket-report-period" style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    cursor: pointer;
                                ">
                                    <option value="current-month" selected>Mes Actual</option>
                                    <option value="last-month">Mes Anterior</option>
                                    <option value="current-quarter">Trimestre Actual</option>
                                    <option value="last-quarter">Trimestre Anterior</option>
                                    <option value="current-year">Año Actual</option>
                                    <option value="last-year">Año Anterior</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                            </div>

                            <!-- Fechas Personalizadas -->
                            <div id="custom-dates-section" style="margin-bottom: 24px; display: none;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    <div>
                                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937; font-size: 13px;">
                                            Fecha Inicio
                                        </label>
                                        <input type="date" id="ticket-report-start-date" style="
                                            width: 100%;
                                            padding: 10px;
                                            border: 2px solid #e5e7eb;
                                            border-radius: 8px;
                                            font-size: 14px;
                                        ">
                                    </div>
                                    <div>
                                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937; font-size: 13px;">
                                            Fecha Fin
                                        </label>
                                        <input type="date" id="ticket-report-end-date" style="
                                            width: 100%;
                                            padding: 10px;
                                            border: 2px solid #e5e7eb;
                                            border-radius: 8px;
                                            font-size: 14px;
                                        ">
                                    </div>
                                </div>
                            </div>

                            <!-- Cliente (solo si tipo = by-client) -->
                            <div id="client-filter-section" style="margin-bottom: 24px; display: none;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937;">
                                    <i data-lucide="users" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                    Cliente (Opcional)
                                </label>
                                <select id="ticket-report-client" style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    cursor: pointer;
                                ">
                                    <option value="">Todos los clientes</option>
                                    ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                                </select>
                                <small style="color: #6b7280; margin-top: 4px; display: block;">
                                    Deja en blanco para incluir todos los clientes
                                </small>
                            </div>

                            <!-- Estado -->
                            <div style="margin-bottom: 24px;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1f2937;">
                                    <i data-lucide="filter" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i>
                                    Estado de Tickets
                                </label>
                                <select id="ticket-report-status" style="
                                    width: 100%;
                                    padding: 10px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    cursor: pointer;
                                ">
                                    <option value="all" selected>Todos los estados</option>
                                    <option value="open">Solo Abiertos</option>
                                    <option value="in_progress">En Progreso</option>
                                    <option value="completed">Completados</option>
                                    <option value="cancelled">Cancelados</option>
                                </select>
                            </div>

                        </div>
                        
                        <div style="
                            padding: 20px;
                            border-top: 1px solid #e0e0e0;
                            display: flex;
                            gap: 10px;
                            justify-content: flex-end;
                            background: #f9fafb;
                        ">
                            <button onclick="document.getElementById('tickets-report-options-modal').remove()" style="
                                padding: 10px 20px;
                                border: 1px solid #ddd;
                                background: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                                Cancelar
                            </button>
                            <button id="generate-tickets-report-btn" style="
                                padding: 10px 24px;
                                border: none;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 600;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i data-lucide="download" style="width: 16px; height: 16px;"></i>
                                Generar Reporte
                            </button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Animación de entrada
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 10);

                // Inicializar iconos de Lucide
                if (window.lucide) {
                    window.lucide.createIcons();
                }

                // Event listeners para mostrar/ocultar secciones
                const reportTypeSelect = document.getElementById('ticket-report-type');
                const periodSelect = document.getElementById('ticket-report-period');
                const singleTicketSection = document.getElementById('single-ticket-section');
                const customDatesSection = document.getElementById('custom-dates-section');
                const clientFilterSection = document.getElementById('client-filter-section');

                reportTypeSelect.addEventListener('change', (e) => {
                    if (e.target.value === 'single') {
                        singleTicketSection.style.display = 'block';
                        clientFilterSection.style.display = 'none';
                    } else if (e.target.value === 'by-client') {
                        singleTicketSection.style.display = 'none';
                        clientFilterSection.style.display = 'block';
                    } else {
                        singleTicketSection.style.display = 'none';
                        clientFilterSection.style.display = 'none';
                    }
                });

                periodSelect.addEventListener('change', (e) => {
                    customDatesSection.style.display = e.target.value === 'custom' ? 'block' : 'none';
                });

                // Event listener del botón generar
                document.getElementById('generate-tickets-report-btn').addEventListener('click', () => {
                    this.executeTicketsReport();
                });

            } catch (error) {
                console.error('Error mostrando modal:', error);
                this.showNotification('Error al cargar opciones: ' + error.message, 'error');
            }
        }

        async executeTicketsReport() {
            const reportType = document.getElementById('ticket-report-type').value;
            const period = document.getElementById('ticket-report-period').value;
            const status = document.getElementById('ticket-report-status').value;
            const clientId = document.getElementById('ticket-report-client')?.value;
            const singleTicketId = document.getElementById('single-ticket-id')?.value;

            // Cerrar modal
            document.getElementById('tickets-report-options-modal').remove();

            // Validaciones
            if (reportType === 'single' && !singleTicketId) {
                this.showNotification('Por favor ingresa el número de ticket', 'warning');
                return;
            }

            this.showNotification('Generando reporte...', 'info');

            try {
                if (reportType === 'single') {
                    // Reporte de ticket individual (ya existe en downloadReport)
                    await this.downloadReport(singleTicketId);
                } else {
                    // Reporte general o por cliente
                    await this.generateTicketsReportPDF(reportType, period, status, clientId);
                }
            } catch (error) {
                console.error('Error generando reporte:', error);
                this.showNotification('Error al generar reporte: ' + error.message, 'error');
            }
        }

        async generateTicketsReportPDF(reportType, period, status, clientId) {
            // Obtener tickets
            const response = await window.authManager.authenticatedFetch(`${window.API_URL}/tickets`);
            if (!response.ok) throw new Error('Error al obtener tickets');
            
            const result = await response.json();
            let tickets = result.data || [];

            // Filtrar por período
            const { startDate, endDate, periodName } = this.calculatePeriodDates(period);
            tickets = tickets.filter(t => {
                const ticketDate = new Date(t.created_at);
                return ticketDate >= startDate && ticketDate <= endDate;
            });

            // Filtrar por estado
            if (status !== 'all') {
                tickets = tickets.filter(t => t.status === status);
            }

            // Filtrar por cliente si es necesario
            if (clientId) {
                tickets = tickets.filter(t => t.client_id == clientId);
            }

            // Si es por cliente, obtener detalles completos de cada ticket
            if (reportType === 'by-client') {
                await this.generateDetailedClientReport(tickets, periodName, clientId);
            } else {
                await this.generateSimpleTicketsReport(tickets, periodName);
            }
        }

        async generateSimpleTicketsReport(tickets, periodName) {
            // Generar PDF simple (el código anterior)
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('REPORTE DE TICKETS', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(periodName, 105, 30, { align: 'center' });

            let yPos = 55;

            // Estadísticas
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen General', 20, yPos);
            yPos += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Total de tickets: ${tickets.length}`, 25, yPos);
            yPos += 6;

            const completados = tickets.filter(t => t.status === 'completed').length;
            doc.text(`Completados: ${completados} (${tickets.length ? Math.round(completados/tickets.length*100) : 0}%)`, 25, yPos);
            yPos += 6;

            const enProgreso = tickets.filter(t => t.status === 'in_progress').length;
            doc.text(`En progreso: ${enProgreso}`, 25, yPos);
            yPos += 6;

            const abiertos = tickets.filter(t => t.status === 'open').length;
            doc.text(`Abiertos: ${abiertos}`, 25, yPos);
            yPos += 15;

            // Listado general
            doc.setFont('helvetica', 'bold');
            doc.text('Listado de Tickets', 20, yPos);
            yPos += 8;

            tickets.slice(0, 30).forEach(ticket => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text(`#${ticket.id} - ${ticket.title.substring(0, 65)}`, 25, yPos);
                yPos += 5;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`${ticket.client_name || 'Sin cliente'} | Estado: ${ticket.status} | ${this.formatDate(ticket.created_at)}`, 25, yPos);
                yPos += 8;
            });

            if (tickets.length > 30) {
                doc.setTextColor(128, 128, 128);
                doc.text(`... y ${tickets.length - 30} tickets más`, 25, yPos);
            }

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(20, 282, 190, 282);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
                doc.text(`Gymtec ERP - ${new Date().toLocaleDateString('es-ES')}`, 105, 292, { align: 'center' });
            }

            const filename = `reporte_tickets_general_${Date.now()}.pdf`;
            doc.save(filename);
            this.showNotification('Reporte generado exitosamente', 'success');
        }

        async generateDetailedClientReport(tickets, periodName, clientId) {
            this.showNotification('Cargando detalles de tickets...', 'info');

            // Agrupar por cliente
            const ticketsByClient = {};
            tickets.forEach(t => {
                const clientName = t.client_name || 'Sin cliente';
                if (!ticketsByClient[clientName]) {
                    ticketsByClient[clientName] = [];
                }
                ticketsByClient[clientName].push(t);
            });

            // Obtener detalles completos de cada ticket (notas y fotos)
            const ticketsWithDetails = [];
            for (const ticket of tickets) {
                try {
                    const detailResponse = await window.authManager.authenticatedFetch(
                        `${window.API_URL}/tickets/${ticket.id}/detail`
                    );
                    if (detailResponse.ok) {
                        const detailResult = await detailResponse.json();
                        ticketsWithDetails.push(detailResult.data);
                    } else {
                        ticketsWithDetails.push(ticket);
                    }
                } catch (error) {
                    console.warn(`No se pudo cargar detalle del ticket ${ticket.id}`, error);
                    ticketsWithDetails.push(ticket);
                }
            }

            // Generar PDF detallado
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // ============ PÁGINA 1: RESUMEN EJECUTIVO ============
            // Header
            doc.setFillColor(102, 126, 234);
            doc.rect(0, 0, 210, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORME DETALLADO', 105, 20, { align: 'center' });
            doc.setFontSize(16);
            doc.text('DE TICKETS POR CLIENTE', 105, 30, { align: 'center' });
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(periodName, 105, 38, { align: 'center' });

            let yPos = 60;

            // Resumen por cliente
            for (const [clientName, clientTickets] of Object.entries(ticketsByClient)) {
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }

                // Nombre del cliente con fondo
                doc.setFillColor(240, 240, 255);
                doc.rect(15, yPos - 5, 180, 12, 'F');
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(102, 126, 234);
                doc.text(clientName, 20, yPos + 3);
                yPos += 15;

                // Estadísticas del cliente
                const clientCompleted = clientTickets.filter(t => t.status === 'completed').length;
                const clientInProgress = clientTickets.filter(t => t.status === 'in_progress').length;
                const clientOpen = clientTickets.filter(t => t.status === 'open').length;
                const clientCancelled = clientTickets.filter(t => t.status === 'cancelled').length;

                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                // Grid de estadísticas
                const statY = yPos;
                doc.setFont('helvetica', 'bold');
                doc.text('Total:', 25, statY);
                doc.setFont('helvetica', 'normal');
                doc.text(String(clientTickets.length), 50, statY);

                doc.setFont('helvetica', 'bold');
                doc.text('Completados:', 70, statY);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(34, 197, 94);
                doc.text(String(clientCompleted), 110, statY);

                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('En Progreso:', 130, statY);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(234, 179, 8);
                doc.text(String(clientInProgress), 165, statY);

                yPos += 7;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('Abiertos:', 25, yPos);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(59, 130, 246);
                doc.text(String(clientOpen), 50, yPos);

                if (clientCancelled > 0) {
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Cancelados:', 70, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(239, 68, 68);
                    doc.text(String(clientCancelled), 110, yPos);
                }

                yPos += 12;
                doc.setTextColor(0, 0, 0);
            }

            // ============ PÁGINAS SIGUIENTES: DETALLE DE CADA TICKET ============
            for (const [clientName, clientTickets] of Object.entries(ticketsByClient)) {
                // Nueva página para cada cliente
                doc.addPage();
                yPos = 20;

                // Header del cliente
                doc.setFillColor(102, 126, 234);
                doc.rect(0, 0, 210, 30, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text(clientName, 105, 12, { align: 'center' });
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`Detalle de ${clientTickets.length} tickets`, 105, 22, { align: 'center' });

                yPos = 40;

                // Iterar cada ticket del cliente
                for (const ticket of clientTickets) {
                    const ticketDetails = ticketsWithDetails.find(t => t.id === ticket.id) || ticket;

                    // Verificar espacio para el ticket
                    if (yPos > 200) {
                        doc.addPage();
                        yPos = 20;
                    }

                    // === HEADER DEL TICKET ===
                    doc.setDrawColor(102, 126, 234);
                    doc.setLineWidth(0.5);
                    doc.line(20, yPos, 190, yPos);
                    yPos += 6;

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(102, 126, 234);
                    doc.text(`Ticket #${ticket.id}`, 20, yPos);
                    
                    // Badge de estado
                    const statusColors = {
                        'completed': [34, 197, 94],
                        'in_progress': [234, 179, 8],
                        'open': [59, 130, 246],
                        'cancelled': [239, 68, 68]
                    };
                    const statusTexts = {
                        'completed': 'Completado',
                        'in_progress': 'En Progreso',
                        'open': 'Abierto',
                        'cancelled': 'Cancelado'
                    };
                    const color = statusColors[ticket.status] || [128, 128, 128];
                    doc.setFillColor(...color);
                    doc.roundedRect(160, yPos - 4, 28, 6, 2, 2, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.text(statusTexts[ticket.status] || ticket.status, 174, yPos, { align: 'center' });
                    
                    yPos += 7;

                    // Título del ticket
                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    const titleLines = doc.splitTextToSize(ticket.title || 'Sin título', 165);
                    titleLines.forEach(line => {
                        doc.text(line, 20, yPos);
                        yPos += 5;
                    });

                    yPos += 2;

                    // Información básica
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Fecha: ${this.formatDate(ticket.created_at)}`, 20, yPos);
                    if (ticket.priority) {
                        doc.text(`| Prioridad: ${ticket.priority}`, 70, yPos);
                    }
                    if (ticket.assigned_technician) {
                        doc.text(`| Técnico: ${ticket.assigned_technician}`, 120, yPos);
                    }
                    yPos += 6;

                    // Equipo (si existe)
                    if (ticketDetails.equipment_details) {
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`Equipo: `, 20, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`${ticketDetails.equipment_details.model || 'N/A'}`, 37, yPos);
                        yPos += 5;
                    }

                    // Descripción
                    if (ticket.description) {
                        yPos += 2;
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        doc.text('Descripción:', 20, yPos);
                        yPos += 5;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        const descLines = doc.splitTextToSize(ticket.description, 165);
                        descLines.forEach(line => {
                            if (yPos > 275) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, 20, yPos);
                            yPos += 4;
                        });
                    }

                    // === NOTAS/COMENTARIOS DEL TÉCNICO ===
                    if (ticketDetails.notes && ticketDetails.notes.length > 0) {
                        yPos += 3;
                        
                        if (yPos > 250) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(102, 126, 234);
                        doc.text('Comentarios del Técnico:', 20, yPos);
                        yPos += 6;

                        ticketDetails.notes.forEach((note, idx) => {
                            if (yPos > 265) {
                                doc.addPage();
                                yPos = 20;
                            }

                            // Fondo para la nota
                            doc.setFillColor(250, 250, 250);
                            const noteHeight = Math.min(doc.splitTextToSize(note.note_text, 160).length * 4 + 8, 40);
                            doc.roundedRect(20, yPos - 2, 170, noteHeight, 2, 2, 'F');

                            doc.setFontSize(8);
                            doc.setTextColor(100, 100, 100);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`${note.created_by} - ${this.formatDate(note.created_at)} ${this.formatTime(note.created_at)}`, 22, yPos + 2);
                            yPos += 6;

                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(0, 0, 0);
                            doc.setFontSize(8);
                            const noteLines = doc.splitTextToSize(note.note_text, 160);
                            noteLines.forEach(line => {
                                doc.text(line, 22, yPos);
                                yPos += 4;
                            });

                            yPos += 4;
                        });
                    }

                    // === FOTOS ===
                    if (ticketDetails.photos && ticketDetails.photos.length > 0) {
                        yPos += 3;

                        if (yPos > 240) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(102, 126, 234);
                        doc.text(`Evidencia Fotográfica (${ticketDetails.photos.length} fotos):`, 20, yPos);
                        yPos += 6;

                        // Mostrar indicador de fotos
                        doc.setFontSize(8);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont('helvetica', 'italic');
                        
                        ticketDetails.photos.forEach((photo, idx) => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }

                            const photoLabel = photo.photo_type === 'before' ? '📷 Foto ANTES' : 
                                             photo.photo_type === 'after' ? '📷 Foto DESPUÉS' : 
                                             `📷 Foto ${idx + 1}`;
                            
                            doc.setFont('helvetica', 'normal');
                            doc.text(`${photoLabel} - ${this.formatDate(photo.created_at)}`, 22, yPos);
                            yPos += 5;

                            // Si hay fotos base64 completas, intentar agregarlas
                            if (photo.photo_base64 && photo.photo_base64.length > 100) {
                                try {
                                    const imgData = photo.photo_base64.startsWith('data:') ? 
                                        photo.photo_base64 : `data:image/jpeg;base64,${photo.photo_base64}`;
                                    
                                    if (yPos > 200) {
                                        doc.addPage();
                                        yPos = 20;
                                    }

                                    doc.addImage(imgData, 'JPEG', 25, yPos, 80, 60);
                                    yPos += 65;
                                } catch (error) {
                                    console.warn('No se pudo agregar imagen al PDF:', error);
                                    doc.setTextColor(128, 128, 128);
                                    doc.text('(Imagen no disponible en el PDF)', 22, yPos);
                                    yPos += 5;
                                }
                            }
                        });
                    }

                    yPos += 8;
                }
            }

            // Footer en todas las páginas
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.line(20, 282, 190, 282);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
                doc.text(`Gymtec ERP - Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 105, 292, { align: 'center' });
            }

            const filename = `informe_detallado_clientes_${Date.now()}.pdf`;
            doc.save(filename);

            this.showNotification('Informe detallado generado exitosamente', 'success');
        }

        calculatePeriodDates(period) {
            const now = new Date();
            let startDate, endDate, periodName;

            switch(period) {
                case 'current-month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    periodName = `${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
                    break;
                case 'last-month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                    periodName = new Date(startDate).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                    break;
                case 'current-quarter':
                    const currentQuarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
                    endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
                    periodName = `Trimestre ${currentQuarter + 1}, ${now.getFullYear()}`;
                    break;
                case 'last-quarter':
                    const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
                    const quarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
                    const quarter = lastQuarter < 0 ? 3 : lastQuarter;
                    startDate = new Date(quarterYear, quarter * 3, 1);
                    endDate = new Date(quarterYear, (quarter + 1) * 3, 0);
                    periodName = `Trimestre ${quarter + 1}, ${quarterYear}`;
                    break;
                case 'current-year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    periodName = `Año ${now.getFullYear()}`;
                    break;
                case 'last-year':
                    startDate = new Date(now.getFullYear() - 1, 0, 1);
                    endDate = new Date(now.getFullYear() - 1, 11, 31);
                    periodName = `Año ${now.getFullYear() - 1}`;
                    break;
                case 'custom':
                    startDate = new Date(document.getElementById('ticket-report-start-date').value);
                    endDate = new Date(document.getElementById('ticket-report-end-date').value);
                    periodName = `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`;
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = now;
                    periodName = 'Período actual';
            }

            return { startDate, endDate, periodName };
        }

        async generateClientsReport() {
            try {
                this.showNotification('Generando reporte de clientes...', 'info');
                
                const response = await window.authManager.authenticatedFetch(
                    `${window.API_URL}/clients`
                );
                
                if (!response.ok) {
                    throw new Error('Error al obtener clientes');
                }
                
                const result = await response.json();
                const clients = result.data || [];
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Header
                doc.setFillColor(41, 128, 185);
                doc.rect(0, 0, 210, 35, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(20);
                doc.text('REPORTE DE CLIENTES', 105, 20, { align: 'center' });
                
                let yPos = 50;
                
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(`Total de Clientes: ${clients.length}`, 20, yPos);
                yPos += 15;
                
                // Listado
                clients.forEach((client, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${index + 1}. ${client.name}`, 25, yPos);
                    yPos += 6;
                    
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    if (client.rut) doc.text(`RUT: ${client.rut}`, 30, yPos);
                    yPos += 5;
                    if (client.email) doc.text(`Email: ${client.email}`, 30, yPos);
                    yPos += 5;
                    if (client.phone) doc.text(`Teléfono: ${client.phone}`, 30, yPos);
                    yPos += 10;
                });
                
                const filename = `reporte_clientes_${Date.now()}.pdf`;
                doc.save(filename);
                
                this.showNotification('Reporte generado exitosamente', 'success');
                
            } catch (error) {
                console.error('Error generando reporte:', error);
                this.showNotification('Error al generar reporte: ' + error.message, 'error');
            }
        }

        async generateEquipmentReport() {
            this.showNotification('Generando reporte de equipos...', 'info');
            setTimeout(() => {
                this.showNotification('Reporte de equipos: Funcionalidad en desarrollo', 'warning');
            }, 1000);
        }

        async generateMaintenanceReport() {
            this.showNotification('Generando reporte de mantenimientos...', 'info');
            setTimeout(() => {
                this.showNotification('Reporte de mantenimientos: Funcionalidad en desarrollo', 'warning');
            }, 1000);
        }

        async generateFinancialReport() {
            this.showNotification('Generando reporte financiero...', 'info');
            setTimeout(() => {
                this.showNotification('Reporte financiero: Funcionalidad en desarrollo', 'warning');
            }, 1000);
        }

        // Método para descargar reporte como PDF
        async downloadReport(reportId) {
            try {
                const report = this.reports.find(r => r.id === reportId);
                if (!report) {
                    this.showNotification('Reporte no encontrado', 'error');
                    return;
                }

                console.log('📥 Descargando reporte:', report);
                
                // Verificar que jsPDF esté cargado
                if (typeof window.jspdf === 'undefined') {
                    console.error('❌ jsPDF no está cargado');
                    this.showNotification('Error: Librería PDF no disponible', 'error');
                    return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                // Si es un informe técnico de ticket, obtener datos completos
                let ticketData = null;
                if (report.ticketId || (report.data && report.data.ticketId)) {
                    const ticketId = report.ticketId || report.data.ticketId;
                    try {
                        const response = await window.authManager.authenticatedFetch(
                            `${window.API_URL}/tickets/${ticketId}/detail`
                        );
                        if (response.ok) {
                            const result = await response.json();
                            ticketData = result.data;
                        }
                    } catch (error) {
                        console.warn('No se pudo cargar detalle del ticket:', error);
                    }
                }

                // GENERAR PDF PROFESIONAL
                let yPos = 20;
                
                // ============ HEADER ============
                doc.setFillColor(41, 128, 185);
                doc.rect(0, 0, 210, 35, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.text('INFORME TÉCNICO', 105, 15, { align: 'center' });
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text('GYMTEC ERP - Sistema de Gestión', 105, 25, { align: 'center' });
                
                yPos = 45;

                // ============ INFORMACIÓN DEL REPORTE ============
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Número de Informe:', 20, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(`#${report.id}`, 70, yPos);
                
                doc.setFont('helvetica', 'bold');
                doc.text('Fecha de Generación:', 110, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(this.formatDate(report.createdAt || new Date()), 165, yPos);
                yPos += 10;

                // ============ DATOS DEL TICKET ============
                if (ticketData) {
                    // Línea separadora
                    doc.setDrawColor(41, 128, 185);
                    doc.setLineWidth(0.5);
                    doc.line(20, yPos, 190, yPos);
                    yPos += 10;

                    // SECCIÓN: INFORMACIÓN DEL TICKET
                    doc.setFillColor(240, 240, 240);
                    doc.rect(20, yPos - 5, 170, 8, 'F');
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(41, 128, 185);
                    doc.text('INFORMACIÓN DEL TICKET', 25, yPos);
                    yPos += 12;

                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    
                    // Ticket ID
                    doc.setFont('helvetica', 'bold');
                    doc.text('Ticket #:', 25, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(String(ticketData.id), 55, yPos);
                    yPos += 7;

                    // Título
                    doc.setFont('helvetica', 'bold');
                    doc.text('Título:', 25, yPos);
                    doc.setFont('helvetica', 'normal');
                    const tituloLines = doc.splitTextToSize(ticketData.title || 'N/A', 130);
                    doc.text(tituloLines, 55, yPos);
                    yPos += (tituloLines.length * 5) + 2;

                    // Estado y Prioridad
                    doc.setFont('helvetica', 'bold');
                    doc.text('Estado:', 25, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(ticketData.status || 'N/A', 55, yPos);
                    
                    doc.setFont('helvetica', 'bold');
                    doc.text('Prioridad:', 110, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(ticketData.priority || 'N/A', 140, yPos);
                    yPos += 7;

                    // Cliente y Ubicación
                    if (ticketData.client_name) {
                        doc.setFont('helvetica', 'bold');
                        doc.text('Cliente:', 25, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(ticketData.client_name, 55, yPos);
                        yPos += 7;
                    }

                    if (ticketData.location_name) {
                        doc.setFont('helvetica', 'bold');
                        doc.text('Ubicación:', 25, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(ticketData.location_name, 55, yPos);
                        yPos += 7;
                    }

                    // Técnico asignado
                    if (ticketData.assigned_technician) {
                        doc.setFont('helvetica', 'bold');
                        doc.text('Técnico:', 25, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(ticketData.assigned_technician, 55, yPos);
                        yPos += 7;
                    }

                    yPos += 5;

                    // SECCIÓN: EQUIPO
                    if (ticketData.equipment_details) {
                        if (yPos > 250) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFillColor(240, 240, 240);
                        doc.rect(20, yPos - 5, 170, 8, 'F');
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(41, 128, 185);
                        doc.text('EQUIPO INVOLUCRADO', 25, yPos);
                        yPos += 12;

                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);

                        const equip = ticketData.equipment_details;
                        
                        doc.setFont('helvetica', 'bold');
                        doc.text('Modelo:', 25, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(equip.model || 'N/A', 55, yPos);
                        yPos += 7;

                        doc.setFont('helvetica', 'bold');
                        doc.text('Marca:', 25, yPos);
                        doc.setFont('helvetica', 'normal');
                        doc.text(equip.brand || 'N/A', 55, yPos);
                        yPos += 7;

                        if (equip.serial_number) {
                            doc.setFont('helvetica', 'bold');
                            doc.text('Serie:', 25, yPos);
                            doc.setFont('helvetica', 'normal');
                            doc.text(equip.serial_number, 55, yPos);
                            yPos += 7;
                        }

                        yPos += 5;
                    }

                    // SECCIÓN: DESCRIPCIÓN DEL PROBLEMA
                    if (ticketData.description) {
                        if (yPos > 230) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFillColor(240, 240, 240);
                        doc.rect(20, yPos - 5, 170, 8, 'F');
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(41, 128, 185);
                        doc.text('DESCRIPCIÓN DEL PROBLEMA', 25, yPos);
                        yPos += 12;

                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'normal');
                        
                        const descLines = doc.splitTextToSize(ticketData.description, 165);
                        descLines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, 25, yPos);
                            yPos += 5;
                        });

                        yPos += 5;
                    }

                    // SECCIÓN: TRABAJO REALIZADO (de las notas)
                    if (ticketData.notes && ticketData.notes.length > 0) {
                        if (yPos > 230) {
                            doc.addPage();
                            yPos = 20;
                        }

                        doc.setFillColor(240, 240, 240);
                        doc.rect(20, yPos - 5, 170, 8, 'F');
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(41, 128, 185);
                        doc.text('TRABAJO REALIZADO Y OBSERVACIONES', 25, yPos);
                        yPos += 12;

                        doc.setFontSize(9);
                        doc.setTextColor(0, 0, 0);

                        ticketData.notes.forEach((note, index) => {
                            if (yPos > 260) {
                                doc.addPage();
                                yPos = 20;
                            }

                            doc.setFont('helvetica', 'bold');
                            doc.text(`Nota ${index + 1}:`, 25, yPos);
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(8);
                            doc.text(`${note.created_by} - ${this.formatDate(note.created_at)}`, 25, yPos + 4);
                            yPos += 9;

                            doc.setFontSize(9);
                            const noteLines = doc.splitTextToSize(note.note_text, 165);
                            noteLines.forEach(line => {
                                if (yPos > 270) {
                                    doc.addPage();
                                    yPos = 20;
                                }
                                doc.text(line, 25, yPos);
                                yPos += 4;
                            });
                            yPos += 6;
                        });
                    }

                } else {
                    // Si no hay datos de ticket, mostrar información del reporte genérico
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Tipo de Reporte:', 20, yPos);
                    doc.setFont('helvetica', 'normal');
                    doc.text(report.type || 'N/A', 70, yPos);
                    yPos += 10;

                    if (report.data) {
                        doc.setFontSize(10);
                        const dataText = JSON.stringify(report.data, null, 2);
                        const lines = doc.splitTextToSize(dataText, 170);
                        
                        lines.forEach(line => {
                            if (yPos > 270) {
                                doc.addPage();
                                yPos = 20;
                            }
                            doc.text(line, 20, yPos);
                            yPos += 5;
                        });
                    }
                }
                
                // ============ FOOTER EN TODAS LAS PÁGINAS ============
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    
                    // Línea superior del footer
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.5);
                    doc.line(20, 282, 190, 282);
                    
                    // Texto del footer
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.setFont('helvetica', 'normal');
                    doc.text(
                        `Página ${i} de ${pageCount}`,
                        105,
                        287,
                        { align: 'center' }
                    );
                    doc.text(
                        `Gymtec ERP - Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
                        105,
                        292,
                        { align: 'center' }
                    );
                }
                
                // ============ DESCARGAR ============
                const filename = ticketData 
                    ? `informe_tecnico_ticket_${ticketData.id}_${new Date().getTime()}.pdf`
                    : `reporte_${report.type}_${report.id}_${new Date().getTime()}.pdf`;
                
                doc.save(filename);
                
                this.showNotification('Informe descargado exitosamente', 'success');
                console.log('✅ PDF generado:', filename);
                
            } catch (error) {
                console.error('Error descargando reporte:', error);
                this.showNotification('Error al descargar el reporte: ' + error.message, 'error');
            }
        }

        // Método para visualizar reporte
        async viewReport(reportId) {
            try {
                console.log('👁️ Intentando visualizar reporte ID:', reportId);
                
                const report = this.reports.find(r => r.id === reportId);
                if (!report) {
                    console.error('❌ Reporte no encontrado:', reportId);
                    this.showNotification('Reporte no encontrado', 'error');
                    return;
                }

                console.log('✅ Reporte encontrado:', report);

                // Obtener datos completos del ticket si existe
                let ticketData = null;
                if (report.ticketId || (report.data && report.data.ticketId)) {
                    const ticketId = report.ticketId || report.data.ticketId;
                    try {
                        const response = await window.authManager.authenticatedFetch(
                            `${window.API_URL}/tickets/${ticketId}/detail`
                        );
                        if (response.ok) {
                            const result = await response.json();
                            ticketData = result.data;
                            console.log('✅ Datos del ticket obtenidos:', ticketData);
                        }
                    } catch (error) {
                        console.warn('⚠️ No se pudo cargar detalle del ticket:', error);
                    }
                }
                
                // Crear modal de vista previa con estilos inline fuertes
                const modal = document.createElement('div');
                modal.id = 'view-report-modal';
                
                // ESTILOS INLINE FORZADOS
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                // Contenido del modal
                let contentHTML = '';
                
                if (ticketData) {
                    // Vista previa con datos del ticket
                    contentHTML = `
                        <div style="padding: 20px;">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h4 style="margin: 0 0 10px 0; color: #2980b9;">
                                    <i data-lucide="file-text" style="width: 20px; height: 20px;"></i>
                                    Informe Técnico - Ticket #${ticketData.id}
                                </h4>
                                <p style="margin: 5px 0; color: #666;">
                                    <strong>Título:</strong> ${ticketData.title || 'N/A'}
                                </p>
                                <p style="margin: 5px 0; color: #666;">
                                    <strong>Estado:</strong> ${ticketData.status || 'N/A'} | 
                                    <strong>Prioridad:</strong> ${ticketData.priority || 'N/A'}
                                </p>
                            </div>
                            
                            ${ticketData.client_name ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="color: #2980b9; margin-bottom: 8px;">Cliente y Ubicación</h5>
                                    <p style="margin: 5px 0;"><strong>Cliente:</strong> ${ticketData.client_name}</p>
                                    ${ticketData.location_name ? `<p style="margin: 5px 0;"><strong>Ubicación:</strong> ${ticketData.location_name}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${ticketData.equipment_details ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="color: #2980b9; margin-bottom: 8px;">Equipo</h5>
                                    <p style="margin: 5px 0;"><strong>Modelo:</strong> ${ticketData.equipment_details.model || 'N/A'}</p>
                                    <p style="margin: 5px 0;"><strong>Marca:</strong> ${ticketData.equipment_details.brand || 'N/A'}</p>
                                    ${ticketData.equipment_details.serial_number ? `<p style="margin: 5px 0;"><strong>Serie:</strong> ${ticketData.equipment_details.serial_number}</p>` : ''}
                                </div>
                            ` : ''}
                            
                            ${ticketData.description ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="color: #2980b9; margin-bottom: 8px;">Descripción del Problema</h5>
                                    <p style="margin: 5px 0; line-height: 1.6;">${ticketData.description}</p>
                                </div>
                            ` : ''}
                            
                            ${ticketData.notes && ticketData.notes.length > 0 ? `
                                <div style="margin-bottom: 15px;">
                                    <h5 style="color: #2980b9; margin-bottom: 8px;">Trabajo Realizado (${ticketData.notes.length} notas)</h5>
                                    ${ticketData.notes.slice(0, 3).map(note => `
                                        <div style="background: #f8f9fa; padding: 10px; border-left: 3px solid #2980b9; margin-bottom: 10px;">
                                            <p style="margin: 0; font-size: 12px; color: #666;">
                                                ${note.created_by} - ${this.formatDate(note.created_at)}
                                            </p>
                                            <p style="margin: 5px 0 0 0;">${note.note_text}</p>
                                        </div>
                                    `).join('')}
                                    ${ticketData.notes.length > 3 ? `<p style="color: #666; font-size: 14px;">... y ${ticketData.notes.length - 3} notas más en el PDF</p>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                } else {
                    // Vista previa genérica
                    contentHTML = `
                        <div style="padding: 20px;">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h4 style="margin: 0 0 10px 0;">${report.type || 'Reporte'}</h4>
                                <p style="margin: 5px 0;">
                                    <strong>Generado:</strong> ${this.formatDate(report.created_at || report.createdAt)} a las ${this.formatTime(report.created_at || report.createdAt)}
                                </p>
                                <p style="margin: 5px 0;">
                                    <strong>Estado:</strong> ${this.getStatusText(report.status)}
                                </p>
                                <p style="margin: 5px 0;">
                                    <strong>Formato:</strong> ${report.format}
                                </p>
                                ${report.size ? `<p style="margin: 5px 0;"><strong>Tamaño:</strong> ${report.size}</p>` : ''}
                            </div>
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                                <p style="margin: 0; color: #856404;">
                                    <strong>ℹ️ Nota:</strong> Este reporte no tiene un ticket asociado. Haz click en "Descargar PDF" para generar el documento.
                                </p>
                            </div>
                        </div>
                    `;
                }
                
                modal.innerHTML = `
                    <div style="
                        background: white;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 800px;
                        max-height: 90vh;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            padding: 20px;
                            border-bottom: 1px solid #e0e0e0;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="eye" style="width: 24px; height: 24px;"></i>
                                Vista Previa del Informe
                            </h2>
                            <button onclick="document.getElementById('view-report-modal').remove()" style="
                                background: none;
                                border: none;
                                cursor: pointer;
                                padding: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <i data-lucide="x" style="width: 24px; height: 24px;"></i>
                            </button>
                        </div>
                        <div style="
                            flex: 1;
                            overflow-y: auto;
                            padding: 20px;
                        ">
                            ${contentHTML}
                        </div>
                        <div style="
                            padding: 20px;
                            border-top: 1px solid #e0e0e0;
                            display: flex;
                            gap: 10px;
                            justify-content: flex-end;
                        ">
                            <button onclick="document.getElementById('view-report-modal').remove()" style="
                                padding: 10px 20px;
                                border: 1px solid #ddd;
                                background: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                                Cerrar
                            </button>
                            <button onclick="window.reportsManager.downloadReport(${reportId}); document.getElementById('view-report-modal').remove();" style="
                                padding: 10px 20px;
                                border: none;
                                background: #2980b9;
                                color: white;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            ">
                                <i data-lucide="download" style="width: 16px; height: 16px;"></i>
                                Descargar PDF
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Hacer visible el modal con animación
                setTimeout(() => {
                    modal.style.opacity = '1';
                }, 10);
                
                // Inicializar iconos de Lucide
                if (window.lucide) {
                    window.lucide.createIcons();
                }
                
                console.log('✅ Modal de vista previa creado');
                
            } catch (error) {
                console.error('❌ Error visualizando reporte:', error);
                this.showNotification('Error al visualizar el reporte: ' + error.message, 'error');
            }
        }
    }

    // Inicializar cuando se carga la página según patrón @bitacora
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'reportes.html' || document.getElementById('reports-history')) {
        console.log(' Usuario autenticado, cargando módulo de reportes...');
        console.log(' Inicializando Reports Manager...');
        
        // Inicializar iconos de Lucide primero
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Crear instancia del manager
        window.reportsManager = new ReportsManager();
    }
});