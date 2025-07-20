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
        // Buscar el botón más cercano desde el elemento clickeado
        const button = event.target.closest('button');
        if (!button) return;
        
        // También verificar si se hizo click directamente en un icono dentro del botón
        const clickedElement = event.target;
        const isIconClick = clickedElement.tagName === 'I' || clickedElement.tagName === 'SVG' || clickedElement.tagName === 'PATH';
        
        console.log('🖱️ Button clicked:', {
            className: button.className,
            dataId: button.dataset.id,
            clickedElement: clickedElement.tagName,
            isIconClick: isIconClick
        });
        
        if (button.matches('.edit-ticket-btn')) {
            console.log('✏️ Edit button clicked for ticket:', button.dataset.id);
            openModal('ticket-modal', { id: button.dataset.id });
        }
        
        if (button.matches('.delete-ticket-btn')) {
            console.log('🗑️ Delete button clicked for ticket:', button.dataset.id);
            event.preventDefault();
            event.stopPropagation();
            deleteItem('tickets', button.dataset.id, fetchTickets);
        }
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
                <div class="font-semibold text-blue-600 text-center">#${ticket.id}</div>
            </td>
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
        
        // Agregar event listeners específicos para los botones de esta fila
        const deleteBtn = row.querySelector('.delete-ticket-btn');
        const editBtn = row.querySelector('.edit-ticket-btn');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                console.log('🗑️ Direct delete button click for ticket:', ticket.id);
                e.preventDefault();
                e.stopPropagation();
                deleteItem('tickets', ticket.id, fetchTickets);
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                console.log('✏️ Direct edit button click for ticket:', ticket.id);
                e.preventDefault();
                e.stopPropagation();
                openModal('ticket-modal', { id: ticket.id });
            });
        }
    });
    
    // Regenerar iconos de Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
}

function populateSelect(selectElement, items, { placeholder, valueKey = 'id', nameKey = 'name' }) {
    if (!selectElement) {
        console.log('🔍 [DEBUG] populateSelect: selectElement is null');
        return;
    }
    
    console.log('🔍 [DEBUG] populateSelect called with:', {
        selectElement: selectElement.name || selectElement.id,
        itemsCount: items.length,
        placeholder,
        items: items
    });
    
    selectElement.innerHTML = '';
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    selectElement.appendChild(placeholderOption);
    
    items.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[nameKey];
        selectElement.appendChild(option);
        console.log(`🔍 [DEBUG] Added option ${index + 1}:`, option.textContent, '(value:', option.value, ')');
    });
    
    console.log('🔍 [DEBUG] Final select innerHTML:', selectElement.innerHTML);
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
        console.log('🔍 [DEBUG] Fetching locations for client:', clientId);
        console.log('🔍 [DEBUG] API_URL:', API_URL);
        const url = `${API_URL}/locations?client_id=${clientId}`;
        console.log('🔍 [DEBUG] Full URL:', url);
        
        const response = await fetch(url);
        console.log('🔍 [DEBUG] Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log('🔍 [DEBUG] Raw API response:', result);
        state.locations = result.data || [];
        console.log('🔍 [DEBUG] Filtered locations for client', clientId, ':', state.locations);
        console.log('🔍 [DEBUG] Number of locations:', state.locations.length);
        
        if (locationSelect) {
            console.log('🔍 [DEBUG] Populating locationSelect with', state.locations.length, 'items');
            populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede' });
            locationSelect.disabled = false;
            console.log('🔍 [DEBUG] locationSelect innerHTML after populate:', locationSelect.innerHTML);
        }
    } catch (error) {
        console.error('❌ [ERROR] Error fetching locations:', error);
        state.locations = [];
        if (locationSelect) {
            populateSelect(locationSelect, [], { placeholder: 'Error al cargar sedes' });
            locationSelect.disabled = false;
        }
    }
}

async function fetchEquipment(locationId) {
    try {
        console.log('🔍 [DEBUG] Fetching equipment for location:', locationId);
        console.log('🔍 [DEBUG] API_URL:', API_URL);
        const url = `${API_URL}/equipment?location_id=${locationId}`;
        console.log('🔍 [DEBUG] Full URL:', url);
        
        const response = await fetch(url);
        console.log('🔍 [DEBUG] Equipment response status:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        console.log('🔍 [DEBUG] Raw equipment API response:', result);
        state.equipment = result.data || [];
        console.log('🔍 [DEBUG] Filtered equipment for location', locationId, ':', state.equipment);
        console.log('🔍 [DEBUG] Number of equipment:', state.equipment.length);
        
        if (equipmentSelect) {
            console.log('🔍 [DEBUG] Populating equipmentSelect with', state.equipment.length, 'items');
            populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo' });
            equipmentSelect.disabled = false;
            console.log('🔍 [DEBUG] equipmentSelect innerHTML after populate:', equipmentSelect.innerHTML);
        }
    } catch (error) {
        console.error('❌ [ERROR] Error fetching equipment:', error);
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
    console.log('🔍 [DEBUG] handleClientChange called with clientId:', clientId);
    
    // Limpiar selects dependientes
    if (locationSelect) {
        locationSelect.disabled = true;
        locationSelect.innerHTML = '<option>Cargando sedes...</option>';
        console.log('🔍 [DEBUG] Reset locationSelect to loading state');
    }
    if (equipmentSelect) {
        equipmentSelect.disabled = true;
        equipmentSelect.innerHTML = '<option>Seleccione una sede primero...</option>';
    }

    if (clientId) {
        console.log('🔍 [DEBUG] Calling fetchLocations with clientId:', clientId);
        fetchLocations(clientId);
    } else {
        console.log('🔍 [DEBUG] No clientId provided, not fetching locations');
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
        
        const ticketData = await response.json();
        console.log('📋 Respuesta del ticket:', ticketData);
        
        // Mejorar extracción del ID del ticket
        let ticketId = id;
        if (!ticketId) {
            // Para tickets nuevos, el ID está en data.id según la respuesta del backend
            ticketId = ticketData.data?.id || ticketData.id || ticketData.lastID;
        }
        
        console.log('🎯 Ticket ID obtenido:', ticketId);
        
        if (!ticketId) {
            console.error('❌ No se pudo obtener el ID del ticket de la respuesta');
            throw new Error('No se pudo obtener el ID del ticket creado');
        }
        
        // Si es un nuevo ticket y hay fotos seleccionadas, adjuntarlas
        if (!id && selectedPhotos.length > 0) {
            try {
                console.log(`📸 Intentando adjuntar ${selectedPhotos.length} fotos al ticket ${ticketId}`);
                await attachTicketPhotos(ticketId);
                console.log('✅ Ticket creado con fotos adjuntadas');
            } catch (photoError) {
                console.error('❌ Error al adjuntar fotos:', photoError);
                alert(`Ticket creado exitosamente, pero hubo un error al subir las fotos: ${photoError.message}`);
            }
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
                
                // Usar una forma más segura de asignar valores
                const setFormValue = (name, value) => {
                    const element = form.querySelector(`[name="${name}"]`);
                    if (element && value !== undefined && value !== null) {
                        element.value = value;
                    }
                };
                
                setFormValue('title', ticketData.title || '');
                setFormValue('description', ticketData.description || '');
                setFormValue('priority', ticketData.priority || 'media');
                setFormValue('status', ticketData.status || 'Abierto');
                
                // Manejar fecha de vencimiento
                if (ticketData.due_date) {
                    const dueDateElement = form.querySelector('[name="due_date"]');
                    if (dueDateElement) {
                        // Convertir datetime a formato datetime-local
                        const dateObj = new Date(ticketData.due_date);
                        const localISOTime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        dueDateElement.value = localISOTime;
                    }
                }
                
                setFormValue('client_id', ticketData.client_id);
                setFormValue('assigned_technician_id', ticketData.assigned_technician_id);
                setFormValue('initial_observations', ticketData.initial_observations || '');

                if (ticketData.client_id) {
                    await fetchLocations(ticketData.client_id);
                    setFormValue('location_id', ticketData.location_id);
                }

                if (ticketData.location_id) {
                    await fetchEquipment(ticketData.location_id);
                    setFormValue('equipment_id', ticketData.equipment_id);
                }

            } catch (error) {
                console.error('Error populating form for edit:', error);
                alert('Error al cargar los datos del ticket para editar.');
                closeModal(modalId);
                return; // Detener ejecución si falla la carga
            }
        } else if (effectiveData.client_id) { // Prefill for new ticket
            setFormValue('client_id', effectiveData.client_id);
            if (effectiveData.client_id) {
                await fetchLocations(effectiveData.client_id);
                if (effectiveData.location_id) {
                    setFormValue('location_id', effectiveData.location_id);
                    await fetchEquipment(effectiveData.location_id);
                    if (effectiveData.equipment_id) {
                        setFormValue('equipment_id', effectiveData.equipment_id);
                    }
                }
            }
        }
        state.ticketPrefillData = null;
        
        // Inicializar sistema de fotos para nuevos tickets
        if (!effectiveData.id) {
            initializeTicketPhotoSystem();
        }
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
    
    // Limpiar estado específico de fotos cuando se cierra el modal de tickets
    if (modalId === 'ticket-modal') {
        resetTicketPhotoSystem();
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
    console.log(`🔍 deleteItem called with resource: ${resource}, id: ${id}`);
    
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    console.log(`📡 Sending DELETE request to: ${API_URL}/${resource}/${id}`);
    
    try {
        const response = await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
        
        console.log(`📨 Response received. Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Delete failed with error:', errorData);
            throw new Error(errorData.error || 'Error al eliminar');
        }
        
        const result = await response.json();
        console.log('✅ Delete successful. Response:', result);
        
        console.log('🔄 Calling callback function...');
        callback();
        
    } catch (error) {
        console.error(`❌ Error deleting ${resource}:`, error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

// ============================================
//           SISTEMA DE FOTOS PARA TICKETS
// ============================================

let selectedPhotos = [];
let photoSystemInitialized = false; // Bandera para evitar inicializaciones múltiples

function setupTicketPhotoUpload() {
    // Evitar múltiples inicializaciones
    if (photoSystemInitialized) {
        console.log('📸 Sistema de fotos ya inicializado, omitiendo...');
        return;
    }
    
    const dropZone = document.getElementById('ticket-photo-drop-zone');
    const fileInput = document.getElementById('ticket-photo-input');
    const clearBtn = document.getElementById('ticket-clear-photos-btn');
    
    if (!dropZone || !fileInput) {
        console.warn('⚠️ Elementos de foto no encontrados');
        return;
    }

    console.log('📸 Inicializando sistema de fotos...');

    // Limpiar event listeners existentes si los hay
    const newDropZone = dropZone.cloneNode(true);
    dropZone.parentNode.replaceChild(newDropZone, dropZone);
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    // Configurar drag and drop en los elementos nuevos
    newDropZone.addEventListener('click', () => newFileInput.click());
    
    newDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        newDropZone.classList.add('dragover');
    });
    
    newDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        newDropZone.classList.remove('dragover');
    });
    
    newDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        newDropZone.classList.remove('dragover');
        handleTicketPhotoFiles(e.dataTransfer.files);
    });
    
    newFileInput.addEventListener('change', (e) => {
        handleTicketPhotoFiles(e.target.files);
    });
    
    if (clearBtn) {
        // Limpiar event listeners del botón también
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        newClearBtn.addEventListener('click', clearTicketPhotos);
    }
    
    photoSystemInitialized = true;
    console.log('✅ Sistema de fotos inicializado');
}

function handleTicketPhotoFiles(files) {
    if (!files || files.length === 0) return;
    
    const maxFileSize = 1 * 1024 * 1024; // 1MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    
    Array.from(files).forEach(file => {
        // Validar tipo de archivo
        if (!allowedTypes.includes(file.type)) {
            alert(`❌ Formato no válido: ${file.name}. Solo se permiten JPG, PNG y GIF.`);
            return;
        }
        
        // Validar tamaño
        if (file.size > maxFileSize) {
            alert(`❌ Archivo muy grande: ${file.name}. Máximo 1MB.`);
            return;
        }
        
        // Convertir a base64 y agregar a la lista
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result
            };
            
            selectedPhotos.push(photoData);
            updateTicketPhotosPreview();
        };
        reader.readAsDataURL(file);
    });
}

function updateTicketPhotosPreview() {
    const container = document.getElementById('ticket-photos-preview-container');
    const grid = document.getElementById('ticket-photos-preview-grid');
    const countSpan = document.querySelector('.ticket-photos-count');
    
    if (!container || !grid) return;
    
    // Mostrar/ocultar contenedor
    if (selectedPhotos.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    // Actualizar contador
    if (countSpan) {
        countSpan.textContent = `${selectedPhotos.length} foto${selectedPhotos.length !== 1 ? 's' : ''} seleccionada${selectedPhotos.length !== 1 ? 's' : ''}`;
    }
    
    // Limpiar grid
    grid.innerHTML = '';
    
    // Agregar previsualizaciones
    selectedPhotos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'ticket-photo-preview-item';
        item.innerHTML = `
            <img src="${photo.data}" alt="${photo.name}" class="ticket-photo-preview-img">
            <button type="button" class="ticket-photo-remove-btn" onclick="removeTicketPhoto('${photo.id}')">
                ×
            </button>
        `;
        grid.appendChild(item);
    });
}

function removeTicketPhoto(photoId) {
    selectedPhotos = selectedPhotos.filter(photo => photo.id !== photoId);
    updateTicketPhotosPreview();
}

function clearTicketPhotos() {
    if (selectedPhotos.length === 0) return;
    
    if (confirm('¿Seguro que quieres limpiar todas las fotos seleccionadas?')) {
        selectedPhotos = [];
        updateTicketPhotosPreview();
        
        // Limpiar input file
        const fileInput = document.getElementById('ticket-photo-input');
        if (fileInput) fileInput.value = '';
        
        // Limpiar comentario
        const commentInput = document.getElementById('ticket-photo-comment');
        if (commentInput) commentInput.value = '';
    }
}

function getTicketPhotoComment() {
    const commentInput = document.getElementById('ticket-photo-comment');
    return commentInput ? commentInput.value.trim() : '';
}

// Función para adjuntar fotos al crear el ticket
async function attachTicketPhotos(ticketId) {
    if (!ticketId) {
        console.error('❌ ticketId es undefined o null');
        throw new Error('ID de ticket no válido');
    }
    
    if (selectedPhotos.length === 0) return;
    
    const comment = getTicketPhotoComment();
    
    try {
        console.log(`📸 Adjuntando ${selectedPhotos.length} fotos al ticket ${ticketId}...`);
        
        for (const photo of selectedPhotos) {
            console.log('📤 Procesando foto:', {
                name: photo.name,
                size: photo.size,
                type: photo.type,
                hasData: !!photo.data,
                dataLength: photo.data ? photo.data.length : 0
            });
            
            // Validar que la foto tenga todos los campos necesarios
            if (!photo.data) {
                console.error('❌ Foto sin datos:', photo);
                throw new Error(`La foto ${photo.name} no tiene datos base64`);
            }
            
            if (!photo.type) {
                console.error('❌ Foto sin tipo MIME:', photo);
                throw new Error(`La foto ${photo.name} no tiene tipo MIME`);
            }
            
            const photoData = {
                photo_data: photo.data,          // Cambio: image_data -> photo_data
                file_name: photo.name,           // Cambio: filename -> file_name  
                mime_type: photo.type,           // Agregar: mime_type requerido
                file_size: photo.size || 0,      // Agregar: file_size (con fallback)
                description: comment || `Foto inicial del ticket ${ticketId}`, // Cambio: comment -> description
                photo_type: 'Evidencia'          // Agregar: photo_type
            };
            
            console.log('📋 Datos de foto a enviar:', {
                file_name: photoData.file_name,
                mime_type: photoData.mime_type,
                file_size: photoData.file_size,
                description: photoData.description,
                photo_type: photoData.photo_type,
                photo_data_length: photoData.photo_data ? photoData.photo_data.length : 0,
                photo_data_preview: photoData.photo_data ? `${photoData.photo_data.substring(0, 50)}...` : 'NO DATA'
            });
            
            const response = await fetch(`${API_URL}/tickets/${ticketId}/photos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(photoData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error del servidor:', errorData);
                throw new Error(errorData.error || 'Error al subir foto');
            }
            
            const result = await response.json();
            console.log('✅ Foto subida exitosamente:', result);
        }
        
        console.log('🎉 Todas las fotos adjuntadas exitosamente');
        
        // Limpiar fotos seleccionadas
        selectedPhotos = [];
        updateTicketPhotosPreview();
        
        // Limpiar input y comentario
        const fileInput = document.getElementById('ticket-photo-input');
        if (fileInput) fileInput.value = '';
        
        const commentInput = document.getElementById('ticket-photo-comment');
        if (commentInput) commentInput.value = '';
        
    } catch (error) {
        console.error('❌ Error al adjuntar fotos:', error);
        throw error; // Re-lanzar para que el formulario principal pueda manejarlo
    }
}

// Inicializar sistema de fotos cuando se abre el modal
function initializeTicketPhotoSystem() {
    console.log('🔄 Inicializando sistema de fotos del ticket...');
    
    // Limpiar estado previo
    resetTicketPhotoSystem();
    
    setupTicketPhotoUpload();
    updateTicketPhotosPreview();
    
    console.log('✅ Sistema de fotos del ticket inicializado');
}

function resetTicketPhotoSystem() {
    console.log('🧹 Limpiando estado del sistema de fotos...');
    
    // Limpiar array de fotos
    selectedPhotos = [];
    
    // Resetear bandera de inicialización para permitir nueva configuración
    photoSystemInitialized = false;
    
    // Limpiar preview de fotos si existe
    const previewContainer = document.getElementById('ticket-photos-preview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    // Resetear input de archivo
    const fileInput = document.getElementById('ticket-photo-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Actualizar preview y contador
    updateTicketPhotosPreview();
    
    console.log('✅ Estado del sistema de fotos limpiado');
}