document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';

    // --- Estado de la Aplicación ---
    const state = {
        clients: [],
        currentClient: null,
        currentLocation: null,
        currentView: 0, // 0: Clientes, 1: Sedes, 2: Detalle
        clientSearchTerm: ''
    };

    // --- Selectores del DOM ---
    const dom = {
        app: document.getElementById('app'),
        panels: {
            clients: document.getElementById('panelClientes'),
            locations: document.getElementById('panelSedes'),
            details: document.getElementById('panelDetalle'),
        },
        content: {
            clientList: document.getElementById('clientList'),
            locationContent: document.getElementById('sedeContent'),
            detailContent: document.getElementById('detalleContent'),
        },
        buttons: {
            back: document.getElementById('backButton'),
            addClient: document.getElementById('add-client-btn'),
        },
        inputs: {
            clientSearch: document.getElementById('clientSearch'),
        },
        modals: {
            client: document.getElementById('client-modal'),
            location: document.getElementById('location-modal'),
            equipment: document.getElementById('equipment-modal'),
        },
        forms: {
            client: document.getElementById('client-modal-form'),
            location: document.getElementById('location-modal-form'),
            equipment: document.getElementById('equipment-modal-form'),
        },
        pageTitle: document.getElementById('page-title'),
    };

    // --- Lógica de la API ---
    const api = {
        getClients: () => fetch(`${API_URL}/clients`).then(res => res.json()),
        getClient: id => fetch(`${API_URL}/clients/${id}`).then(res => res.json()),
        getClientLocations: id => fetch(`${API_URL}/clients/${id}/locations`).then(res => res.json()),
        getLocation: id => fetch(`${API_URL}/locations/${id}`).then(res => res.json()),
        getLocationEquipment: id => fetch(`${API_URL}/locations/${id}/equipment`).then(res => res.json()),
        getEquipment: id => fetch(`${API_URL}/equipment/${id}`).then(res => res.json()),
        save: (resource, data) => {
            const id = data.get('id');
            const url = id ? `${API_URL}/${resource}/${id}` : `${API_URL}/${resource}`;
            const method = id ? 'PUT' : 'POST';
            return fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(data)),
            }).then(res => {
                if (!res.ok) throw new Error(`Error al guardar ${resource}`);
                return res.json().catch(() => ({}));
            });
        }
    };

    // --- Lógica de Renderizado ---
    const render = {
        clientList: () => {
            const filteredClients = state.clients.filter(c => c.name.toLowerCase().includes(state.clientSearchTerm.toLowerCase()));
            dom.content.clientList.innerHTML = filteredClients.map(client => `
                <li class="list-item ${state.currentClient?.id === client.id ? 'active' : ''}" data-client-id="${client.id}">
                    ${client.name}
                </li>
            `).join('');
        },
        locationPanel: async (client) => {
            if (!client) {
                dom.content.locationContent.innerHTML = '<div class="text-center text-gray-500 p-10">Seleccione un cliente para ver sus sedes.</div>';
                return;
            }
            try {
                const locations = await api.getClientLocations(client.id);
                const locationsHtml = locations.map(loc => `
                    <li class="list-item ${state.currentLocation?.id === loc.id ? 'active' : ''}" data-location-id="${loc.id}">
                        <p class="font-semibold text-gray-800">${loc.name}</p>
                        <p class="text-sm text-gray-500">${loc.address}</p>
                    </li>
                `).join('');

                dom.content.locationContent.innerHTML = `
                    <div class="p-6">
                        <div class="bg-white rounded-lg shadow p-4 mb-6">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h2 class="text-xl font-bold text-gray-800">${client.name}</h2>
                                    <p class="text-sm text-gray-500">${client.legal_name || ''} (${client.rut || 'N/A'})</p>
                                </div>
                                <button class="edit-client-btn p-2 rounded-md hover:bg-gray-200" data-client-id="${client.id}"><i data-lucide="pencil" class="h-5 w-5"></i></button>
                            </div>
                            <div class="mt-4 border-t pt-4">
                                <h3 class="text-sm font-semibold text-gray-600 mb-2">Detalles del Cliente</h3>
                                <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt class="font-medium text-gray-500">Dirección</dt>
                                    <dd class="text-gray-900">${client.address || 'No especificada'}</dd>
                                    <dt class="font-medium text-gray-500">Giro</dt>
                                    <dd class="text-gray-900">${client.business_activity || 'No especificado'}</dd>
                                    <dt class="font-medium text-gray-500">Contacto</dt>
                                    <dd class="text-gray-900">${client.contact_name || 'No especificado'}</dd>
                                    <dt class="font-medium text-gray-500">Teléfono</dt>
                                    <dd class="text-gray-900">${client.phone || 'No especificado'}</dd>
                                    <dt class="font-medium text-gray-500">Email</dt>
                                    <dd class="text-gray-900">${client.email || 'No especificado'}</dd>
                                </dl>
                            </div>
                            <div class="mt-4 flex space-x-2">
                                 <button class="view-contract-btn px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-md hover:bg-gray-300">Ver Contrato</button>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <h3 class="text-lg font-semibold text-gray-700">Sedes</h3>
                                <button class="add-location-btn px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 flex items-center gap-1" data-client-id="${client.id}"><i data-lucide="plus" class="h-4 w-4"></i>Añadir</button>
                            </div>
                            <ul class="bg-white rounded-lg shadow overflow-hidden">
                                ${locationsHtml || '<li class="p-4 text-sm text-gray-500">No hay sedes registradas.</li>'}
                            </ul>
                        </div>
                    </div>`;

                if (locations.length === 1 && !state.currentLocation) {
                    actions.selectLocation(locations[0].id);
                }

            } catch (error) {
                console.error("Error cargando sedes:", error);
                dom.content.locationContent.innerHTML = '<div class="p-4 text-red-500">Error al cargar las sedes.</div>';
            }
        },
        detailPanel: async (location) => {
            if (!location) {
                dom.content.detailContent.innerHTML = '<div class="text-center text-gray-500 p-10">Seleccione una sede para ver detalles.</div>';
                return;
            }
            try {
                const equipment = await api.getLocationEquipment(location.id);
                const grouped = equipment.reduce((acc, eq) => {
                    (acc[eq.type] = acc[eq.type] || []).push(eq);
                    return acc;
                }, {});

                const equipmentHtml = Object.entries(grouped).map(([type, items]) => `
                    <details class="border-b" open>
                        <summary class="list-item flex justify-between items-center font-semibold">
                            <span>${type} (${items.length})</span>
                            <i data-lucide="chevron-down" class="h-5 w-5 transform transition-transform"></i>
                        </summary>
                        <ul class="bg-gray-50">
                            ${items.map(i => `
                                <li class="list-item equipment-item" data-equipment-id="${i.id}">
                                    <div class="flex-1">
                                        <span class="font-medium text-sky-800">${i.serial_number || 'N/S'}</span>
                                        <span class="text-sm text-gray-600 ml-2">${i.model || 'Sin modelo'}</span>
                                    </div>
                                    <button class="edit-equipment-btn p-1 hover:bg-gray-200 rounded-full" data-equipment-id="${i.id}"><i data-lucide="pencil" class="h-4 w-4"></i></button>
                                </li>`
                            ).join('')}
                        </ul>
                    </details>
                `).join('');

                dom.content.detailContent.innerHTML = `
                    <div class="p-6">
                        <div class="bg-white rounded-lg shadow p-4 mb-6">
                            <h2 class="text-xl font-bold text-gray-800">${location.name}</h2>
                            <p class="text-sm text-gray-600">${location.address}</p>
                             <div class="mt-4 flex space-x-2">
                                <button class="edit-location-btn px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-md hover:bg-gray-300" data-location-id="${location.id}">Editar Sede</button>
                                <button class="create-ticket-btn px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-md hover:bg-sky-700" data-client-id="${state.currentClient.id}" data-location-id="${location.id}">Crear Ticket</button>
                            </div>
                        </div>
                        <div class="bg-white rounded-lg shadow mb-6">
                             <div class="flex justify-between items-center p-4 border-b">
                                <h3 class="text-lg font-semibold text-gray-700">Equipos en Sede</h3>
                                <button class="add-equipment-btn px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 flex items-center gap-1" data-location-id="${location.id}"><i data-lucide="plus" class="h-4 w-4"></i>Añadir</button>
                             </div>
                             <div class="overflow-hidden">${equipmentHtml || '<div class="p-4 text-sm text-gray-500">No hay equipos registrados.</div>'}</div>
                        </div>
                    </div>`;
                lucide.createIcons();
            } catch (error) {
                console.error("Error cargando equipos:", error);
                dom.content.detailContent.innerHTML = '<div class="p-4 text-red-500">Error al cargar los equipos.</div>';
            }
        },
        mobileView: () => {
            if (window.innerWidth >= 1024) {
                Object.values(dom.panels).forEach(p => p.classList.remove('panel-mobile-hidden'));
                dom.buttons.back.disabled = true;
                return;
            }

            dom.buttons.back.disabled = state.currentView === 0;

            Object.values(dom.panels).forEach(p => p.classList.add('panel-mobile-hidden'));
            if (state.currentView === 0) dom.panels.clients.classList.remove('panel-mobile-hidden');
            if (state.currentView === 1) dom.panels.locations.classList.remove('panel-mobile-hidden');
            if (state.currentView === 2) dom.panels.details.classList.remove('panel-mobile-hidden');
        },
        updateAll: () => {
            dom.pageTitle.textContent = state.currentLocation?.name || state.currentClient?.name || 'Clientes';
            render.clientList();
            render.locationPanel(state.currentClient);
            render.detailPanel(state.currentLocation);
            render.mobileView();
            lucide.createIcons();
        }
    };
    
    // --- Lógica de Modales ---
    const modals = {
        open: (modalElem, title, data = {}) => {
            const form = modalElem.querySelector('form');
            form.reset();
            modalElem.querySelector('h3').textContent = title;
            
            for (const [key, value] of Object.entries(data)) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = value;
            }
            
            const isViewMode = title.toLowerCase().includes('detalle');
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type !== 'hidden') {
                    input.readOnly = isViewMode;
                    input.classList.toggle('bg-slate-100', isViewMode);
                }
            });
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Guardar';

            modalElem.classList.add('is-open');
        },
        close: (modalElem) => modalElem.classList.remove('is-open'),
        setup: (modalElem, resource, onSuccess) => {
            const form = modalElem.querySelector('form');
            modalElem.querySelector('.modal-cancel-btn').addEventListener('click', () => modals.close(modalElem));
            form.addEventListener('submit', async e => {
                e.preventDefault();

                if (form.querySelector('button[type="submit"]').textContent === 'Cerrar') {
                    modals.close(modalElem);
                    return;
                }

                const formData = new FormData(form);
                try {
                    await api.save(resource, formData);
                    modals.close(modalElem);
                    if(onSuccess) onSuccess();
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    };

    // --- Acciones del Usuario ---
    const actions = {
        init: async () => {
            try {
                state.clients = await api.getClients();
                render.updateAll();
            } catch(e) {
                console.error("Error al inicializar:", e);
                dom.content.clientList.innerHTML = `<li class="p-4 text-red-500">Error al cargar clientes. Verifique que el backend esté funcionando.</li>`;
            }
        },
        selectClient: async (id) => {
            if (state.currentClient?.id === id) return;
            try {
                const client = await api.getClient(id);
                state.currentClient = client;
                state.currentLocation = null; // Reset location when client changes
                state.currentView = 1;
                render.updateAll();
            } catch (error) {
                console.error("Error seleccionando cliente:", error);
            }
        },
        selectLocation: async (id) => {
            if (state.currentLocation?.id === id) return;
            try {
                const location = await api.getLocation(id);
                state.currentLocation = location;
                state.currentView = 2;
                render.updateAll();
            } catch (error) {
                console.error("Error seleccionando sede:", error);
            }
        },
    };

    // --- Lógica de Eventos ---
    const events = {
        setup: () => {
            // Búsqueda de clientes
            dom.inputs.clientSearch.addEventListener('input', e => {
                state.clientSearchTerm = e.target.value;
                render.clientList();
            });

            // Selección de cliente
            dom.content.clientList.addEventListener('click', e => {
                const item = e.target.closest('.list-item');
                if (item) actions.selectClient(item.dataset.clientId);
            });
            
            // Selección de sede
            dom.content.locationContent.addEventListener('click', e => {
                const item = e.target.closest('.list-item');
                if (item) actions.selectLocation(item.dataset.locationId);
            });

            // Botón de retroceso (móvil)
            dom.buttons.back.addEventListener('click', () => {
                state.currentView = Math.max(0, state.currentView - 1);
                if(state.currentView === 1) state.currentLocation = null;
                if(state.currentView === 0) state.currentClient = null;
                render.updateAll();
            });
            
            // Botones de modales y acciones
            dom.buttons.addClient.addEventListener('click', () => {
                modals.open(dom.modals.client, 'Nuevo Cliente');
            });
            
            document.body.addEventListener('click', async e => {
                // Añadir Sede
                if (e.target.matches('.add-location-btn, .add-location-btn *')) {
                    modals.open(dom.modals.location, 'Nueva Sede', { client_id: state.currentClient.id });
                }
                // Añadir Equipo
                if (e.target.matches('.add-equipment-btn, .add-equipment-btn *')) {
                     modals.open(dom.modals.equipment, 'Nuevo Equipo', { location_id: state.currentLocation.id });
                }
                // Editar Cliente
                if (e.target.matches('.edit-client-btn, .edit-client-btn *')) {
                    modals.open(dom.modals.client, 'Editar Cliente', state.currentClient);
                }
                // Editar Sede
                if (e.target.matches('.edit-location-btn, .edit-location-btn *')) {
                     modals.open(dom.modals.location, 'Editar Sede', state.currentLocation);
                }
                // Editar Equipo
                if (e.target.matches('.edit-equipment-btn, .edit-equipment-btn *')) {
                    const button = e.target.closest('.edit-equipment-btn');
                    const equipment = await api.getEquipment(button.dataset.equipmentId);
                    modals.open(dom.modals.equipment, 'Editar Equipo', equipment);
                }
                 // Ver Contrato
                if (e.target.matches('.view-contract-btn, .view-contract-btn *')) {
                    alert('Funcionalidad "Ver Contrato" aún no implementada.');
                }
                // Crear Ticket
                if (e.target.matches('.create-ticket-btn, .create-ticket-btn *')) {
                    const button = e.target.closest('.create-ticket-btn');
                    const clientId = button.dataset.clientId;
                    const locationId = button.dataset.locationId;
                    window.location.href = `tickets.html?cliente=${clientId}&sede=${locationId}`;
                }
                // Ver detalles de equipo
                 if (e.target.matches('.equipment-item, .equipment-item *')) {
                    if (e.target.closest('.edit-equipment-btn')) return; // No disparar si se hace clic en editar
                    const item = e.target.closest('.equipment-item');
                    const equipment = await api.getEquipment(item.dataset.equipmentId);
                    alert(`Detalles del equipo:\n- Tipo: ${equipment.type}\n- Modelo: ${equipment.model}\n- N/S: ${equipment.serial_number}\n- Fecha Adquisición: ${equipment.acquisition_date}`);
                }
            });

            // Configuración de modales
            modals.setup(dom.modals.client, 'clients', async () => {
                state.clients = await api.getClients();
                if (state.currentClient) {
                    state.currentClient = await api.getClient(state.currentClient.id);
                }
                render.updateAll();
            });
            modals.setup(dom.modals.location, 'locations', async () => {
                state.currentClient = await api.getClient(state.currentClient.id);
                render.locationPanel(state.currentClient);
            });
             modals.setup(dom.modals.equipment, 'equipment', async () => {
                state.currentLocation = await api.getLocation(state.currentLocation.id);
                render.detailPanel(state.currentLocation);
            });

            // Redimensionamiento de ventana
            window.addEventListener('resize', render.mobileView);
        }
    }

    // --- Inicialización ---
    actions.init();
    events.setup();
});
