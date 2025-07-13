// personal.js - Gestión completa de personal/usuarios
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api'
};

class PersonalManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentUser = null;
        this.searchTerm = '';
        this.filterRole = '';
        this.filterStatus = '';
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando módulo de Personal...');
        this.setupEventListeners();
        await this.loadUsers();
        this.updateStatistics();
        console.log('✅ Módulo de Personal inicializado');
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('add-user-btn').addEventListener('click', () => this.openUserModal());
        document.getElementById('refresh-users').addEventListener('click', () => this.loadUsers());

        // Modales
        document.getElementById('close-modal').addEventListener('click', () => this.closeUserModal());
        document.getElementById('cancel-user').addEventListener('click', () => this.closeUserModal());
        document.getElementById('close-confirm-modal').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('cancel-action').addEventListener('click', () => this.closeConfirmModal());

        // Formularios
        document.getElementById('user-form').addEventListener('submit', (e) => this.handleUserSubmit(e));
        document.getElementById('confirm-action').addEventListener('click', () => this.executeConfirmedAction());

        // Filtros y búsqueda
        document.getElementById('search-users').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('filter-role').addEventListener('change', (e) => this.handleFilterRole(e));
        document.getElementById('filter-status').addEventListener('change', (e) => this.handleFilterStatus(e));

        // Cambio de rol para mostrar permisos
        document.getElementById('role').addEventListener('change', (e) => this.updateRolePermissions(e.target.value));

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeUserModal();
                this.closeConfirmModal();
            }
        });
    }

    async loadUsers() {
        console.log('📋 Cargando usuarios...');
        const tableBody = document.getElementById('users-table-body');
        
        // Mostrar loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <div class="loading">
                        <i data-lucide="loader"></i>
                        <span>Cargando usuarios...</span>
                    </div>
                </td>
            </tr>
        `;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/users`);
            const data = await response.json();
            
            if (data.message === 'success') {
                this.users = data.data;
                this.applyFilters();
                this.updateStatistics();
                console.log(`✅ ${this.users.length} usuarios cargados`);
            } else {
                throw new Error('Error al cargar usuarios');
            }
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.showError('Error al cargar los usuarios');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8">
                        <div class="error-state">
                            <i data-lucide="alert-circle"></i>
                            <span>Error al cargar usuarios</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    renderUsers() {
        const tableBody = document.getElementById('users-table-body');
        
        if (this.filteredUsers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8">
                        <div class="empty-state">
                            <i data-lucide="users"></i>
                            <span>No se encontraron usuarios</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.filteredUsers.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            <i data-lucide="user"></i>
                        </div>
                        <div>
                            <div class="user-name">${user.username}</div>
                            <div class="user-id">ID: ${user.id}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge role-${user.role?.toLowerCase()}">${user.role}</span>
                </td>
                <td>
                    <span class="status-badge status-${user.status?.toLowerCase()}">${user.status}</span>
                </td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="personalManager.editUser(${user.id})" title="Editar">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="personalManager.deleteUser(${user.id})" title="Eliminar">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Re-inicializar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    updateStatistics() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.status === 'Activo').length;
        const technicianUsers = this.users.filter(user => user.role === 'Tecnico').length;
        const adminUsers = this.users.filter(user => user.role === 'Admin').length;

        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('active-users').textContent = activeUsers;
        document.getElementById('technician-users').textContent = technicianUsers;
        document.getElementById('admin-users').textContent = adminUsers;
    }

    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.applyFilters();
    }

    handleFilterRole(e) {
        this.filterRole = e.target.value;
        this.applyFilters();
    }

    handleFilterStatus(e) {
        this.filterStatus = e.target.value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = !this.searchTerm || 
                user.username.toLowerCase().includes(this.searchTerm) ||
                user.email.toLowerCase().includes(this.searchTerm) ||
                user.role.toLowerCase().includes(this.searchTerm);
            
            const matchesRole = !this.filterRole || user.role === this.filterRole;
            const matchesStatus = !this.filterStatus || user.status === this.filterStatus;
            
            return matchesSearch && matchesRole && matchesStatus;
        });
        
        this.renderUsers();
    }

    openUserModal(user = null) {
        this.currentUser = user;
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const title = document.getElementById('modal-title');
        const passwordField = document.getElementById('password');

        if (user) {
            title.textContent = 'Editar Usuario';
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('role').value = user.role;
            document.getElementById('status').value = user.status;
            passwordField.required = false;
            passwordField.placeholder = 'Dejar vacío para mantener contraseña actual';
        } else {
            title.textContent = 'Agregar Usuario';
            form.reset();
            passwordField.required = true;
            passwordField.placeholder = 'Contraseña del usuario';
        }

        this.updateRolePermissions(user ? user.role : '');
        modal.style.display = 'flex';
    }

    closeUserModal() {
        document.getElementById('user-modal').style.display = 'none';
        this.currentUser = null;
    }

    async handleUserSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);
        
        // Validaciones
        if (!this.validateUserData(userData)) {
            return;
        }

        try {
            const url = this.currentUser 
                ? `${CONFIG.API_BASE_URL}/users/${this.currentUser.id}`
                : `${CONFIG.API_BASE_URL}/users`;
            
            const method = this.currentUser ? 'PUT' : 'POST';
            
            // Si es edición y no hay contraseña, no enviarla
            if (this.currentUser && !userData.password) {
                delete userData.password;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();
            
            if (response.ok && result.message === 'success') {
                this.showSuccess(this.currentUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
                this.closeUserModal();
                await this.loadUsers();
            } else {
                throw new Error(result.error || 'Error al guardar usuario');
            }
        } catch (error) {
            console.error('❌ Error guardando usuario:', error);
            this.showError(error.message);
        }
    }

    validateUserData(userData) {
        if (!userData.username || userData.username.length < 3) {
            this.showError('El nombre de usuario debe tener al menos 3 caracteres');
            return false;
        }

        if (!userData.email || !this.isValidEmail(userData.email)) {
            this.showError('El email no es válido');
            return false;
        }

        if (!this.currentUser && (!userData.password || userData.password.length < 6)) {
            this.showError('La contraseña debe tener al menos 6 caracteres');
            return false;
        }

        if (!userData.role) {
            this.showError('Debe seleccionar un rol');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.openUserModal(user);
        }
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.openConfirmModal(
                `¿Está seguro que desea eliminar el usuario "${user.username}"?`,
                () => this.executeDeleteUser(userId)
            );
        }
    }

    async executeDeleteUser(userId) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/${userId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showSuccess('Usuario eliminado exitosamente');
                await this.loadUsers();
            } else {
                throw new Error(result.error || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('❌ Error eliminando usuario:', error);
            this.showError(error.message);
        }
    }

    updateRolePermissions(role) {
        const permissionsContainer = document.getElementById('role-permissions');
        const permissions = this.getRolePermissions(role);
        
        if (permissions.length > 0) {
            permissionsContainer.innerHTML = `
                <ul class="permissions-list">
                    ${permissions.map(permission => `
                        <li class="permission-item">
                            <i data-lucide="check"></i>
                            <span>${permission}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
        } else {
            permissionsContainer.innerHTML = '<p class="text-sm text-gray-600">Selecciona un rol para ver los permisos</p>';
        }

        // Re-inicializar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    getRolePermissions(role) {
        const permissions = {
            'Admin': [
                'Acceso completo al sistema',
                'Gestionar usuarios y roles',
                'Configurar sistema',
                'Ver todos los reportes',
                'Gestionar clientes y equipos',
                'Administrar tickets'
            ],
            'Supervisor': [
                'Supervisar técnicos',
                'Ver reportes de equipo',
                'Gestionar tickets asignados',
                'Acceder a datos de clientes',
                'Aprobar horas extras'
            ],
            'Tecnico': [
                'Gestionar tickets asignados',
                'Actualizar estado de equipos',
                'Registrar tiempo de trabajo',
                'Acceder a inventario de repuestos',
                'Ver información de clientes asignados'
            ],
            'Cliente': [
                'Ver estado de sus equipos',
                'Crear solicitudes de servicio',
                'Ver historial de tickets',
                'Acceder a reportes básicos'
            ]
        };

        return permissions[role] || [];
    }

    openConfirmModal(message, action) {
        document.getElementById('confirm-message').textContent = message;
        this.confirmAction = action;
        document.getElementById('confirm-modal').style.display = 'flex';
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').style.display = 'none';
        this.confirmAction = null;
    }

    executeConfirmedAction() {
        if (this.confirmAction) {
            this.confirmAction();
        }
        this.closeConfirmModal();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Inicializar icono
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    window.personalManager = new PersonalManager();
});