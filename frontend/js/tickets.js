const API_URL = 'http://localhost:3000/api';

let state = {
    tickets: [],
    clients: [],
    locations: [],
    equipment: [],
    ticketPrefillData: null // Added for prefilling from URL params
};

// --- DOM Elements ---
const ticketList = document.getElementById('ticket-list');
const clientSelect = document.getElementById('ticket-client-select');
const locationSelect = document.getElementById('ticket-location-select');
const equipmentSelect = document.getElementById('ticket-equipment-select');
const ticketModalForm = document.getElementById('ticket-modal-form');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAllInitialData().then(() => {
        checkForUrlParams(); // Check for URL params after initial data is loaded
    });

    // --- Event Listeners ---
    document.getElementById('add-ticket-btn').addEventListener('click', () => openModal('ticket-modal'));
    document.getElementById('ticket-modal-cancel-btn').addEventListener('click', () => closeModal('ticket-modal'));
    document.getElementById('ticket-modal-close-btn').addEventListener('click', () => closeModal('ticket-modal')); // Para el botón X del modal
    
    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.matches('.edit-ticket-btn')) openModal('ticket-modal', { id: button.dataset.id });
        if (button.matches('.delete-ticket-btn')) deleteItem('tickets', button.dataset.id, fetchTickets);
    });

    clientSelect.addEventListener('change', handleClientChange);
    locationSelect.addEventListener('change', handleLocationChange);
    ticketModalForm.addEventListener('submit', handleFormSubmit);
});

// --- Render Functions ---
function renderTickets(tickets) {
    ticketList.innerHTML = '';
    if (tickets && tickets.length > 0) {
        tickets.forEach(ticket => {
            const row = document.createElement('tr');
            
            let statusCellClass = '';
            let dueDateText = 'N/A';
            if (ticket.due_date) {
                const dueDate = new Date(ticket.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    statusCellClass = 'sla-red'; // Vencido
                } else if (diffDays <= 3) {
                    statusCellClass = 'sla-yellow'; // Próximo a vencer
                } else {
                    statusCellClass = 'sla-green'; // Lejos de vencer
                }
                dueDateText = dueDate.toLocaleDateString();
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">
                        <a href="ticket-detail.html?id=${ticket.id}" class="text-sky-600 hover:text-sky-800 hover:underline">${ticket.title}</a>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${ticket.client_name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm"><span class="status-badge ${statusCellClass}">${ticket.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${ticket.priority}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${dueDateText}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="p-1 text-slate-500 hover:text-sky-500 edit-ticket-btn" data-id="${ticket.id}"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button class="p-1 text-slate-500 hover:text-red-500 delete-ticket-btn" data-id="${ticket.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>`;
            ticketList.appendChild(row);
        });
        
        // Actualizar iconos Lucide después de renderizar
        lucide.createIcons();
    } else {
        ticketList.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-500">No hay tickets registrados.</td></tr>';
    }
}

function populateSelect(selectElement, items, { placeholder, valueKey = 'id', nameKey = 'name' }) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[nameKey];
        selectElement.appendChild(option);
    });
}

// --- API Calls ---
async function fetchAllInitialData() {
    try {
        await Promise.all([fetchTickets(), fetchClients()]);
    } catch (error) {
        console.error("Error fetching initial data:", error);
    }
}

async function fetchTickets() {
    try {
        const response = await fetch(`${API_URL}/tickets`);
        if (!response.ok) throw new Error(`Error fetching tickets: ${response.statusText}`);
        const result = await response.json();
        state.tickets = result.data || []; // Asegurar que sea un array
        renderTickets(state.tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        renderTickets([]); // Renderizar lista vacía o con mensaje de error
    }
}

async function fetchClients() {
    try {
        const response = await fetch(`${API_URL}/clients`);
        if (!response.ok) throw new Error(`Error fetching clients: ${response.statusText}`);
        const result = await response.json();
        state.clients = result.data || []; // Asegurar que sea un array
        populateSelect(clientSelect, state.clients, { placeholder: 'Seleccione un cliente...' });
    } catch (error) {
        console.error("Error fetching clients:", error);
        populateSelect(clientSelect, [], { placeholder: 'Error al cargar clientes' });
    }
}

async function fetchLocations(clientId) {
    try {
        const response = await fetch(`${API_URL}/clients/${clientId}/locations`);
        if (!response.ok) throw new Error(`Error fetching locations: ${response.statusText}`);
        const result = await response.json();
        state.locations = result.data || [];
        populateSelect(locationSelect, state.locations, { placeholder: 'Seleccione una sede...' });
        locationSelect.disabled = false;
    } catch (error) {
        console.error("Error fetching locations:", error);
        populateSelect(locationSelect, [], { placeholder: 'Error al cargar sedes' });
        locationSelect.disabled = false;
    }
}

async function fetchEquipment(locationId) {
    try {
        const response = await fetch(`${API_URL}/locations/${locationId}/equipment`);
        if (!response.ok) throw new Error(`Error fetching equipment: ${response.statusText}`);
        const result = await response.json();
        state.equipment = result.data || [];
        populateSelect(equipmentSelect, state.equipment, { placeholder: 'Seleccione un equipo (opcional)...' });
        equipmentSelect.disabled = false;
    } catch (error) {
        console.error("Error fetching equipment:", error);
        populateSelect(equipmentSelect, [], { placeholder: 'Error al cargar equipos' });
        equipmentSelect.disabled = false;
    }
}

// --- Event Handlers ---
function handleClientChange(e) {
    const clientId = e.target.value;
    locationSelect.disabled = true;
    locationSelect.innerHTML = '<option>Cargando sedes...</option>';
    equipmentSelect.disabled = true;
    equipmentSelect.innerHTML = '<option>Seleccione una sede primero...</option>';
    if (clientId) {
        fetchLocations(clientId);
    }
}

function handleLocationChange(e) {
    const locationId = e.target.value;
    equipmentSelect.disabled = true;
    equipmentSelect.innerHTML = '<option>Cargando equipos...</option>';
    if (locationId) {
        fetchEquipment(locationId);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements.id.value;
    const body = Object.fromEntries(new FormData(form));
    delete body.id;
    // Ensure optional fields are handled
    if (!body.location_id) body.location_id = null;
    if (!body.equipment_id) body.equipment_id = null;

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

// --- Modal & Generic Functions ---
async function openModal(modalId, data = {}) {
    const form = document.getElementById(`${modalId}-form`);
    form.reset();
    form.querySelector('input[name="id"]').value = '';
    document.getElementById(`${modalId}-title`).textContent = 'Nuevo Ticket';

    // Reset and disable dependent dropdowns
    // Client select is populated by fetchAllInitialData -> fetchClients
    locationSelect.innerHTML = '<option value="">Seleccione un cliente primero...</option>';
    locationSelect.disabled = true;
    equipmentSelect.innerHTML = '<option value="">Seleccione una sede primero...</option>';
    equipmentSelect.disabled = true;

    let effectiveData = { ...data }; // Start with data passed to openModal (e.g., for editing)

    // If it's a new ticket (no ID yet) AND there's prefill data from URL params
    if (!effectiveData.id && state.ticketPrefillData) {
        effectiveData = { ...state.ticketPrefillData, ...effectiveData };
    }

    if (effectiveData.id) { // Editing an existing ticket
        document.getElementById(`${modalId}-title`).textContent = 'Editar Ticket';
        try {
            const response = await fetch(`${API_URL}/tickets/${effectiveData.id}`);
            if (!response.ok) throw new Error(`Failed to fetch ticket ${effectiveData.id}`);
            const result = await response.json();
            const ticketData = result.data;

            // Populate form fields directly from ticketData using updated IDs
            Object.entries(ticketData).forEach(([key, value]) => {
                const fieldId = getFieldId(key);
                const field = document.getElementById(fieldId);
                if (field) {
                    if (key === 'due_date' && value) {
                        field.value = value.split('T')[0]; // Format for date input
                    } else {
                        field.value = value;
                    }
                }
            });

            // Set client_id first, then fetch and set dependent dropdowns
            if (ticketData.client_id) {
                clientSelect.value = ticketData.client_id;
                await fetchLocations(ticketData.client_id); // Populates and enables locationSelect
                locationSelect.value = ticketData.location_id;

                if (ticketData.location_id) {
                    await fetchEquipment(ticketData.location_id); // Populates and enables equipmentSelect
                    equipmentSelect.value = ticketData.equipment_id;
                }
            }
        } catch (error) {
            console.error("Error opening modal for editing ticket:", error);
        }
    } else if (effectiveData.client_id) { // New ticket with prefill data
        clientSelect.value = effectiveData.client_id;
        await fetchLocations(effectiveData.client_id);
        locationSelect.value = effectiveData.location_id;

        if (effectiveData.location_id) {
            await fetchEquipment(effectiveData.location_id);
            if (effectiveData.equipment_id) {
                equipmentSelect.value = effectiveData.equipment_id;
            }
        }
    }
    
    document.getElementById(modalId).classList.add('flex');
    document.getElementById(modalId).style.display = 'flex';
    
    // Actualizar iconos Lucide en el modal
    lucide.createIcons();
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
    const clientId = params.get('cliente'); // Cambiado de 'location_id' a 'cliente'
    const locationId = params.get('sede');   // Cambiado de 'equipment_id' a 'sede'
    const equipmentId = params.get('equipo'); // Nuevo parámetro para equipo

    state.ticketPrefillData = null; // Reset prefill data each time

    if (clientId && locationId) { // Si tenemos cliente y sede de la URL
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
    document.getElementById(modalId).classList.remove('flex');
    document.getElementById(modalId).style.display = 'none';
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