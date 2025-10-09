/**
 * Módulo de Gestión de Contratos - Versión Rediseñada
 * Sistema completo de CRUD con autenticación y UI moderna
 */

// Verificación de autenticación inmediata
if (!localStorage.getItem('authToken')) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando módulo de contratos...');

    // ================================
    // CONFIGURACIÓN Y ESTADO GLOBAL
    // ================================
    
    const state = {
        contracts: [],
        clients: [],
        filteredContracts: [],
        currentContract: null,
        isLoading: false,
        error: null,
        filters: {
            search: '',
            status: ''
        }
    };

    // ================================
    // ELEMENTOS DEL DOM
    // ================================
    
    const elements = {
        // Containers principales
        loadingState: document.getElementById('loading-state'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        emptyState: document.getElementById('empty-state'),
        
        // Estadísticas
        totalContracts: document.getElementById('total-contracts'),
        activeContracts: document.getElementById('active-contracts'),
        resultsCount: document.getElementById('results-count'),
        
        // Tabla
        tableBody: document.getElementById('contracts-table-body'),
        
        // Controles
        createBtn: document.getElementById('create-contract-btn'),
        refreshBtn: document.getElementById('refresh-btn'),
        searchInput: document.getElementById('search-input'),
        statusFilter: document.getElementById('status-filter'),
        
        // Modal
        modal: document.getElementById('contract-modal'),
        modalTitle: document.getElementById('modal-title'),
        closeModal: document.getElementById('close-modal'),
        contractForm: document.getElementById('contract-form'),
        cancelBtn: document.getElementById('cancel-btn'),
        
        // Form fields
        clientSelect: document.getElementById('contract-client'),
        statusSelect: document.getElementById('contract-status'),
        startDate: document.getElementById('contract-start-date'),
        endDate: document.getElementById('contract-end-date'),
        details: document.getElementById('contract-details'),
        
        // Notifications
        notification: document.getElementById('notification'),
        notificationMessage: document.getElementById('notification-message'),
        
        // Auth
        logoutBtn: document.getElementById('logout-btn')
    };

    // ================================
    // API FUNCTIONS
    // ================================
    
    const api = {
        // Obtener todos los contratos
        async getContracts() {
            console.log('📡 Obteniendo contratos...');
            const response = await window.authenticatedFetch(`${API_URL}/contracts`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Contratos obtenidos:', result.data?.length || 0);
            return result.data || [];
        },

        // Obtener clientes para el selector
        async getClients() {
            console.log('📡 Obteniendo clientes...');
            const response = await window.authenticatedFetch(`${API_URL}/clients`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Clientes obtenidos:', result.data?.length || 0);
            return result.data || [];
        },

        // Crear nuevo contrato
        async createContract(contractData) {
            console.log('📡 Creando contrato:', contractData);
            const response = await window.authenticatedFetch(`${API_URL}/contracts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contractData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Contrato creado:', result);
            return result;
        },

        // Actualizar contrato existente
        async updateContract(id, contractData) {
            console.log('📡 Actualizando contrato:', id, contractData);
            const response = await window.authenticatedFetch(`${API_URL}/contracts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contractData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Contrato actualizado:', result);
            return result;
        },

        // Eliminar contrato
        async deleteContract(id) {
            console.log('📡 Eliminando contrato:', id);
            const response = await window.authenticatedFetch(`${API_URL}/contracts/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }
            
            console.log('✅ Contrato eliminado');
            return true;
        }
    };

    // ================================
    // UI FUNCTIONS
    // ================================
    
    const ui = {
        // Mostrar/ocultar loading
        showLoading() {
            elements.loadingState?.classList.remove('hidden');
            elements.errorState?.classList.add('hidden');
            elements.emptyState?.classList.add('hidden');
        },

        hideLoading() {
            elements.loadingState?.classList.add('hidden');
        },

        // Mostrar errores
        showError(message) {
            console.error('❌ Error UI:', message);
            if (elements.errorMessage) elements.errorMessage.textContent = message;
            elements.errorState?.classList.remove('hidden');
            elements.loadingState?.classList.add('hidden');
        },

        hideError() {
            elements.errorState?.classList.add('hidden');
        },

        // Mostrar estado vacío
        showEmpty() {
            elements.emptyState?.classList.remove('hidden');
            if (elements.tableBody) elements.tableBody.innerHTML = '';
        },

        hideEmpty() {
            elements.emptyState?.classList.add('hidden');
        },

        // Actualizar estadísticas
        updateStats() {
            const total = state.contracts.length;
            const active = state.contracts.filter(c => c.status === 'active').length;
            
            if (elements.totalContracts) elements.totalContracts.textContent = total;
            if (elements.activeContracts) elements.activeContracts.textContent = active;
            
            const filtered = state.filteredContracts.length;
            if (elements.resultsCount) {
                elements.resultsCount.textContent = filtered === total ? 
                    `(${total} contratos)` : 
                    `(${filtered} de ${total} contratos)`;
            }
        },

        // Obtener badge de estado
        getStatusBadge(status) {
            const badges = {
                'active': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><i data-lucide="check-circle" class="h-3 w-3 mr-1"></i>Activo</span>',
                'inactive': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><i data-lucide="pause-circle" class="h-3 w-3 mr-1"></i>Inactivo</span>',
                'pending': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><i data-lucide="clock" class="h-3 w-3 mr-1"></i>Pendiente</span>',
                'expired': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><i data-lucide="alert-circle" class="h-3 w-3 mr-1"></i>Expirado</span>'
            };
            return badges[status] || badges['inactive'];
        },

        // Formatear fecha
        formatDate(dateString) {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                console.warn('Error formateando fecha:', dateString, error);
                return '-';
            }
        },

        // Obtener nombre del cliente
        getClientName(clientId) {
            const client = state.clients.find(c => c.id === clientId);
            return client ? client.name : `Cliente #${clientId}`;
        },

        // Renderizar tabla de contratos
        renderTable() {
            if (!elements.tableBody) return;

            if (state.filteredContracts.length === 0) {
                this.showEmpty();
                return;
            }

            this.hideEmpty();

            const rows = state.filteredContracts.map(contract => {
                const startDate = this.formatDate(contract.start_date);
                const endDate = this.formatDate(contract.end_date);
                const clientName = this.getClientName(contract.client_id);
                const statusBadge = this.getStatusBadge(contract.status);

                return `
                    <tr class="hover:bg-gray-50 transition-colors group">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <i data-lucide="file-text" class="h-4 w-4 text-gray-400 mr-3"></i>
                                <div>
                                    <div class="text-sm font-medium text-gray-900">Contrato #${contract.id}</div>
                                    <div class="text-sm text-gray-500">${contract.details ? contract.details.substring(0, 50) + '...' : 'Sin descripción'}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <i data-lucide="building" class="h-4 w-4 text-gray-400 mr-2"></i>
                                <div class="text-sm text-gray-900">${clientName}</div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${statusBadge}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div class="flex items-center space-x-2">
                                <i data-lucide="calendar" class="h-4 w-4 text-gray-400"></i>
                                <div>
                                    <div>Inicio: ${startDate}</div>
                                    <div>Fin: ${endDate}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <i data-lucide="clock" class="h-4 w-4 text-blue-400 mr-2"></i>
                                <span class="text-sm text-gray-900">24h</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div class="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="editContract(${contract.id})" 
                                        class="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50">
                                    <i data-lucide="edit" class="h-4 w-4"></i>
                                </button>
                                <button onclick="deleteContract(${contract.id})" 
                                        class="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50">
                                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            elements.tableBody.innerHTML = rows;
            
            // Reinicializar iconos de Lucide
            lucide.createIcons();
            
            this.updateStats();
        },

        // Cargar clientes en el selector
        loadClientOptions() {
            if (!elements.clientSelect) return;

            const options = ['<option value="">Seleccionar cliente...</option>'];
            state.clients.forEach(client => {
                options.push(`<option value="${client.id}">${client.name}</option>`);
            });

            elements.clientSelect.innerHTML = options.join('');
        },

        // Mostrar notificación
        showNotification(message, type = 'success') {
            if (!elements.notification || !elements.notificationMessage) return;

            elements.notificationMessage.textContent = message;
            
            // Cambiar color según tipo
            elements.notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 
                'bg-blue-500'
            } text-white`;
            
            elements.notification.classList.remove('hidden');
            
            setTimeout(() => {
                elements.notification.classList.add('hidden');
            }, 3000);
        }
    };

    // ================================
    // FILTROS Y BÚSQUEDA
    // ================================
    
    function applyFilters() {
        const searchTerm = state.filters.search.toLowerCase();
        const statusFilter = state.filters.status;

        state.filteredContracts = state.contracts.filter(contract => {
            // Filtro de búsqueda
            const matchesSearch = !searchTerm || 
                contract.id.toString().includes(searchTerm) ||
                contract.details?.toLowerCase().includes(searchTerm) ||
                ui.getClientName(contract.client_id).toLowerCase().includes(searchTerm);

            // Filtro de estado
            const matchesStatus = !statusFilter || contract.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        ui.renderTable();
    }

    // ================================
    // MODAL FUNCTIONS
    // ================================
    
    function openModal(contract = null) {
        if (!elements.modal) return;

        state.currentContract = contract;
        
        if (contract) {
            elements.modalTitle.textContent = 'Editar Contrato';
            fillForm(contract);
        } else {
            elements.modalTitle.textContent = 'Nuevo Contrato';
            elements.contractForm.reset();
        }

        elements.modal.classList.remove('hidden');
    }

    function closeModal() {
        if (!elements.modal) return;
        elements.modal.classList.add('hidden');
        elements.contractForm.reset();
        state.currentContract = null;
    }

    function fillForm(contract) {
        if (elements.clientSelect) elements.clientSelect.value = contract.client_id || '';
        if (elements.statusSelect) elements.statusSelect.value = contract.status || '';
        if (elements.startDate) elements.startDate.value = contract.start_date ? contract.start_date.split('T')[0] : '';
        if (elements.endDate) elements.endDate.value = contract.end_date ? contract.end_date.split('T')[0] : '';
        if (elements.details) elements.details.value = contract.details || '';
    }

    // ================================
    // CRUD OPERATIONS
    // ================================
    
    async function createContract(formData) {
        try {
            await api.createContract(formData);
            ui.showNotification('Contrato creado exitosamente');
            closeModal();
            await loadData();
        } catch (error) {
            console.error('Error creando contrato:', error);
            ui.showNotification('Error al crear el contrato: ' + error.message, 'error');
        }
    }

    async function updateContract(id, formData) {
        try {
            await api.updateContract(id, formData);
            ui.showNotification('Contrato actualizado exitosamente');
            closeModal();
            await loadData();
        } catch (error) {
            console.error('Error actualizando contrato:', error);
            ui.showNotification('Error al actualizar el contrato: ' + error.message, 'error');
        }
    }

    // Funciones globales para botones en la tabla
    window.editContract = function(id) {
        const contract = state.contracts.find(c => c.id === id);
        if (contract) {
            openModal(contract);
        }
    };

    window.deleteContract = async function(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este contrato?')) {
            return;
        }

        try {
            await api.deleteContract(id);
            ui.showNotification('Contrato eliminado exitosamente');
            await loadData();
        } catch (error) {
            console.error('Error eliminando contrato:', error);
            ui.showNotification('Error al eliminar el contrato: ' + error.message, 'error');
        }
    };

    // ================================
    // DATA LOADING
    // ================================
    
    async function loadData() {
        try {
            ui.showLoading();
            ui.hideError();

            // Cargar datos en paralelo
            const [contractsData, clientsData] = await Promise.all([
                api.getContracts(),
                api.getClients()
            ]);

            state.contracts = contractsData;
            state.clients = clientsData;
            state.filteredContracts = contractsData;

            ui.loadClientOptions();
            ui.renderTable();

        } catch (error) {
            console.error('Error cargando datos:', error);
            ui.showError('Error al cargar los datos: ' + error.message);
        } finally {
            ui.hideLoading();
        }
    }

    // ================================
    // EVENT LISTENERS
    // ================================
    
    // Búsqueda en tiempo real
    elements.searchInput?.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        applyFilters();
    });

    // Filtro de estado
    elements.statusFilter?.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        applyFilters();
    });

    // Botones principales
    elements.createBtn?.addEventListener('click', () => openModal());
    elements.refreshBtn?.addEventListener('click', loadData);

    // Modal
    elements.closeModal?.addEventListener('click', closeModal);
    elements.cancelBtn?.addEventListener('click', closeModal);
    
    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeModal();
        }
    });

    // Formulario
    elements.contractForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const contractData = {
            client_id: parseInt(formData.get('client_id')),
            status: formData.get('status'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            details: formData.get('details')
        };

        if (state.currentContract) {
            await updateContract(state.currentContract.id, contractData);
        } else {
            await createContract(contractData);
        }
    });

    // Logout
    elements.logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
    });

    // ================================
    // INICIALIZACIÓN
    // ================================
    
    console.log('⚙️ Configurando módulo...');
    
    // Cargar datos iniciales
    await loadData();
    
    console.log('✅ Módulo de contratos inicializado correctamente');
});