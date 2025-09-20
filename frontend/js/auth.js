/**
 * Sistema de AutenticaciÃ³n Frontend - Gymtec ERP
 * Maneja tokens JWT, verificaciÃ³n de sesiones y redirecciones
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
     * Verificar si el usuario estÃ¡ autenticado
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * Verificar si el usuario tiene un rol especÃ­fico
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
     * Obtener headers de autorizaciÃ³n para fetch
     */
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    /**
     * Realizar fetch con autenticaciÃ³n automÃ¡tica
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

        // Si recibimos 401, el token expirÃ³ o es invÃ¡lido
        if (response.status === 401) {
            console.warn('ðŸ”’ Token expirado o invÃ¡lido (401), haciendo logout automÃ¡tico...');
            this.logout();
            window.location.href = '/login.html';
            throw new Error('SesiÃ³n expirada');
        }

        return response;
    }

    /**
     * Verificar token con el servidor
     */
    async verifyToken() {
        if (!this.isAuthenticated()) {
            console.log('ðŸ” verifyToken: No hay token, usuario no autenticado');
            return false;
        }

        try {
            console.log('ðŸ” verifyToken: Verificando token con servidor...');
            const response = await fetch(`${this.apiUrl}/auth/verify`, {
                headers: this.getAuthHeaders()
            });

            console.log('ðŸ” verifyToken: Respuesta del servidor:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('âœ… verifyToken: Token vÃ¡lido, usuario:', data.user?.username);
                // Actualizar datos del usuario si es necesario
                localStorage.setItem(this.userKey, JSON.stringify(data.user));
                return true;
            } else if (response.status === 401 || response.status === 403) {
                // Solo hacer logout si el token es realmente invÃ¡lido (401/403)
                console.warn('âŒ verifyToken: Token invÃ¡lido o expirado, haciendo logout');
                this.logout();
                return false;
            } else {
                // Para otros errores (500, timeout, etc), no hacer logout automÃ¡tico
                console.warn('âš ï¸ verifyToken: Error del servidor, pero manteniendo sesiÃ³n:', response.status);
                return false; // Retornar false pero NO hacer logout
            }
        } catch (error) {
            // Para errores de red, NO hacer logout automÃ¡tico
            console.warn('âš ï¸ verifyToken: Error de red, manteniendo sesiÃ³n:', error.message);
            return false; // Retornar false pero NO hacer logout
        }
    }

    /**
     * Proteger pÃ¡gina - redireccionar a login si no estÃ¡ autenticado
     */
    async protectPage(requiredRole = null) {
        console.log('ðŸ” protectPage: Iniciando protecciÃ³n de pÃ¡gina...');
        
        // Si no hay token, redireccionar a login
        if (!this.isAuthenticated()) {
            console.log('âŒ protectPage: No hay token, redirigiendo a login');
            this.redirectToLogin();
            return false;
        }

        console.log('âœ… protectPage: Token presente, verificando con servidor...');

        // Verificar token con el servidor
        const isValid = await this.verifyToken();
        if (isValid === false) {
            // Solo redireccionar si verifyToken retornÃ³ false Y el usuario ya no estÃ¡ autenticado
            // (esto significa que se hizo logout automÃ¡tico por token invÃ¡lido)
            if (!this.isAuthenticated()) {
                console.log('âŒ protectPage: Token invÃ¡lido, redirigiendo a login');
                this.redirectToLogin();
                return false;
            } else {
                // Si el token sigue presente pero la verificaciÃ³n fallÃ³ (error de red),
                // permitir el acceso pero mostrar warning
                console.warn('âš ï¸ protectPage: Error de red verificando token, pero permitiendo acceso');
            }
        }

        // Verificar rol si es requerido
        if (requiredRole && !this.hasRole(requiredRole)) {
            console.warn('âŒ protectPage: Rol insuficiente');
            this.showUnauthorized();
            return false;
        }

        console.log('âœ… protectPage: Acceso permitido');
        return true;
    }

    /**
     * Redireccionar a login
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        console.log('ðŸš¨ REDIRECT TO LOGIN LLAMADO desde:', currentPage);
        
        // PREVENIR BUCLES DE REDIRECCIÃ“N
        if (currentPage.includes('login.html')) {
            console.log('âš ï¸ Ya estamos en login, evitando bucle');
            return;
        }
        
        // Delay para evitar redirecciones demasiado rÃ¡pidas
        setTimeout(() => {
            const returnUrl = encodeURIComponent(currentPage + window.location.search);
            console.log('ðŸ”„ Redirigiendo a login con return URL:', returnUrl);
            window.location.href = `login.html?return=${returnUrl}`;
        }, 100);
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
                    <p class="text-gray-600 mb-6">No tienes permisos para acceder a esta pÃ¡gina.</p>
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
     * Cerrar sesiÃ³n
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

        // Redireccionar a login CON PROTECCIÃ“N ANTI-BUCLE
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html')) {
            console.log('âš ï¸ Ya estamos en login despuÃ©s de logout');
            return;
        }
        
        console.log('ðŸ”„ Logout: Redirigiendo a login');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 100);
    }

    /**
     * Cambiar contraseÃ±a
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
            throw new Error(error.error || 'Error cambiando contraseÃ±a');
        }

        return await response.json();
    }

    /**
     * Obtener informaciÃ³n del usuario para mostrar en la UI
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
     * Obtener color segÃºn el rol
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
     * Renderizar informaciÃ³n del usuario en el header
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
                            <i data-lucide="key" class="w-4 h-4 inline mr-2"></i>Cambiar ContraseÃ±a
                        </a>
                        <hr class="my-2">
                        <a href="#" onclick="authManager.logout()" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            <i data-lucide="log-out" class="w-4 h-4 inline mr-2"></i>Cerrar SesiÃ³n
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Event listener para el menÃº desplegable
        document.getElementById('user-menu-btn').addEventListener('click', () => {
            const menu = document.getElementById('user-menu');
            menu.classList.toggle('hidden');
        });

        // Cerrar menÃº al hacer clic fuera
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
     * Mostrar modal para cambiar contraseÃ±a
     */
    showChangePasswordModal() {
        // Implementar modal de cambio de contraseÃ±a
        console.log('Mostrar modal de cambio de contraseÃ±a');
        // Esta funcionalidad se puede implementar mÃ¡s adelante
    }
}

// Crear instancia global
window.authManager = new AuthManager();

// Compatibilidad con cÃ³digo que usa AuthManager (mayÃºscula)
window.AuthManager = window.authManager;

/**
 * FunciÃ³n de utilidad para proteger pÃ¡ginas
 * Usar al inicio de cada pÃ¡gina que requiera autenticaciÃ³n
 */
window.protectPage = async function(requiredRole = null) {
    return await window.authManager.protectPage(requiredRole);
};

/**
 * FunciÃ³n de utilidad para fetch autenticado
 */
window.authenticatedFetch = async function(url, options = {}) {
    return await window.authManager.authenticatedFetch(url, options);
};
