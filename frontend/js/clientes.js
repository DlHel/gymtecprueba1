document.addEventListener('DOMContentLoaded', () => {
    // CRÍTICO: Protección de autenticación PRIMERO
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en clientes.js, redirigiendo a login...');
        window.location.href = '/login.html?return=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }
    
    console.log('✅ Usuario autenticado, cargando módulo de clientes...');    // Protección robusta contra interferencia de extensiones del navegador
    const originalFetch = window.fetch;
    let retryCount = 0;
    const maxRetries = 3;
    
    window.fetch = function(...args) {
        return new Promise((resolve, reject) => {
            const attemptFetch = (attempt = 0) => {
                originalFetch.apply(this, args)
                    .then(resolve)
                    .catch(error => {
                        console.log(`Intento ${attempt + 1} falló:`, error.message);
                        
                        // Errores específicos de extensiones del navegador
                        const isExtensionError = error.message && (
                            error.message.includes('message channel closed') ||
                            error.message.includes('Extension context invalidated') ||
                            error.message.includes('Could not establish connection') ||
                            error.message.includes('The message port closed') ||
                            error.message.includes('receiving end does not exist')
                        );
                        
                        if (isExtensionError && attempt < maxRetries) {
                            console.warn(`🔄 Reintentando petición (${attempt + 1}/${maxRetries}) debido a interferencia de extensión`);
                            setTimeout(() => attemptFetch(attempt + 1), 100 * (attempt + 1)); // Delay incremental
                        } else {
                            reject(error);
                        }
                    });
            };
            
            attemptFetch();
        });
    };

    // Suprimir errores de extensiones en la consola
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('message channel closed') || 
            message.includes('Extension context invalidated') ||
            message.includes('vendor.js')) {
            // No mostrar estos errores de extensiones
            return;
        }
        originalConsoleError.apply(console, args);
    };

    // === CONFIGURACIÓN INICIAL ===
    setupModernEventListeners();
    
    // === FUNCIONES DE CONFIGURACIÓN MODERNA ===
    function setupModernEventListeners() {
        // Botones de agregar cliente
        const addClientBtn = document.getElementById('add-client-btn');
        const addClientBtnEmpty = document.getElementById('add-client-btn-empty');
        
        if (addClientBtn) {
            addClientBtn.addEventListener('click', () => {
                console.log('🔘 Abriendo modal de nuevo cliente');
                modals.open(dom.modals.client, 'Nuevo Cliente');
            });
        }
        
        if (addClientBtnEmpty) {
            addClientBtnEmpty.addEventListener('click', () => {
                console.log('🔘 Abriendo modal de primer cliente');
                modals.open(dom.modals.client, 'Nuevo Cliente');
            });
        }
        
        // Configurar búsqueda mejorada
        const searchInput = document.getElementById('clientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleModernSearch, 300));
        }
        
        console.log('✅ Event listeners modernos configurados');
    }
    
    function handleModernSearch(event) {
        const searchTerm = event.target.value.trim().toLowerCase();
        console.log('🔍 Búsqueda:', searchTerm);
        
        // Actualizar contador de resultados
        updateSearchStats(searchTerm);
        
        // Filtrar la lista de clientes
        filterClientsList(searchTerm);
    }
    
    function updateSearchStats(searchTerm) {
        const statsElement = document.getElementById('search-stats');
        const countElement = statsElement?.querySelector('.clients-total-count');
        
        if (countElement) {
            if (searchTerm) {
                // Contar resultados filtrados
                const filteredCount = document.querySelectorAll('.client-card:not(.hidden)').length;
                countElement.textContent = `${filteredCount} resultado${filteredCount !== 1 ? 's' : ''}`;
            } else {
                // Mostrar total
                const totalCount = document.querySelectorAll('.client-card').length;
                countElement.textContent = `${totalCount} cliente${totalCount !== 1 ? 's' : ''}`;
            }
        }
    }
    
    function filterClientsList(searchTerm) {
        const clientCards = document.querySelectorAll('.client-card');
        
        clientCards.forEach(card => {
            const name = card.querySelector('.client-card-name')?.textContent?.toLowerCase() || '';
            const rut = card.querySelector('[data-rut]')?.textContent?.toLowerCase() || '';
            const email = card.querySelector('[data-email]')?.textContent?.toLowerCase() || '';
            
            const matches = name.includes(searchTerm) || 
                          rut.includes(searchTerm) || 
                          email.includes(searchTerm);
            
            if (matches) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
        
        // Mostrar estado vacío si no hay resultados
        updateEmptyState(searchTerm);
    }
    
    function updateEmptyState(searchTerm) {
        const listContent = document.getElementById('client-list-container');
        const visibleCards = document.querySelectorAll('.client-card:not(.hidden)').length;
        
        // Remover estados vacíos anteriores
        const existingEmpty = listContent.querySelector('.clients-list-empty');
        if (existingEmpty) {
            existingEmpty.remove();
        }
        
        if (visibleCards === 0 && searchTerm) {
            const emptyState = document.createElement('div');
            emptyState.className = 'clients-list-empty';
            emptyState.innerHTML = `
                <i data-lucide="search-x"></i>
                <h4>No se encontraron resultados</h4>
                <p>No hay clientes que coincidan con "${searchTerm}"</p>
            `;
            listContent.appendChild(emptyState);
            lucide.createIcons();
        }
    }
    
    // Función debounce para optimizar búsqueda
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
    
    // Sistema de notificación para extensiones problemáticas
    let extensionWarningShown = false;
    const showExtensionWarning = () => {
        if (extensionWarningShown) return;
        extensionWarningShown = true;
        
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="position: fixed; top: 20px; right: 20px; z-index: 10000; background: #fbbf24; color: #92400e; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 400px; font-family: system-ui, -apple-system, sans-serif;">
                <div style="display: flex; align-items: start; gap: 12px;">
                    <div style="font-size: 20px;">⚠️</div>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 8px;">Extensión del navegador interfiriendo</div>
                        <div style="font-size: 14px; line-height: 1.4; margin-bottom: 12px;">
                            Una extensión de tu navegador está interfiriendo con la aplicación. 
                            Para una mejor experiencia, considera desactivar extensiones como bloqueadores de anuncios o VPNs.
                        </div>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                style="background: #92400e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Auto-remover después de 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    };

    // Detectar errores de extensiones en tiempo real
    window.addEventListener('error', (event) => {
        if (event.error && event.error.message && 
            event.error.message.includes('message channel closed')) {
            showExtensionWarning();
        }
    });

    // Detectar errores de promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && 
            event.reason.message.includes('message channel closed')) {
            showExtensionWarning();
        }
    });

    // Verificar que API_URL esté definido
    if (typeof API_URL === 'undefined') {
        console.error('❌ API_URL no está definido. Asegúrate de cargar config.js primero.');
        return;
    }

    console.log('🚀 Iniciando módulo de clientes con API_URL:', API_URL);

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
        getClients: async () => {
            try {
                console.log('📡 Solicitando lista de clientes...');
                
                // Crear un timeout para la petición
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
                
                const response = await authenticatedFetch(`${API_URL}/clients`, {
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('✅ Clientes recibidos:', data);
                return data;
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('La petición tardó demasiado tiempo. Verifique su conexión.');
                }
                
                // Manejar errores específicos de extensiones
                if (error.message && (
                    error.message.includes('message channel closed') ||
                    error.message.includes('Extension context invalidated') ||
                    error.message.includes('Could not establish connection')
                )) {
                    console.warn('⚠️ Error de extensión del navegador detectado, reintentando...');
                    // Reintentar una vez más
                    try {
                        const retryResponse = await authenticatedFetch(`${API_URL}/clients`);
                        if (!retryResponse.ok) {
                            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                        }
                        return await retryResponse.json();
                    } catch (retryError) {
                        throw new Error('Error persistente. Intente desactivar extensiones del navegador.');
                    }
                }
                
                console.error('Error fetching clients:', error);
                throw error;
            }
        },
        getClient: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/clients/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching client:', error);
                throw error;
            }
        },
        getClientLocations: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/clients/${id}/locations`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                return data.data || [];
            } catch (error) {
                console.error('Error fetching client locations:', error);
                throw error;
            }
        },
        getLocation: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/locations/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching location:', error);
                throw error;
            }
        },
        getLocationEquipment: async (id) => {
            try {
                console.log(`🔍 Obteniendo equipos para ubicación ${id}...`);
                const response = await authenticatedFetch(`${API_URL}/locations/${id}/equipment`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                console.log(`✅ Equipos recibidos para ubicación ${id}:`, data);
                // La API devuelve directamente un array, no un objeto con propiedad data
                return Array.isArray(data) ? data : (data.data || []);
            } catch (error) {
                console.error('Error fetching location equipment:', error);
                throw error;
            }
        },
        getEquipment: async (id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/equipment/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching equipment:', error);
                throw error;
            }
        },
        save: async (resource, data) => {
            try {
                const id = data.get('id');
                const url = id ? `${API_URL}/${resource}/${id}` : `${API_URL}/${resource}`;
                const method = id ? 'PUT' : 'POST';
                const requestBody = Object.fromEntries(data);
                
                console.log(`📡 ${method} ${url}`);
                console.log('📤 Request body:', requestBody);
                
                const response = await authenticatedFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });
                
                if (!response.ok) {
                    // Intentar obtener el mensaje de error del backend
                    let errorMessage = `Error al guardar ${resource}: ${response.status} ${response.statusText}`;
                    try {
                        const errorData = await response.json();
                        if (errorData.error) {
                            errorMessage = errorData.error;
                            if (errorData.details) {
                                errorMessage += `\n\nDetalles: ${errorData.details}`;
                            }
                        }
                    } catch (jsonError) {
                        // Si no se puede parsear JSON, usar mensaje genérico
                    }
                    throw new Error(errorMessage);
                }
                
                // Intentar parsear JSON, pero no fallar si no hay contenido
                try {
                    const result = await response.json();
                    console.log('📥 Response:', result);
                    return result;
                } catch (jsonError) {
                    console.log('⚠️ No JSON response, returning empty object');
                    return {};
                }
            } catch (error) {
                console.error('Error saving:', error);
                throw error;
            }
        },
        delete: async (resource, id) => {
            try {
                const response = await authenticatedFetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    throw new Error(`Error al eliminar ${resource}: ${response.status} ${response.statusText}`);
                }
                
                // Intentar parsear JSON, pero no fallar si no hay contenido
                try {
                    return await response.json();
                } catch (jsonError) {
                    return {};
                }
            } catch (error) {
                console.error('Error deleting:', error);
                throw error;
            }
        }
    };

    // --- Lógica de Renderizado ---
    const render = {
        clientList: () => {
            console.log('🔄 Ejecutando render.clientList()');
            console.log('📊 State.clients:', state.clients);
            
            // Ocultar loading state
            const loadingState = document.getElementById('loading-clients');
            if (loadingState) {
                loadingState.style.display = 'none';
            }

            // Verificar si hay clientes
            if (!state.clients || state.clients.length === 0) {
                dom.clientListContainer.innerHTML = `
                    <div class="clients-list-empty">
                        <i data-lucide="users"></i>
                        <h4>No hay clientes registrados</h4>
                        <p>Comienza agregando tu primer cliente al sistema</p>
                    </div>
                `;
                // Mostrar estado vacío en el panel de detalles si existe
                const emptyDetailElement = document.getElementById('empty-detail');
                if (emptyDetailElement) {
                    emptyDetailElement.style.display = 'flex';
                }
                lucide.createIcons();
                return;
            }

            // Generar tarjetas de clientes modernas
            const clientsHtml = state.clients.map(client => {
                const locationCount = client.location_count || 0;
                const equipmentCount = client.equipment_count || 0;
                
                return `
                    <div class="client-card" data-client-id="${client.id}">
                        <div class="client-card-header">
                            <h4 class="client-card-name">${client.name}</h4>
                            <span class="client-card-badge">Activo</span>
                        </div>
                        <div class="client-card-info">
                            <div class="client-card-detail" data-rut="${client.rut || ''}">
                                <i data-lucide="credit-card"></i>
                                <span>RUT: ${client.rut || 'No especificado'}</span>
                            </div>
                            ${client.contact_name ? `
                                <div class="client-card-detail">
                                    <i data-lucide="user"></i>
                                    <span>${client.contact_name}</span>
                                </div>
                            ` : ''}
                            ${client.email ? `
                                <div class="client-card-detail" data-email="${client.email}">
                                    <i data-lucide="mail"></i>
                                    <span>${client.email}</span>
                                </div>
                            ` : ''}
                            ${client.phone ? `
                                <div class="client-card-detail">
                                    <i data-lucide="phone"></i>
                                    <span>${client.phone}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="client-card-stats">
                            <div class="client-stat-item">
                                <i data-lucide="map-pin"></i>
                                <span class="client-stat-value">${locationCount}</span>
                                <span>sede${locationCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="client-stat-item">
                                <i data-lucide="monitor"></i>
                                <span class="client-stat-value">${equipmentCount}</span>
                                <span>equipo${equipmentCount !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            dom.clientListContainer.innerHTML = clientsHtml;
            console.log('📝 HTML generado para clientes:', clientsHtml.substring(0, 200) + '...');
            console.log('📍 Contenedor de lista:', dom.clientListContainer);
            
            // Actualizar contador de clientes de forma segura
            try {
                updateSearchStats('');
            } catch (statsError) {
                console.error('❌ Error al actualizar estadísticas:', statsError);
            }
            
            // Ocultar estado vacío del panel de detalles si existe
            const emptyDetailElement = document.getElementById('empty-detail');
            if (emptyDetailElement) {
                emptyDetailElement.style.display = 'none';
            }
            
            // Regenerar iconos de Lucide
            setTimeout(() => {
                lucide.createIcons();
                console.log('✅ Lista de clientes renderizada correctamente');
            }, 10);
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
                             <button class="delete-client-btn p-2 rounded-md hover:bg-red-100 text-red-600 hover:text-red-700" data-client-id="${client.id}" title="Eliminar Cliente">
                                <i data-lucide="trash-2" class="h-5 w-5"></i>
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
                    <div class="app-card p-6">
                        ${clientInfoHtml}
                        <div class="mt-6">
                             <div class="flex justify-between items-center mb-3">
                                <h3 class="text-lg font-semibold text-gray-700">Sedes</h3>
                                <button class="add-location-btn btn-primary flex items-center" data-client-id="${client.id}">
                                    <i data-lucide="plus" class="mr-2 h-4 w-4"></i>Añadir Sede
                                </button>
                            </div>
                            <div class="space-y-3">
                                ${locationsHtml || '<p class="text-gray-500 text-sm">No hay sedes para este cliente.</p>'}
                            </div>
                        </div>
                    </div>`;
                
                // No ocultar la lista - debe permanecer visible
                lucide.createIcons();

            } catch (error) {
                console.error('Error cargando detalle del cliente:', error);
                dom.detailContainer.innerHTML = '<div class="app-card p-6 text-center text-red-500">Error al cargar los detalles.</div>';
            }
        },

        locationEquipment: async (locationId, container) => {
             try {
                console.log(`🏢 Cargando equipos para ubicación ${locationId}...`);
                const equipment = await api.getLocationEquipment(locationId);
                console.log(`📋 Equipos obtenidos:`, equipment);
                
                // El botón de añadir siempre debe estar visible.
                let contentHtml = `
                    <div class="flex justify-end mb-3">
                        <button class="add-equipment-btn btn-primary flex items-center" data-location-id="${locationId}">
                            <i data-lucide="plus" class="mr-2 h-4 w-4"></i>Añadir Equipo
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
                                        <th>Marca</th>
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
                                    <td style="font-weight: 500; color: var(--text-secondary);">${item.brand || 'N/A'}</td>
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
                const response = await authenticatedFetch(`${API_URL}/tickets?location_id=${locationId}`);
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
            
            // Mapear campos especiales para equipos
            if (modalElem.id === 'equipment-modal') {
                console.log('📋 Configurando modal de equipo con datos:', data);
                if (data.id) {
                    console.log('✏️ Modo edición de equipo');
                    // Es edición de equipo - mapear campos correctamente
                    const fieldMapping = {
                        'id': 'id',
                        'location_id': 'location_id', 
                        'type': 'type',
                        'name': 'name',
                        'brand': 'brand',
                        'model': 'model',
                        'serial_number': 'serial_number',
                        'acquisition_date': 'acquisition_date',
                        'notes': 'notes'
                    };
                    
                    for (const [formField, dataField] of Object.entries(fieldMapping)) {
                        const input = form.querySelector(`[name="${formField}"]`);
                        if (input && data[dataField] !== undefined) {
                            if (formField === 'acquisition_date' && data[dataField]) {
                                // Formatear fecha para input type="date"
                                input.value = data[dataField].split('T')[0];
                            } else {
                                input.value = data[dataField] || '';
                            }
                            console.log(`📝 ${formField} = ${input.value}`);
                        }
                    }
                } else {
                    console.log('🆕 Modo creación de equipo');
                    // Es creación - población normal
                    for (const [key, value] of Object.entries(data)) {
                        const input = form.querySelector(`[name="${key}"]`);
                        if (input) {
                            input.value = value || '';
                            console.log(`📝 ${key} = ${input.value}`);
                        }
                    }
                }
            } else {
                // Población normal para otros modales
                for (const [key, value] of Object.entries(data)) {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) input.value = value || '';
                }
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
            const closeBtn = modalElem.querySelector('.base-modal-close');
            if (closeBtn) {
                // Remover listener anterior si existe para evitar duplicados
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = modalElem.querySelector('.base-modal-close');
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
            modalElem.querySelector('.base-btn-cancel').addEventListener('click', () => modals.close(modalElem));
            
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const formData = new FormData(form);
                console.log('🔔 Modal submit iniciado para:', resource);
                console.log('📝 Form data:', Object.fromEntries(formData));
                
                try {
                    const savedData = await api.save(resource, formData);
                    console.log('✅ Datos guardados exitosamente:', savedData);
                    modals.close(modalElem);
                    if(onSuccess) {
                        console.log('🚀 Ejecutando callback onSuccess...');
                        await onSuccess(formData, savedData);
                    }
                } catch (error) {
                    console.error('❌ Error al guardar:', error);
                    
                    // Mostrar mensajes de error más específicos
                    let errorMessage = error.message;
                    
                    if (error.message.includes('Duplicate entry') && error.message.includes('serial_number')) {
                        errorMessage = 'El número de serie ya existe en el sistema. Por favor, ingrese un número de serie único.';
                    } else if (error.message.includes('Duplicate entry') && error.message.includes('rut')) {
                        errorMessage = 'El RUT ya está registrado en el sistema.';
                    } else if (error.message.includes('400 Bad Request')) {
                        errorMessage = 'Los datos ingresados no son válidos. Verifique los campos obligatorios.';
                    } else if (error.message.includes('500')) {
                        errorMessage = 'Error interno del servidor. Intente nuevamente o contacte al administrador.';
                    }
                    
                    alert(errorMessage);
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
                // Restaurar estado vacío del panel de detalles al buscar
                dom.detailContainer.innerHTML = `
                    <div class="clients-empty-state" id="empty-detail">
                        <div class="clients-empty-icon">
                            <i data-lucide="user-plus" class="w-16 h-16"></i>
                        </div>
                        <h3 class="clients-empty-title">Selecciona un cliente</h3>
                        <p class="clients-empty-text">Elige un cliente de la lista para ver sus detalles, sedes y equipos</p>
                        <button id="add-client-btn-empty" class="clients-action-btn primary">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Crear Primer Cliente
                        </button>
                    </div>
                `;
                lucide.createIcons();
                render.clientList();
            });

            dom.clientListContainer.addEventListener('click', e => {
                const item = e.target.closest('.client-card[data-client-id]');
                if (item) {
                    // Actualizar estado visual de las tarjetas
                    document.querySelectorAll('.client-card').forEach(card => {
                        card.classList.remove('active');
                    });
                    item.classList.add('active');
                    
                    // Cargar detalles del cliente
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
                    if (targetButton.matches('.delete-client-btn')) {
                        const clientId = targetButton.dataset.clientId;
                        const clientName = state.currentClient.name;
                        
                        // Confirmar eliminación con múltiples alertas para seguridad
                        const confirmMessage = `¿Estás seguro de que quieres ELIMINAR COMPLETAMENTE al cliente "${clientName}"?\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️\n\nSe eliminará:\n- El cliente y toda su información\n- Todas sus sedes\n- Todos los equipos de todas las sedes\n- Todas las fotos de equipos\n- Todos los tickets relacionados\n- Todas las notas y datos asociados`;
                        
                        if (confirm(confirmMessage)) {
                            const secondConfirm = `¿REALMENTE quieres eliminar "${clientName}" y TODOS sus datos?\n\nEscribe "ELIMINAR" en el siguiente cuadro para confirmar.`;
                            const userInput = prompt(secondConfirm);
                            
                            if (userInput === "ELIMINAR") {
                                await handleDeleteClient(clientId, clientName);
                            } else if (userInput !== null) {
                                alert('Eliminación cancelada. Debes escribir exactamente "ELIMINAR" para confirmar.');
                            }
                        }
                    }
                    if (targetButton.matches('.close-detail-btn')) {
                        actions.init(); // Vuelve al estado inicial (lista de clientes)
                    }
                    if (targetButton.matches('#add-client-btn-empty') || targetButton.id === 'add-client-btn-empty') {
                        console.log('🔘 Abriendo modal de primer cliente desde panel vacío');
                        modals.open(dom.modals.client, 'Nuevo Cliente');
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
                        console.log('🔧 Abriendo modal de nuevo equipo para location_id:', locationId);
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
            modals.setup(dom.modals.client, 'clients', async (formData, savedClient) => {
                console.log('🔄 Callback de cliente ejecutado');
                console.log('📋 FormData:', Object.fromEntries(formData));
                console.log('💾 SavedClient:', savedClient);
                
                await actions.init(); // Recarga todo
                
                // Si se creó un cliente nuevo, seleccionarlo automáticamente
                if (savedClient && savedClient.id) {
                    console.log('🎯 Cliente creado exitosamente, seleccionando automáticamente:', savedClient.id);
                    
                    // Actualizar el estado con el nuevo cliente
                    state.currentClient = savedClient;
                    
                    // Marcar el cliente como activo en la lista
                    setTimeout(() => {
                        const clientCard = document.querySelector(`[data-client-id="${savedClient.id}"]`);
                        if (clientCard) {
                            console.log('✅ Cliente encontrado en lista, marcando como activo');
                            // Remover selección anterior
                            document.querySelectorAll('.client-card').forEach(card => {
                                card.classList.remove('active');
                            });
                            // Seleccionar el nuevo cliente
                            clientCard.classList.add('active');
                        } else {
                            console.log('❌ Cliente no encontrado en lista DOM');
                        }
                    }, 200);
                    
                    // Mostrar los detalles del cliente recién creado
                    await render.clientDetail(savedClient.id);
                } else if (state.currentClient) {
                    console.log('📝 Editando cliente existente:', state.currentClient.id);
                    // Si es una edición, mantener el cliente actual seleccionado
                    await render.clientDetail(state.currentClient.id);
                } else {
                    console.log('⚠️ No hay savedClient ni currentClient');
                }
            });
            modals.setup(dom.modals.location, 'locations', (formData, savedLocation) => render.clientDetail(state.currentClient.id));
            modals.setup(dom.modals.equipment, 'equipment', async (formData, savedEquipment) => {
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
                console.log('🔄 Inicializando módulo de clientes...');
                
                // Mostrar indicador de carga
                dom.clientListContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-8 text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p class="text-gray-600">Cargando clientes...</p>
                    </div>
                `;
                
                const clientsResult = await api.getClients();
                console.log('✅ Clientes cargados:', clientsResult);
                
                state.clients = clientsResult.data || clientsResult || [];
                
                if (state.clients.length === 0) {
                    dom.clientListContainer.innerHTML = `
                        <div class="bg-white rounded-lg shadow-sm p-8 text-center">
                            <p class="text-gray-600 mb-4">No hay clientes registrados</p>
                            <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onclick="document.getElementById('add-client-btn').click()">
                                Crear primer cliente
                            </button>
                        </div>
                    `;
                } else {
                    console.log('📋 Llamando a render.clientList()...');
                    render.clientList();
                }
                
                // Restaurar estado vacío del panel de detalles
                dom.detailContainer.innerHTML = `
                    <div class="clients-empty-state" id="empty-detail">
                        <div class="clients-empty-icon">
                            <i data-lucide="user-plus" class="w-16 h-16"></i>
                        </div>
                        <h3 class="clients-empty-title">Selecciona un cliente</h3>
                        <p class="clients-empty-text">Elige un cliente de la lista para ver sus detalles, sedes y equipos</p>
                        <button id="add-client-btn-empty" class="clients-action-btn primary">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Crear Primer Cliente
                        </button>
                    </div>
                `;
                // Inicializar iconos de Lucide
                lucide.createIcons();

                // Comprobar si hay que abrir un cliente específico desde la URL
                const urlParams = new URLSearchParams(window.location.search);
                const clientIdToOpen = urlParams.get('openClient');
                if (clientIdToOpen) {
                    console.log('🔗 Abriendo cliente desde URL:', clientIdToOpen);
                    await render.clientDetail(clientIdToOpen);
                    // Limpiar la URL para que no vuelva a abrirse al recargar
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                console.log('✅ Módulo de clientes inicializado correctamente');

            } catch(error) {
                console.error("❌ Error al inicializar módulo de clientes:", error);
                
                // Mostrar error más específico
                let errorMessage = 'Error desconocido';
                if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
                    errorMessage = 'No se puede conectar con el servidor. Verifique que el backend esté funcionando.';
                } else if (error.message.includes('HTTP')) {
                    errorMessage = `Error del servidor: ${error.message}`;
                } else {
                    errorMessage = error.message;
                }
                
                dom.clientListContainer.innerHTML = `
                    <div class="bg-white rounded-lg shadow-sm p-6 text-center border-l-4 border-red-500">
                        <div class="text-red-600 mb-2">
                            <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Error al cargar clientes</h3>
                        <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                        <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                            Reintentar
                        </button>
                    </div>
                `;
            }
        }
    };

    // --- Función para eliminar cliente ---
    async function handleDeleteClient(clientId, clientName) {
        // Guardar referencia al botón antes de hacer cambios
        const deleteButton = document.querySelector('.delete-client-btn');
        const originalText = deleteButton ? deleteButton.innerHTML : '<i data-lucide="trash-2" class="w-4 h-4"></i>';
        
        try {
            console.log(`🗑️ Iniciando eliminación del cliente ID: ${clientId}, Nombre: ${clientName}`);
            
            // Mostrar indicador de carga
            if (deleteButton) {
                deleteButton.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Eliminando...';
                deleteButton.disabled = true;
            }
            
            // Llamar al API para eliminar el cliente (API_URL ya incluye /api)
            const response = await authenticatedFetch(`${API_URL}/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                // Intentar parsear como JSON solo si es posible
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    // Si no es JSON, usar el status como error
                    errorData = { error: `HTTP ${response.status} - ${response.statusText}` };
                }
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Cliente eliminado exitosamente:', result);
            
            // Actualizar el estado eliminando el cliente del array
            state.clients = state.clients.filter(client => client.id !== parseInt(clientId));
            console.log('🔄 Estado actualizado, clientes restantes:', state.clients.length);
            
            // Mostrar mensaje de éxito
            alert(`✅ Cliente "${clientName}" y todos sus datos han sido eliminados exitosamente.`);
            
            // Recargar la lista de clientes con el estado actualizado
            render.clientList();
            
            // Limpiar el detalle del cliente (verificar que el elemento exista)
            if (dom.detailContainer) {
                dom.detailContainer.innerHTML = `
                    <div class="clients-empty-state">
                        <div class="clients-empty-icon">
                            <i data-lucide="users" class="w-12 h-12"></i>
                        </div>
                        <h3 class="clients-empty-title">Cliente eliminado</h3>
                        <p class="clients-empty-text">El cliente ha sido eliminado exitosamente. Selecciona otro cliente de la lista.</p>
                        <button id="add-client-btn-empty" class="clients-action-btn primary">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Crear Nuevo Cliente
                        </button>
                    </div>
                `;
                
                // Reinicializar iconos
                lucide.createIcons();
            } else {
                console.warn('⚠️ Contenedor de detalles de cliente no encontrado');
            }
            
            // Limpiar estado
            state.currentClient = null;
            
        } catch (error) {
            console.error('❌ Error al eliminar cliente:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Error tipo:', typeof error);
            console.error('❌ Error mensaje:', error.message);
            
            // Restaurar botón si existe
            if (deleteButton) {
                deleteButton.innerHTML = originalText;
                deleteButton.disabled = false;
            }
            
            // Mostrar error específico
            let errorMessage = error.message || 'Error desconocido';
            if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'No se puede conectar con el servidor. Verifique la conexión.';
            } else if (error.message && error.message.includes('500')) {
                errorMessage = 'Error interno del servidor. Es posible que el cliente tenga datos relacionados que impiden la eliminación.';
            } else if (error.message && error.message.includes('404')) {
                errorMessage = 'Cliente no encontrado en el sistema.';
            }
            
            alert(`❌ Error al eliminar cliente: ${errorMessage}`);
        }
    }
    
    actions.init();
    events.setup();
    lucide.createIcons();
});
