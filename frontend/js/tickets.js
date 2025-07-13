// API_URL se define en config.js

let state = {
    tickets: [],
    clients: [],
    locations: [],
    equipment: [],
    ticketPrefillData: null // Added for prefilling from URL params
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAllInitialData().then(() => {
        checkForUrlParams(); // Check for URL params after initial data is loaded
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
        await Promise.all([fetchTickets(), fetchClients(), fetchEquipmentModels()]);
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

async function fetchEquipmentModels() {
    try {
        const response = await fetch(`${API_URL}/models`);
        if (!response.ok) throw new Error('Failed to fetch equipment models');
        const result = await response.json();
        const models = result.data || [];
        const modelSelect = document.getElementById('new-equipment-model-select');
        populateSelect(modelSelect, models, { placeholder: 'Seleccione un modelo (opcional)', valueKey: 'id', nameKey: 'name' });
    } catch (error) {
        console.error("Error fetching equipment models:", error);
    }
}

// --- Event Handlers ---
function handleClientChange(e) {
    const clientId = e.target.value;
    locationSelect.disabled = true;
    locationSelect.innerHTML = '<option>Cargando sedes...</option>';
    equipmentSelect.disabled = true;
    equipmentSelect.innerHTML = '<option>Seleccione una sede primero...</option>';
    
    addLocationBtn.disabled = !clientId;
    addEquipmentBtn.disabled = true;

    if (clientId) {
        fetchLocations(clientId);
    }
}

function handleLocationChange(e) {
    const locationId = e.target.value;
    equipmentSelect.disabled = true;
    equipmentSelect.innerHTML = '<option>Cargando equipos...</option>';
    
    addEquipmentBtn.disabled = !locationId;

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
        const form = document.getElementById('ticket-modal-form');
        form.reset();
        form.querySelector('input[name="id"]').value = '';
        document.getElementById('ticket-modal-title').textContent = 'Nuevo Ticket';
        document.getElementById('ticket-status-wrapper').classList.add('hidden');

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
            document.getElementById('ticket-status-wrapper').classList.remove('hidden');

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