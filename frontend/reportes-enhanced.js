// Enhanced Reports Manager with Role-based Functionality
// =======================================================

class EnhancedReportsManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.currentReportType = null;
        this.isGenerating = false;
        this.notifications = [];
        
        // Configuración de reportes por rol
        this.reportConfig = {
            admin: {
                color: '#3b82f6',
                gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                reports: [
                    'executive-dashboard',
                    'multi-client-analysis', 
                    'global-financial',
                    'technician-productivity',
                    'global-inventory',
                    'sla-compliance'
                ]
            },
            manager: {
                color: '#f59e0b',
                gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
                reports: [
                    'executive-dashboard',
                    'multi-client-analysis',
                    'global-financial',
                    'sla-compliance'
                ]
            },
            client: {
                color: '#10b981',
                gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
                reports: [
                    'my-equipment',
                    'maintenance-history',
                    'equipment-uptime',
                    'maintenance-costs',
                    'my-sla-status',
                    'preventive-schedule'
                ]
            },
            technician: {
                color: '#8b5cf6',
                gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                reports: [
                    'technical-ticket',
                    'tickets',
                    'my-equipment',
                    'maintenance-history'
                ]
            }
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando Enhanced Reports Manager...');
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Detectar rol del usuario
            await this.detectUserRole();
            
            // Configurar interfaz según rol
            this.setupRoleBasedInterface();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar estadísticas iniciales
            await this.loadInitialStats();
            
            // Inicializar animaciones
            this.initializeAnimations();
            
            console.log('✅ Enhanced Reports Manager inicializado correctamente');
            this.showNotification('Sistema de reportes cargado correctamente', 'success');
            
        } catch (error) {
            console.error('❌ Error inicializando Reports Manager:', error);
            this.showNotification('Error al cargar el sistema de reportes', 'error');
        }
    }

    async checkAuthentication() {
        if (!window.AuthManager || !AuthManager.isAuthenticated()) {
            console.warn('⚠️ Usuario no autenticado, redirigiendo...');
            window.location.href = '/login.html';
            throw new Error('Usuario no autenticado');
        }
        
        this.currentUser = AuthManager.getCurrentUser();
        console.log('✅ Usuario autenticado:', this.currentUser?.username);
    }

    async detectUserRole() {
        try {
            this.userRole = AuthManager.getUserRole() || 'client';
            
            console.log('🔍 Rol detectado:', this.userRole);
            
            // Actualizar badge de rol
            this.updateRoleBadge();
            
            return this.userRole;
        } catch (error) {
            console.error('❌ Error detectando rol:', error);
            this.userRole = 'client'; // Fallback seguro
            this.updateRoleBadge();
        }
    }

    updateRoleBadge() {
        const roleBadge = document.getElementById('user-role-badge');
        const roleText = document.getElementById('current-user-role');
        
        if (roleBadge && roleText) {
            // Remover clases existentes
            roleBadge.className = 'user-role-badge';
            
            // Agregar clase específica del rol
            roleBadge.classList.add(this.userRole);
            
            // Actualizar texto
            const roleNames = {
                'admin': 'Administrador',
                'manager': 'Gerente',
                'client': 'Cliente',
                'technician': 'Técnico'
            };
            
            roleText.textContent = roleNames[this.userRole] || 'Usuario';
            
            console.log('🏷️ Badge de rol actualizado:', this.userRole);
        }
    }

    setupRoleBasedInterface() {
        console.log('🎨 Configurando interfaz para rol:', this.userRole);
        
        // Ocultar todas las secciones
        this.hideAllSections();
        
        // Mostrar sección correspondiente al rol
        this.showRoleSection();
        
        // Configurar estadísticas específicas por rol
        this.setupRoleBasedStats();
        
        // Configurar colores del tema según rol
        this.applyRoleTheme();
    }

    setupRoleBasedStats() {
        // Ocultar todas las estadísticas primero
        const allStats = document.querySelectorAll('.admin-stats, .client-stats, .technician-stats');
        allStats.forEach(stat => stat.classList.add('hidden'));
        
        // Mostrar estadísticas específicas del rol
        const roleStatsClass = `${this.userRole}-stats`;
        const roleStats = document.querySelectorAll(`.${roleStatsClass}`);
        
        if (roleStats.length > 0) {
            roleStats.forEach(stat => stat.classList.remove('hidden'));
            console.log(`📊 Estadísticas de ${this.userRole} mostradas`);
        } else {
            // Fallback: mostrar estadísticas de admin si no hay específicas
            const adminStats = document.querySelectorAll('.admin-stats');
            adminStats.forEach(stat => stat.classList.remove('hidden'));
            console.log('📊 Usando estadísticas por defecto (admin)');
        }
    }

    hideAllSections() {
        const sections = [
            'admin-reports-section',
            'client-reports-section', 
            'general-reports-section'
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
            }
        });
    }

    showRoleSection() {
        // Determinar qué sección mostrar según el rol
        let sectionToShow = '';
        
        switch (this.userRole) {
            case 'admin':
            case 'manager':
                sectionToShow = 'admin-reports-section';
                break;
            case 'client':
                sectionToShow = 'client-reports-section';
                break;
            case 'technician':
                // Los técnicos ven reportes generales + algunos específicos
                sectionToShow = 'general-reports-section';
                break;
            default:
                sectionToShow = 'general-reports-section';
        }
        
        // Mostrar sección principal
        const mainSection = document.getElementById(sectionToShow);
        if (mainSection) {
            mainSection.classList.remove('hidden');
            console.log('📱 Sección mostrada:', sectionToShow);
        }
        
        // Siempre mostrar reportes generales (para todos los roles)
        const generalSection = document.getElementById('general-reports-section');
        if (generalSection && sectionToShow !== 'general-reports-section') {
            generalSection.classList.remove('hidden');
        }
    }

    applyRoleTheme() {
        const config = this.reportConfig[this.userRole];
        if (!config) return;
        
        // Aplicar variables CSS dinámicas
        document.documentElement.style.setProperty('--current-role-color', config.color);
        document.documentElement.style.setProperty('--current-role-gradient', config.gradient);
        
        console.log('🎨 Tema aplicado para rol:', this.userRole);
    }

    setupEventListeners() {
        // Event listeners para tarjetas de reportes
        document.addEventListener('click', (e) => {
            const reportCard = e.target.closest('.report-type-card');
            if (reportCard) {
                e.preventDefault();
                this.handleReportCardClick(reportCard);
            }
        });

        // Event listeners para botones de generación
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-generate-report')) {
                e.preventDefault();
                this.handleGenerateReport(e.target);
            }
        });

        // Event listener para formularios
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.report-form')) {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            }
        });

        console.log('🎧 Event listeners configurados');
    }

    handleReportCardClick(card) {
        try {
            const reportType = card.getAttribute('data-type');
            const reportRole = card.getAttribute('data-role');
            
            console.log('📊 Tarjeta de reporte clickeada:', { reportType, reportRole });
            
            // Verificar si el usuario tiene permisos para este reporte
            if (!this.canAccessReport(reportType, reportRole)) {
                this.showNotification('No tienes permisos para acceder a este reporte', 'warning');
                return;
            }
            
            // Animar tarjeta seleccionada
            this.animateCardSelection(card);
            
            // Configurar formulario de generación
            this.setupGenerationForm(reportType);
            
            this.currentReportType = reportType;
            
        } catch (error) {
            console.error('❌ Error manejando click de tarjeta:', error);
            this.showNotification('Error al seleccionar reporte', 'error');
        }
    }

    canAccessReport(reportType, reportRole) {
        // Reportes generales son accesibles para todos
        if (reportRole === 'all') return true;
        
        // Verificar si el reporte está en la configuración del rol actual
        const userConfig = this.reportConfig[this.userRole];
        if (!userConfig) return false;
        
        return userConfig.reports.includes(reportType);
    }

    animateCardSelection(card) {
        // Remover selección previa
        document.querySelectorAll('.report-type-card.selected').forEach(c => {
            c.classList.remove('selected');
        });
        
        // Agregar clase de seleccionado
        card.classList.add('selected');
        
        // Animar tarjeta
        card.style.transform = 'scale(1.05)';
        setTimeout(() => {
            card.style.transform = '';
        }, 200);
    }

    setupGenerationForm(reportType) {
        // Esta función se expandirá con formularios específicos por tipo de reporte
        console.log('📝 Configurando formulario para reporte:', reportType);
        
        // Mostrar formulario de generación si existe
        const formContainer = document.getElementById('generation-form-container');
        if (formContainer) {
            formContainer.classList.remove('hidden');
            this.scrollToElement(formContainer);
        }
    }

    async handleGenerateReport(button) {
        if (this.isGenerating) {
            this.showNotification('Ya se está generando un reporte', 'warning');
            return;
        }

        try {
            this.isGenerating = true;
            this.showLoadingState(button);
            
            console.log('📊 Generando reporte:', this.currentReportType);
            
            // Simular generación de reporte
            await this.generateReport(this.currentReportType);
            
            this.showNotification('Reporte generado exitosamente', 'success');
            
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            this.showNotification('Error al generar el reporte', 'error');
        } finally {
            this.isGenerating = false;
            this.hideLoadingState(button);
        }
    }

    async generateReport(reportType) {
        // Simular tiempo de generación
        const delay = Math.random() * 2000 + 1000; // 1-3 segundos
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simular éxito o fallo (95% éxito)
                if (Math.random() > 0.05) {
                    resolve({
                        type: reportType,
                        filename: `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`,
                        size: Math.floor(Math.random() * 5000) + 500 // KB
                    });
                } else {
                    reject(new Error('Error simulado en la generación'));
                }
            }, delay);
        });
    }

    async loadInitialStats() {
        try {
            console.log('📈 Cargando estadísticas iniciales...');
            
            // Simular carga de estadísticas
            const stats = await this.fetchStatsForRole();
            
            // Animar contadores
            this.animateCounters(stats);
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            this.showNotification('Error al cargar estadísticas', 'warning');
        }
    }

    async fetchStatsForRole() {
        // Simular datos según el rol
        const roleStats = {
            admin: {
                totalReports: Math.floor(Math.random() * 500) + 100,
                pendingReports: Math.floor(Math.random() * 20) + 5,
                activeClients: Math.floor(Math.random() * 50) + 10,
                systemUptime: '99.8%'
            },
            client: {
                myReports: Math.floor(Math.random() * 50) + 10,
                equipmentCount: Math.floor(Math.random() * 100) + 20,
                lastMaintenance: '5 días',
                availability: '98.5%'
            },
            technician: {
                assignedTickets: Math.floor(Math.random() * 30) + 5,
                completedReports: Math.floor(Math.random() * 100) + 25,
                pendingTasks: Math.floor(Math.random() * 10) + 2,
                efficiency: '94.2%'
            }
        };
        
        return roleStats[this.userRole] || roleStats.client;
    }

    animateCounters(stats) {
        const statCards = document.querySelectorAll('.stat-number');
        
        statCards.forEach((card, index) => {
            const targetValue = Object.values(stats)[index];
            
            if (typeof targetValue === 'number') {
                this.animateNumber(card, 0, targetValue, 1500);
            } else {
                card.textContent = targetValue;
            }
        });
    }

    animateNumber(element, start, end, duration) {
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (end - start) * easeOutCubic);
            
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        
        requestAnimationFrame(updateNumber);
    }

    initializeAnimations() {
        // Animar entrada de tarjetas
        const cards = document.querySelectorAll('.report-type-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        console.log('✨ Animaciones inicializadas');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="notification-icon">
                    ${this.getNotificationIcon(type)}
                </div>
                <div class="notification-content">
                    <p class="notification-message">${message}</p>
                    <small class="notification-time">${new Date().toLocaleTimeString()}</small>
                </div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-lucide="x" class="h-4 w-4"></i>
                </button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
        
        // Actualizar iconos de Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
        
        console.log(`📢 Notificación [${type}]:`, message);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    getNotificationIcon(type) {
        const icons = {
            success: '<i data-lucide="check-circle" class="h-5 w-5 text-green-500"></i>',
            error: '<i data-lucide="x-circle" class="h-5 w-5 text-red-500"></i>',
            warning: '<i data-lucide="alert-triangle" class="h-5 w-5 text-yellow-500"></i>',
            info: '<i data-lucide="info" class="h-5 w-5 text-blue-500"></i>'
        };
        
        return icons[type] || icons.info;
    }

    showLoadingState(button) {
        button.disabled = true;
        button.classList.add('loading');
        
        const originalText = button.textContent;
        button.setAttribute('data-original-text', originalText);
        button.textContent = 'Generando...';
    }

    hideLoadingState(button) {
        button.disabled = false;
        button.classList.remove('loading');
        
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.textContent = originalText;
        }
    }

    scrollToElement(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    // Métodos específicos por tipo de reporte
    generateExecutiveDashboard() {
        console.log('📊 Generando Dashboard Ejecutivo...');
        // Implementación específica
    }

    generateMultiClientAnalysis() {
        console.log('🏢 Generando Análisis Multi-Cliente...');
        // Implementación específica
    }

    generateMyEquipmentReport() {
        console.log('🔧 Generando Reporte de Mis Equipos...');
        // Implementación específica
    }

    generateMaintenanceHistory() {
        console.log('📝 Generando Historial de Mantenimientos...');
        // Implementación específica
    }

    // Utility methods
    formatDate(date) {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    getPermissionsForRole(role) {
        const permissions = {
            admin: ['read', 'write', 'delete', 'admin'],
            manager: ['read', 'write', 'manage'],
            client: ['read', 'view_own'],
            technician: ['read', 'write', 'technical']
        };
        
        return permissions[role] || ['read'];
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM cargado, inicializando Enhanced Reports Manager...');
    
    // Verificar que las dependencias estén disponibles
    if (!window.AuthManager) {
        console.error('❌ AuthManager no encontrado');
        return;
    }
    
    if (!window.API_URL) {
        console.error('❌ API_URL no configurada');
        return;
    }
    
    // Inicializar manager
    window.reportsManager = new EnhancedReportsManager();
    
    // Inicializar iconos de Lucide si está disponible
    if (window.lucide) {
        lucide.createIcons();
        console.log('✨ Iconos de Lucide inicializados');
    }
});

// Exportar para uso global
window.EnhancedReportsManager = EnhancedReportsManager;
