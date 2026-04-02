/**
 * Sistema de Autenticación Frontend - Gymtec ERP
 * Maneja tokens, gestión de sesiones y redirecciones
 */

class AuthManager {
    constructor() {
        this.apiUrl = window.API_URL || '/api';
        this.tokenKey = 'gymtec_token';
        this.userKey = 'gymtec_user';
        this.rememberKey = 'gymtec_remember';
    }

    normalizeRole(role) {
        const normalized = String(role || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();

        switch (normalized) {
            case 'admin':
            case 'administrador':
                return 'Admin';
            case 'manager':
            case 'gerente':
                return 'Manager';
            case 'technician':
            case 'tecnico':
                return 'Technician';
            case 'client':
            case 'cliente':
                return 'Cliente';
            case 'supervisor':
                return 'Supervisor';
            default:
                return String(role || '').trim();
        }
    }

    getStorageValue(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key);
    }

    setStoredAuth(token, user, remember = false) {
        const primaryStorage = remember ? localStorage : sessionStorage;
        const secondaryStorage = remember ? sessionStorage : localStorage;

        primaryStorage.setItem(this.tokenKey, token);
        primaryStorage.setItem(this.userKey, JSON.stringify(user));
        secondaryStorage.removeItem(this.tokenKey);
        secondaryStorage.removeItem(this.userKey);

        if (remember) {
            localStorage.setItem(this.rememberKey, 'true');
        } else {
            localStorage.removeItem(this.rememberKey);
        }
    }

    clearStoredAuth() {
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.rememberKey);
    }

    /**
     * Obtener token del localStorage
     */
    getToken() {
        return this.getStorageValue(this.tokenKey);
    }

    /**
     * Obtener datos del usuario del localStorage
     */
    getUser() {
        const userJson = this.getStorageValue(this.userKey);
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

        const userRole = this.normalizeRole(user.role);
        
        if (Array.isArray(role)) {
            return role.some((candidateRole) => this.normalizeRole(candidateRole) === userRole);
        }
        return userRole === this.normalizeRole(role);
    }

    /**
     * Verificar si el usuario es administrador
     */
    isAdmin() {
        return this.hasRole('admin') || this.hasRole('Admin');
    }

    /**
     * Verificar si el usuario es Manager
     */
    isManager() {
        return this.hasRole('manager') || this.hasRole('Manager');
    }

    /**
     * Verificar si el usuario es Technician
     */
    isTechnician() {
        return this.hasRole('technician') || this.hasRole('Technician');
    }

    /**
     * Verificar si el usuario es Client
     */
    isClient() {
        return this.hasRole('client') || this.hasRole('Client');
    }

    /**
     * Verificar si el usuario tiene permisos administrativos (Admin o Manager)
     */
    isAdminOrManager() {
        return this.isAdmin() || this.isManager();
    }

    /**
     * Obtener el rol del usuario actual
     */
    getUserRole() {
        const user = this.getUser();
        return user ? user.role : null;
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
        // Detectar si el body es FormData para no sobrescribir Content-Type
        const isFormData = options.body instanceof FormData;
        
        const headers = {
            // Solo agregar Content-Type: application/json si NO es FormData
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...this.getAuthHeaders(),
            ...(options.headers || {})
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si recibimos 401, el token expiró o es inválido
        if (response.status === 401) {
            console.warn('🔒 Token expirado o inválido (401), haciendo logout automático...');
            this.logout();
            throw new Error('Sesión expirada');
        }

        return response;
    }

    /**
     * Verificar token con el servidor - SIMPLIFICADO para evitar bucles
     */
    async verifyToken() {
        if (!this.isAuthenticated()) {
            console.log('🔐 verifyToken: No hay token');
            return false;
        }

        try {
            console.log('🔐 verifyToken: Verificando token...');
            const response = await fetch(`${this.apiUrl}/auth/verify`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ verifyToken: Token válido');
                const remember = localStorage.getItem(this.rememberKey) === 'true';
                this.setStoredAuth(this.getToken(), data.user, remember);
                return true;
            } else if (response.status === 401 || response.status === 403) {
                console.warn('❌ verifyToken: Token inválido');
                this.clearStoredAuth();
                return false;
            } else {
                // Error del servidor - mantener sesión
                console.warn('⚠️ verifyToken: Error del servidor, manteniendo sesión');
                return true; // Permitir acceso si hay error del servidor
            }
        } catch (error) {
            // Error de red - permitir acceso
            console.warn('⚠️ verifyToken: Error de red, permitiendo acceso');
            return true;
        }
    }

    /**
     * Proteger página - SIMPLIFICADO para evitar bucles
     */
    async protectPage(requiredRole = null) {
        console.log('🔒 protectPage: Verificando acceso...');
        
        // Si no hay token, redireccionar a login
        if (!this.isAuthenticated()) {
            console.log('❌ protectPage: No hay token');
            this.redirectToLogin();
            return false;
        }

        console.log('✅ protectPage: Token presente');

        // Verificar rol si es requerido
        if (requiredRole && !this.hasRole(requiredRole)) {
            console.warn('❌ protectPage: Rol insuficiente');
            this.showUnauthorized();
            return false;
        }

        console.log('✅ protectPage: Acceso permitido');
        return true;
    }

    /**
     * Redireccionar a login
     */
    redirectToLogin() {
        const currentPage = window.location.pathname;
        console.log('🚨 redirectToLogin desde:', currentPage);
        
        // PREVENIR BUCLES
        if (currentPage.includes('login.html')) {
            console.log('⚠️ Ya estamos en login');
            return;
        }
        
        setTimeout(() => {
            const returnUrl = encodeURIComponent(currentPage + window.location.search);
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
        this.clearStoredAuth();

        // Redireccionar a login
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html')) {
            window.location.href = 'login.html';
        }
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

    getUserInitials(username) {
        if (!username) return '??';
        const parts = username.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    }

    getRoleColor(role) {
        const colors = {
            'admin': 'bg-red-500',
            'Admin': 'bg-red-500',
            'manager': 'bg-blue-500',
            'Manager': 'bg-blue-500',
            'technician': 'bg-green-500',
            'Technician': 'bg-green-500',
            'client': 'bg-gray-500',
            'Client': 'bg-gray-500'
        };
        return colors[role] || 'bg-gray-500';
    }

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

        document.getElementById('user-menu-btn').addEventListener('click', () => {
            document.getElementById('user-menu').classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('user-menu');
            const btn = document.getElementById('user-menu-btn');
            if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    showChangePasswordModal() {
        console.log('Mostrar modal de cambio de contraseña');
    }
}

// Crear instancia global
window.authManager = new AuthManager();
window.AuthManager = window.authManager;

window.protectPage = async function(requiredRole = null) {
    return await window.authManager.protectPage(requiredRole);
};

window.authenticatedFetch = async function(url, options = {}) {
    return await window.authManager.authenticatedFetch(url, options);
};
