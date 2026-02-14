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
                const response = await window.authenticatedFetch(`${window.API_URL}/informes`);
                if (!response || !response.ok) throw new Error('Error al cargar informes');
                const result = await response.json();
                
                this.reports = (result.data || []).map(r => ({
                    id: r.id,
                    name: `Informe Técnico #${r.ticket_id}`,
                    type: 'Informe Técnico',
                    format: 'PDF',
                    status: 'completed',
                    created_at: r.report_date || r.created_at,
                    size: '',
                    ticketId: r.ticket_id,
                    filename: r.filename,
                    ticketTitle: r.ticket_title || '',
                    clientName: r.client_name || ''
                }));
            } catch (error) {
                console.error('Error cargando informes:', error);
                this.showNotification('Error cargando historial de informes', 'error');
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

        async downloadReport(id) {
            const report = this.reports.find(r => r.id === id);
            if (report && report.ticketId && window.downloadPDFWithName) {
                try {
                    this.showNotification('Descargando PDF...', 'info');
                    await window.downloadPDFWithName(report.ticketId);
                    this.showNotification('PDF descargado correctamente', 'success');
                } catch (e) {
                    console.error('Error descargando PDF:', e);
                    this.showNotification('Error al descargar PDF', 'error');
                }
            } else {
                this.showNotification('No se puede descargar este reporte', 'error');
            }
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

    // Componente Alpine: Modal Informe Técnico
    Alpine.data('technicalReportModal', () => ({
        isOpen: false,
        isGenerating: false,
        allTickets: [],
        completedTickets: [],
        selectedTicketId: '',
        previewData: null,
        additionalNotes: '',
        previewSections: {},
        
        // Filtros
        searchText: '',
        filterClient: '',
        filterTechnician: '',
        filterLocation: '',
        filterStatus: '',
        
        // Listas únicas para filtros
        clients: [],
        technicians: [],
        locations: [],
        statuses: [],

        init() {
            this.$watch('selectedTicketId', (val) => {
                if (val) this.loadTicketDetails(val);
                else this.previewData = null;
            });
            window.addEventListener('open-technical-report-modal', () => this.openModal());
        },

        openModal() {
            this.isOpen = true;
            this.loadAllTickets();
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
            this.searchText = '';
            this.filterClient = '';
            this.filterTechnician = '';
            this.filterLocation = '';
            this.filterStatus = '';
        },

        async loadAllTickets() {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/tickets`);
                const result = await response.json();
                this.allTickets = result.data || [];
                
                // Extraer listas únicas para filtros
                const clientSet = new Set();
                const techSet = new Set();
                const locSet = new Set();
                const statusSet = new Set();
                
                this.allTickets.forEach(t => {
                    if (t.client_name) clientSet.add(t.client_name);
                    if (t.technician_name) techSet.add(t.technician_name);
                    if (t.location_name) locSet.add(t.location_name);
                    if (t.status) statusSet.add(t.status);
                });
                
                this.clients = [...clientSet].sort();
                this.technicians = [...techSet].sort();
                this.locations = [...locSet].sort();
                this.statuses = [...statusSet].sort();
                
                this.applyFilters();
            } catch (e) {
                console.error('Error cargando tickets', e);
                this.showNotification('Error cargando lista de tickets', 'error');
            }
        },

        applyFilters() {
            let filtered = [...this.allTickets];
            
            if (this.filterClient) {
                filtered = filtered.filter(t => t.client_name === this.filterClient);
            }
            if (this.filterTechnician) {
                filtered = filtered.filter(t => t.technician_name === this.filterTechnician);
            }
            if (this.filterLocation) {
                filtered = filtered.filter(t => t.location_name === this.filterLocation);
            }
            if (this.filterStatus) {
                filtered = filtered.filter(t => t.status === this.filterStatus);
            }
            if (this.searchText.trim()) {
                const q = this.searchText.toLowerCase();
                filtered = filtered.filter(t => 
                    (t.title && t.title.toLowerCase().includes(q)) ||
                    (t.client_name && t.client_name.toLowerCase().includes(q)) ||
                    (t.description && t.description.toLowerCase().includes(q)) ||
                    String(t.id).includes(q)
                );
            }
            
            this.completedTickets = filtered;
        },

        // Tickets agrupados por cliente
        get ticketsByClient() {
            const groups = {};
            this.completedTickets.forEach(t => {
                const client = t.client_name || 'Sin cliente';
                if (!groups[client]) groups[client] = [];
                groups[client].push(t);
            });
            // Ordenar por nombre de cliente
            return Object.keys(groups).sort().map(name => ({
                name,
                tickets: groups[name]
            }));
        },

        getStatusLabel(status) {
            const labels = {
                'open': 'Abierto',
                'in_progress': 'En Progreso',
                'completed': 'Completado',
                'closed': 'Cerrado',
                'pending': 'Pendiente',
                'cancelled': 'Cancelado'
            };
            return labels[status] || status;
        },

        getStatusColor(status) {
            const colors = {
                'open': 'bg-blue-100 text-blue-700',
                'in_progress': 'bg-yellow-100 text-yellow-700',
                'completed': 'bg-green-100 text-green-700',
                'closed': 'bg-gray-100 text-gray-600',
                'pending': 'bg-orange-100 text-orange-700',
                'cancelled': 'bg-red-100 text-red-700'
            };
            return colors[status] || 'bg-gray-100 text-gray-600';
        },


        async loadTicketDetails(ticketId) {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${ticketId}/informe-data`);
                const result = await response.json();
                
                if (result.data) {
                    const { ticket, comments, photos } = result.data;
                    this._lastComments = comments || [];
                    this._lastPhotos = photos || [];
                    this.processTicketData(ticket);
                }
            } catch (e) {
                console.error('Error cargando detalles para informe:', e);
                try {
                    const response = await window.authenticatedFetch(`${window.API_URL}/tickets/${ticketId}`);
                    const result = await response.json();
                    if (result.data) {
                        this._lastComments = result.data.comments || [];
                        this._lastPhotos = [];
                        this.processTicketData(result.data);
                    }
                } catch (e2) {
                    console.error('Error en fallback:', e2);
                    this.showNotification('Error cargando detalles del ticket', 'error');
                }
            }
        },

        processTicketData(ticket) {
            const comments = this._lastComments || [];
            const sections = {
                'diagnostico': [],
                'trabajo': [],
                'solucion': [],
                'recomendacion': []
            };
            let cierre = '';

            comments.forEach(c => {
                const text = c.comment_text || c.comment || c.body || '';
                if (text.includes('#diagnostico')) sections.diagnostico.push(text.replace('#diagnostico', '').trim());
                if (text.includes('#trabajo')) sections.trabajo.push(text.replace('#trabajo', '').trim());
                if (text.includes('#solucion')) sections.solucion.push(text.replace('#solucion', '').trim());
                if (text.includes('#recomendacion')) sections.recomendacion.push(text.replace('#recomendacion', '').trim());
                if (text.includes('#cierre')) cierre = text.replace('#cierre', '').trim();
            });

            this.previewData = { ticket, cierre, photosCount: (this._lastPhotos || []).length };
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
                // 1. Crear registro de informe en BD
                const informeData = {
                    ticket_id: parseInt(this.selectedTicketId),
                    filename: `Informe_Tecnico_${this.selectedTicketId}_${Date.now()}.pdf`,
                    notas_adicionales: this.additionalNotes || null,
                    client_email: (this.previewData && this.previewData.ticket && this.previewData.ticket.client_email) || null
                };

                const createResponse = await window.authenticatedFetch(`${window.API_URL}/informes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(informeData)
                });

                if (!createResponse || !createResponse.ok) {
                    const errData = createResponse ? await createResponse.json().catch(() => ({})) : {};
                    throw new Error(errData.error || 'Error creando registro de informe');
                }

                // 2. Descargar PDF real del servidor
                if (window.downloadPDFWithName) {
                    await window.downloadPDFWithName(this.selectedTicketId);
                } else if (window.reportsManager && window.reportsManager.downloadPDFFromServer) {
                    await window.reportsManager.downloadPDFFromServer(this.selectedTicketId);
                } else {
                    const token = window.authManager ? window.authManager.getToken() : localStorage.getItem('gymtec_token');
                    window.open(`${window.API_URL}/tickets/${this.selectedTicketId}/generate-pdf?token=${token}`, '_blank');
                }

                this.showNotification('Informe generado y descargado correctamente', 'success');
                this.closeModal();
                window.dispatchEvent(new Event('reload-reports'));

            } catch (e) {
                console.error('Error generando informe:', e);
                this.showNotification('Error al generar el informe: ' + e.message, 'error');
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

// Notificaciones globales
class ReportsManager {
    constructor() {
        // Solo notificaciones, los eventos se manejan inline en HTML
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