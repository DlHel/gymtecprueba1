/**
 * Sistema de Permisos por Roles - Gymtec ERP
 * Define qué módulos puede ver cada rol
 */

window.PERMISSIONS = {
    // Configuración de acceso por página
    pages: {
        'index.html': {
            roles: ['Admin', 'Manager', 'Technician', 'Client'],
            label: 'Dashboard'
        },
        'clientes.html': {
            roles: ['Admin', 'Manager', 'Technician'],
            label: 'Clientes'
        },
        'equipo.html': {
            roles: ['Admin', 'Manager', 'Technician'],
            label: 'Equipos'
        },
        'equipos.html': {
            roles: ['Admin', 'Manager', 'Technician'],
            label: 'Equipos'
        },
        'tickets.html': {
            roles: ['Admin', 'Manager', 'Technician', 'Client'],
            label: 'Tickets de Servicio'
        },
        'planificador.html': {
            roles: ['Admin', 'Manager'],
            label: 'Planificador'
        },
        'contratos.html': {
            roles: ['Admin', 'Manager'],
            label: 'Contratos y SLAs'
        },
        'inventario.html': {
            roles: ['Admin', 'Manager'],
            label: 'Inventario'
        },
        'modelos.html': {
            roles: ['Admin', 'Manager'],
            label: 'Modelos de Equipos'
        },
        'notifications-dashboard.html': {
            roles: ['Admin', 'Manager', 'Technician', 'Client'],
            label: 'Notificaciones'
        },
        'finanzas.html': {
            roles: ['Admin', 'Manager'],
            label: 'Finanzas'
        },
        'personal.html': {
            roles: ['Admin', 'Manager'],
            label: 'Personal'
        },
        'asistencia.html': {
            roles: ['Admin', 'Manager', 'Technician'],
            label: 'Control de Asistencia'
        },
        'reportes.html': {
            roles: ['Admin', 'Manager', 'Technician'],
            label: 'Reportes'
        },
        'configuracion.html': {
            roles: ['Admin'],
            label: 'Configuración'
        }
    },

    /**
     * Verificar si el usuario tiene acceso a una página
     */
    canAccessPage(page, userRole) {
        if (!page || !userRole) return false;
        
        const pageConfig = this.pages[page];
        if (!pageConfig) return true; // Si no está configurado, permitir acceso
        
        // Comparación case-insensitive
        const normalizedUserRole = userRole.toLowerCase();
        return pageConfig.roles.some(role => role.toLowerCase() === normalizedUserRole);
    },

    /**
     * Obtener páginas accesibles para un rol
     */
    getAccessiblePages(userRole) {
        if (!userRole) return [];
        
        return Object.entries(this.pages)
            .filter(([page, config]) => config.roles.includes(userRole))
            .map(([page, config]) => ({
                page,
                label: config.label
            }));
    },

    /**
     * Verificar acceso a la página actual
     */
    checkCurrentPageAccess() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            console.warn('🔒 Usuario no autenticado');
            window.location.href = '/login.html';
            return false;
        }

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const userRole = window.authManager.getUserRole();

        if (!this.canAccessPage(currentPage, userRole)) {
            console.warn(`🚫 Acceso denegado a ${currentPage} para rol ${userRole}`);
            alert(`No tienes permisos para acceder a esta página.\n\nTu rol: ${userRole}\nPágina: ${this.pages[currentPage]?.label || currentPage}`);
            window.location.href = '/index.html';
            return false;
        }

        return true;
    }
};

/**
 * Función global para verificar permisos de página
 * Llamar al inicio de cada página protegida
 */
window.checkPagePermissions = function() {
    return window.PERMISSIONS.checkCurrentPageAccess();
};
