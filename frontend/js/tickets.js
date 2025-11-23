// API_URL se define en config.js

let state = {
    tickets: [],
    clients: [],
    locations: [],
    equipment: [],
    ticketPrefillData: null,
    filteredTickets: [],
    currentFilters: {
        search: '',
        status: '',
        priority: '',
        client: '',
        type: ''
    },
    // Estado específico para gimnación
    gimnacion: {
        selectedEquipment: [],
        checklistTemplates: [],
        selectedTemplate: null,
        contracts: []
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 TICKETS: Iniciando verificación de autenticación...');
    
    // --- DOM Elements (DESPUÉS de que el DOM esté cargado) ---
    const ticketList = document.getElementById('ticket-list');
    const clientSelect = document.querySelector('[name="client_id"]');
    const locationSelect = document.querySelector('[name="location_id"]');
    const equipmentSelect = document.querySelector('[name="equipment_id"]');
    const ticketModalForm = document.getElementById('ticket-form');
    const addClientModalForm = document.getElementById('add-client-modal-form');
    const addLocationModalForm = document.getElementById('add-location-modal-form');
    const addEquipmentModalForm = document.getElementById('add-equipment-modal-form');

    // Elementos para filtros y búsqueda
    const searchInput = document.getElementById('tickets-search');
    const statusFilter = document.getElementById('tickets-filter-status');
    const priorityFilter = document.getElementById('tickets-filter-priority');
    const clientFilter = document.getElementById('tickets-filter-client');
    const typeFilter = document.getElementById('tickets-filter-type');
    const clearFiltersBtn = document.getElementById('tickets-clear-filters');
    const emptyState = document.getElementById('tickets-empty-state');

    // Elementos DOM específicos para gimnación
    const addGimnacionBtn = document.getElementById('add-gimnacion-btn');
    const gimnacionModal = document.getElementById('gimnacion-modal');
    const gimnacionForm = document.getElementById('gimnacion-form');
    const equipmentScopeContainer = document.getElementById('equipment-scope-container');
    const checklistTemplateSelect = document.getElementById('checklist-template-select');
    const checklistPreviewContainer = document.getElementById('checklist-preview-container');
    const checklistPreview = document.getElementById('checklist-preview');
    
    // Verificar que estamos en la página correcta
    if (!ticketList) {
        console.warn('⚠️ TICKETS: ticketList no encontrado en DOM');
        return;
    }
    
    // ============================================
    // PROTECCIÓN DE AUTENTICACIÓN (CRÍTICO)
    // Verificación local simple (patrón @bitacora)
    // ============================================
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.error('❌ TICKETS: Usuario no autenticado, redirigiendo a login...');
        // Usar redirectToLogin() para preservar returnUrl
        if (window.authManager && typeof window.authManager.redirectToLogin === 'function') {
            window.authManager.redirectToLogin();
        } else {
            // Fallback: construir returnUrl manualmente
            const currentPage = window.location.pathname;
            const returnUrl = encodeURIComponent(currentPage + window.location.search);
            window.location.href = `login.html?return=${returnUrl}`;
        }
        return;
    }    console.log('✅ TICKETS: Autenticación verificada, inicializando...');
    
    // Obtener referencias a nuevos elementos del checklist
    const checklistEditableContainer = document.getElementById('checklist-editable-container');
    const checklistEditableItems = document.getElementById('checklist-editable-items');
    
    // Hacer elementos DOM disponibles globalmente para funciones
    window.ticketsElements = {
        ticketList,
        clientSelect,
        locationSelect, 
        equipmentSelect,
        ticketModalForm,
        addClientModalForm,
        addLocationModalForm,
        addEquipmentModalForm,
        searchInput,
        statusFilter,
        priorityFilter,
        clientFilter,
        typeFilter,
        clearFiltersBtn,
        emptyState,
        addGimnacionBtn,
        gimnacionModal,
        gimnacionForm,
        equipmentScopeContainer,
        checklistTemplateSelect,
        checklistPreviewContainer,
        checklistPreview,
        checklistEditableContainer,
        checklistEditableItems
    };
    
    // Inicializar la aplicación con función async
    async function initializeTickets() {
        try {
            await fetchAllInitialData();
            checkForUrlParams();
            setupFilters();
            
            // Inicializar editor de checklist
            if (typeof initChecklistEditor === 'function') {
                initChecklistEditor();
            }
            
            console.log('✅ TICKETS: Inicialización completada');
        } catch (error) {
            console.error('❌ TICKETS: Error en inicialización:', error);
        }
    }
    
    // Ejecutar inicialización
    initializeTickets();
    
    // --- Event Listeners ---
    const addTicketBtn = document.getElementById('add-ticket-btn');
    if (addTicketBtn) {
        addTicketBtn.addEventListener('click', () => openModal('ticket-modal'));
        console.log('✅ TICKETS: Event listener para add-ticket-btn configurado');
    } else {
        console.warn('⚠️ TICKETS: add-ticket-btn no encontrado');
    }
    
    // Event listener para botón de gimnación
    if (addGimnacionBtn) {
        addGimnacionBtn.addEventListener('click', () => {
            console.log('🏢 TICKETS: Botón gimnación clickeado');
            openGimnacionModal();
        });
        console.log('✅ TICKETS: Event listener para add-gimnacion-btn configurado');
    } else {
        console.warn('⚠️ TICKETS: add-gimnacion-btn no encontrado');
    }
    
    // Event listener para filtro de tipo
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
        console.log('✅ TICKETS: Event listener para type filter configurado');
    } else {
        console.warn('⚠️ TICKETS: type filter no encontrado');
    }
    
    // Listeners para cerrar modales usando el nuevo sistema base-modal
    const ticketModalClose = document.querySelector('#ticket-modal .base-modal-close');
    if (ticketModalClose) {
        ticketModalClose.addEventListener('click', () => closeModal('ticket-modal'));
    }
    const ticketModalCancel = document.querySelector('#ticket-modal .base-btn-cancel');
    if (ticketModalCancel) {
        ticketModalCancel.addEventListener('click', () => closeModal('ticket-modal'));
    }
    
    // Listeners para tabs del modal
    const tabButtons = document.querySelectorAll('#ticket-modal .base-tab-button');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            // Remover active de todos los tabs
            document.querySelectorAll('#ticket-modal .base-tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#ticket-modal .base-tab-content').forEach(content => content.classList.remove('active'));

            // Activar el tab seleccionado
            tab.classList.add('active');
            const tabContent = document.getElementById(`tab-${tabId}`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Listeners para el nuevo modal de cliente
    const addClientCancelBtn = document.getElementById('add-client-modal-cancel-btn');
    if (addClientCancelBtn) {
        addClientCancelBtn.addEventListener('click', () => closeModal('add-client-modal'));
    }
    const addClientCloseBtn = document.getElementById('add-client-modal-close-btn');
    if (addClientCloseBtn) {
        addClientCloseBtn.addEventListener('click', () => closeModal('add-client-modal'));
    }

    // Listeners para el modal de sede
    const addLocationCancelBtn = document.getElementById('add-location-modal-cancel-btn');
    if (addLocationCancelBtn) {
        addLocationCancelBtn.addEventListener('click', () => closeModal('add-location-modal'));
    }
    const addLocationCloseBtn = document.getElementById('add-location-modal-close-btn');
    if (addLocationCloseBtn) {
        addLocationCloseBtn.addEventListener('click', () => closeModal('add-location-modal'));
    }

    // Listeners para el modal de equipo
    const addEquipmentCancelBtn = document.getElementById('add-equipment-modal-cancel-btn');
    if (addEquipmentCancelBtn) {
        addEquipmentCancelBtn.addEventListener('click', () => closeModal('add-equipment-modal'));
    }
    const addEquipmentCloseBtn = document.getElementById('add-equipment-modal-close-btn');
    if (addEquipmentCloseBtn) {
        addEquipmentCloseBtn.addEventListener('click', () => closeModal('add-equipment-modal'));
    }

    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.matches('.edit-ticket-btn')) openModal('ticket-modal', { id: button.dataset.id });
        if (button.matches('.delete-ticket-btn')) deleteItem('tickets', button.dataset.id, fetchTickets);
    });

    if (clientSelect) clientSelect.addEventListener('change', handleClientChange);
    if (locationSelect) locationSelect.addEventListener('change', handleLocationChange);
    if (ticketModalForm) ticketModalForm.addEventListener('submit', handleFormSubmit);
    if (addClientModalForm) addClientModalForm.addEventListener('submit', handleNewClientSubmit);
    if (addLocationModalForm) addLocationModalForm.addEventListener('submit', handleNewLocationSubmit);
    if (addEquipmentModalForm) addEquipmentModalForm.addEventListener('submit', handleNewEquipmentSubmit);
});

// --- Funciones de filtrado y búsqueda ---
function setupFilters() {
    const { searchInput, statusFilter, priorityFilter, clientFilter, typeFilter, clearFiltersBtn } = window.ticketsElements || {};
    
    // Event listeners para filtros
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchChange, 300));
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilterChange);
    }
    if (priorityFilter) {
        priorityFilter.addEventListener('change', handleFilterChange);
    }
    if (clientFilter) {
        clientFilter.addEventListener('change', handleFilterChange);
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', handleFilterChange);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearchChange(event) {
    state.currentFilters.search = event.target.value.toLowerCase();
    applyFilters();
}

function handleFilterChange(event) {
    const filterId = event.target.id;
    const value = event.target.value;
    
    if (filterId === 'tickets-filter-status') {
        state.currentFilters.status = value;
    } else if (filterId === 'tickets-filter-priority') {
        state.currentFilters.priority = value;
    } else if (filterId === 'tickets-filter-client') {
        state.currentFilters.client = value;
    } else if (filterId === 'tickets-filter-type') {
        state.currentFilters.type = value;
    }
    
    applyFilters();
}

function clearAllFilters() {
    const { searchInput, statusFilter, priorityFilter, clientFilter, typeFilter } = window.ticketsElements || {};
    
    state.currentFilters = {
        search: '',
        status: '',
        priority: '',
        client: '',
        type: ''
    };
    
    // Limpiar los inputs
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (clientFilter) clientFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    
    applyFilters();
}

function applyFilters() {
    let filtered = [...state.tickets];
    
    // Filtro de búsqueda
    if (state.currentFilters.search) {
        filtered = filtered.filter(ticket => 
            ticket.title.toLowerCase().includes(state.currentFilters.search) ||
            ticket.description.toLowerCase().includes(state.currentFilters.search) ||
            (ticket.client_name && ticket.client_name.toLowerCase().includes(state.currentFilters.search))
        );
    }
    
    // Filtro por estado
    if (state.currentFilters.status) {
        filtered = filtered.filter(ticket => 
            ticket.status && ticket.status.toLowerCase() === state.currentFilters.status
        );
    }
    
    // Filtro por prioridad
    if (state.currentFilters.priority) {
        filtered = filtered.filter(ticket => 
            ticket.priority && ticket.priority.toLowerCase() === state.currentFilters.priority
        );
    }
    
    // Filtro por cliente
    if (state.currentFilters.client) {
        filtered = filtered.filter(ticket => 
            ticket.client_id && ticket.client_id.toString() === state.currentFilters.client
        );
    }
    
    // Filtro por tipo de ticket
    if (state.currentFilters.type) {
        filtered = filtered.filter(ticket => 
            (ticket.ticket_type || 'individual').toLowerCase() === state.currentFilters.type
        );
    }
    
    state.filteredTickets = filtered;
    renderTickets(filtered);
    updateStatistics(filtered);
}

function updateStatistics(filteredTickets = null) {
    const tickets = filteredTickets || state.tickets;
    
    const stats = {
        abierto: 0,
        progreso: 0,
        espera: 0,
        resuelto: 0,
        cerrado: 0
    };
    
    tickets.forEach(ticket => {
        if (ticket.status) {
            const status = ticket.status.toLowerCase().replace(' ', '');
            const normalizedStatus = status === 'enprogreso' ? 'progreso' : 
                                   status === 'enespera' ? 'espera' : status;
            if (stats.hasOwnProperty(normalizedStatus)) {
                stats[normalizedStatus]++;
            }
        }
    });
    
    // Actualizar los elementos del DOM
    const statElements = {
        'stats-abierto': stats.abierto,
        'stats-progreso': stats.progreso,
        'stats-espera': stats.espera,
        'stats-resuelto': stats.resuelto,
        'stats-cerrado': stats.cerrado
    };
    
    Object.entries(statElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    });
}

function getClientInitials(clientName) {
    if (!clientName) return '??';
    return clientName.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

function getStatusClass(status) {
    if (!status) return 'abierto';
    const normalized = status.toLowerCase().replace(' ', '');
    return normalized === 'enprogreso' ? 'progreso' : 
           normalized === 'enespera' ? 'espera' : 
           normalized;
}

function getPriorityClass(priority) {
    if (!priority) return 'media';
    return priority.toLowerCase();
}

function getSLAClass(dueDate) {
    if (!dueDate) return 'sla-green';
    
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'sla-red';
    if (diffDays <= 3) return 'sla-yellow';
    return 'sla-green';
}

function formatSLADate(dueDate) {
    if (!dueDate) return 'N/A';
    
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Vencido (${Math.abs(diffDays)} días)`;
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === 1) return 'Vence mañana';
    return `${diffDays} días`;
}

function getTicketTypeClass(ticketType) {
    const type = (ticketType || 'individual').toLowerCase();
    switch (type) {
        case 'gimnacion':
            return 'bg-emerald-100 text-emerald-800';
        case 'individual':
        default:
            return 'bg-blue-100 text-blue-800';
    }
}

function getTicketTypeLabel(ticketType) {
    const type = (ticketType || 'individual').toLowerCase();
    switch (type) {
        case 'gimnacion':
            return 'Gimnación';
        case 'individual':
        default:
            return 'Individual';
    }
}

// --- Render Functions ---
function renderTickets(tickets) {
    const { ticketList, emptyState } = window.ticketsElements || {};
    
    if (!ticketList) return;
    
    ticketList.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
        return;
    }
    
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusClass(ticket.status);
        const priorityClass = getPriorityClass(ticket.priority);
        const slaClass = getSLAClass(ticket.due_date);
        
        row.innerHTML = `
            <td class="ticket-id-cell">
                <span class="ticket-number">#${ticket.id}</span>
            </td>
            <td>
                <div class="font-medium text-gray-900 ticket-title">${ticket.title || 'Sin título'}</div>
                <div class="text-sm text-gray-500">${ticket.description ? ticket.description.substring(0, 80) + '...' : ''}</div>
            </td>
            <td>
                <div class="tickets-client-info">
                    <div class="tickets-client-avatar">
                        ${getClientInitials(ticket.client_name)}
                    </div>
                    <div class="tickets-client-details">
                        <div class="tickets-client-name">${ticket.client_name || 'Sin cliente'}</div>
                        <div class="tickets-client-location">${ticket.location_name || 'Sin sede'}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTicketTypeClass(ticket.ticket_type)}">
                    ${getTicketTypeLabel(ticket.ticket_type)}
                </span>
            </td>
            <td>
                <span class="tickets-status-badge ${statusClass}">
                    ${ticket.status || 'Abierto'}
                </span>
            </td>
            <td>
                <span class="tickets-priority-badge ${priorityClass}">
                    ${ticket.priority || 'Media'}
                </span>
            </td>
            <td>
                <span class="tickets-sla-indicator ${slaClass}">
                    ${formatSLADate(ticket.due_date)}
                </span>
            </td>
            <td>
                <div class="tickets-actions">
                    <button class="tickets-action-btn view" onclick="window.location.href='ticket-detail.html?id=${ticket.id}'" title="Ver detalles">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button class="tickets-action-btn edit edit-ticket-btn" data-id="${ticket.id}" title="Editar ticket">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button class="tickets-action-btn delete delete-ticket-btn" data-id="${ticket.id}" title="Eliminar ticket">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        
        ticketList.appendChild(row);
    });
    
    // Regenerar iconos de Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
}

function populateSelect(selectElement, items, { placeholder, valueKey = 'id', nameKey = 'name', formatLabel = null }) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        
        // Si hay función de formateo personalizado, usarla
        if (formatLabel) {
            option.textContent = formatLabel(item);
        } else {
            option.textContent = item[nameKey];
        }
        
        selectElement.appendChild(option);
    });
}

function populateClientFilter() {
    const { clientFilter } = window.ticketsElements || {};
    if (!clientFilter) return;
    
    // Limpiar opciones actuales excepto la primera
    clientFilter.innerHTML = '<option value="">Todos los clientes</option>';
    
    // Agregar clientes únicos
    const uniqueClients = [...new Set(state.clients.map(client => ({ id: client.id, name: client.name })))];
    uniqueClients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientFilter.appendChild(option);
    });
}

// --- API Calls ---
async function fetchAllInitialData() {
    try {
        await Promise.all([
            fetchTickets(),
            fetchClients()
        ]);
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }
}

async function fetchTickets() {
    try {
        const response = await authenticatedFetch(`${API_URL}/tickets`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.tickets = result.data || [];
        state.filteredTickets = [...state.tickets];
        
        // 🔍 DEBUG: Verificar tipos de tickets
        console.log('📊 TICKETS: Tickets cargados:', state.tickets.length);
        const ticketTypes = state.tickets.reduce((acc, t) => {
            const type = t.ticket_type || 'sin tipo';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 TICKETS: Distribución por tipo:', ticketTypes);
        
        populateClientFilter();
        renderTickets(state.filteredTickets);
        updateStatistics();
    } catch (error) {
        console.error('Error fetching tickets:', error);
        state.tickets = [];
        state.filteredTickets = [];
        renderTickets([]);
    }
}

async function fetchClients() {
    try {
        const response = await authenticatedFetch(`${API_URL}/clients`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.clients = result.data || [];
        
        // Usar namespace para elementos DOM
        const { clientSelect } = window.ticketsElements || {};
        if (clientSelect) {
            populateSelect(clientSelect, state.clients, { placeholder: 'Seleccione un cliente' });
        }
        
        populateClientFilter();
    } catch (error) {
        console.error('Error fetching clients:', error);
        state.clients = [];
    }
}

async function fetchLocations(clientId) {
    try {
        console.log('Fetching locations for client:', clientId);
        const response = await authenticatedFetch(`${API_URL}/locations?client_id=${clientId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log('Locations API response:', result);
        state.locations = result.data || [];
        console.log('Filtered locations for client', clientId, ':', state.locations);
        
        // Buscar el elemento directamente
        const locationSelect = document.querySelector('[name="location_id"]');
        if (locationSelect) {
            populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede' });
            locationSelect.disabled = false;
        } else {
            console.error('❌ LOCATIONS: No se encontró el select location_id');
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        state.locations = [];
        
        // Buscar el elemento directamente
        const locationSelect = document.querySelector('[name="location_id"]');
        if (locationSelect) {
            populateSelect(locationSelect, [], { placeholder: 'Error al cargar sedes' });
            locationSelect.disabled = false;
        }
    }
}

async function fetchEquipment(locationId) {
    try {
        const response = await authenticatedFetch(`${API_URL}/equipment?location_id=${locationId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.equipment = result.data || [];
        
        console.log('🔍 EQUIPOS: Cargados', state.equipment.length, 'equipos para sede', locationId);
        console.log('🔍 EQUIPOS: Primer equipo:', state.equipment[0]);
        console.log('🔍 EQUIPOS: Segundo equipo:', state.equipment[1]);
        console.log('🔍 EQUIPOS: Tercer equipo:', state.equipment[2]);
        
        // Buscar el elemento directamente
        const equipmentSelect = document.querySelector('[name="equipment_id"]');
        if (equipmentSelect) {
            // Formato personalizado: mostrar model_name + serial_number (o ID si no hay serial)
            populateSelect(equipmentSelect, state.equipment, { 
                placeholder: 'Seleccione un equipo',
                formatLabel: (eq) => {
                    const modelName = eq.model_name || eq.type || 'Sin modelo';
                    const identifier = eq.serial_number || eq.custom_id || `#${eq.id}`;
                    return `${modelName} - ${identifier}`;
                }
            });
            equipmentSelect.disabled = false;
            console.log('✅ EQUIPOS: Dropdown poblado con', state.equipment.length, 'equipos');
        } else {
            console.error('❌ EQUIPOS: No se encontró el select equipment_id');
        }
    } catch (error) {
        console.error('Error fetching equipment:', error);
        state.equipment = [];
        
        // Buscar el elemento directamente
        const equipmentSelect = document.querySelector('[name="equipment_id"]');
        if (equipmentSelect) {
            populateSelect(equipmentSelect, [], { placeholder: 'Error al cargar equipos' });
            equipmentSelect.disabled = false;
        }
    }
}

async function fetchEquipmentModels() {
    try {
        const response = await authenticatedFetch(`${API_URL}/equipment-models`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        const models = result.data || [];
        
        const modelSelect = document.getElementById('new-equipment-model-select');
        if (modelSelect) {
            populateSelect(modelSelect, models, { placeholder: 'Seleccione un modelo...' });
        }
    } catch (error) {
        console.error('Error fetching equipment models:', error);
    }
}

// --- Event Handlers ---
function handleClientChange(e) {
    const clientId = e.target.value;
    
    // Usar namespace para elementos DOM
    const { locationSelect, equipmentSelect } = window.ticketsElements || {};
    
    // Limpiar selects dependientes
    if (locationSelect) {
        locationSelect.disabled = true;
        locationSelect.innerHTML = '<option>Cargando sedes...</option>';
    }
    if (equipmentSelect) {
        equipmentSelect.disabled = true;
        equipmentSelect.innerHTML = '<option>Seleccione una sede primero...</option>';
    }

    if (clientId) {
        fetchLocations(clientId);
    }
}

function handleLocationChange(e) {
    const locationId = e.target.value;
    
    // Usar namespace para elementos DOM
    const { equipmentSelect } = window.ticketsElements || {};
    
    // Limpiar select de equipos
    if (equipmentSelect) {
        equipmentSelect.disabled = true;
        equipmentSelect.innerHTML = '<option>Cargando equipos...</option>';
    }

    if (locationId) {
        fetchEquipment(locationId);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('input[name="id"]').value;
    const body = Object.fromEntries(new FormData(form));
    
    // El ID no debe ir en el cuerpo de la solicitud, se usa en la URL
    delete body.id;

    // Asegurarse de que los campos opcionales que están vacíos se envíen como null
    if (!body.location_id) body.location_id = null;
    if (!body.equipment_id) body.equipment_id = null;
    if (!body.due_date) body.due_date = null;

    const url = id ? `${API_URL}/tickets/${id}` : `${API_URL}/tickets`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await authenticatedFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error desconocido');
        }
        
        closeModal('ticket-modal');
        fetchTickets();
    } catch (error) {
        console.error('Form submission error:', error);
        alert(`Error al guardar: ${error.message}`);
    }
}

async function handleNewClientSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));

    try {
        const response = await authenticatedFetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear el cliente');
        }

        const newClient = await response.json();
        
        // 1. Añadir el nuevo cliente al estado local
        state.clients.push(newClient);
        
        // 2. Repoblar y seleccionar en el desplegable de tickets
        populateSelect(clientSelect, state.clients, { placeholder: 'Seleccione un cliente...' });
        clientSelect.value = newClient.id;

        // 3. Disparar el evento change para cargar las sedes (que estarán vacías para un cliente nuevo)
        clientSelect.dispatchEvent(new Event('change'));

        // 4. Cerrar el modal de creación de cliente
        closeModal('add-client-modal');
        form.reset();

    } catch (error) {
        console.error('Error creating new client:', error);
        alert(`Error: ${error.message}`);
    }
}

async function handleNewLocationSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));

    try {
        const response = await authenticatedFetch(`${API_URL}/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Failed to create location');
        const newLocation = await response.json();

        // Obtener referencia desde window.ticketsElements
        const locationSelect = window.ticketsElements?.locationSelect;
        
        // 1. Añadir a estado y repoblar desplegable de sedes
        state.locations.push(newLocation);
        if (locationSelect) {
            populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede...' });
            locationSelect.value = newLocation.id;
            
            // 2. Disparar evento para actualizar la UI dependiente (equipos)
            locationSelect.dispatchEvent(new Event('change'));
        }

        // 3. Cerrar modal
        closeModal('add-location-modal');
        form.reset();

    } catch (error) {
        console.error('Error creating new location:', error);
        alert('Error al crear la sede.');
    }
}

async function handleNewEquipmentSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));
    
    // El modelo es opcional, si no se selecciona, enviar null
    if (!body.model_id) body.model_id = null;

    try {
        const response = await authenticatedFetch(`${API_URL}/equipment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Failed to create equipment');
        const newEquipment = await response.json();

        // Obtener referencia desde window.ticketsElements
        const equipmentSelect = window.ticketsElements?.equipmentSelect;
        
        // 1. Añadir a estado y repoblar desplegable de equipos
        state.equipment.push(newEquipment);
        if (equipmentSelect) {
            populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo (opcional)...' });
            equipmentSelect.value = newEquipment.id;
        }

        // 2. Cerrar modal
        closeModal('add-equipment-modal');
        form.reset();

    } catch (error) {
        console.error('Error creating new equipment:', error);
        alert('Error al crear el equipo.');
    }
}

// --- Modal & Generic Functions ---
async function openModal(modalId, data = {}) {
    // Lógica general para cualquier modal: mostrarlo.
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with id ${modalId} not found.`);
        return;
    }

    // Lógica específica solo para el modal de tickets
    if (modalId === 'ticket-modal') {
        const form = document.getElementById('ticket-form');
        form.reset();
        form.querySelector('input[name="id"]').value = '';
        document.getElementById('ticket-modal-title').textContent = 'Nuevo Ticket';
        
        // Ocultar wrapper de status si existe (para nuevos tickets)
        const statusWrapper = document.getElementById('ticket-status-wrapper');
        if (statusWrapper) {
            statusWrapper.classList.add('hidden');
        }

        // Reset and disable dependent dropdowns - USAR window.ticketsElements
        const locationSelect = window.ticketsElements?.locationSelect;
        const equipmentSelect = window.ticketsElements?.equipmentSelect;
        
        if (locationSelect) {
            locationSelect.innerHTML = '<option value="">Seleccione un cliente primero...</option>';
            locationSelect.disabled = true;
        }
        
        if (equipmentSelect) {
            equipmentSelect.innerHTML = '<option value="">Seleccione una sede primero...</option>';
            equipmentSelect.disabled = true;
        }

        let effectiveData = { ...data };

        if (!effectiveData.id && state.ticketPrefillData) {
            effectiveData = { ...state.ticketPrefillData, ...effectiveData };
        }

        if (effectiveData.id) { // Editing an existing ticket
            document.getElementById('ticket-modal-title').textContent = 'Editar Ticket';
            
            // Mostrar wrapper de status si existe (para tickets existentes)
            const statusWrapper = document.getElementById('ticket-status-wrapper');
            if (statusWrapper) {
                statusWrapper.classList.remove('hidden');
            }

            try {
                const response = await authenticatedFetch(`${API_URL}/tickets/${effectiveData.id}`);
                if (!response.ok) throw new Error(`Failed to fetch ticket ${effectiveData.id}`);
                const result = await response.json();
                const ticketData = result.data;

                form.querySelector('input[name="id"]').value = ticketData.id;
                form.elements.title.value = ticketData.title;
                form.elements.description.value = ticketData.description;
                form.elements.priority.value = ticketData.priority;
                form.elements.status.value = ticketData.status;

                if (ticketData.due_date) {
                    form.elements.due_date.value = ticketData.due_date.split('T')[0];
                }

                form.elements.client_id.value = ticketData.client_id;

                if (ticketData.client_id) {
                    await fetchLocations(ticketData.client_id);
                    form.elements.location_id.value = ticketData.location_id;
                }

                if (ticketData.location_id) {
                    await fetchEquipment(ticketData.location_id);
                    form.elements.equipment_id.value = ticketData.equipment_id;
                }

            } catch (error) {
                console.error('Error populating form for edit:', error);
                alert('Error al cargar los datos del ticket para editar.');
                closeModal(modalId);
                return; // Detener ejecución si falla la carga
            }
        } else if (effectiveData.client_id) { // Prefill for new ticket
            form.elements.client_id.value = effectiveData.client_id;
            if (effectiveData.client_id) {
                await fetchLocations(effectiveData.client_id);
                if (effectiveData.location_id) {
                    form.elements.location_id.value = effectiveData.location_id;
                    await fetchEquipment(effectiveData.location_id);
                    if (effectiveData.equipment_id) {
                        form.elements.equipment_id.value = effectiveData.equipment_id;
                    }
                }
            }
        }
        state.ticketPrefillData = null;
    }
     // Lógica específica para el modal de añadir cliente
    else if (modalId === 'add-client-modal') {
        const form = document.getElementById('add-client-modal-form');
        form.reset();
    }
    else if (modalId === 'add-location-modal' || modalId === 'add-equipment-modal') {
        const form = document.getElementById(`${modalId}-form`);
        form.reset();
    }

    if (modalId === 'ticket-modal') {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('modal-open');
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10); // Pequeño delay para que la animación funcione
    } else {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    lucide.createIcons(); // Refrescar iconos por si hay nuevos en el modal
}

// Helper function to map field names to their HTML IDs
function getFieldId(fieldName) {
    const fieldMapping = {
        'title': 'ticket-title',
        'description': 'ticket-description',
        'client_id': 'ticket-client-select',
        'location_id': 'ticket-location-select',
        'equipment_id': 'ticket-equipment-select',
        'priority': 'ticket-priority',
        'due_date': 'ticket-due-date'
    };
    return fieldMapping[fieldName] || fieldName;
}

async function checkForUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const editTicketId = params.get('edit'); // Parámetro para editar ticket
    const clientId = params.get('cliente'); // Cambiado de 'location_id' a 'cliente'
    const locationId = params.get('sede');   // Cambiado de 'equipment_id' a 'sede'
    const equipmentId = params.get('equipo'); // Nuevo parámetro para equipo

    state.ticketPrefillData = null; // Reset prefill data each time

    // Manejar edición de ticket
    if (editTicketId) {
        try {
            console.log(`🎫 Abriendo modal para editar ticket ${editTicketId}`);
            // Abrir el modal automáticamente en modo edición
            await openModal('ticket-modal', { id: editTicketId });
        } catch (error) {
            console.error("Error processing URL param for ticket edit:", error);
            alert('Error al cargar el ticket para editar');
        }
    }
    // Manejar creación de ticket con datos precompletados
    else if (clientId && locationId) { // Si tenemos cliente y sede de la URL
        try {
            state.ticketPrefillData = {
                client_id: clientId,
                location_id: locationId,
                equipment_id: equipmentId || null // equipmentId puede ser opcional
            };
            // Abrir el modal automáticamente si se pasaron parámetros para crear un ticket
            openModal('ticket-modal'); 
        } catch (error) {
            console.error("Error processing URL params for ticket prefill:", error);
        }
    }

    // Limpiar los parámetros de la URL para evitar que se reutilicen al navegar
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ===========================================
// FUNCIONES ESPECÍFICAS PARA GIMNACIÓN 
// ===========================================

/**
 * Abrir modal de gimnación y cargar datos iniciales
 */
async function openGimnacionModal() {
    try {
        console.log('🏢 GIMNACION: Abriendo modal de gimnación...');
        
        // Buscar elementos DOM directamente
        const gimnacionModal = document.getElementById('gimnacion-modal');
        const gimnacionForm = document.getElementById('gimnacion-form');
        
        if (!gimnacionModal) {
            console.error('❌ GIMNACION: Modal no encontrado');
            alert('Error: Modal de gimnación no disponible');
            return;
        }
        
        // Limpiar estado previo
        state.gimnacion.selectedEquipment = [];
        state.gimnacion.selectedTemplate = null;
        
        // Cargar datos necesarios
        await loadGimnacionData();
        
        // Mostrar modal usando la clase correcta
        gimnacionModal.classList.add('is-open');
        document.body.classList.add('modal-open');
        
        // Configurar event listeners para cerrar modal
        setupModalCloseListeners(gimnacionModal);
        
        // Setup event listeners específicos
        setupGimnacionEventListeners();
        
        lucide.createIcons();
        
        console.log('✅ GIMNACION: Modal de gimnación abierto correctamente');
        
    } catch (error) {
        console.error('❌ GIMNACION: Error al abrir modal:', error);
        alert('Error al abrir el modal de gimnación');
    }
}

/**
 * Configurar event listeners para cerrar el modal
 */
function setupModalCloseListeners(modal) {
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeGimnacionModal();
        }
    });
    
    // Cerrar con tecla ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeGimnacionModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Cerrar con botón X
    const closeButton = modal.querySelector('.base-modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', closeGimnacionModal);
    }
}

/**
 * Cargar datos necesarios para gimnación
 */
async function loadGimnacionData() {
    try {
        // Cargar templates de checklist si no están cargados
        if (state.gimnacion.checklistTemplates.length === 0) {
            await fetchChecklistTemplates();
        }
        
        // Cargar contratos si no están cargados
        if (state.gimnacion.contracts.length === 0) {
            await fetchContracts();
        }
        
        // Poblar selectores
        populateGimnacionSelects();
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando datos:', error);
        throw error;
    }
}

/**
 * Poblar selectores del modal de gimnación
 */
function populateGimnacionSelects() {
    // Buscar directamente los elementos en lugar de usar window.ticketsElements
    const gimnacionForm = document.getElementById('gimnacion-form');
    
    if (!gimnacionForm) {
        console.warn('⚠️ GIMNACION: gimnacionForm no encontrado');
        return;
    }
    
    // Poblar selector de clientes
    const clientSelect = gimnacionForm.querySelector('[name="client_id"]');
    if (clientSelect && state.clients.length > 0) {
        clientSelect.innerHTML = '<option value="">Seleccione un cliente</option>';
        state.clients.forEach(client => {
            clientSelect.innerHTML += `<option value="${client.id}">${client.name}</option>`;
        });
    }
    
    // Limpiar contenedor de equipos al inicio
    const equipmentContainer = document.getElementById('equipment-scope-container');
    if (equipmentContainer) {
        equipmentContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i data-lucide="map-pin" class="h-8 w-8 mx-auto mb-2"></i>
                <p>Seleccione cliente y sede para cargar equipos...</p>
            </div>
        `;
    }
    
    // Poblar selector de contratos
    const contractSelect = gimnacionForm.querySelector('[name="contract_id"]');
    if (contractSelect && state.gimnacion.contracts.length > 0) {
        contractSelect.innerHTML = '<option value="">Sin contrato específico</option>';
        state.gimnacion.contracts.forEach(contract => {
            contractSelect.innerHTML += `<option value="${contract.id}">${contract.contract_name} (${contract.client_name})</option>`;
        });
    }
    
    // Poblar selectores de templates por categoría
    if (state.gimnacion.checklistTemplates.length > 0) {
        populateTemplateSelectors();
    }
}

/**
 * Configurar event listeners específicos del modal gimnación
 */
function setupGimnacionEventListeners() {
    const gimnacionModal = document.getElementById('gimnacion-modal');
    const gimnacionForm = document.getElementById('gimnacion-form');
    
    if (!gimnacionModal || !gimnacionForm) {
        console.warn('⚠️ GIMNACION: Elementos de modal no disponibles para event listeners');
        return;
    }

    // ✅ CONFIGURAR LISTENERS PARA PESTAÑAS
    const tabButtons = gimnacionModal.querySelectorAll('.base-tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = button.getAttribute('data-tab');
            if (tabName) {
                switchGimnacionTab(tabName);
                console.log(`🔄 GIMNACION: Cambiando a pestaña: ${tabName}`);
            }
        });
    });
    
    // Cerrar modal
    const closeBtn = gimnacionModal.querySelector('.base-modal-close');
    const cancelBtn = gimnacionModal.querySelector('.base-btn-cancel');
    
    if (closeBtn) closeBtn.addEventListener('click', closeGimnacionModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeGimnacionModal);
    
    // Event listeners para selectores
    const clientSelect = gimnacionForm.querySelector('[name="client_id"]');
    const locationSelect = gimnacionForm.querySelector('[name="location_id"]');
    
    if (clientSelect) {
        clientSelect.addEventListener('change', onGimnacionClientChange);
    }
    
    if (locationSelect) {
        locationSelect.addEventListener('change', onGimnacionLocationChange);
    }
    
    // ✅ CRÍTICO: Event listener para submit del formulario de gimnación
    gimnacionForm.addEventListener('submit', handleGimnacionSubmit);
    console.log('✅ GIMNACION: Event listener de submit configurado');
    
    // Event listeners para botones de equipos
    const selectAllBtn = document.getElementById('select-all-equipment');
    const deselectAllBtn = document.getElementById('deselect-all-equipment');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllEquipment);
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllEquipment);
    }
    
    console.log('✅ GIMNACION: Event listeners configurados correctamente');
}

/**
 * Cerrar modal de gimnación
 */
function closeGimnacionModal() {
    const gimnacionModal = document.getElementById('gimnacion-modal');
    
    if (gimnacionModal) {
        gimnacionModal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
    }
    
    // Limpiar estado
    state.gimnacion.selectedEquipment = [];
    state.gimnacion.selectedTemplate = null;
    
    console.log('✅ GIMNACION: Modal cerrado');
}

/**
 * Manejar cambio de cliente en gimnación
 */
async function onGimnacionClientChange(event) {
    const clientId = event.target.value;
    const gimnacionForm = document.getElementById('gimnacion-form');
    
    if (!gimnacionForm) return;
    
    const locationSelect = gimnacionForm.querySelector('[name="location_id"]');
    const equipmentContainer = document.getElementById('equipment-scope-container');
    
    if (!locationSelect || !equipmentContainer) return;
    
    // Limpiar ubicaciones
    locationSelect.innerHTML = '<option value="">Seleccione una sede</option>';
    
    // Limpiar equipos
    equipmentContainer.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Seleccione una sede para ver los equipos</p>';
    
    if (!clientId) return;
    
    try {
        // Cargar ubicaciones del cliente
        const locations = await fetchLocationsByClient(clientId);
        
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            locationSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando ubicaciones:', error);
    }
}

/**
 * Cambiar pestaña activa en modal gimnación
 */
function switchGimnacionTab(tabName) {
    const gimnacionModal = document.getElementById('gimnacion-modal');
    
    if (!gimnacionModal) {
        console.warn('⚠️ GIMNACION: Modal no encontrado para cambio de pestaña');
        return;
    }
    
    console.log(`🔄 GIMNACION: Cambiando a pestaña: ${tabName}`);
    
    // Desactivar todas las pestañas
    gimnacionModal.querySelectorAll('.base-tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
            console.log(`✅ GIMNACION: Botón activado: ${tabName}`);
        }
    });
    
    // Mostrar contenido de pestaña correspondiente
    gimnacionModal.querySelectorAll('.base-tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
            console.log(`✅ GIMNACION: Contenido mostrado: tab-${tabName}`);
        }
    });
    
    // Regenerar iconos de Lucide después del cambio
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
}

/**
 * Manejar cambio de cliente en gimnación
 */
// DUPLICADO ELIMINADO - async function onGimnacionClientChange(event) {
    const clientId = event.target.value;
    const { gimnacionForm, equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!gimnacionForm) return;
    
    const locationSelect = gimnacionForm.querySelector('[name="location_id"]');
    if (!locationSelect) return;
    
    // Limpiar selector de sede
    locationSelect.innerHTML = '<option value="">Seleccione una sede</option>';
    
    // Limpiar equipos
    if (equipmentScopeContainer) {
        equipmentScopeContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Seleccione una sede para ver los equipos</p>';
    }
    
    if (!clientId) return;
    
    try {
        // Cargar sedes del cliente usando la función existente
        await fetchLocations(clientId);
        
        // Las sedes ya están en state.locations, ahora llenar el select
        state.locations.forEach(location => {
            locationSelect.innerHTML += `<option value="${location.id}">${location.name}</option>`;
        });
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando sedes:', error);
    }
}

/**
 * Manejar cambio de sede en gimnación
 */
async function onGimnacionLocationChange(event) {
    const locationId = event.target.value;
    const equipmentContainer = document.getElementById('equipment-scope-container');
    
    if (!equipmentContainer) return;
    
    if (!locationId) {
        equipmentContainer.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Seleccione una sede para ver los equipos</p>';
        return;
    }
    
    try {
        // Mostrar loading
        equipmentContainer.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Cargando equipos...</p>';
        
        // Cargar equipos de la sede
        const equipment = await fetchEquipmentByLocation(locationId);
        
        // Renderizar equipos con cards visuales
        renderEquipmentScope(equipment);
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando equipos:', error);
        equipmentContainer.innerHTML = '<p class="text-red-500 text-center py-4 col-span-full">Error cargando equipos</p>';
    }
}

/**
 * Renderizar lista de equipos con cards visuales
 */
function renderEquipmentScope(equipment) {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    
    if (!equipmentContainer || !equipment.length) {
        if (equipmentContainer) {
            equipmentContainer.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No hay equipos disponibles en esta sede</p>';
        }
        return;
    }
    
    // Guardar equipos para filtrado
    state.gimnacion.allEquipment = equipment;
    
    renderFilteredEquipment(equipment);
    
    // Setup event listeners para buscador y filtros
    setupEquipmentFilters();
}

/**
 * Renderizar equipos filtrados en formato tabla agrupada por categorías
 */
function renderFilteredEquipment(equipment) {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    
    if (!equipmentContainer) return;
    
    if (equipment.length === 0) {
        equipmentContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i data-lucide="package" class="h-8 w-8 mx-auto mb-2"></i>
                <p>No hay equipos disponibles para esta sede</p>
            </div>
        `;
        return;
    }
    
    // Agrupar equipos por categoría
    const groupedEquipment = equipment.reduce((groups, equip) => {
        const category = equip.category || 'Sin categoría';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(equip);
        return groups;
    }, {});
    
    let html = `
        <div class="equipment-table-container">
            <table class="w-full border-collapse text-sm">
                <thead class="bg-gray-50 sticky top-0">
                    <tr class="border-b border-gray-200">
                        <th class="text-left p-2 font-semibold text-gray-700 w-8">
                            <input type="checkbox" id="select-all-equipment" class="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500">
                        </th>
                        <th class="text-left p-2 font-semibold text-gray-700">Equipo</th>
                        <th class="text-left p-2 font-semibold text-gray-700">Categoría</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Renderizar cada categoría
    Object.keys(groupedEquipment).sort().forEach(category => {
        const categoryEquipment = groupedEquipment[category];
        const categoryColor = getCategoryColor(category);
        const categoryId = category.toLowerCase().replace(/\s+/g, '-');
        const allCategorySelected = categoryEquipment.every(equip => 
            state.gimnacion.selectedEquipment.some(selected => selected.id === equip.id)
        );
        
        // Header de categoría
        html += `
            <tr class="category-header bg-gray-50 border-t-2 border-gray-300">
                <td class="p-2">
                    <input type="checkbox" 
                           id="select-category-${categoryId}" 
                           class="category-checkbox w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                           data-category="${category}"
                           ${allCategorySelected ? 'checked' : ''}>
                </td>
                <td colspan="2" class="p-2">
                    <div class="flex items-center">
                        <span class="font-semibold text-gray-800 mr-3">${category}</span>
                        <span class="px-2 py-1 text-xs rounded-full ${categoryColor}">
                            ${categoryEquipment.length} equipo${categoryEquipment.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </td>
            </tr>
        `;
        
        // Equipos de la categoría
        categoryEquipment.forEach(equip => {
            const isSelected = state.gimnacion.selectedEquipment.some(selected => selected.id === equip.id);
            
            html += `
                <tr class="equipment-row border-b border-gray-100 hover:bg-green-50 transition-colors ${
                    isSelected ? 'bg-green-50' : ''
                }" data-category="${category}">
                    <td class="p-2">
                        <input type="checkbox" 
                               class="equipment-checkbox w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                               data-equipment-id="${equip.id}"
                               data-equipment='${JSON.stringify(equip)}'
                               ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="p-2">
                        <div class="font-medium text-gray-900 text-sm">${equip.name}</div>
                        <div class="text-xs text-gray-500">${equip.model_name || 'Sin modelo'} • ${equip.serial_number || 'S/N no disponible'}</div>
                    </td>
                    <td class="p-2">
                        <span class="px-2 py-1 text-xs rounded-full ${categoryColor}">
                            ${category}
                        </span>
                    </td>
                </tr>
            `;
        });
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    equipmentContainer.innerHTML = html;
    
    // Setup event listeners
    setupEquipmentTableEventListeners();
    
    // Regenerar iconos
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Configurar event listeners para la tabla de equipos
 */
function setupEquipmentTableEventListeners() {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    if (!equipmentContainer) return;
    
    // Checkbox para seleccionar todos los equipos
    const selectAllCheckbox = equipmentContainer.querySelector('#select-all-equipment');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const equipmentCheckboxes = equipmentContainer.querySelectorAll('.equipment-checkbox');
            const categoryCheckboxes = equipmentContainer.querySelectorAll('.category-checkbox');
            
            equipmentCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const equipmentData = JSON.parse(checkbox.dataset.equipment);
                
                if (isChecked) {
                    // Agregar al estado si no existe
                    if (!state.gimnacion.selectedEquipment.some(equip => equip.id === equipmentData.id)) {
                        state.gimnacion.selectedEquipment.push(equipmentData);
                    }
                } else {
                    // Remover del estado
                    state.gimnacion.selectedEquipment = state.gimnacion.selectedEquipment.filter(
                        equip => equip.id !== equipmentData.id
                    );
                }
            });
            
            // Actualizar checkboxes de categoría
            categoryCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            updateEquipmentSummary();
            console.log('🔄 GIMNACION: Selección masiva:', isChecked ? 'todos' : 'ninguno');
        });
    }
    
    // Checkboxes de categorías
    const categoryCheckboxes = equipmentContainer.querySelectorAll('.category-checkbox');
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const category = e.target.dataset.category;
            
            // Encontrar todos los equipos de esta categoría
            const categoryEquipmentCheckboxes = equipmentContainer.querySelectorAll(
                `.equipment-row[data-category="${category}"] .equipment-checkbox`
            );
            
            categoryEquipmentCheckboxes.forEach(equipCheckbox => {
                equipCheckbox.checked = isChecked;
                const equipmentData = JSON.parse(equipCheckbox.dataset.equipment);
                
                if (isChecked) {
                    // Agregar al estado si no existe
                    if (!state.gimnacion.selectedEquipment.some(equip => equip.id === equipmentData.id)) {
                        state.gimnacion.selectedEquipment.push(equipmentData);
                    }
                } else {
                    // Remover del estado
                    state.gimnacion.selectedEquipment = state.gimnacion.selectedEquipment.filter(
                        equip => equip.id !== equipmentData.id
                    );
                }
            });
            
            updateSelectAllCheckbox();
            updateEquipmentSummary();
            console.log(`🔄 GIMNACION: Categoría ${category}:`, isChecked ? 'seleccionada' : 'deseleccionada');
        });
    });
    
    // Checkboxes individuales de equipos
    const equipmentCheckboxes = equipmentContainer.querySelectorAll('.equipment-checkbox');
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const equipmentData = JSON.parse(e.target.dataset.equipment);
            const category = e.target.closest('.equipment-row').dataset.category;
            
            if (isChecked) {
                // Agregar al estado si no existe
                if (!state.gimnacion.selectedEquipment.some(equip => equip.id === equipmentData.id)) {
                    state.gimnacion.selectedEquipment.push(equipmentData);
                }
            } else {
                // Remover del estado
                state.gimnacion.selectedEquipment = state.gimnacion.selectedEquipment.filter(
                    equip => equip.id !== equipmentData.id
                );
            }
            
            // Actualizar checkbox de categoría
            updateCategoryCheckbox(category);
            updateSelectAllCheckbox();
            updateEquipmentSummary();
            
            console.log(`🔄 GIMNACION: Equipo ${equipmentData.name}:`, isChecked ? 'seleccionado' : 'deseleccionado');
        });
    });
}

/**
 * Actualizar estado del checkbox de categoría basado en sus equipos
 */
function updateCategoryCheckbox(category) {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    if (!equipmentContainer) return;
    
    const categoryCheckbox = equipmentContainer.querySelector(`[data-category="${category}"]`);
    const categoryEquipmentCheckboxes = equipmentContainer.querySelectorAll(
        `.equipment-row[data-category="${category}"] .equipment-checkbox`
    );
    
    if (categoryCheckbox && categoryEquipmentCheckboxes.length > 0) {
        const checkedCount = Array.from(categoryEquipmentCheckboxes).filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            categoryCheckbox.checked = false;
            categoryCheckbox.indeterminate = false;
        } else if (checkedCount === categoryEquipmentCheckboxes.length) {
            categoryCheckbox.checked = true;
            categoryCheckbox.indeterminate = false;
        } else {
            categoryCheckbox.checked = false;
            categoryCheckbox.indeterminate = true;
        }
    }
}

/**
 * Actualizar estado del checkbox "seleccionar todo"
 */
function updateSelectAllCheckbox() {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    if (!equipmentContainer) return;
    
    const selectAllCheckbox = equipmentContainer.querySelector('#select-all-equipment');
    const equipmentCheckboxes = equipmentContainer.querySelectorAll('.equipment-checkbox');
    
    if (selectAllCheckbox && equipmentCheckboxes.length > 0) {
        const checkedCount = Array.from(equipmentCheckboxes).filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === equipmentCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

/**
 * Actualizar resumen de equipos seleccionados
 */
function updateEquipmentSummary() {
    const selectedCount = state.gimnacion.selectedEquipment.length;
    console.log(`📊 GIMNACION: ${selectedCount} equipos seleccionados`);
    
    // Actualizar contador en la UI si existe
    const summaryElement = document.getElementById('selected-equipment-summary');
    if (summaryElement) {
        if (selectedCount > 0) {
            summaryElement.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div class="flex items-center text-green-800">
                        <i data-lucide="check-circle" class="h-4 w-4 mr-2"></i>
                        <span class="font-medium">${selectedCount} equipo${selectedCount !== 1 ? 's' : ''} seleccionado${selectedCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            `;
            summaryElement.classList.remove('hidden');
        } else {
            summaryElement.classList.add('hidden');
        }
        
        // Regenerar iconos
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

/**
 * Obtener color de categoría
 */
function getCategoryColor(category) {
    const colors = {
        'Cardio': 'bg-blue-100 text-blue-800',
        'Fuerza': 'bg-red-100 text-red-800', 
        'Funcional': 'bg-green-100 text-green-800',
        'Accesorios': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
}

/**
 * Configurar filtros de equipos
 */
function setupEquipmentFilters() {
    const searchInput = document.getElementById('equipment-search');
    const categoryFilter = document.getElementById('equipment-category-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterEquipment);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterEquipment);
    }
}

/**
 * Filtrar equipos en tiempo real
 */
function filterEquipment() {
    const searchTerm = document.getElementById('equipment-search')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('equipment-category-filter')?.value || '';
    
    if (!state.gimnacion.allEquipment) return;
    
    let filteredEquipment = state.gimnacion.allEquipment;
    
    // Filtrar por búsqueda
    if (searchTerm) {
        filteredEquipment = filteredEquipment.filter(equip => 
            equip.name.toLowerCase().includes(searchTerm) ||
            (equip.model_name && equip.model_name.toLowerCase().includes(searchTerm)) ||
            (equip.serial_number && equip.serial_number.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtrar por categoría
    if (selectedCategory) {
        filteredEquipment = filteredEquipment.filter(equip => 
            equip.category === selectedCategory
        );
    }
    
    renderFilteredEquipment(filteredEquipment);
}

/**
 * Manejar clic en card de equipo (FUNCIÓN LEGACY - NO USAR CON NUEVA TABLA)
 * Esta función se mantiene para compatibilidad pero ya no se usa
 */
/* DEPRECATED - USAR setupEquipmentTableEventListeners() EN SU LUGAR
function toggleEquipmentSelection(event) {
    const card = event.currentTarget;
    const equipmentData = JSON.parse(card.dataset.equipment);
    const equipmentId = parseInt(card.dataset.equipmentId);
    
    const isSelected = state.gimnacion.selectedEquipment.some(selected => selected.id === equipmentId);
    
    if (isSelected) {
        // Remover de seleccionados
        state.gimnacion.selectedEquipment = state.gimnacion.selectedEquipment.filter(
            selected => selected.id !== equipmentId
        );
        card.classList.remove('ring-2', 'ring-green-500', 'bg-green-50');
        card.classList.add('hover:border-green-300');
    } else {
        // Agregar a seleccionados
        state.gimnacion.selectedEquipment.push(equipmentData);
        card.classList.add('ring-2', 'ring-green-500', 'bg-green-50');
        card.classList.remove('hover:border-green-300');
    }
    
    // Actualizar checkbox visual
    const checkbox = card.querySelector('.w-4.h-4');
    const checkIcon = card.querySelector('[data-lucide="check"]');
    
    if (isSelected) {
        checkbox.classList.remove('bg-green-500', 'border-green-500');
        checkbox.classList.add('border-gray-300');
        if (checkIcon) checkIcon.remove();
    } else {
        checkbox.classList.add('bg-green-500', 'border-green-500');
        checkbox.classList.remove('border-gray-300');
        checkbox.innerHTML = '<i data-lucide="check" class="w-3 h-3 text-white"></i>';
    }
    
    // Actualizar contadores y vista previa
    updateEquipmentSummary();
    updateSelectedEquipmentPreview();
    
    // Regenerar iconos
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Actualizar resumen de equipos seleccionados
 */
function updateEquipmentSummary() {
    const selectedCount = document.getElementById('selected-count');
    
    if (!selectedCount) return;
    
    const count = state.gimnacion.selectedEquipment.length;
    selectedCount.textContent = count;
    
    console.log('📋 GIMNACION: Equipos seleccionados:', count);
}

/**
 * Actualizar vista previa de equipos seleccionados
 */
function updateSelectedEquipmentPreview() {
    const preview = document.getElementById('selected-equipment-preview');
    const list = document.getElementById('selected-equipment-list');
    
    if (!preview || !list) return;
    
    if (state.gimnacion.selectedEquipment.length === 0) {
        preview.classList.add('hidden');
        return;
    }
    
    preview.classList.remove('hidden');
    
    let html = '';
    state.gimnacion.selectedEquipment.forEach(equip => {
        const categoryColor = getCategoryColor(equip.category);
        html += `
            <div class="flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <span class="font-medium text-green-800 mr-2">${equip.name}</span>
                <span class="px-2 py-1 text-xs rounded-full ${categoryColor} mr-2">
                    ${equip.category || 'Sin categoría'}
                </span>
                <button type="button" class="text-green-600 hover:text-green-800 ml-auto" onclick="removeEquipmentFromSelection(${equip.id})" title="Quitar equipo">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    });
    
    list.innerHTML = html;
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Remover equipo de la selección desde la vista previa
 */
function removeEquipmentFromSelection(equipmentId) {
    state.gimnacion.selectedEquipment = state.gimnacion.selectedEquipment.filter(
        selected => selected.id !== equipmentId
    );
    
    // Actualizar la card visual si está visible
    const card = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
    if (card) {
        card.classList.remove('ring-2', 'ring-green-500', 'bg-green-50');
        card.classList.add('hover:border-green-300');
        
        const checkbox = card.querySelector('.w-4.h-4');
        const checkIcon = card.querySelector('[data-lucide="check"]');
        
        checkbox.classList.remove('bg-green-500', 'border-green-500');
        checkbox.classList.add('border-gray-300');
        if (checkIcon) checkIcon.remove();
    }
    
    updateEquipmentSummary();
    updateSelectedEquipmentPreview();
}

/**
 * Seleccionar todos los equipos visibles
 */
function selectAllEquipment() {
    const equipmentContainer = document.getElementById('equipment-scope-container');
    
    if (!equipmentContainer) return;
    
    const equipmentCards = equipmentScopeContainer.querySelectorAll('.equipment-card');
    
    equipmentCards.forEach(card => {
        const equipmentData = JSON.parse(card.dataset.equipment);
        const equipmentId = parseInt(card.dataset.equipmentId);
        
        const isAlreadySelected = state.gimnacion.selectedEquipment.some(selected => selected.id === equipmentId);
        
        if (!isAlreadySelected) {
            state.gimnacion.selectedEquipment.push(equipmentData);
            card.classList.add('ring-2', 'ring-green-500', 'bg-green-50');
            card.classList.remove('hover:border-green-300');
            
            // Actualizar checkbox visual
            const checkbox = card.querySelector('.w-4.h-4');
            checkbox.classList.add('bg-green-500', 'border-green-500');
            checkbox.classList.remove('border-gray-300');
            checkbox.innerHTML = '<i data-lucide="check" class="w-3 h-3 text-white"></i>';
        }
    });
    
    updateEquipmentSummary();
    updateSelectedEquipmentPreview();
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Deseleccionar todos los equipos
 */
function deselectAllEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const equipmentCards = equipmentScopeContainer.querySelectorAll('.equipment-card');
    
    equipmentCards.forEach(card => {
        card.classList.remove('ring-2', 'ring-green-500', 'bg-green-50');
        card.classList.add('hover:border-green-300');
        
        // Actualizar checkbox visual
        const checkbox = card.querySelector('.w-4.h-4');
        const checkIcon = card.querySelector('[data-lucide="check"]');
        
        checkbox.classList.remove('bg-green-500', 'border-green-500');
        checkbox.classList.add('border-gray-300');
        if (checkIcon) checkIcon.remove();
    });
    
    state.gimnacion.selectedEquipment = [];
    updateEquipmentSummary();
    updateSelectedEquipmentPreview();
}

/**
 * Poblar selectores de templates por categoría
 */
function populateTemplateSelectors() {
    console.log('🔧 TICKETS: Poblando selectores de templates...');
    console.log('📊 TICKETS: Templates disponibles:', state.gimnacion.checklistTemplates);
    
    // Poblar selector principal de checklist
    const checklistTemplateSelect = document.getElementById('checklist-template-select');
    if (checklistTemplateSelect) {
        checklistTemplateSelect.innerHTML = '<option value="">Seleccionar template...</option>';
        
        state.gimnacion.checklistTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.items_count || 0} items)`;
            checklistTemplateSelect.appendChild(option);
        });
        
        console.log('✅ TICKETS: Selector checklist-template-select poblado con', state.gimnacion.checklistTemplates.length, 'templates');
    } else {
        console.warn('⚠️ TICKETS: Selector checklist-template-select no encontrado');
    }
    
    // Poblar otros selectores con clase template-select
    const templateSelects = document.querySelectorAll('.template-select');
    
    templateSelects.forEach(select => {
        if (select.id === 'checklist-template-select') return; // Ya lo procesamos arriba
        
        const category = select.dataset.category;
        select.innerHTML = '<option value="">Seleccionar...</option>';
        
        // Filtrar templates por categoría (simulado - en producción vendría del backend)
        const filteredTemplates = state.gimnacion.checklistTemplates.filter(template => {
            if (category === 'basico') {
                return template.items_count <= 5; // Templates con pocos items
            } else if (category === 'completo') {
                return template.items_count > 10; // Templates con muchos items
            } else if (category === 'tipo') {
                return template.name && (
                    template.name.toLowerCase().includes('cardio') || 
                    template.name.toLowerCase().includes('fuerza') ||
                    template.name.toLowerCase().includes('funcional')
                );
            }
            return true;
        });
        
        filteredTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} (${template.items_count} items)`;
            select.appendChild(option);
        });
        
        // Event listener para selección
        select.addEventListener('change', onTemplateSelection);
    });
}

/**
 * Manejar selección de template
 */
async function onTemplateSelection(event) {
    const templateId = event.target.value;
    
    if (!templateId) return;
    
    try {
        // Cargar items del template
        const templateItems = await fetchTemplateItems(templateId);
        
        // Encontrar el template seleccionado
        const template = state.gimnacion.checklistTemplates.find(t => t.id == templateId);
        state.gimnacion.selectedTemplate = template;
        
        // Mostrar vista previa
        showChecklistPreview(template, templateItems);
        
        // Limpiar otros selectores
        const allSelects = document.querySelectorAll('.template-select');
        allSelects.forEach(select => {
            if (select !== event.target) {
                select.value = '';
            }
        });
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando template:', error);
    }
}

/**
 * Mostrar vista previa del checklist
 */
function showChecklistPreview(template, items) {
    const preview = document.getElementById('checklist-preview');
    const templateName = document.getElementById('checklist-template-name');
    const itemCount = document.getElementById('checklist-item-count');
    const itemsPreview = document.getElementById('checklist-items-preview');
    
    if (!preview || !templateName || !itemCount || !itemsPreview) return;
    
    // Mostrar información del template
    templateName.textContent = template.template_name;
    itemCount.textContent = items.length;
    
    // Renderizar items
    let html = '';
    items.forEach((item, index) => {
        html += `
            <div class="flex items-start py-2 border-b border-gray-100 last:border-b-0">
                <span class="text-sm text-purple-600 font-medium w-8 flex-shrink-0">${index + 1}.</span>
                <div class="flex-1">
                    <span class="text-sm text-gray-900">${item.item_description}</span>
                    ${item.is_required ? 
                        '<span class="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Obligatorio</span>' : 
                        '<span class="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Opcional</span>'
                    }
                </div>
            </div>
        `;
    });
    
    itemsPreview.innerHTML = html;
    preview.classList.remove('hidden');
    
    // Setup botón de limpiar selección
    const clearBtn = document.getElementById('clear-checklist-selection');
    if (clearBtn) {
        clearBtn.onclick = clearChecklistSelection;
    }
}

/**
 * Limpiar selección de checklist
 */
function clearChecklistSelection() {
    const preview = document.getElementById('checklist-preview');
    const allSelects = document.querySelectorAll('.template-select');
    
    // Ocultar vista previa
    if (preview) {
        preview.classList.add('hidden');
    }
    
    // Limpiar selectores
    allSelects.forEach(select => {
        select.value = '';
    });
    
    // Limpiar estado
    state.gimnacion.selectedTemplate = null;
}

/**
 * Renderizar checklist editable con checkboxes
 */
function renderEditableChecklist(template, items) {
    const editableContainer = document.getElementById('checklist-editable-container');
    const editableItems = document.getElementById('checklist-editable-items');
    const completedCount = document.getElementById('checklist-completed-count');
    const totalCount = document.getElementById('checklist-total-count');
    
    if (!editableContainer || !editableItems) return;
    
    // Mostrar contenedor
    editableContainer.classList.remove('hidden');
    
    // Actualizar contadores
    totalCount.textContent = items.length;
    completedCount.textContent = '0';
    
    let html = '';
    
    items.forEach((item, index) => {
        const itemId = `checklist-item-${item.id || index}`;
        html += `
            <div class="checklist-item flex items-start space-x-3 p-3 bg-white rounded border" data-item-id="${item.id || index}">
                <div class="flex items-center">
                    <input 
                        type="checkbox" 
                        id="${itemId}" 
                        class="checklist-checkbox w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500" 
                        data-item-id="${item.id || index}"
                        onchange="updateChecklistProgress()"
                    >
                </div>
                <div class="flex-1 min-w-0">
                    <label for="${itemId}" class="block text-sm font-medium text-gray-900 cursor-pointer">
                        ${item.item_description}
                        ${item.is_required ? '<span class="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Obligatorio</span>' : '<span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Opcional</span>'}
                    </label>
                    
                    <!-- Campo de notas opcional -->
                    <div class="mt-2">
                        <textarea 
                            placeholder="Notas adicionales (opcional)..."
                            class="checklist-notes w-full px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            rows="2"
                            data-item-id="${item.id || index}"
                        ></textarea>
                    </div>
                </div>
            </div>
        `;
    });
    
    editableItems.innerHTML = html;
    
    // Agregar event listeners para checkboxes
    addChecklistEventListeners();
}

/**
 * Actualizar progreso del checklist
 */
function updateChecklistProgress() {
    const checkboxes = document.querySelectorAll('.checklist-checkbox');
    const completed = document.querySelectorAll('.checklist-checkbox:checked');
    const completedCount = document.getElementById('checklist-completed-count');
    
    if (completedCount) {
        completedCount.textContent = completed.length;
    }
    
    // Validar elementos obligatorios
    validateRequiredChecklistItems();
}

/**
 * Validar elementos obligatorios del checklist
 */
function validateRequiredChecklistItems() {
    const requiredItems = document.querySelectorAll('.checklist-item:has(.bg-red-100)');
    const submitButton = document.querySelector('#gimnacion-form button[type="submit"]');
    
    if (!submitButton) return;
    
    let allRequiredCompleted = true;
    
    requiredItems.forEach(item => {
        const checkbox = item.querySelector('.checklist-checkbox');
        if (checkbox && !checkbox.checked) {
            allRequiredCompleted = false;
        }
    });
    
    // Actualizar estado del botón submit
    if (allRequiredCompleted) {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        submitButton.disabled = true;
        submitButton.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Agregar event listeners para elementos del checklist
 */
function addChecklistEventListeners() {
    // Event listeners para checkboxes ya están en onchange del HTML
    
    // Event listeners para notas (auto-save)
    const noteTextareas = document.querySelectorAll('.checklist-notes');
    noteTextareas.forEach(textarea => {
        textarea.addEventListener('blur', () => {
            // Auto-guardar notas cuando el usuario sale del campo
            console.log('💾 Auto-saving checklist note:', {
                itemId: textarea.dataset.itemId,
                note: textarea.value
            });
        });
    });
}

/**
 * Obtener datos del checklist completado
 */
function getChecklistData() {
    const checklistItems = [];
    
    document.querySelectorAll('.checklist-item').forEach(item => {
        const itemId = item.dataset.itemId;
        const checkbox = item.querySelector('.checklist-checkbox');
        const notes = item.querySelector('.checklist-notes');
        
        if (checkbox) {
            checklistItems.push({
                item_id: itemId,
                completed: checkbox.checked,
                notes: notes ? notes.value.trim() : '',
                completed_at: checkbox.checked ? new Date().toISOString() : null
            });
        }
    });
    
    return checklistItems;
}

/**
 * Cerrar modal de gimnación
 */
function closeGimnacionModal() {
    const { gimnacionModal, gimnacionForm, checklistPreviewContainer, checklistEditableContainer } = window.ticketsElements || {};
    
    if (gimnacionModal) {
        gimnacionModal.classList.remove('is-open');
        
        // Limpiar formulario
        if (gimnacionForm) {
            gimnacionForm.reset();
        }
        
        // Ocultar contenedores de checklist
        if (checklistPreviewContainer) {
            checklistPreviewContainer.classList.add('hidden');
        }
        if (checklistEditableContainer) {
            checklistEditableContainer.classList.add('hidden');
        }
        
        // Limpiar editor de checklist
        if (window.checklistEditor) {
            window.checklistEditor.cancel();
        }
        
        // Ocultar editor de template
        const templateEditor = document.getElementById('template-editor');
        if (templateEditor) {
            templateEditor.classList.add('hidden');
        }
        
        // Limpiar selector de template
        const templateSelect = document.getElementById('checklist-template-select');
        if (templateSelect) {
            templateSelect.value = '';
        }
        
        // Limpiar estado
        state.gimnacion.selectedEquipment = [];
        state.gimnacion.selectedTemplate = null;
        
        // Actualizar resumen de equipos seleccionados
        const selectedSummary = document.getElementById('selected-equipment-summary');
        const selectedCount = document.getElementById('selected-count');
        
        if (selectedSummary) {
            selectedSummary.classList.add('hidden');
        }
        if (selectedCount) {
            selectedCount.textContent = '0';
        }
        
        console.log('✅ GIMNACION: Modal cerrado y limpiado completamente');
    }
}

/**
 * Cerrar modal de gimnación
 */
function closeGimnacionModal() {
    const { gimnacionModal, gimnacionForm } = window.ticketsElements || {};
    
    if (gimnacionModal) {
        gimnacionModal.classList.remove('is-open');
        
        // Limpiar formulario
        if (gimnacionForm) {
            gimnacionForm.reset();
        }
        
        // Limpiar editor de checklist
        if (typeof cancelTemplateEdit === 'function') {
            cancelTemplateEdit();
        }
        
        // Limpiar estado
        state.gimnacion.selectedEquipment = [];
        state.gimnacion.selectedTemplate = null;
        
        // Ocultar resumen de equipos seleccionados
        const summary = document.getElementById('selected-equipment-summary');
        if (summary) {
            summary.classList.add('hidden');
        }
        
        console.log('✅ GIMNACION: Modal cerrado y estado limpiado');
    }
}
async function handleGimnacionSubmit(event) {
    event.preventDefault();
    
    const { gimnacionForm, checklistTemplateSelect } = window.ticketsElements || {};
    
    if (!gimnacionForm) {
        alert('Error: Formulario no disponible');
        return;
    }
    
    try {
        // Validaciones
        if (state.gimnacion.selectedEquipment.length === 0) {
            alert('Debe seleccionar al menos un equipo para el servicio');
            activateGimnacionTab('gimnacion-scope');
            return;
        }
        
        // Recopilar datos del formulario
        const formData = new FormData(gimnacionForm);
        
        // Obtener datos del checklist del nuevo editor
        const checklistData = checklistEditorState.isEditing && checklistEditorState.items.length > 0 
            ? window.checklistEditor.getData() 
            : [];
        
        // Transformar equipment_ids a equipment_scope que espera el backend
        const equipment_scope = state.gimnacion.selectedEquipment.map(equip => ({
            equipment_id: equip.id,
            is_included: true,  // Todos los seleccionados están incluidos
            exclusion_reason: null,
            assigned_technician_id: null
        }));
        
        const ticketData = {
            title: formData.get('title'),
            description: formData.get('description'),
            client_id: parseInt(formData.get('client_id')),
            location_id: parseInt(formData.get('location_id')),
            contract_id: formData.get('contract_id') || null,
            priority: formData.get('priority'),
            ticket_type: 'gimnacion',
            equipment_scope: equipment_scope,  // Formato correcto para el backend
            technicians: [],  // Array vacío si no hay técnicos asignados
            checklist_template_id: checklistTemplateSelect?.value || null,
            custom_checklist: checklistData  // Renombrado de checklist_data a custom_checklist
        };
        
        console.log('🚀 GIMNACION: Creando ticket de gimnación...', {
            ...ticketData,
            equipment_count: equipment_scope.length,
            checklist_items: checklistData.length
        });
        
        // Crear ticket de gimnación
        const response = await authenticatedFetch(`${API_URL}/tickets/gimnacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al crear ticket de gimnación');
        }
        
        const result = await response.json();
        console.log('✅ GIMNACION: Ticket creado exitosamente:', result);
        
        // Cerrar modal
        closeGimnacionModal();
        
        // Refrescar lista de tickets
        await fetchTickets();
        renderTickets(state.filteredTickets);
        updateStatistics();
        
        alert('Ticket de gimnación creado exitosamente');
        
    } catch (error) {
        console.error('❌ GIMNACION: Error al crear ticket:', error);
        alert(`Error al crear el ticket de gimnación: ${error.message}`);
    }
}

// ===========================================
// FUNCIONES API ESPECÍFICAS PARA GIMNACIÓN
// ===========================================

/**
 * Obtener templates de checklist desde la API
 */
async function fetchChecklistTemplates() {
    try {
        const response = await authenticatedFetch(`${API_URL}/gimnacion/checklist-templates`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.gimnacion.checklistTemplates = result.data || [];
        
        console.log('✅ GIMNACION: Templates de checklist cargados:', state.gimnacion.checklistTemplates.length);
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando templates:', error);
        state.gimnacion.checklistTemplates = [];
        throw error;
    }
}

/**
 * Obtener items de un template de checklist
 */
async function fetchTemplateItems(templateId) {
    try {
        const response = await authenticatedFetch(`${API_URL}/gimnacion/checklist-templates/${templateId}/items`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result.data || [];
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando items del template:', error);
        throw error;
    }
}

// Hacer funciones disponibles globalmente para checklist-editor.js
window.fetchChecklistTemplates = fetchChecklistTemplates;
window.fetchTemplateItems = fetchTemplateItems;
window.ticketsState = state;

/**
 * Obtener contratos para selector
 */
async function fetchContracts() {
    try {
        const response = await authenticatedFetch(`${API_URL}/contracts`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.gimnacion.contracts = result.data || [];
        
        console.log('✅ GIMNACION: Contratos cargados:', state.gimnacion.contracts.length);
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando contratos:', error);
        state.gimnacion.contracts = [];
    }
}

/**
 * Obtener equipos de una ubicación usando el nuevo endpoint
 */
async function fetchEquipmentByLocation(locationId) {
    try {
        const response = await authenticatedFetch(`${API_URL}/locations/${locationId}/equipment`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result.data || [];
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando equipos de la sede:', error);
        throw error;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modalId === 'ticket-modal') {
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // Esperar a que termine la animación
    } else {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
    document.body.classList.remove('modal-open');
}

async function deleteItem(resource, id, callback) {
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
    try {
        const response = await authenticatedFetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar');
        }
        callback();
    } catch (error) {
        console.error(`Error deleting ${resource}:`, error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

/**
 * Seleccionar todos los equipos
 */
function selectAllEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    console.log('✅ GIMNACION: Todos los equipos seleccionados');
}

/**
 * Deseleccionar todos los equipos
 */
function deselectAllEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
        }
    });
    
    console.log('✅ GIMNACION: Todos los equipos deseleccionados');
}

/**
 * Manejar cambio de template con el nuevo editor
 */
async function onTemplateChangeWithEditor(event) {
    const templateId = event.target.value;
    
    if (!templateId) {
        // Ocultar editor si no hay template seleccionado
        if (window.checklistEditor) {
            window.checklistEditor.cancel();
        }
        return;
    }
    
    try {
        console.log(`📋 GIMNACION: Cargando template ${templateId} en editor...`);
        
        // Cargar template y sus items
        const template = state.gimnacion.checklistTemplates.find(t => t.id == templateId);
        const templateItems = await fetchTemplateItems(templateId);
        
        // Cargar en el editor
        checklistEditorState.currentTemplate = template;
        checklistEditorState.items = templateItems;
        checklistEditorState.isEditing = true;
        checklistEditorState.unsavedChanges = false;
        
        // Mostrar editor
        const templateEditor = document.getElementById('template-editor');
        const templateNameInput = document.getElementById('template-name-input');
        
        if (templateEditor) {
            templateEditor.classList.remove('hidden');
        }
        
        if (templateNameInput && template) {
            templateNameInput.value = template.template_name;
        }
        
        // Renderizar items
        if (typeof renderChecklistItems === 'function') {
            renderChecklistItems();
        }
        
        if (typeof updateProgress === 'function') {
            updateProgress();
        }
        
        console.log('✅ GIMNACION: Template cargado en editor exitosamente');
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando template en editor:', error);
        alert('Error al cargar el template seleccionado');
    }
}

// --- Global Functions (accessible from HTML) ---
window.removeEquipmentFromSelection = removeEquipmentFromSelection;
