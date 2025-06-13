document.addEventListener('DOMContentLoaded', () => {
    // API_URL se define en config.js

    // --- Estado de la Aplicación ---
    const state = {
        clients: [],
        currentClient: null,
        clientSearchTerm: ''
    };

    // --- Selectores del DOM ---
    const dom = {
        clientSearch: document.getElementById('clientSearch'),
        addClientBtn: document.getElementById('add-client-btn'),
        clientListContainer: document.getElementById('client-list-container'),
        detailContainer: document.getElementById('detail-container'),
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
    };

    // --- Lógica de la API (sin cambios, pero la incluyo por completitud) ---
    const api = {
        getClients: () => fetch(`${API_URL}/clients`).then(res => res.json()),
        getClient: id => fetch(`${API_URL}/clients/${id}`).then(res => res.json()),
        getClientLocations: id => fetch(`${API_URL}/clients/${id}/locations`).then(res => res.json().then(data => data.data || [])),
        getLocation: id => fetch(`${API_URL}/locations/${id}`).then(res => res.json()),
        getLocationEquipment: id => fetch(`${API_URL}/locations/${id}/equipment`).then(res => res.json().then(data => data.data || [])),
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
        },
        delete: (resource, id) => {
            return fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error(`Error al eliminar ${resource}`);
                    return res.json().catch(() => ({}));
                });
        }
    };

    // --- Lógica de Renderizado ---
    const render = {
        clientList: () => {
            const searchTerm = state.clientSearchTerm.toLowerCase();
            const filteredClients = state.clients.filter(c => 
                c.name.toLowerCase().includes(searchTerm) ||
                (c.rut && c.rut.toLowerCase().includes(searchTerm)) ||
                (c.legal_name && c.legal_name.toLowerCase().includes(searchTerm))
            );

            if (filteredClients.length === 0 && searchTerm) {
                dom.clientListContainer.innerHTML = `<div class="bg-white rounded-lg shadow-sm p-4 text-center text-gray-500">No se encontraron clientes.</div>`;
                dom.detailContainer.innerHTML = '';
                return;
            }

            dom.clientListContainer.innerHTML = `
                <div class="bg-white rounded-lg shadow-sm overflow-hidden">
                    <ul class="divide-y divide-gray-200">
                        ${filteredClients.map(client => `
                            <li class="p-4 hover:bg-sky-50 cursor-pointer" data-client-id="${client.id}">
                                <p class="font-semibold text-sky-700">${client.name}</p>
                                <p class="text-sm text-gray-600">${client.legal_name} (${client.rut})</p>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        },

        clientDetail: async (clientId) => {
            try {
                const client = await api.getClient(clientId);
                const locations = await api.getClientLocations(clientId);
                state.currentClient = client;

                const clientInfoHtml = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">${client.name}</h2>
                            <p class="text-sm text-gray-500">${client.legal_name || ''} (${client.rut || 'N/A'})</p>
                        </div>
                        <div class="flex items-center gap-2">
                             <button class="edit-client-btn p-2 rounded-md hover:bg-gray-200" data-client-id="${client.id}" title="Editar Cliente">
                                <i data-lucide="pencil" class="h-5 w-5"></i>
                            </button>
                             <button class="close-detail-btn p-2 rounded-md hover:bg-gray-200" title="Volver a la lista">
                                <i data-lucide="x" class="h-5 w-5"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-4 border-t pt-4">
                        <dl class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <dt class="font-medium text-gray-500">Dirección</dt><dd class="text-gray-900">${client.address || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Giro</dt><dd class="text-gray-900">${client.business_activity || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Contacto</dt><dd class="text-gray-900">${client.contact_name || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500">Teléfono</dt><dd class="text-gray-900">${client.phone || 'N/A'}</dd>
                            <dt class="font-medium text-gray-500 col-span-2">Email</dt><dd class="text-gray-900 col-span-2">${client.email || 'N/A'}</dd>
                        </dl>
                    </div>`;

                const locationsHtml = locations.map(loc => `
                    <details class="sede-card" data-location-id="${loc.id}">
                        <summary>
                            <div class="sede-info">
                                <h4>${loc.name}</h4>
                                <p>${loc.address}</p>
                            </div>
                            <div class="sede-actions">
                                <button class="create-ticket-btn" title="Crear Ticket" data-client-id="${client.id}" data-location-id="${loc.id}"><i data-lucide="file-plus-2" class="h-5 w-5"></i></button>
                                <button class="edit-location-btn" title="Editar Sede" data-location-id="${loc.id}"><i data-lucide="pencil" class="h-5 w-5"></i></button>
                                <i data-lucide="chevron-down" class="h-5 w-5 sede-chevron"></i>
                            </div>
                        </summary>
                        <div class="sede-content">
                            <!-- Pestañas -->
                            <div class="sede-tabs">
                                <nav>
                                    <button class="sede-tab-btn active" data-tab="equipment">
                                        Equipos
                                    </button>
                                    <button class="sede-tab-btn" data-tab="history">
                                        Historial de Tickets
                                    </button>
                                </nav>
                            </div>
                            <!-- Contenido de Pestañas -->
                            <div class="py-4">
                                <div class="tab-content location-equipment-container">
                                    <p class="text-gray-500 text-sm py-4 text-center">Cargando equipos...</p>
                                </div>
                                <div class="tab-content location-history-container hidden">
                                     <p class="text-gray-500 text-sm py-4 text-center">Cargando historial...</p>
                                </div>
                            </div>
                        </div>
                    </details>
                `).join('');

                dom.detailContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        ${clientInfoHtml}
                        <div class="mt-6">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-semibold text-gray-700">Sedes</h3>
                                <button class="add-location-btn px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 flex items-center gap-1" data-client-id="${client.id}">
                                    <i data-lucide="plus" class="h-4 w-4"></i>Añadir Sede
                                </button>
                            </div>
                            <div class="space-y-3">
                                ${locationsHtml || '<p class="text-gray-500 text-sm">No hay sedes para este cliente.</p>'}
                            </div>
                        </div>
                    </div>`;
                
                dom.clientListContainer.innerHTML = ''; // Ocultar lista al mostrar detalle
                lucide.createIcons();

            } catch (error) {
                console.error('Error cargando detalle del cliente:', error);
                dom.detailContainer.innerHTML = '<div class="bg-white rounded-lg shadow-sm p-4 text-center text-red-500">Error al cargar los detalles.</div>';
            }
        },

        locationEquipment: async (locationId, container) => {
             try {
                const equipment = await api.getLocationEquipment(locationId);
                
                // El botón de añadir siempre debe estar visible.
                let contentHtml = `
                    <div class="flex justify-end mb-3">
                        <button class="add-equipment-btn px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600 flex items-center gap-1" data-location-id="${locationId}">
                            <i data-lucide="plus" class="h-4 w-4"></i>Añadir Equipo
                        </button>
                    </div>`;

                if (equipment.length === 0) {
                    contentHtml += '<div class="bg-gray-50 p-6 rounded-lg text-center text-sm text-gray-500">No hay equipos registrados en esta sede.</div>';
                } else {
                    const grouped = equipment.reduce((acc, eq) => {
                        (acc[eq.type] = acc[eq.type] || []).push(eq);
                        return acc;
                    }, {});

                    let tableHtml = `
                        <div class="sede-equipment-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Modelo</th>
                                        <th>Nº Serie</th>
                                        <th style="text-align: right;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                    for (const type in grouped) {
                        grouped[type].forEach((item, index) => {
                            tableHtml += `
                                <tr class="equipment-row" data-equipment-id="${item.id}">
                                    ${index === 0 ? `<td style="font-weight: 600; vertical-align: top;" rowspan="${grouped[type].length}">${type}</td>` : ''}
                                    <td style="cursor: pointer;" onclick="openEquipmentDrawer(${item.id})">${item.model || 'N/A'}</td>
                                    <td style="font-family: monospace; font-size: 0.75rem; color: #6b7280;">${item.serial_number || 'N/A'}</td>
                                    <td style="text-align: right;">
                                        <div class="equipment-actions">
                                            <button class="edit-equipment-btn" title="Editar Equipo" data-equipment-id="${item.id}"><i data-lucide="pencil" class="h-4 w-4"></i></button>
                                            <button class="delete-equipment-btn" title="Eliminar Equipo" data-equipment-id="${item.id}"><i data-lucide="trash-2" class="h-4 w-4"></i></button>
                                        </div>
                                    </td>
                                </tr>`;
                        });
                    }
                    
                    tableHtml += '</tbody></table></div>';
                    contentHtml += tableHtml;
                }
                
                container.innerHTML = contentHtml;
                lucide.createIcons();

            } catch (error) {
                 console.error('Error cargando equipos:', error);
                 container.innerHTML = '<p class="text-red-500 text-sm">Error al cargar equipos.</p>';
            }
        },

        locationHistory: async (locationId, container) => {
            try {
                const response = await fetch(`${API_URL}/tickets?location_id=${locationId}`);
                if (!response.ok) throw new Error('Error al cargar historial');
                const ticketsResult = await response.json();
                const tickets = ticketsResult.data || [];
                
                if (tickets.length === 0) {
                    container.innerHTML = '<div class="bg-gray-50 p-6 rounded-lg text-center text-sm text-gray-500">No hay tickets registrados para esta sede.</div>';
                    return;
                }

                const historyHtml = tickets.map(t => {
                     const ticketDate = new Date(t.created_at).toLocaleDateString('es-CL');
                     return `
                        <div class="py-2 border-b last:border-b-0">
                           <p class="font-semibold text-gray-700">${t.title}</p>
                           <p class="text-xs text-gray-500">Ticket #${t.id} - ${ticketDate} - <span class="font-medium">${t.status}</span></p>
                        </div>
                     `
                }).join('');

                container.innerHTML = `<div class="space-y-1">${historyHtml}</div>`;

            } catch (error) {
                console.error('Error cargando historial de tickets:', error);
                container.innerHTML = '<p class="text-red-500 text-sm">Error al cargar historial.</p>';
            }
        }
    };
    
    // --- Lógica de Modales Modernos ---
     const modals = {
        open: (modalElem, title, data = {}) => {
            console.log('Abriendo modal:', modalElem, title, data);
            
            if (!modalElem) {
                console.error('Modal element no encontrado!');
                return;
            }
            
            const form = modalElem.querySelector('form');
            if (!form) {
                console.error('Form no encontrado en modal!');
                return;
            }
            
            form.reset();
            const titleElement = modalElem.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = title;
            }
            
            for (const [key, value] of Object.entries(data)) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = value;
            }
            
            console.log('Mostrando modal...');
            // Mostrar modal con animación
            modalElem.style.display = 'flex';
            modalElem.style.opacity = '1'; // Forzar visibilidad para debug
            modalElem.style.pointerEvents = 'auto'; // Forzar interactividad para debug
            document.body.classList.add('modal-open');
            
            // Forzar reflow para que la transición funcione
            modalElem.offsetHeight;
            
            modalElem.classList.add('is-open');
            console.log('Modal debería estar visible ahora');
            console.log('Modal computed style:', window.getComputedStyle(modalElem));

            // Configurar botón X de cerrar (cada vez que se abre el modal)
            const closeBtn = modalElem.querySelector('.client-modal-close, .location-modal-close, .equipment-modal-close');
            if (closeBtn) {
                // Remover listener anterior si existe para evitar duplicados
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = modalElem.querySelector('.client-modal-close, .location-modal-close, .equipment-modal-close');
                newCloseBtn.addEventListener('click', () => modals.close(modalElem));
            }

            // Autocompletado (lo dejamos por ahora)
            const addressInput = form.querySelector('input[name="address"]');
            if (addressInput && window.google) {
                const autocomplete = new google.maps.places.Autocomplete(addressInput, {
                    types: ['address'],
                    componentRestrictions: { 'country': 'CL' } 
                });
            }

            // Activar escáner de código de barras
            const scanBtn = form.querySelector('#scan-barcode-btn');
            const closeScannerBtn = form.querySelector('#close-scanner-btn');
            const scannerContainer = form.querySelector('#barcode-scanner-container');
            const serialInput = form.querySelector('input[name="serial_number"]');
            
            if (scanBtn) {
                const html5QrCode = new Html5Qrcode("barcode-reader");
                
                const startScanner = () => {
                    scannerContainer.classList.remove('hidden');
                    html5QrCode.start(
                        { facingMode: "environment" }, // Usar cámara trasera
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 150 }
                        },
                        (decodedText, decodedResult) => {
                            serialInput.value = decodedText;
                            stopScanner();
                        },
                        (errorMessage) => {
                            // No hacer nada en caso de error de escaneo (normal)
                        })
                    .catch((err) => {
                        alert("No se pudo iniciar el escáner. Asegúrate de dar permiso para usar la cámara.");
                        scannerContainer.classList.add('hidden');
                    });
                };

                const stopScanner = () => {
                    html5QrCode.stop().then(() => {
                        scannerContainer.classList.add('hidden');
                    }).catch(err => console.log("Error al detener el escáner, puede que ya estuviera detenido."));
                };

                scanBtn.onclick = startScanner;
                closeScannerBtn.onclick = stopScanner;
            }
            
            // Actualizar iconos de Lucide después de configurar el modal
            lucide.createIcons();
        },
        close: (modalElem) => {
            modalElem.classList.remove('is-open');
            setTimeout(() => {
                modalElem.style.display = 'none';
            }, 300); // Esperar a que termine la animación
            document.body.classList.remove('modal-open');
        },
        setup: (modalElem, resource, onSuccess) => {
            const form = modalElem.querySelector('form');
            
            // Event listener para botón cancelar
            modalElem.querySelector('.modal-cancel-btn').addEventListener('click', () => modals.close(modalElem));
            
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const formData = new FormData(form);
                try {
                    await api.save(resource, formData);
                    modals.close(modalElem);
                    if(onSuccess) await onSuccess();
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    };

    // --- Lógica de Mapas ---
    const maps = {
        initMap: (container, address) => {
            if (!address || !window.google) {
                container.innerHTML = `<p class="text-xs text-gray-400 p-2">Dirección no especificada para mostrar el mapa.</p>`;
                return;
            }
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ 'address': address, 'componentRestrictions': {'country': 'CL'} }, (results, status) => {
                if (status === 'OK') {
                    const map = new google.maps.Map(container, {
                        center: results[0].geometry.location,
                        zoom: 16,
                        disableDefaultUI: true,
                        zoomControl: true,
                    });
                    new google.maps.Marker({
                        map: map,
                        position: results[0].geometry.location
                    });
                     container.innerHTML = ''; // Limpiar texto de placeholder
                     container.appendChild(map.getDiv());
                } else {
                    console.error('Geocode was not successful for the following reason: ' + status);
                    container.innerHTML = `<p class="text-xs text-red-400 p-2">No se pudo encontrar la dirección en el mapa.</p>`;
                }
            });
        }
    };

    // --- Lógica de Eventos ---
    const events = {
        setup: () => {
            dom.clientSearch.addEventListener('input', () => {
                state.clientSearchTerm = dom.clientSearch.value;
                dom.detailContainer.innerHTML = ''; // Limpiar detalle al buscar
                render.clientList();
            });

            dom.clientListContainer.addEventListener('click', e => {
                const item = e.target.closest('li[data-client-id]');
                if (item) {
                    render.clientDetail(item.dataset.clientId);
                }
            });

            dom.addClientBtn.addEventListener('click', () => {
                modals.open(dom.modals.client, 'Nuevo Cliente');
            });
            
            dom.detailContainer.addEventListener('toggle', async (e) => {
                const detailsElement = e.target;
                if (detailsElement.matches('details[data-location-id]') && detailsElement.open) {
                    // Cargar la pestaña de equipos por defecto
                    const equipmentContainer = detailsElement.querySelector('.location-equipment-container');
                    if (!equipmentContainer.dataset.loaded) {
                        equipmentContainer.dataset.loaded = "true";
                        await render.locationEquipment(detailsElement.dataset.locationId, equipmentContainer);
                    }
                }
            }, true);
            
            dom.detailContainer.addEventListener('click', async e => {
                // --- Manejo de Pestañas ---
                const tabButton = e.target.closest('.sede-tab-btn');
                if (tabButton) {
                    const detailsElement = tabButton.closest('details');
                    const tabName = tabButton.dataset.tab;

                    // Ocultar todos los contenidos y desactivar botones
                    detailsElement.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                    detailsElement.querySelectorAll('.sede-tab-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    
                    // Mostrar el contenido correcto y activar el botón
                    detailsElement.querySelector(`.location-${tabName}-container`).classList.remove('hidden');
                    tabButton.classList.add('active');

                    // Cargar contenido si es la primera vez
                    if (tabName === 'history') {
                        const historyContainer = detailsElement.querySelector('.location-history-container');
                        if (!historyContainer.dataset.loaded) {
                            historyContainer.dataset.loaded = "true";
                            await render.locationHistory(detailsElement.dataset.locationId, historyContainer);
                        }
                    }
                    return; // Detener para no confundir con otros clics
                }

                // --- Botones de acción ---
                const targetButton = e.target.closest('button');
                if (targetButton) {
                    console.log('Botón clickeado:', targetButton.className);
                    if (targetButton.matches('.edit-client-btn')) {
                        console.log('Abriendo modal de editar cliente');
                        console.log('Modal element:', dom.modals.client);
                        console.log('Current client:', state.currentClient);
                        modals.open(dom.modals.client, 'Editar Cliente', state.currentClient);
                    }
                    if (targetButton.matches('.close-detail-btn')) {
                        actions.init(); // Vuelve al estado inicial (lista de clientes)
                    }
                    if (targetButton.matches('.add-location-btn')) {
                        modals.open(dom.modals.location, 'Nueva Sede', { client_id: state.currentClient.id });
                    }
                    if (targetButton.matches('.edit-location-btn')) {
                        console.log('Abriendo modal de editar sede');
                        const location = await api.getLocation(targetButton.dataset.locationId);
                        modals.open(dom.modals.location, 'Editar Sede', location);
                    }
                    if (targetButton.matches('.add-equipment-btn')) {
                        const locationId = targetButton.dataset.locationId;
                        modals.open(dom.modals.equipment, 'Nuevo Equipo', { location_id: locationId });
                    }
                    if (targetButton.matches('.edit-equipment-btn')) {
                        const equipmentId = targetButton.dataset.equipmentId;
                        const equipment = await api.getEquipment(equipmentId);
                        // Formatear la fecha para el input type="date"
                        if (equipment.acquisition_date) {
                            equipment.acquisition_date = equipment.acquisition_date.split('T')[0];
                        }
                        modals.open(dom.modals.equipment, 'Editar Equipo', equipment);
                    }
                    if (targetButton.matches('.delete-equipment-btn')) {
                        const equipmentId = targetButton.dataset.equipmentId;
                        if (confirm('¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer.')) {
                            await api.delete('equipment', equipmentId);
                            // Recargar la pestaña de equipos
                            const detailsElement = targetButton.closest('details');
                            const equipmentContainer = detailsElement.querySelector('.location-equipment-container');
                            await render.locationEquipment(detailsElement.dataset.locationId, equipmentContainer);
                        }
                    }
                    if (targetButton.matches('.create-ticket-btn')) {
                        window.location.href = `tickets.html?cliente=${targetButton.dataset.clientId}&sede=${targetButton.dataset.locationId}`;
                    }
                }

                // Clic en fila de equipo - verificar si se hizo clic en la celda del modelo
                const equipmentRow = e.target.closest('.equipment-row');
                if (equipmentRow && (e.target.classList.contains('hover:underline') || e.target.classList.contains('cursor-pointer'))) {
                     const equipmentId = equipmentRow.dataset.equipmentId;
                     try {
                         openEquipmentDrawer(equipmentId);
                     } catch (error) {
                         console.error('Error al abrir drawer:', error);
                         // Fallback: navegar a la página separada
                         window.location.href = `equipo.html?id=${equipmentId}&clientId=${state.currentClient.id}`;
                     }
                }
            });

            // Configuración de modales
            modals.setup(dom.modals.client, 'clients', async () => {
                await actions.init(); // Recarga todo
                if (state.currentClient) {
                   await render.clientDetail(state.currentClient.id);
                }
            });
            modals.setup(dom.modals.location, 'locations', () => render.clientDetail(state.currentClient.id));
            modals.setup(dom.modals.equipment, 'equipment', async (formData) => {
                // Busca el contenedor de equipos relevante y lo recarga
                const locationId = formData.get('location_id');
                const detailsElement = document.querySelector(`details[data-location-id="${locationId}"]`);
                if (detailsElement) {
                    const equipmentContainer = detailsElement.querySelector('.location-equipment-container');
                    await render.locationEquipment(locationId, equipmentContainer);
                }
            });
        }
    };

    // --- Inicialización ---
    const actions = {
        init: async () => {
            try {
                const clientsResult = await api.getClients();
                state.clients = clientsResult.data || [];
                render.clientList();
                dom.detailContainer.innerHTML = '';

                // Comprobar si hay que abrir un cliente específico desde la URL
                const urlParams = new URLSearchParams(window.location.search);
                const clientIdToOpen = urlParams.get('openClient');
                if (clientIdToOpen) {
                    await render.clientDetail(clientIdToOpen);
                    // Limpiar la URL para que no vuelva a abrirse al recargar
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

            } catch(e) {
                console.error("Error al inicializar:", e);
                dom.clientListContainer.innerHTML = `<div class="p-4 text-red-500 bg-white rounded-lg shadow-sm">Error al cargar clientes. Verifique que el backend esté funcionando.</li>`;
            }
        }
    };
    
    actions.init();
    events.setup();
    lucide.createIcons();
});
