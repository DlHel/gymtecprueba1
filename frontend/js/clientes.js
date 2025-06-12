const API_URL = 'http://localhost:3000/api';

let state = {
    clients: [],
    locations: [],
    equipment: [],
    selectedClientId: null,
    selectedLocationId: null,
};

// --- DOM Elements ---
const clientList = document.getElementById('client-list');
const locationList = document.getElementById('location-list');
const equipmentList = document.getElementById('equipment-list');
const addLocationBtn = document.getElementById('add-location-btn');
const createTicketForLocationBtn = document.getElementById('create-ticket-for-location-btn');
const addEquipmentBtn = document.getElementById('add-equipment-btn');
const clientModalForm = document.getElementById('client-modal-form');
const locationModalForm = document.getElementById('location-modal-form');
const equipmentModalForm = document.getElementById('equipment-modal-form');
const searchClientInput = document.getElementById('search-client-input');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchClients();

    // --- Event Listeners ---
    searchClientInput.addEventListener('input', handleClientSearch);
    document.getElementById('add-client-btn').addEventListener('click', () => openModal('client-modal'));
    document.getElementById('client-modal-cancel-btn').addEventListener('click', () => closeModal('client-modal'));
    clientModalForm.addEventListener('submit', (e) => handleFormSubmit(e, 'clients', fetchClients));

    addLocationBtn.addEventListener('click', () => {
        if (state.selectedClientId) {
            openModal('location-modal', { client_id: state.selectedClientId });
        }
    });
    document.getElementById('location-modal-cancel-btn').addEventListener('click', () => closeModal('location-modal'));
    locationModalForm.addEventListener('submit', (e) => handleFormSubmit(e, 'locations', () => fetchLocationsForClient(state.selectedClientId)));

    createTicketForLocationBtn.addEventListener('click', () => {
        if (state.selectedLocationId) {
            window.location.href = `tickets.html?location_id=${state.selectedLocationId}`;
        }
    });

    addEquipmentBtn.addEventListener('click', () => {
        if (state.selectedLocationId) {
            openModal('equipment-modal', { location_id: state.selectedLocationId });
        }
    });
    document.getElementById('equipment-modal-cancel-btn').addEventListener('click', () => closeModal('equipment-modal'));
    equipmentModalForm.addEventListener('submit', (e) => handleFormSubmit(e, 'equipment', () => fetchEquipmentForLocation(state.selectedLocationId)));


    const panelsContainer = document.getElementById('client-panels-container');
    if(panelsContainer) {
        panelsContainer.addEventListener('click', function(event) {
            const target = event.target;
            const button = target.closest('button');
            const link = target.closest('a');

            if (link && link.matches('.quick-view-equipment-btn')) {
                event.preventDefault();
                openModal('equipment-modal', { id: link.dataset.id, readonly: true });
            }

            if (!button) return;

            if (button.matches('.edit-client-btn')) openModal('client-modal', { id: button.dataset.id });
            else if (button.matches('.delete-client-btn')) deleteItem('clients', button.dataset.id, fetchClients);
            else if (button.matches('.edit-location-btn')) openModal('location-modal', { id: button.dataset.id, client_id: state.selectedClientId });
            else if (button.matches('.delete-location-btn')) deleteItem('locations', button.dataset.id, () => fetchLocationsForClient(state.selectedClientId));
            else if (button.matches('.edit-equipment-btn')) openModal('equipment-modal', { id: button.dataset.id, location_id: state.selectedLocationId });
            else if (button.matches('.delete-equipment-btn')) deleteItem('equipment', button.dataset.id, () => fetchEquipmentForLocation(state.selectedLocationId));
            else if (button.matches('#create-ticket-for-equipment-btn')) {
                const equipmentId = document.querySelector('#equipment-modal-form input[name="id"]').value;
                const locationId = document.querySelector('#equipment-modal-form input[name="location_id"]').value;
                if(equipmentId && locationId) {
                    window.location.href = `tickets.html?location_id=${locationId}&equipment_id=${equipmentId}`;
                }
            }
        });
    }
});


// --- Render Functions ---
function renderClients(clients) {
    clientList.innerHTML = '';
    if (clients && clients.length > 0) {
        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center';
            if (client.id === state.selectedClientId) {
                li.classList.add('bg-sky-100');
            }
            li.innerHTML = `
                <div>
                    <span class="font-medium text-slate-800">${client.name}</span>
                    <span class="block text-sm text-slate-500">${client.contact_person || ''}</span>
                </div>
                <div>
                    <button class="p-1 text-slate-500 hover:text-sky-500 edit-client-btn" data-id="${client.id}"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button class="p-1 text-slate-500 hover:text-red-500 delete-client-btn" data-id="${client.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;
            li.addEventListener('click', (e) => {
                if (!e.target.closest('button')) handleClientSelection(client.id, li);
            });
            clientList.appendChild(li);
        });
    } else {
        clientList.innerHTML = '<li class="p-4 text-slate-500">No hay clientes.</li>';
    }
    lucide.createIcons();
}

function renderLocations(locations) {
    locationList.innerHTML = '';
    if (locations && locations.length > 0) {
        locations.forEach(location => {
            const li = document.createElement('li');
            li.className = 'p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center';
            li.innerHTML = `
                <div>
                    <span class="font-medium text-slate-800">${location.name}</span>
                    <span class="block text-sm text-slate-500">${location.address || ''}</span>
                </div>
                <div>
                    <button class="p-1 text-slate-500 hover:text-sky-500 edit-location-btn" data-id="${location.id}"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button class="p-1 text-slate-500 hover:text-red-500 delete-location-btn" data-id="${location.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;
            li.addEventListener('click', (e) => {
                if (!e.target.closest('button')) handleLocationSelection(location.id, li);
            });
            locationList.appendChild(li);
        });
    } else {
        locationList.innerHTML = '<li class="p-4 text-slate-500">No hay sedes.</li>';
    }
    lucide.createIcons();
}

function renderEquipment(equipment) {
    equipmentList.innerHTML = '';
    if (!equipment || equipment.length === 0) {
        equipmentList.innerHTML = '<li class="p-4 text-slate-500">No hay equipos.</li>';
        return;
    }

    const equipmentByType = equipment.reduce((acc, item) => {
        const type = item.type || 'Sin tipo';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(item);
        return acc;
    }, {});

    Object.entries(equipmentByType).forEach(([type, items]) => {
        const groupLi = document.createElement('li');
        groupLi.className = 'p-4';
        groupLi.innerHTML = `
            <details>
                <summary class="font-medium text-slate-800 cursor-pointer flex justify-between">
                    <span>${type}</span>
                    <span class="text-sm font-normal bg-slate-200 text-slate-600 px-2 rounded-full">${items.length}</span>
                </summary>
                <ul class="mt-2 space-y-2 pl-4">
                    ${items.map(item => `
                        <li class="flex justify-between items-center text-sm">
                            <div>
                                <a href="#" class="font-medium text-slate-700 hover:text-sky-600 quick-view-equipment-btn" data-id="${item.id}">${item.name}</a>
                                <span class="block text-xs text-slate-500">${item.brand || ''} ${item.model || ''} - S/N: ${item.serial_number || 'N/A'}</span>
                            </div>
                            <div>
                                <button class="p-1 text-slate-500 hover:text-sky-500 edit-equipment-btn" data-id="${item.id}" title="Editar Equipo"><i data-lucide="edit" class="w-4 h-4"></i></button>
                                <button class="p-1 text-slate-500 hover:text-red-500 delete-equipment-btn" data-id="${item.id}" title="Eliminar Equipo"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </details>
        `;
        equipmentList.appendChild(groupLi);
    });

    lucide.createIcons();
}

// --- API Calls ---
async function fetchClients() {
    try {
        const response = await fetch(`${API_URL}/clients`);
        state.clients = (await response.json()).data;
        renderClients(state.clients);
        if (state.clients.length > 0) {
            if (!state.selectedClientId) { // Auto-select first client only if none is selected yet
                handleClientSelection(state.clients[0].id, clientList.querySelector('li:first-child'));
            }
        } else {
            resetPanels('client'); // No clients, reset all panels starting from client level
        }
    } catch (error) {
        console.error("Error fetching clients:", error);
    }
}

async function fetchLocationsForClient(clientId) {
    resetPanels('location'); // Reset location and equipment panels before fetching new locations
    try {
        const response = await fetch(`${API_URL}/clients/${clientId}/locations`);
        state.locations = (await response.json()).data;
        renderLocations(state.locations);
        if (state.locations.length === 1 && !state.selectedLocationId) { // Auto-select if single location and none selected yet
            handleLocationSelection(state.locations[0].id, locationList.querySelector('li:first-child'));
        } else if (state.locations.length === 0) {
            resetPanels('equipment'); // No locations found, ensure equipment panel is also reset
        }
    } catch (error) {
        console.error("Error fetching locations:", error);
    }
}

async function fetchEquipmentForLocation(locationId) {
    resetPanels('equipment'); // Reset equipment panel before fetching new equipment
    try {
        const response = await fetch(`${API_URL}/locations/${locationId}/equipment`);
        state.equipment = (await response.json()).data;
        renderEquipment(state.equipment);
    } catch (error) {
        console.error("Error fetching equipment:", error);
    }
}

// --- Event Handlers ---
function handleClientSelection(clientId, liElement) {
    state.selectedClientId = clientId;
    document.querySelectorAll('#client-list li').forEach(li => li.classList.remove('bg-sky-100'));
    if (liElement) liElement.classList.add('bg-sky-100');
    
    // Show "Add Location" button if a client is selected
    addLocationBtn.style.display = state.selectedClientId ? 'block' : 'none';
    fetchLocationsForClient(clientId);
}

function handleLocationSelection(locationId, liElement) {
    state.selectedLocationId = locationId;
    document.querySelectorAll('#location-list li').forEach(li => li.classList.remove('bg-sky-100'));
    if (liElement) liElement.classList.add('bg-sky-100');

    // Show buttons related to a selected location
    const showLocationActionButtons = !!state.selectedLocationId;
    addEquipmentBtn.style.display = showLocationActionButtons ? 'block' : 'none';
    if (showLocationActionButtons) {
        createTicketForLocationBtn.classList.remove('hidden');
    } else {
        createTicketForLocationBtn.classList.add('hidden');
    }
    fetchEquipmentForLocation(locationId);
}

function handleClientSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredClients = state.clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        (client.contact_person && client.contact_person.toLowerCase().includes(searchTerm))
    );
    renderClients(filteredClients);
}

// --- Modal & Form Logic ---
async function openModal(modalId, data = {}) {
    const form = document.getElementById(`${modalId}-form`);
    form.reset();
    form.querySelector('input[name="id"]').value = '';
    
    document.getElementById(`${modalId}-title`).textContent = `Nuevo ${modalId.split('-')[0].charAt(0).toUpperCase() + modalId.split('-')[0].slice(1)}`;
    if(data.client_id) form.elements['client_id'].value = data.client_id;
    if(data.location_id) form.elements['location_id'].value = data.location_id;

    const isReadonly = data.readonly || false;
    form.classList.toggle('readonly', isReadonly);
    
    const contextButtons = form.querySelector('.context-buttons');
    if (contextButtons) {
        contextButtons.classList.toggle('hidden', !isReadonly);
    }

    if (data.id) { // Editing or Viewing
        const resourceName = modalId.split('-')[0];
        document.getElementById(`${modalId}-title`).textContent = isReadonly ? `Detalle del ${resourceName}` : `Editar ${resourceName}`;

        const resource = resourceName + 's';
        const response = await fetch(`${API_URL}/${resource}/${data.id}`);
        const result = await response.json();
        Object.entries(result.data).forEach(([key, value]) => {
            if (form.elements[key]) form.elements[key].value = value;
        });
    }
    
    document.getElementById(modalId).classList.add('flex');
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('flex');
    document.getElementById(modalId).style.display = 'none';
}

async function handleFormSubmit(e, resource, callback) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements.id.value;
    
    const body = Object.fromEntries(new FormData(form));
    delete body.id;

    const url = id ? `${API_URL}/${resource}/${id}` : `${API_URL}/${resource}`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('API request failed');
        
        closeModal(form.id.replace('-form', ''));
        if (callback) callback();

    } catch (error) {
        console.error('Form submission error:', error);
    }
}

async function deleteItem(resource, id, callback) {
    if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
    try {
        await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
        callback();
    } catch (error) {
        console.error(`Error deleting ${resource}:`, error);
    }
}

function resetPanels(level = 'all') { 
    // level can be 'all', 'client', 'location', 'equipment'
    // Resets panels hierarchically

    if (level === 'all' || level === 'client') {
        clientList.innerHTML = '<li class="p-4 text-slate-500">Cargando clientes...</li>';
        state.selectedClientId = null;
        addLocationBtn.style.display = 'none'; // Hide "Add Location" if no client selected
        // If client selection is reset, cascade to location and equipment
        level = 'location'; // Ensure downstream panels are also reset
    }

    if (level === 'all' || level === 'client' || level === 'location') {
        locationList.innerHTML = '<li class="p-4 text-slate-500">Seleccione un cliente para ver sus sedes.</li>';
        state.selectedClientId = null;
        addEquipmentBtn.style.display = 'none'; // Hide "Add Equipment" if no location selected
        createTicketForLocationBtn.classList.add('hidden'); // Hide "Create Ticket for Location"
         // If location selection is reset, cascade to equipment
        level = 'equipment'; // Ensure downstream equipment panel is also reset
    }

    if (level === 'all' || level === 'client' || level === 'location' || level === 'equipment') {
        equipmentList.innerHTML = '<li class="p-4 text-slate-500">Seleccione una sede para ver sus equipos.</li>';
        // Buttons related to equipment are hidden when location is reset.
        // No specific selected equipment state in the main list view to reset here.
    }
} 