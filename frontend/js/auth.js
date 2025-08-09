/**
 * Sistema de Autenticación Frontend - Gymtec ERP
 * Maneja tokens JWT, verificación de sesiones y redirecciones
 */

class AuthManager {
    constructor() {
        this.apiUrl = window.API_URL || 'http://localhost:3000/api';
        this.tokenKey = 'gymtec_token';
        this.userKey = 'gymtec_user';
        this.rememberKey = 'gymtec_remember';
    }

    /**
     * Obtener token del localStorage
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Obtener datos del usuario del localStorage
     */
    getUser() {
        const userJson = localStorage.getItem(this.userKey);
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Verificar si el usuario tiene un rol específico
     */
    hasRole(role) {
        const user = this.getUser();
        if (!user) return false;
        
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    }

    /**
     * Verificar si el usuario es administrador
     */
    isAdmin() {
        return this.hasRole('Admin');
    }

    /**
     * Obtener headers de autorización para fetch
     */
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Realizar fetch con autenticación automática
     */
    async authenticatedFetch(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si recibimos 401, el token expiró o es inválido
        if (response.status === 401) {
            this.logout();
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }

        return response;
    }

    /**
     * Verificar token con el servidor
     */
    async verifyToken() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiUrl}/auth/verify`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                // Actualizar datos del usuario si es necesario
                localStorage.setItem(this.userKey, JSON.stringify(data.user));
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.warn('Error verificando token:', error);
            return false;
        }
    }

    /**
     * Proteger página - redireccionar a login si no está autenticado
     */
    async protectPage(requiredRole = null) {
        // Si no hay token, redireccionar a login
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }

        // Verificar token con el servidor
        const isValid = await this.verifyToken();
        if (!isValid) {
            this.redirectToLogin();
            return false;
        }

        // Verificar rol si es requerido
        if (requiredRole && !this.hasRole(requiredRole)) {
            this.showUnauthorized();
            return false;
        }

        return true;
    }

    /**
     * Redireccionar a login
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPage + window.location.search);
        window.location.href = `login.html?return=${returnUrl}`;
    }

    /**
     * Mostrar mensaje de no autorizado
     */
    showUnauthorized() {
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-100">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
                    <div class="mb-4">
                        <i data-lucide="shield-alert" class="w-16 h-16 mx-auto text-red-500"></i>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
                    <p class="text-gray-600 mb-6">No tienes permisos para acceder a esta página.</p>
                    <button onclick="window.location.href='index.html'" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg">
                        Volver al Dashboard
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Cerrar sesión
     */
    async logout() {
        const token = this.getToken();
        
        // Notificar al servidor (opcional)
        if (token) {
            try {
                await fetch(`${this.apiUrl}/auth/logout`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            } catch (error) {
                console.warn('Error en logout:', error);
            }
        }

        // Limpiar datos locales
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.rememberKey);

        // Redireccionar a login
        window.location.href = 'login.html';
    }

    /**
     * Cambiar contraseña
     */
    async changePassword(currentPassword, newPassword) {
        const response = await this.authenticatedFetch(`${this.apiUrl}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error cambiando contraseña');
        }

        return await response.json();
    }

    /**
     * Obtener información del usuario para mostrar en la UI
     */
    getUserDisplayInfo() {
        const user = this.getUser();
        if (!user) return null;

        return {
            username: user.username,
            email: user.email,
            role: user.role,
            initials: this.getUserInitials(user.username),
            roleColor: this.getRoleColor(user.role)
        };
    }

    /**
     * Obtener iniciales del usuario
     */
    getUserInitials(username) {
        if (!username) return '??';
        
        const parts = username.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    }

    /**
     * Obtener color según el rol
     */
    getRoleColor(role) {
        const colors = {
            'Admin': 'bg-red-500',
            'Supervisor': 'bg-blue-500',
            'Tecnico': 'bg-green-500',
            'Cliente': 'bg-gray-500'
        };
        return colors[role] || 'bg-gray-500';
    }

    /**
     * Renderizar información del usuario en el header
     */
    renderUserInfo(containerId = 'user-info') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const userInfo = this.getUserDisplayInfo();
        if (!userInfo) return;

        container.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 ${userInfo.roleColor} rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        ${userInfo.initials}
                    </div>
                    <div class="hidden md:block">
                        <div class="text-sm font-medium text-gray-900">${userInfo.username}</div>
                        <div class="text-xs text-gray-500">${userInfo.role}</div>
                    </div>
                </div>
                <div class="relative">
                    <button id="user-menu-btn" class="flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                    </button>
                    <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                        <a href="#" onclick="authManager.showChangePasswordModal()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <i data-lucide="key" class="w-4 h-4 inline mr-2"></i>Cambiar Contraseña
                        </a>
                        <hr class="my-2">
                        <a href="#" onclick="authManager.logout()" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i>Cerrar Sesión
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Event listener para el menú desplegable
        document.getElementById('user-menu-btn').addEventListener('click', () => {
            const menu = document.getElementById('user-menu');
            menu.classList.toggle('hidden');
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('user-menu');
            const btn = document.getElementById('user-menu-btn');
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Inicializar iconos
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Mostrar modal para cambiar contraseña
     */
    showChangePasswordModal() {
        // Implementar modal de cambio de contraseña
        console.log('Mostrar modal de cambio de contraseña');
        // Esta funcionalidad se puede implementar más adelante
    }
}

// Crear instancia global
window.authManager = new AuthManager();

/**
 * Función de utilidad para proteger páginas
 * Usar al inicio de cada página que requiera autenticación
 */
window.protectPage = async function(requiredRole = null) {
    return await window.authManager.protectPage(requiredRole);
};

/**
 * Función de utilidad para fetch autenticado
 */
window.authenticatedFetch = async function(url, options = {}) {
    return await window.authManager.authenticatedFetch(url, options);
};
