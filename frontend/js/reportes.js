// reportes.js - Sistema de reportes modernizado con Alpine.js

console.log('🔒 Inicializando módulo de reportes (Alpine.js Edition)...');

document.addEventListener('DOMContentLoaded', function() {
    // Verificación de autenticación crítica
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en reportes, redirigiendo a login...');
        window.authManager.redirectToLogin();
        return;
    }
    
    // Inicializar iconos
    if(window.lucide) window.lucide.createIcons();

    // Event Dispatcher para comunicación entre componentes Alpine y JS "Legacy"
    window.dispatchEvent(new Event('reports-module-loaded'));
});

// Componente Alpine: Lista de Reportes
document.addEventListener('alpine:init', () => {
    Alpine.data('reportsList', () => ({
        reports: [],
        isLoading: true,
        
        async init() {
            console.log('🚀 Alpine reportsList inicializado');
            await this.loadReports();
            
            // Escuchar eventos globales para recargar lista
            window.addEventListener('reload-reports', () => this.loadReports());
        },

        async loadReports() {
            this.isLoading = true;
            try {
                // Simulación de carga (reemplazar con fetch real)
                // TODO: Conectar con endpoint real GET /api/reports/history
                await new Promise(r => setTimeout(r, 800));
                
                this.reports = [
                    {
                        id: 1,
                        name: 'Informe Técnico #183',
                        type: 'Informe Técnico',
                        format: 'PDF',
                        status: 'completed',
                        created_at: new Date().toISOString(),
                        size: '2.3 MB',
                        ticketId: 183
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
            } catch (error) {
                this.showNotification('Error cargando historial', 'error');
            } finally {
                this.isLoading = false;
                this.$nextTick(() => { if(window.lucide) window.lucide.createIcons(); });
            }
        },

        getFormatIcon(format) {
            const icons = { 'PDF': 'file-text', 'Excel': 'file-spreadsheet', 'CSV': 'file-text' };
            return icons[format] || 'file';
        },

        getStatusText(status) {
            const statuses = { 'completed': 'Completado', 'processing': 'Procesando', 'failed': 'Error' };
            return statuses[status] || status;
        },

        formatDate(isoString) {
            return new Date(isoString).toLocaleDateString('es-ES');
        },

        formatTime(isoString) {
            return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        },

        downloadReport(id) {
            this.showNotification(`Descargando reporte #${id}...`, 'info');
        },

        viewReport(id) {
            this.showNotification(`Abriendo reporte #${id}...`, 'info');
        },

        deleteReport(id) {
            if(confirm('¿Eliminar reporte?')) {
                this.reports = this.reports.filter(r => r.id !== id);
                this.showNotification('Reporte eliminado', 'success');
            }
        },

        showNotification(msg, type) {
            // Usar helper global si existe, o simple alert
            if (window.reportsManager && window.reportsManager.showNotification) {
                window.reportsManager.showNotification(msg, type);
            } else {
                alert(msg);
            }
        }
    }));

    // Componente Alpine: Modal Nuevo Reporte
    Alpine.data('newReportModal', () => ({
        isOpen: false,
        isSubmitting: false,
        tickets: [],
        technicians: [],
        formData: {
            type: '',
            format: 'pdf',
            period: 'this-month',
            startDate: '',
            endDate: '',
            ticketId: '',
            technicianId: '',
            workDescription: '',
            includeCharts: true,
            includeImages: false,
            emailRecipients: ''
        },

        init() {
            this.$watch('formData.type', (val) => {
                if (val === 'technical-ticket') {
                    this.loadTickets();
                    this.loadTechnicians();
                }
            });
        },

        openModal(initialType = '') {
            this.isOpen = true;
            if (initialType) this.formData.type = initialType;
            this.resetForm();
        },

        closeModal() {
            this.isOpen = false;
        },

        resetForm() {
            // Reset parcial para mantener defaults
            this.formData.startDate = '';
            this.formData.endDate = '';
        },

        async loadTickets() {
            if (this.tickets.length > 0) return;
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/tickets`);
                const result = await response.json();
                this.tickets = result.data || [];
            } catch (e) {
                console.error('Error cargando tickets', e);
            }
        },

        async loadTechnicians() {
             if (this.technicians.length > 0) return;
             try {
                const response = await window.authenticatedFetch(`${window.API_URL}/users?role=technician`);
                const result = await response.json();
                this.technicians = result.data || [];
             } catch (e) {
                 console.error('Error cargando técnicos', e);
             }
        },

        async submitReport() {
            this.isSubmitting = true;
            try {
                console.log('Generando reporte con datos:', this.formData);
                
                // Simulación de llamada al backend
                await new Promise(r => setTimeout(r, 1500));
                
                // Disparar evento para recargar lista
                window.dispatchEvent(new Event('reload-reports'));
                
                this.closeModal();
                this.showNotification('Reporte generado exitosamente', 'success');
            } catch (error) {
                this.showNotification('Error al generar reporte', 'error');
            } finally {
                this.isSubmitting = false;
            }
        },
        
        showNotification(msg, type) {
             if (window.reportsManager && window.reportsManager.showNotification) {
                window.reportsManager.showNotification(msg, type);
            } else {
                alert(msg);
            }
        }
    }));

    // Componente Alpine: Modal Informe Técnico
    Alpine.data('technicalReportModal', () => ({
        isOpen: false,
        isGenerating: false,
        completedTickets: [],
        selectedTicketId: '',
        previewData: null,
        additionalNotes: '',
        previewSections: {},

        init() {
            this.$watch('selectedTicketId', (val) => {
                if (val) this.loadTicketDetails(val);
                else this.previewData = null;
            });
            // Escuchar apertura desde JS externo si es necesario
            window.addEventListener('open-technical-report-modal', () => this.openModal());
        },

        openModal() {
            this.isOpen = true;
            this.loadCompletedTickets();
            this.resetForm();
        },

        closeModal() {
            this.isOpen = false;
        },

        resetForm() {
            this.selectedTicketId = '';
            this.previewData = null;
            this.additionalNotes = '';
            this.previewSections = {};
        },

        async loadCompletedTickets() {
            try {
                // Endpoint real: GET /api/tickets?status=completed
                // TODO: Asegurar que este endpoint soporte filtro por status
                const response = await window.authenticatedFetch(`${window.API_URL}/tickets?status=completed`);
                const result = await response.json();
                this.completedTickets = result.data || [];
            } catch (e) {
                console.error('Error cargando tickets completados', e);
                this.showNotification('Error cargando lista de tickets', 'error');
            }
        },

        async loadTicketDetails(ticketId) {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${ticketId}`);
                const result = await response.json();
                
                if (result.data) {
                    this.processTicketData(result.data);
                }
            } catch (e) {
                console.error('Error cargando detalles', e);
                this.showNotification('Error cargando detalles del ticket', 'error');
            }
        },

        processTicketData(ticket) {
            const comments = ticket.comments || [];
            const sections = {
                'diagnostico': [],
                'trabajo': [],
                'solucion': [],
                'recomendacion': []
            };
            let cierre = '';

            comments.forEach(c => {
                const text = c.body || '';
                // Simple parsing logic based on hashtags
                if (text.includes('#diagnostico')) sections.diagnostico.push(text.replace('#diagnostico', '').trim());
                if (text.includes('#trabajo')) sections.trabajo.push(text.replace('#trabajo', '').trim());
                if (text.includes('#solucion')) sections.solucion.push(text.replace('#solucion', '').trim());
                if (text.includes('#recomendacion')) sections.recomendacion.push(text.replace('#recomendacion', '').trim());
                if (text.includes('#cierre')) cierre = text.replace('#cierre', '').trim();
            });

            this.previewData = { ticket, cierre };
            this.previewSections = sections;
        },

        getSectionTitle(key) {
            const titles = {
                'diagnostico': '🔍 Diagnóstico Inicial',
                'trabajo': '✓ Trabajo Ejecutado',
                'solucion': '🔧 Solución Aplicada',
                'recomendacion': '💡 Recomendaciones'
            };
            return titles[key] || key;
        },

        getSectionClass(key) {
             const classes = {
                'diagnostico': 'bg-gray-50 border-gray-200',
                'trabajo': 'bg-green-50 border-green-200',
                'solucion': 'bg-purple-50 border-purple-200',
                'recomendacion': 'bg-orange-50 border-orange-200'
            };
            return classes[key] || 'bg-gray-50';
        },

        getSectionTitleClass(key) {
            const classes = {
                'diagnostico': 'text-gray-900',
                'trabajo': 'text-green-900',
                'solucion': 'text-purple-900',
                'recomendacion': 'text-orange-900'
            };
            return classes[key] || 'text-gray-900';
        },

        getSectionTextClass(key) {
             const classes = {
                'diagnostico': 'text-gray-700',
                'trabajo': 'text-green-800',
                'solucion': 'text-purple-800',
                'recomendacion': 'text-orange-800'
            };
            return classes[key] || 'text-gray-700';
        },

        async generatePDF() {
            if (!this.selectedTicketId) return;
            this.isGenerating = true;

            try {
                // Crear registro de informe en BD
                const informeData = {
                    ticket_id: this.selectedTicketId,
                    filename: `informe_${this.selectedTicketId}_${Date.now()}.pdf`,
                    notas_adicionales: this.additionalNotes,
                    client_email: this.previewData.ticket.client_email
                };

                const createResponse = await window.authenticatedFetch(`${window.API_URL}/informes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(informeData)
                });

                if (!createResponse.ok) throw new Error('Error creando registro de informe');

                // Simulación de éxito
                await new Promise(r => setTimeout(r, 1500)); 

                this.showNotification('Informe generado correctamente', 'success');
                this.closeModal();
                window.dispatchEvent(new Event('reload-reports'));

            } catch (e) {
                console.error('Error generando informe', e);
                this.showNotification('Error al generar el informe', 'error');
            } finally {
                this.isGenerating = false;
            }
        },

        showNotification(msg, type) {
            if (window.reportsManager && window.reportsManager.showNotification) {
                window.reportsManager.showNotification(msg, type);
            } else {
                alert(msg);
            }
        }
    }));
});

// CLASE LEGACY ADAPTADA (Para mantener compatibilidad con otras partes del sistema si es necesario)
// Se mantiene como orquestador global de notificaciones y métodos auxiliares
class ReportsManager {
    constructor() {
        this.init();
    }

    init() {
        // Inicializar event listeners globales que no se pueden mover a Alpine fácilmente
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // Botones externos que abren modales
        const newReportBtn = document.getElementById('new-report-btn');
        if (newReportBtn) {
            newReportBtn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('open-new-report-modal'));
            });
        }
        
        // Cards de tipos de reporte
        document.querySelectorAll('.report-type-card-compact').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                window.dispatchEvent(new CustomEvent('open-new-report-modal', { detail: { type } }));
            });
        });
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `reports-alert ${type}`;
        notification.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
            <span>${message}</span>
        `;

        const main = document.querySelector('main');
        if (main) main.insertBefore(notification, main.firstChild);
        else document.body.appendChild(notification);

        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 4000);
    }
}

// Instanciar globalmente
window.reportsManager = new ReportsManager();