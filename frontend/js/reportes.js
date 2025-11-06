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

            // Click en cards de tipo de reporte
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

                // Configurar fuente y colores
                doc.setFont('helvetica');
                
                // Título
                doc.setFontSize(18);
                doc.setTextColor(44, 62, 80);
                doc.text('REPORTE - GYMTEC ERP', 105, 20, { align: 'center' });
                
                // Línea decorativa
                doc.setDrawColor(52, 152, 219);
                doc.setLineWidth(0.5);
                doc.line(20, 25, 190, 25);
                
                // Información del reporte
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                let yPos = 35;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Tipo de Reporte:', 20, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(report.type || 'N/A', 70, yPos);
                yPos += 8;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Fecha de Generación:', 20, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(this.formatDate(report.createdAt), 70, yPos);
                yPos += 8;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Formato:', 20, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(report.format || 'PDF', 70, yPos);
                yPos += 8;
                
                doc.setFont('helvetica', 'bold');
                doc.text('Estado:', 20, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(this.getStatusText(report.status), 70, yPos);
                yPos += 15;
                
                // Sección de datos (si existen)
                if (report.data) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text('Datos del Reporte:', 20, yPos);
                    yPos += 10;
                    
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    
                    // Convertir datos a texto legible
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
                
                // Footer
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(9);
                    doc.setTextColor(128, 128, 128);
                    doc.text(
                        `Página ${i} de ${pageCount}`,
                        105,
                        290,
                        { align: 'center' }
                    );
                    doc.text(
                        `Generado por Gymtec ERP - ${new Date().toLocaleDateString('es-ES')}`,
                        105,
                        295,
                        { align: 'center' }
                    );
                }
                
                // Descargar el PDF
                const filename = `reporte_${report.type}_${report.id}_${new Date().getTime()}.pdf`;
                doc.save(filename);
                
                this.showNotification('Reporte descargado exitosamente', 'success');
                console.log('✅ PDF generado:', filename);
                
            } catch (error) {
                console.error('Error descargando reporte:', error);
                this.showNotification('Error al descargar el reporte: ' + error.message, 'error');
            }
        }

        // Método para visualizar reporte
        async viewReport(reportId) {
            try {
                const report = this.reports.find(r => r.id === reportId);
                if (!report) {
                    this.showNotification('Reporte no encontrado', 'error');
                    return;
                }

                console.log('👁️ Visualizando reporte:', report);
                
                // Crear modal de vista previa
                const modal = document.createElement('div');
                modal.className = 'base-modal active';
                modal.id = 'view-report-modal';
                modal.innerHTML = `
                    <div class="base-modal-content base-modal-large">
                        <div class="base-modal-header">
                            <h2>
                                <i data-lucide="file-text"></i>
                                Vista Previa del Reporte
                            </h2>
                            <button class="base-modal-close" onclick="document.getElementById('view-report-modal').remove()">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                        <div class="base-modal-body">
                            <div class="report-preview-container">
                                <div class="report-preview-header">
                                    <h3>${report.type}</h3>
                                    <p>Generado: ${this.formatDate(report.createdAt)} ${this.formatTime(report.createdAt)}</p>
                                    <span class="report-status-badge ${report.status}">${this.getStatusText(report.status)}</span>
                                </div>
                                <div class="report-preview-content">
                                    <pre>${JSON.stringify(report.data || report, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                        <div class="base-modal-footer">
                            <button class="base-btn base-btn-secondary" onclick="document.getElementById('view-report-modal').remove()">
                                Cerrar
                            </button>
                            <button class="base-btn base-btn-primary" onclick="reportsManager.downloadReport(${reportId})">
                                <i data-lucide="download"></i>
                                Descargar PDF
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                if (window.lucide) {
                    window.lucide.createIcons();
                }
                
            } catch (error) {
                console.error('Error visualizando reporte:', error);
                this.showNotification('Error al visualizar el reporte', 'error');
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