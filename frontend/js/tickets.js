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
        client: ''
    }
};

// --- DOM Elements ---
const ticketList = document.getElementById('ticket-list');
const clientSelect = document.querySelector('[name="client_id"]');
const locationSelect = document.querySelector('[name="location_id"]');
const equipmentSelect = document.querySelector('[name="equipment_id"]');
const ticketModalForm = document.getElementById('ticket-form');
const addClientModalForm = document.getElementById('add-client-modal-form');
const addLocationModalForm = document.getElementById('add-location-modal-form');
const addEquipmentModalForm = document.getElementById('add-equipment-modal-form');

// Nuevos elementos para filtros y búsqueda
const searchInput = document.getElementById('tickets-search');
const statusFilter = document.getElementById('tickets-filter-status');
const priorityFilter = document.getElementById('tickets-filter-priority');
const clientFilter = document.getElementById('tickets-filter-client');
const clearFiltersBtn = document.getElementById('tickets-clear-filters');
const emptyState = document.getElementById('tickets-empty-state');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que estamos en la página correcta
    if (!ticketList) return;
    
    fetchAllInitialData().then(() => {
        checkForUrlParams();
        setupFilters();
    });

    // --- Event Listeners ---
    document.getElementById('add-ticket-btn').addEventListener('click', () => openModal('ticket-modal'));
    
    // Listeners para cerrar modales usando el nuevo sistema base-modal
    document.querySelector('#ticket-modal .base-modal-close').addEventListener('click', () => closeModal('ticket-modal'));
    document.querySelector('#ticket-modal .base-btn-cancel').addEventListener('click', () => closeModal('ticket-modal'));
    
    // Listeners para tabs del modal
    document.querySelectorAll('#ticket-modal .base-tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Remover active de todos los tabs
            document.querySelectorAll('#ticket-modal .base-tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('#ticket-modal .base-tab-content').forEach(content => content.classList.remove('active'));
            
            // Activar el tab seleccionado
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
    
    // Listeners para el nuevo modal de cliente
    document.getElementById('add-client-modal-cancel-btn').addEventListener('click', () => closeModal('add-client-modal'));
    document.getElementById('add-client-modal-close-btn').addEventListener('click', () => closeModal('add-client-modal'));

    // Listeners para el modal de sede
    document.getElementById('add-location-modal-cancel-btn').addEventListener('click', () => closeModal('add-location-modal'));
    document.getElementById('add-location-modal-close-btn').addEventListener('click', () => closeModal('add-location-modal'));

    // Listeners para el modal de equipo
    document.getElementById('add-equipment-modal-cancel-btn').addEventListener('click', () => closeModal('add-equipment-modal'));
    document.getElementById('add-equipment-modal-close-btn').addEventListener('click', () => closeModal('add-equipment-modal'));

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
    }
    
    applyFilters();
}

function clearAllFilters() {
    state.currentFilters = {
        search: '',
        status: '',
        priority: '',
        client: ''
    };
    
    // Limpiar los inputs
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (clientFilter) clientFilter.value = '';
    
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

// --- Render Functions ---
function renderTickets(tickets) {
    if (!ticketList) return;
    
    ticketList.innerHTML = '';
    
    if (!tickets || tickets.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusClass(ticket.status);
        const priorityClass = getPriorityClass(ticket.priority);
        const slaClass = getSLAClass(ticket.due_date);
        
        row.innerHTML = `
            <td>
                <div class="font-medium text-gray-900">${ticket.title || 'Sin título'}</div>
                <div class="text-sm text-gray-500">${ticket.description ? ticket.description.substring(0, 100) + '...' : ''}</div>
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
        const response = await fetch(`${API_URL}/tickets`);
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
        const response = await fetch(`${API_URL}/clients`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.clients = result.data || [];
        
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
        const response = await fetch(`${API_URL}/locations?client_id=${clientId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log('Locations API response:', result);
        state.locations = result.data || [];
        console.log('Filtered locations for client', clientId, ':', state.locations);
        
        if (locationSelect) {
            populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede' });
            locationSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error fetching locations:', error);
        state.locations = [];
        if (locationSelect) {
            populateSelect(locationSelect, [], { placeholder: 'Error al cargar sedes' });
            locationSelect.disabled = false;
        }
    }
}

async function fetchEquipment(locationId) {
    try {
        const response = await fetch(`${API_URL}/equipment?location_id=${locationId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        state.equipment = result.data || [];
        
        if (equipmentSelect) {
            populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo' });
            equipmentSelect.disabled = false;
        }
    } catch (error) {
        console.error('Error fetching equipment:', error);
        state.equipment = [];
        if (equipmentSelect) {
            populateSelect(equipmentSelect, [], { placeholder: 'Error al cargar equipos' });
            equipmentSelect.disabled = false;
        }
    }
}

async function fetchEquipmentModels() {
    try {
        const response = await fetch(`${API_URL}/equipment-models`);
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
        const response = await fetch(url, {
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
        const response = await fetch(`${API_URL}/clients`, {
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
        const response = await fetch(`${API_URL}/locations`, {
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
        const response = await fetch(`${API_URL}/equipment`, {
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
                const response = await fetch(`${API_URL}/tickets/${effectiveData.id}`);
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
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10); // Pequeño delay para que la animación funcione
    } else {
        modal.style.display = 'flex';
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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modalId === 'ticket-modal') {
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Esperar a que termine la animación
    } else {
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
}

async function deleteItem(resource, id, callback) {
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
    try {
        const response = await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
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