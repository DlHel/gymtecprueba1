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
document.addEventListener('DOMContentLoaded', async () => {
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
    
    // USAR protectPage en lugar de verificación manual
    if (typeof window.protectPage === 'function') {
        console.log('✅ TICKETS: Usando protectPage para verificar autenticación...');
        const hasAccess = await window.protectPage();
        if (!hasAccess) {
            console.warn('❌ TICKETS: Acceso denegado por protectPage');
            return; // protectPage ya maneja la redirección
        }
    } else {
        // Fallback a verificación manual (menos robusta)
        console.warn('⚠️ TICKETS: protectPage no disponible, usando verificación manual...');
        
        if (!window.authManager) {
            console.error('❌ TICKETS: authManager no disponible');
            window.location.href = 'login.html';
            return;
        }
        
        if (!window.authManager.isAuthenticated()) {
            console.error('❌ TICKETS: Usuario no autenticado');
            window.location.href = 'login.html';
            return;
        }
    }
    
    console.log('✅ TICKETS: Autenticación verificada, inicializando...');
    
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
        checklistPreview
    };
    
    // Inicializar la aplicación
    try {
        await fetchAllInitialData();
        checkForUrlParams();
        setupFilters();
        console.log('✅ TICKETS: Inicialización completada');
    } catch (error) {
        console.error('❌ TICKETS: Error en inicialización:', error);
    }
    
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

function populateSelect(selectElement, items, { placeholder, valueKey = 'id', nameKey = 'name' }) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[nameKey];
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
        
        // Usar namespace para elementos DOM
        const { locationSelect } = window.ticketsElements || {};
        if (locationSelect) {
            populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede' });
            locationSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        state.locations = [];
        
        // Usar namespace para elementos DOM
        const { locationSelect } = window.ticketsElements || {};
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
        
        // Usar namespace para elementos DOM
        const { equipmentSelect } = window.ticketsElements || {};
        if (equipmentSelect) {
            populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo' });
            equipmentSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error fetching equipment:', error);
        state.equipment = [];
        
        // Usar namespace para elementos DOM
        const { equipmentSelect } = window.ticketsElements || {};
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

        // 1. Añadir a estado y repoblar desplegable de sedes
        state.locations.push(newLocation);
        populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede...' });
        locationSelect.value = newLocation.id;
        
        // 2. Disparar evento para actualizar la UI dependiente (equipos)
        locationSelect.dispatchEvent(new Event('change'));

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

        // 1. Añadir a estado y repoblar desplegable de equipos
        state.equipment.push(newEquipment);
        populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo (opcional)...' });
        equipmentSelect.value = newEquipment.id;

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

        // Reset and disable dependent dropdowns
        locationSelect.innerHTML = '<option value="">Seleccione un cliente primero...</option>';
        locationSelect.disabled = true;
        equipmentSelect.innerHTML = '<option value="">Seleccione una sede primero...</option>';
        equipmentSelect.disabled = true;

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
        
        // Obtener elementos DOM
        const { gimnacionModal, gimnacionForm } = window.ticketsElements || {};
        
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
        
        // Mostrar modal usando el patrón base-modal
        gimnacionModal.classList.add('is-open');
        
        // Activar primera pestaña
        activateGimnacionTab('gimnacion-general');
        
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
    const { gimnacionForm, checklistTemplateSelect } = window.ticketsElements || {};
    
    if (!gimnacionForm) {
        console.warn('⚠️ GIMNACION: gimnacionForm no disponible');
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
    
    // Poblar selector de contratos
    const contractSelect = gimnacionForm.querySelector('[name="contract_id"]');
    if (contractSelect && state.gimnacion.contracts.length > 0) {
        contractSelect.innerHTML = '<option value="">Sin contrato específico</option>';
        state.gimnacion.contracts.forEach(contract => {
            contractSelect.innerHTML += `<option value="${contract.id}">${contract.contract_name} (${contract.client_name})</option>`;
        });
    }
    
    // Poblar selector de templates de checklist
    if (checklistTemplateSelect && state.gimnacion.checklistTemplates.length > 0) {
        checklistTemplateSelect.innerHTML = '<option value="">Seleccione un template...</option>';
        state.gimnacion.checklistTemplates.forEach(template => {
            checklistTemplateSelect.innerHTML += `<option value="${template.id}">${template.template_name} (${template.item_count} items)</option>`;
        });
    }
}

/**
 * Configurar event listeners específicos del modal gimnación
 */
function setupGimnacionEventListeners() {
    const { gimnacionModal, gimnacionForm, checklistTemplateSelect } = window.ticketsElements || {};
    
    if (!gimnacionModal || !gimnacionForm) {
        console.warn('⚠️ GIMNACION: Elementos de modal no disponibles para event listeners');
        return;
    }
    
    // Cerrar modal
    const closeBtn = gimnacionModal.querySelector('.base-modal-close');
    const cancelBtn = gimnacionModal.querySelector('.base-btn-cancel');
    
    if (closeBtn) closeBtn.addEventListener('click', closeGimnacionModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeGimnacionModal);
    
    // Tabs de navegación
    const tabButtons = gimnacionModal.querySelectorAll('.base-tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            activateGimnacionTab(tabName);
        });
    });
    
    // Cambios de cliente y sede
    const clientSelect = gimnacionForm.querySelector('[name="client_id"]');
    const locationSelect = gimnacionForm.querySelector('[name="location_id"]');
    
    if (clientSelect) {
        clientSelect.addEventListener('change', onGimnacionClientChange);
    }
    
    if (locationSelect) {
        locationSelect.addEventListener('change', onGimnacionLocationChange);
    }
    
    // Botones de selección de equipos
    const selectAllBtn = document.getElementById('select-all-equipment');
    const deselectAllBtn = document.getElementById('deselect-all-equipment');
    
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllEquipment);
    if (deselectAllBtn) deselectAllBtn.addEventListener('click', deselectAllEquipment);
    
    // Template de checklist
    if (checklistTemplateSelect) {
        checklistTemplateSelect.addEventListener('change', onTemplateChange);
    }
    
    // Submit del formulario
    if (gimnacionForm) {
        gimnacionForm.addEventListener('submit', handleGimnacionSubmit);
    }
}

/**
 * Activar pestaña específica en modal gimnación
 */
function activateGimnacionTab(tabName) {
    const { gimnacionModal } = window.ticketsElements || {};
    
    if (!gimnacionModal) return;
    
    // Desactivar todas las pestañas
    gimnacionModal.querySelectorAll('.base-tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Mostrar contenido de pestaña correspondiente
    gimnacionModal.querySelectorAll('.base-tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabName}`) {
            content.classList.add('active');
        }
    });
}

/**
 * Manejar cambio de cliente en gimnación
 */
async function onGimnacionClientChange(event) {
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
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    if (!locationId) {
        equipmentScopeContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Seleccione una sede para ver los equipos</p>';
        return;
    }
    
    try {
        // Mostrar loading
        equipmentScopeContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando equipos...</p>';
        
        // Cargar equipos de la sede
        const equipment = await fetchEquipmentByLocation(locationId);
        
        // Renderizar equipos con checkboxes
        renderEquipmentScope(equipment);
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando equipos:', error);
        equipmentScopeContainer.innerHTML = '<p class="text-red-500 text-center py-4">Error cargando equipos</p>';
    }
}

/**
 * Renderizar lista de equipos con checkboxes
 */
function renderEquipmentScope(equipment) {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer || !equipment.length) {
        if (equipmentScopeContainer) {
            equipmentScopeContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No hay equipos disponibles en esta sede</p>';
        }
        return;
    }
    
    let html = '';
    
    equipment.forEach(equip => {
        html += `
            <div class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input 
                    type="checkbox" 
                    id="equip-${equip.id}" 
                    value="${equip.id}"
                    class="equipment-checkbox mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    data-equipment='${JSON.stringify(equip)}'
                >
                <label for="equip-${equip.id}" class="flex-1 cursor-pointer">
                    <div class="font-medium text-gray-900">${equip.name}</div>
                    <div class="text-sm text-gray-500">
                        ${equip.model_name || 'Sin modelo'} • 
                        ${equip.category_name || 'Sin categoría'} • 
                        ${equip.serial_number || 'S/N no disponible'}
                    </div>
                </label>
            </div>
        `;
    });
    
    equipmentScopeContainer.innerHTML = html;
    
    // Agregar event listeners a los checkboxes
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedEquipment);
    });
}

/**
 * Actualizar lista de equipos seleccionados
 */
function updateSelectedEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox:checked');
    state.gimnacion.selectedEquipment = [];
    
    checkboxes.forEach(checkbox => {
        const equipmentData = JSON.parse(checkbox.dataset.equipment);
        state.gimnacion.selectedEquipment.push(equipmentData);
    });
    
    console.log('📋 GIMNACION: Equipos seleccionados:', state.gimnacion.selectedEquipment.length);
}

/**
 * Seleccionar todos los equipos
 */
function selectAllEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedEquipment();
}

/**
 * Deseleccionar todos los equipos
 */
function deselectAllEquipment() {
    const { equipmentScopeContainer } = window.ticketsElements || {};
    
    if (!equipmentScopeContainer) return;
    
    const checkboxes = equipmentScopeContainer.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedEquipment();
}

/**
 * Manejar cambio de template de checklist
 */
async function onTemplateChange(event) {
    const templateId = event.target.value;
    const { checklistPreviewContainer } = window.ticketsElements || {};
    
    if (!checklistPreviewContainer) return;
    
    if (!templateId) {
        checklistPreviewContainer.classList.add('hidden');
        state.gimnacion.selectedTemplate = null;
        return;
    }
    
    try {
        // Cargar items del template
        const templateItems = await fetchTemplateItems(templateId);
        
        // Encontrar el template seleccionado
        const template = state.gimnacion.checklistTemplates.find(t => t.id == templateId);
        state.gimnacion.selectedTemplate = template;
        
        // Mostrar vista previa
        renderChecklistPreview(template, templateItems);
        checklistPreviewContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ GIMNACION: Error cargando template:', error);
    }
}

/**
 * Renderizar vista previa del checklist
 */
function renderChecklistPreview(template, items) {
    const { checklistPreview } = window.ticketsElements || {};
    
    if (!checklistPreview) return;
    
    let html = `<div class="mb-2 font-medium text-blue-600">${template.template_name}</div>`;
    
    items.forEach((item, index) => {
        html += `
            <div class="flex items-center py-1">
                <span class="text-sm text-gray-600 w-6">${index + 1}.</span>
                <span class="text-sm text-gray-900">${item.item_description}</span>
                ${item.is_required ? '<span class="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded">Obligatorio</span>' : ''}
            </div>
        `;
    });
    
    checklistPreview.innerHTML = html;
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
        
        // Limpiar estado
        state.gimnacion.selectedEquipment = [];
        state.gimnacion.selectedTemplate = null;
        
        console.log('✅ GIMNACION: Modal cerrado');
    }
}

/**
 * Manejar envío del formulario de gimnación
 */
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
        const ticketData = {
            title: formData.get('title'),
            description: formData.get('description'),
            client_id: parseInt(formData.get('client_id')),
            location_id: parseInt(formData.get('location_id')),
            contract_id: formData.get('contract_id') || null,
            priority: formData.get('priority'),
            ticket_type: 'gimnacion',
            equipment_ids: state.gimnacion.selectedEquipment.map(e => e.id),
            checklist_template_id: checklistTemplateSelect?.value || null
        };
        
        console.log('🚀 GIMNACION: Creando ticket de gimnación...', ticketData);
        
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