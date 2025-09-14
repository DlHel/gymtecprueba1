/**
 * GYMTEC ERP - Service Tickets JavaScript
 * Sistema de tickets de servicio para mantenimiento completo de gimnasio
 * 
 * Funcionalidades:
 * - CRUD de service tickets
 * - Modal especializado con selección múltiple de equipos
 * - Equipos agrupados por tipo/modelo
 * - Filtros avanzados
 * - Integración con sistema de autenticación
 */

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que el AuthManager esté disponible
    const initTimeout = setTimeout(() => {
        console.error('❌ Timeout: AuthManager no disponible después de 5 segundos');
        window.location.href = '/login.html';
    }, 5000);

    const checkAuthManager = () => {
        if (window.authManager && typeof window.authManager.isAuthenticated === 'function') {
            clearTimeout(initTimeout);
            
            // Protección de autenticación
            if (!window.authManager.isAuthenticated()) {
                console.log('🔒 Usuario no autenticado, redirigiendo al login...');
                window.location.href = '/login.html';
                return;
            }
            
            console.log('✅ AuthManager disponible, inicializando Service Tickets...');
            initServiceTickets();
        } else {
            console.log('⏳ Esperando AuthManager...');
            setTimeout(checkAuthManager, 100);
        }
    };

    checkAuthManager();

    function initServiceTickets() {

    // Estado del módulo
    const state = {
        serviceTickets: [],
        clients: [],
        locations: [],
        technicians: [],
        equipment: [],
        currentFilters: {
            client_id: '',
            location_id: '',
            status: '',
            assigned_technician_id: ''
        },
        selectedEquipment: new Set(),
        editingTicketId: null, // ID del ticket que se está editando
        isLoading: false,
        error: null
    };

    // Capa de API con autenticación
    const api = {
        // Service Tickets
        getServiceTickets: async (filters = {}) => {
            try {
                const queryParams = new URLSearchParams(filters).toString();
                const response = await authenticatedFetch(`${API_URL}/service-tickets?${queryParams}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo service tickets:', error);
                throw error;
            }
        },

        createServiceTicket: async (data) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/service-tickets`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error creando service ticket');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error creando service ticket:', error);
                throw error;
            }
        },

        getServiceTicket: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo service ticket:', error);
                throw error;
            }
        },

        updateServiceTicket: async (id, data) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error actualizando service ticket');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error actualizando service ticket:', error);
                throw error;
            }
        },

        getServiceTicketEquipment: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}/equipment`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo equipos del service ticket:', error);
                throw error;
            }
        },

        // Clientes y ubicaciones
        getClients: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/clients`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo clientes:', error);
                throw error;
            }
        },

        getLocationsByClient: async (clientId) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/clients/${clientId}/locations`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo ubicaciones:', error);
                throw error;
            }
        },

        // Equipos agrupados para modal
        getEquipmentGrouped: async (locationId) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/locations/${locationId}/equipment/grouped`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo equipos agrupados:', error);
                throw error;
            }
        },

        // Técnicos
        getTechnicians: async () => {
            try {
                const response = await authenticatedFetch(`${API_URL}/users/technicians`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('❌ Error obteniendo técnicos:', error);
                throw error;
            }
        },

        deleteServiceTicket: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/service-tickets/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error eliminando service ticket');
                }
                return await response.json();
            } catch (error) {
                console.error('❌ Error eliminando service ticket:', error);
                throw error;
            }
        }
    };

    // Gestión de UI
    const ui = {
        showLoading: (show = true) => {
            const loadingEl = document.getElementById('loading-state');
            const contentEl = document.getElementById('service-tickets-container');
            const errorEl = document.getElementById('error-state');
            const emptyEl = document.getElementById('empty-state');

            if (loadingEl) loadingEl.classList.toggle('hidden', !show);
            if (contentEl) contentEl.classList.toggle('hidden', show);
            if (errorEl) errorEl.classList.add('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');

            state.isLoading = show;
        },

        showError: (message) => {
            const errorEl = document.getElementById('error-state');
            const errorMsgEl = document.getElementById('error-message');
            const loadingEl = document.getElementById('loading-state');
            const contentEl = document.getElementById('service-tickets-container');
            const emptyEl = document.getElementById('empty-state');

            if (errorMsgEl) errorMsgEl.textContent = message;
            if (errorEl) errorEl.classList.remove('hidden');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.classList.add('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');

            state.error = message;
            console.error('❌ UI Error:', message);
        },

        showEmpty: () => {
            const emptyEl = document.getElementById('empty-state');
            const loadingEl = document.getElementById('loading-state');
            const contentEl = document.getElementById('service-tickets-container');
            const errorEl = document.getElementById('error-state');

            if (emptyEl) emptyEl.classList.remove('hidden');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.classList.add('hidden');
            if (errorEl) errorEl.classList.add('hidden');
        },

        updateServiceTicketsTable: (tickets) => {
            const tbody = document.getElementById('service-tickets-table-body');
            const countEl = document.getElementById('tickets-count');

            if (!tbody) return;

            if (countEl) {
                countEl.textContent = `(${tickets.length})`;
            }

            if (tickets.length === 0) {
                ui.showEmpty();
                return;
            }

            // Mostrar contenido
            const contentEl = document.getElementById('service-tickets-container');
            const loadingEl = document.getElementById('loading-state');
            const errorEl = document.getElementById('error-state');
            const emptyEl = document.getElementById('empty-state');

            if (contentEl) contentEl.classList.remove('hidden');
            if (loadingEl) loadingEl.classList.add('hidden');
            if (errorEl) errorEl.classList.add('hidden');
            if (emptyEl) emptyEl.classList.add('hidden');

            tbody.innerHTML = tickets.map(ticket => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div>
                                <div class="text-sm font-medium text-gray-900">
                                    #${ticket.id} - ${ticket.title}
                                </div>
                                <div class="text-sm text-gray-500">
                                    ${ticket.description ? ticket.description.substring(0, 100) + (ticket.description.length > 100 ? '...' : '') : 'Sin descripción'}
                                </div>
                                ${ticket.scheduled_date ? `
                                    <div class="text-xs text-blue-600 mt-1">
                                        <i class="fas fa-calendar mr-1"></i>
                                        Programado: ${formatDate(ticket.scheduled_date)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${ticket.client_name}</div>
                        <div class="text-sm text-gray-500">
                            <i class="fas fa-map-marker-alt mr-1"></i>
                            ${ticket.location_name}
                        </div>
                        ${ticket.location_address ? `
                            <div class="text-xs text-gray-400">${ticket.location_address}</div>
                        ` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-1">
                                <div class="text-sm font-medium text-gray-900">
                                    ${ticket.completed_equipment_count || 0} / ${ticket.total_equipment_count || 0} equipos
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div class="bg-green-600 h-2 rounded-full" 
                                         style="width: ${ticket.progress_percentage || 0}%"></div>
                                </div>
                                <div class="text-xs text-gray-500 mt-1">
                                    ${ticket.progress_percentage || 0}% completado
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${getStatusBadge(ticket.status)}
                        ${getPriorityBadge(ticket.priority)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${ticket.assigned_technician_name ? `
                            <div class="flex items-center">
                                <i class="fas fa-user-cog text-blue-500 mr-2"></i>
                                ${ticket.assigned_technician_name}
                            </div>
                        ` : `
                            <span class="text-gray-400">
                                <i class="fas fa-user-slash mr-1"></i>
                                Sin asignar
                            </span>
                        `}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Creado: ${formatDate(ticket.created_at)}</div>
                        <div class="text-xs">por ${ticket.created_by_name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                            <button onclick="viewServiceTicket(${ticket.id})" 
                                class="text-blue-600 hover:text-blue-900"
                                title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="editServiceTicket(${ticket.id})" 
                                class="text-green-600 hover:text-green-900"
                                title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteServiceTicket(${ticket.id})" 
                                class="text-red-600 hover:text-red-900"
                                title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            console.log(`✅ Tabla actualizada con ${tickets.length} service tickets`);
        },

        updateEquipmentSelector: (groupedEquipment) => {
            const container = document.getElementById('equipment-groups-container');
            const equipmentSelector = document.getElementById('equipment-selector');
            const equipmentLoading = document.getElementById('equipment-loading');

            if (!container) return;

            // Mostrar selector y ocultar loading
            if (equipmentSelector) equipmentSelector.classList.remove('hidden');
            if (equipmentLoading) equipmentLoading.classList.add('hidden');

            if (!groupedEquipment || Object.keys(groupedEquipment).length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        <i class="fas fa-exclamation-triangle mb-2"></i>
                        <div>No hay equipos disponibles en esta ubicación</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = Object.entries(groupedEquipment).map(([category, models]) => `
                <div class="category-group mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-medium text-gray-800 flex items-center">
                            <i class="fas fa-layer-group text-blue-500 mr-2"></i>
                            ${category}
                            <span class="text-sm text-gray-500 ml-2">(${Object.values(models).reduce((sum, equipments) => sum + equipments.length, 0)} equipos)</span>
                        </h4>
                        <div class="space-x-1">
                            <button type="button" onclick="selectCategoryEquipment('${category}')"
                                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                Seleccionar categoría
                            </button>
                        </div>
                    </div>
                    
                    <div class="ml-4 space-y-3">
                        ${Object.entries(models).map(([modelKey, equipments]) => `
                            <div class="model-group">
                                <div class="flex items-center justify-between mb-1">
                                    <div class="text-sm font-medium text-gray-700 flex items-center">
                                        <i class="fas fa-cube text-green-500 mr-2"></i>
                                        ${modelKey}
                                        <span class="text-xs text-gray-500 ml-2">(${equipments.length})</span>
                                    </div>
                                    <button type="button" onclick="selectModelEquipment('${category}', '${modelKey}')"
                                        class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                        Seleccionar modelo
                                    </button>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-2 ml-4">
                                    ${equipments.map(equipment => `
                                        <label class="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                            <input type="checkbox" 
                                                value="${equipment.id}"
                                                onchange="toggleEquipment(${equipment.id})"
                                                class="mr-2 text-green-600 focus:ring-green-500">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-sm font-medium text-gray-900 truncate">
                                                    ${equipment.custom_id}
                                                </div>
                                                <div class="text-xs text-gray-500 truncate">
                                                    ${equipment.name}
                                                </div>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            // Actualizar contador
            updateSelectedEquipmentCount();
        }
    };

    // Funciones auxiliares
    function getStatusBadge(status) {
        const statusMap = {
            'pendiente': { color: 'yellow', text: 'Pendiente', icon: 'clock' },
            'en_progreso': { color: 'blue', text: 'En Progreso', icon: 'play' },
            'completado': { color: 'green', text: 'Completado', icon: 'check' },
            'cerrado': { color: 'gray', text: 'Cerrado', icon: 'lock' }
        };

        const statusInfo = statusMap[status] || { color: 'gray', text: status, icon: 'question' };
        return `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800">
                <i class="fas fa-${statusInfo.icon} mr-1"></i>
                ${statusInfo.text}
            </span>
        `;
    }

    function getPriorityBadge(priority) {
        const priorityMap = {
            'low': { color: 'green', text: 'Baja' },
            'medium': { color: 'yellow', text: 'Media' },
            'high': { color: 'orange', text: 'Alta' },
            'critical': { color: 'red', text: 'Crítica' }
        };

        const priorityInfo = priorityMap[priority] || { color: 'gray', text: priority };
        return `
            <div class="mt-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${priorityInfo.color}-100 text-${priorityInfo.color}-800">
                    ${priorityInfo.text}
                </span>
            </div>
        `;
    }

    function formatDate(dateString) {
        if (!dateString) return 'No especificada';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Funciones de gestión de equipos
    window.toggleEquipment = (equipmentId) => {
        if (state.selectedEquipment.has(equipmentId)) {
            state.selectedEquipment.delete(equipmentId);
        } else {
            state.selectedEquipment.add(equipmentId);
        }
        updateSelectedEquipmentCount();
    };

    window.selectAllEquipment = () => {
        const checkboxes = document.querySelectorAll('#equipment-selector input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            state.selectedEquipment.add(parseInt(checkbox.value));
        });
        updateSelectedEquipmentCount();
    };

    window.deselectAllEquipment = () => {
        const checkboxes = document.querySelectorAll('#equipment-selector input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            state.selectedEquipment.delete(parseInt(checkbox.value));
        });
        updateSelectedEquipmentCount();
    };

    window.selectCategoryEquipment = (category) => {
        const categoryGroup = document.querySelector(`[data-category="${category}"]`);
        if (categoryGroup) {
            const checkboxes = categoryGroup.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
                state.selectedEquipment.add(parseInt(checkbox.value));
            });
        }
        updateSelectedEquipmentCount();
    };

    window.selectModelEquipment = (category, modelKey) => {
        // Esta función se puede implementar si necesitamos selección por modelo específico
        console.log('Seleccionar modelo:', category, modelKey);
    };

    function updateSelectedEquipmentCount() {
        const countEl = document.getElementById('selected-equipment-count');
        if (countEl) {
            countEl.textContent = state.selectedEquipment.size;
        }
    }

    function updateSelectedEquipmentCheckboxes() {
        document.querySelectorAll('#equipment-selector input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = state.selectedEquipment.has(parseInt(checkbox.value));
        });
        updateSelectedEquipmentCount();
    }

    // Carga de datos
    async function loadInitialData() {
        try {
            console.log('🚀 Cargando datos iniciales...');

            const [clientsResponse, techniciansResponse] = await Promise.all([
                api.getClients().catch(() => ({ data: [] })),
                api.getTechnicians().catch(() => ({ data: [] }))
            ]);

            state.clients = clientsResponse.data || [];
            state.technicians = techniciansResponse.data || [];

            // Cargar filtros
            loadFilters();

            // Cargar service tickets inicial
            await loadServiceTickets();

            console.log('✅ Datos iniciales cargados');

        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            ui.showError('Error al cargar los datos iniciales. Por favor, recarga la página.');
        }
    }

    function loadFilters() {
        // Cargar clientes en filtros
        const clientFilterEl = document.getElementById('filter-client');
        const modalClientEl = document.getElementById('ticket-client');

        if (clientFilterEl) {
            clientFilterEl.innerHTML = '<option value="">Todos los clientes</option>' +
                state.clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
        }

        if (modalClientEl) {
            modalClientEl.innerHTML = '<option value="">Seleccionar cliente...</option>' +
                state.clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
        }

        // Cargar técnicos
        const technicianFilterEl = document.getElementById('filter-technician');
        if (technicianFilterEl) {
            technicianFilterEl.innerHTML = '<option value="">Todos los técnicos</option>' +
                state.technicians.map(tech => `<option value="${tech.id}">${tech.username}</option>`).join('');
        }
    }

    async function loadServiceTickets() {
        try {
            ui.showLoading(true);
            console.log('📋 Cargando service tickets...');

            const response = await api.getServiceTickets(state.currentFilters);
            state.serviceTickets = response.data || [];

            ui.updateServiceTicketsTable(state.serviceTickets);
            console.log(`✅ ${state.serviceTickets.length} service tickets cargados`);

        } catch (error) {
            console.error('❌ Error cargando service tickets:', error);
            ui.showError('Error al cargar los tickets de servicio');
        } finally {
            ui.showLoading(false);
        }
    }

    // Funciones de modal
    window.showCreateModal = () => {
        const modal = document.getElementById('service-ticket-modal');
        const form = document.getElementById('service-ticket-form');
        
        if (modal && form) {
            // Resetear formulario
            form.reset();
            state.selectedEquipment.clear();
            
            // Ocultar selector de equipos
            const equipmentSelector = document.getElementById('equipment-selector');
            const equipmentLoading = document.getElementById('equipment-loading');
            
            if (equipmentSelector) equipmentSelector.classList.add('hidden');
            if (equipmentLoading) {
                equipmentLoading.classList.remove('hidden');
                equipmentLoading.textContent = 'Selecciona una ubicación para cargar los equipos...';
            }
            
            modal.classList.remove('hidden');
        }
    };

    window.closeModal = () => {
        const modal = document.getElementById('service-ticket-modal');
        if (modal) {
            modal.classList.add('hidden');
            state.selectedEquipment.clear();
            state.editingTicketId = null;

            // Reset modal to create mode
            document.getElementById('modal-title').innerHTML = '<i data-lucide="clipboard-list" class="text-green-600 mr-2"></i>Nuevo Ticket de Servicio';
            const submitBtn = document.querySelector('#service-ticket-form button[type="submit"]');
            if(submitBtn) {
                submitBtn.innerHTML = '<i data-lucide="save" class="mr-2"></i>Crear Ticket de Servicio';
            }
        }
    };

    // Carga de ubicaciones por cliente
    window.loadLocationsForClient = async (clientId) => {
        const clientSelect = document.getElementById('ticket-client');
        const locationSelect = document.getElementById('ticket-location');
        
        if (!clientSelect || !locationSelect) return;
        
        const currentClientId = clientId || clientSelect.value;
        
        // Reset location and equipment
        locationSelect.innerHTML = '<option value="">Seleccionar ubicación...</option>';
        resetEquipmentSelector();
        
        if (!currentClientId) return;
        
        try {
            locationSelect.disabled = true;
            const response = await api.getLocationsByClient(currentClientId);
            const locations = response.data || [];
            
            locationSelect.innerHTML = '<option value="">Seleccionar ubicación...</option>' +
                locations.map(location => `
                    <option value="${location.id}">${location.name}</option>
                `).join('');
                
        } catch (error) {
            console.error('❌ Error cargando ubicaciones:', error);
            locationSelect.innerHTML = '<option value="">Error cargando ubicaciones</option>';
        } finally {
            locationSelect.disabled = false;
        }
    };

    // Carga de equipos por ubicación
    window.loadEquipmentForLocation = async (locationId) => {
        const locationSelect = document.getElementById('ticket-location');
        const equipmentLoading = document.getElementById('equipment-loading');
        
        if (!locationSelect) return;
        
        const currentLocationId = locationId || locationSelect.value;
        
        // Reset equipment selector
        resetEquipmentSelector();
        
        if (!currentLocationId) return;
        
        try {
            if (equipmentLoading) {
                equipmentLoading.classList.remove('hidden');
                equipmentLoading.textContent = 'Cargando equipos del gimnasio...';
            }
            
            const response = await api.getEquipmentGrouped(currentLocationId);
            const groupedEquipment = response.grouped_data || {};
            
            ui.updateEquipmentSelector(groupedEquipment);
            
        } catch (error) {
            console.error('❌ Error cargando equipos:', error);
            if (equipmentLoading) {
                equipmentLoading.textContent = 'Error cargando equipos. Intenta de nuevo.';
            }
        }
    };

    function resetEquipmentSelector() {
        const equipmentSelector = document.getElementById('equipment-selector');
        const equipmentLoading = document.getElementById('equipment-loading');
        
        if (equipmentSelector) equipmentSelector.classList.add('hidden');
        if (equipmentLoading) {
            equipmentLoading.classList.remove('hidden');
            equipmentLoading.textContent = 'Selecciona una ubicación para cargar los equipos...';
        }
        
        state.selectedEquipment.clear();
        updateSelectedEquipmentCount();
    }

    // Envío de formulario
    const form = document.getElementById('service-ticket-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');

            try {
                if (state.selectedEquipment.size === 0) {
                    alert('Debes seleccionar al menos un equipo para el servicio.');
                    return;
                }
                
                const formData = new FormData(form);
                const data = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    client_id: parseInt(formData.get('client_id')),
                    location_id: parseInt(formData.get('location_id')),
                    priority: formData.get('priority'),
                    status: 'pendiente', // Default status
                    assigned_technician_id: null, // Can be assigned later
                    scheduled_date: formData.get('scheduled_date') || null,
                    estimated_duration_hours: formData.get('estimated_duration_hours') ? parseFloat(formData.get('estimated_duration_hours')) : null,
                    equipment_ids: Array.from(state.selectedEquipment)
                };

                if (submitBtn) {
                    submitBtn.disabled = true;
                }

                if (state.editingTicketId) {
                    // Update existing ticket
                    data.status = (await api.getServiceTicket(state.editingTicketId)).data.status; // Preserve status on update
                    console.log('📝 Actualizando service ticket:', data);
                    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Guardando...';
                    
                    const response = await api.updateServiceTicket(state.editingTicketId, data);
                    console.log('✅ Service ticket actualizado:', response);
                    alert('Ticket de servicio actualizado exitosamente!');

                } else {
                    // Create new ticket
                    console.log('📝 Creando service ticket:', data);
                    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando...';
                    
                    const response = await api.createServiceTicket(data);
                    console.log('✅ Service ticket creado:', response);
                    alert(`Service ticket creado exitosamente!\nTicket #${response.service_ticket_id}\nEquipos incluidos: ${response.equipment_count}`);
                }
                
                closeModal();
                await loadServiceTickets();
                
            } catch (error) {
                console.error(`❌ Error en el formulario de service ticket: ${error.message}`);
                alert(`Error: ${error.message}`);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Event listeners para filtros
    document.getElementById('filter-client')?.addEventListener('change', (e) => {
        state.currentFilters.client_id = e.target.value;
        loadServiceTickets();
    });

    document.getElementById('filter-location')?.addEventListener('change', (e) => {
        state.currentFilters.location_id = e.target.value;
        loadServiceTickets();
    });

    document.getElementById('filter-status')?.addEventListener('change', (e) => {
        state.currentFilters.status = e.target.value;
        loadServiceTickets();
    });

    document.getElementById('filter-technician')?.addEventListener('change', (e) => {
        state.currentFilters.assigned_technician_id = e.target.value;
        loadServiceTickets();
    });

    // Funciones globales para acciones de tabla
    window.refreshServiceTickets = () => {
        loadServiceTickets();
    };

    window.viewServiceTicket = (id) => {
        window.location.href = `service-ticket-detail.html?id=${id}`;
    };

    window.editServiceTicket = async (id) => {
        console.log('✏️ Editando service ticket:', id);
        state.editingTicketId = id;

        try {
            const [ticketResponse, equipmentResponse] = await Promise.all([
                api.getServiceTicket(id),
                api.getServiceTicketEquipment(id)
            ]);

            const ticket = ticketResponse.data;
            const equipment = equipmentResponse.data;

            // Populate form
            document.getElementById('ticket-title').value = ticket.title;
            document.getElementById('ticket-description').value = ticket.description;
            document.getElementById('ticket-client').value = ticket.client_id;
            
            await window.loadLocationsForClient(ticket.client_id);
            document.getElementById('ticket-location').value = ticket.location_id;

            await window.loadEquipmentForLocation(ticket.location_id);

            state.selectedEquipment.clear();
            equipment.forEach(eq => state.selectedEquipment.add(eq.equipment_id));
            updateSelectedEquipmentCheckboxes();

            document.getElementById('ticket-priority').value = ticket.priority;
            document.getElementById('ticket-scheduled-date').value = ticket.scheduled_date ? ticket.scheduled_date.split('T')[0] : '';
            document.getElementById('ticket-duration').value = ticket.estimated_duration_hours;

            // Change modal for editing
            document.getElementById('modal-title').innerHTML = `<i data-lucide="clipboard-list" class="text-green-600 mr-2"></i>Editar Ticket de Servicio #${id}`;
            document.querySelector('#service-ticket-form button[type="submit"]').innerHTML = '<i data-lucide="save" class="mr-2"></i>Guardar Cambios';
            
            window.showCreateModal();

        } catch (error) {
            console.error('❌ Error preparando la edición del ticket:', error);
            alert('Error al cargar los datos del ticket para editar.');
            state.editingTicketId = null;
        }
    };

    window.deleteServiceTicket = async (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este service ticket?')) {
            console.log('🗑️ Eliminando service ticket:', id);
            try {
                await api.deleteServiceTicket(id);
                alert('Ticket de servicio eliminado exitosamente.');
                loadServiceTickets(); // Recargar la lista de tickets
            } catch (error) {
                console.error('❌ Error eliminando service ticket:', error);
                alert(`Error al eliminar el ticket de servicio: ${error.message}`);
            }
        }
    };

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('service-ticket-modal');
        if (e.target === modal) {
            closeModal();
        }
    });

    // Mostrar información de usuario
    const userInfo = window.authManager.getUser();
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl && userInfo) {
        userInfoEl.textContent = `${userInfo.username} (${userInfo.role})`;
    }

    // Función global de logout
    window.logout = () => {
        window.authManager.logout();
    };

    // Inicialización
    async function init() {
        try {
            console.log('🚀 Inicializando Service Tickets...');
            await loadInitialData();
            console.log('✅ Service Tickets inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Service Tickets:', error);
            ui.showError('Error fatal al inicializar la aplicación');
        }
    }

    // Ejecutar inicialización
    init();
    
    } // Cierre de initServiceTickets()
});
