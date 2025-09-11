document.addEventListener('DOMContentLoaded', () => {
    // CRÍTICO: Protección de autenticación PRIMERO
// ✅ CRÍTICO: Protección de autenticación TEMPORALMENTE DESHABILITADA
console.log('🔧 DEBUG: equipo.js - Verificación de autenticación deshabilitada temporalmente');
/*
if (!window.AuthManager || !AuthManager.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
}
*/    const API_URL = window.API_URL || 'http://localhost:3000/api';
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const backButton = document.querySelector('header a');

    // --- Funciones de Utilidad para Manejo de Errores ---
    /**
     * Mostrar error al usuario de manera user-friendly
     * @param {string} message - Mensaje de error a mostrar
     * @param {string} context - Contexto del error para logging
     */
    function showError(message, context = 'Equipo') {
        console.error(`❌ ${context}:`, message);

        // Buscar elemento de error o usar notificación genérica
        const errorElement = document.getElementById('error-display');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');

            // Auto-hide después de 5 segundos
            setTimeout(() => {
                if (errorElement) errorElement.classList.add('hidden');
            }, 5000);
        } else {
            // Fallback: usar alert o console
            console.warn('⚠️ Elemento error-display no encontrado, usando alert');
            alert(message);
        }
    }

    /**
     * Mostrar mensaje de éxito al usuario
     * @param {string} message - Mensaje de éxito a mostrar
     */
    function showSuccess(message) {
        console.log(`✅ EQUIPO: ${message}`);

        // Buscar elemento de éxito o usar notificación genérica
        const successElement = document.getElementById('success-display');
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.remove('hidden');

            // Auto-hide después de 3 segundos
            setTimeout(() => {
                if (successElement) successElement.classList.add('hidden');
            }, 3000);
        }
    }

    const state = {
        equipment: null,
        tickets: [],
        notes: []
    };

    const api = {
        getEquipment: async (id) => {
            if (!id) {
                console.warn('⚠️ getEquipment: ID no proporcionado');
                throw new Error('ID de equipo requerido');
            }

            try {
                console.log(`🔄 Cargando equipo ${id}...`);
                const response = await authenticatedFetch(`${API_URL}/equipment/${id}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                console.log(`✅ Equipo ${id} cargado:`, data);
                return data;

            } catch (error) {
                const errorId = `EQP_DETAIL_${Date.now()}`;
                console.error(`❌ Error cargando equipo ${id} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    equipmentId: id,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error cargando equipo. Por favor intenta nuevamente. (Ref: ${errorId})`, 'getEquipment');
                throw error;
            }
        },

        getEquipmentTickets: async (id) => {
            if (!id) {
                console.warn('⚠️ getEquipmentTickets: ID no proporcionado');
                return [];
            }

            try {
                console.log(`🔄 Cargando tickets para equipo ${id}...`);
                const response = await authenticatedFetch(`${API_URL}/equipment/${id}/tickets`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                const tickets = data.data || [];
                console.log(`✅ Tickets cargados para equipo ${id}: ${tickets.length} tickets`);
                return tickets;

            } catch (error) {
                const errorId = `EQP_TICKETS_${Date.now()}`;
                console.error(`❌ Error cargando tickets para equipo ${id} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    equipmentId: id,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error cargando tickets del equipo. Por favor intenta nuevamente. (Ref: ${errorId})`, 'getEquipmentTickets');
                throw error;
            }
        },

        getEquipmentNotes: async (id) => {
            if (!id) {
                console.warn('⚠️ getEquipmentNotes: ID no proporcionado');
                return [];
            }

            try {
                console.log(`🔄 Cargando notas para equipo ${id}...`);
                const response = await authenticatedFetch(`${API_URL}/equipment/${id}/notes`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                const notes = data.data || [];
                console.log(`✅ Notas cargadas para equipo ${id}: ${notes.length} notas`);
                return notes;

            } catch (error) {
                const errorId = `EQP_NOTES_${Date.now()}`;
                console.error(`❌ Error cargando notas para equipo ${id} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    equipmentId: id,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error cargando notas del equipo. Por favor intenta nuevamente. (Ref: ${errorId})`, 'getEquipmentNotes');
                throw error;
            }
        },

        addEquipmentNote: async (id, note) => {
            if (!id || !note) {
                console.warn('⚠️ addEquipmentNote: Parámetros id o note no proporcionados');
                throw new Error('ID de equipo y contenido de nota requeridos');
            }

            try {
                console.log(`🔄 Agregando nota a equipo ${id}...`);
                const response = await authenticatedFetch(`${API_URL}/equipment/${id}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(note)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                console.log(`✅ Nota agregada a equipo ${id}:`, data);
                return data;

            } catch (error) {
                const errorId = `EQP_ADD_NOTE_${Date.now()}`;
                console.error(`❌ Error agregando nota a equipo ${id} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    equipmentId: id,
                    note,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error agregando nota al equipo. Por favor intenta nuevamente. (Ref: ${errorId})`, 'addEquipmentNote');
                throw error;
            }
        },

        deleteEquipmentNote: async (noteId) => {
            if (!noteId) {
                console.warn('⚠️ deleteEquipmentNote: noteId no proporcionado');
                throw new Error('ID de nota requerido');
            }

            try {
                console.log(`🔄 Eliminando nota ${noteId}...`);
                const response = await authenticatedFetch(`${API_URL}/equipment/notes/${noteId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                console.log(`✅ Nota ${noteId} eliminada:`, data);
                return data;

            } catch (error) {
                const errorId = `EQP_DEL_NOTE_${Date.now()}`;
                console.error(`❌ Error eliminando nota ${noteId} [${errorId}]:`, {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    noteId,
                    user: AuthManager.getCurrentUser()?.username
                });

                showError(`Error eliminando nota del equipo. Por favor intenta nuevamente. (Ref: ${errorId})`, 'deleteEquipmentNote');
                throw error;
            }
        },

        // Nuevas funciones para el selector de equipos
        getAllEquipment: async (filters = {}) => {
            try {
                console.log('🔄 Cargando lista completa de equipos...');
                let url = `${API_URL}/equipment`;
                
                // Agregar filtros si existen
                const params = new URLSearchParams();
                if (filters.client_id) params.append('client_id', filters.client_id);
                if (filters.location_id) params.append('location_id', filters.location_id);
                if (filters.search) params.append('search', filters.search);
                
                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await authenticatedFetch(url);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                const equipments = data.data || [];
                console.log(`✅ Equipos cargados: ${equipments.length} equipos`);
                return equipments;

            } catch (error) {
                console.error('❌ Error cargando equipos:', error);
                throw error;
            }
        },

        getAllClients: async () => {
            try {
                console.log('🔄 Cargando lista de clientes...');
                const response = await authenticatedFetch(`${API_URL}/clients`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                const clients = data.data || [];
                console.log(`✅ Clientes cargados: ${clients.length} clientes`);
                return clients;

            } catch (error) {
                console.error('❌ Error cargando clientes:', error);
                throw error;
            }
        },

        getLocationsByClient: async (clientId) => {
            try {
                console.log(`🔄 Cargando ubicaciones para cliente ${clientId}...`);
                const response = await authenticatedFetch(`${API_URL}/locations?client_id=${clientId}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Error desconocido'}`);
                }

                const data = await response.json();
                const locations = data.data || [];
                console.log(`✅ Ubicaciones cargadas: ${locations.length} ubicaciones`);
                return locations;

            } catch (error) {
                console.error('❌ Error cargando ubicaciones:', error);
                throw error;
            }
        }
    };

    const render = {
        all: () => {
            const { equipment, tickets } = state;
            if (!equipment) {
                mainContent.innerHTML = `
                    <div class="equipment-error-container">
                        <div class="equipment-error-card">
                            <div class="equipment-error-icon">
                                <i data-lucide="alert-triangle" class="h-12 w-12 text-red-500"></i>
                            </div>
                            <h2 class="equipment-error-title">Error cargando equipo</h2>
                            <p class="equipment-error-message">No se pudo cargar la información del equipo.</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Actualizar título y breadcrumbs
            pageTitle.innerHTML = `
                <i data-lucide="wrench" class="equipment-title-icon"></i>
                <span>${equipment.name || equipment.type}</span>
            `;
            
            // Actualizar breadcrumbs
            const clientBreadcrumb = document.getElementById('breadcrumb-client');
            const locationBreadcrumb = document.getElementById('breadcrumb-location');
            const equipmentBreadcrumb = document.getElementById('breadcrumb-equipment');
            
            if (clientBreadcrumb) clientBreadcrumb.textContent = equipment.client_name || 'Cliente';
            if (locationBreadcrumb) locationBreadcrumb.textContent = equipment.location_name || 'Ubicación';
            if (equipmentBreadcrumb) equipmentBreadcrumb.textContent = equipment.name || equipment.type || 'Equipo';

            const formatDate = (dateString) => {
                return dateString ? new Date(dateString).toLocaleDateString('es-CL') : 'N/A';
            };
            
            const ticketsHtml = tickets.length > 0 ? tickets.map(t => `
                <div class="equipment-ticket-item">
                    <div class="equipment-ticket-header">
                        <div class="equipment-ticket-title">${t.title}</div>
                        <span class="equipment-ticket-status ${t.status.toLowerCase()}">${t.status}</span>
                    </div>
                    <div class="equipment-ticket-description">${t.description}</div>
                    <div class="equipment-ticket-meta">
                        <span class="ticket-meta-item">
                            <i data-lucide="calendar" class="h-4 w-4"></i>
                            ${formatDate(t.created_at)}
                        </span>
                        <span class="ticket-meta-item">
                            <i data-lucide="flag" class="h-4 w-4"></i>
                            Estado: ${t.status}
                        </span>
                        <span class="ticket-meta-item priority-${t.priority.toLowerCase()}">
                            <i data-lucide="alert-circle" class="h-4 w-4"></i>
                            ${t.priority}
                        </span>
                    </div>
                </div>
            `).join('') : `
                <div class="equipment-empty">
                    <i data-lucide="inbox" class="equipment-empty-icon"></i>
                    <h3>No hay tickets registrados</h3>
                    <p>Este equipo no tiene tickets de mantenimiento asociados.</p>
                </div>
            `;

            mainContent.innerHTML = `
                <div class="equipment-container">
                    <!-- Tarjeta de información general optimizada -->
                    <div class="equipment-card">
                        <h2 class="equipment-section-title">
                            <i data-lucide="info"></i>
                            Información General
                        </h2>
                        <div class="equipment-info-compact">
                            <!-- Detalles del equipo -->
                            <div class="equipment-details-compact">
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Tipo</span>
                                    <span class="equipment-detail-value">${equipment.type}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Marca</span>
                                    <span class="equipment-detail-value">${equipment.brand || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Modelo</span>
                                    <span class="equipment-detail-value">${equipment.model || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Nº Serie</span>
                                    <span class="equipment-detail-value serial">${equipment.serial_number || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Fecha Adquisición</span>
                                    <span class="equipment-detail-value">${formatDate(equipment.acquisition_date)}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <span class="equipment-detail-label">Última Mantención</span>
                                    <span class="equipment-detail-value">${formatDate(equipment.last_maintenance_date)}</span>
                                </div>
                            </div>
                            
                            <!-- QR Code compacto -->
                            <div class="equipment-qr-compact">
                                <div class="equipment-qr-title">Identificador Único</div>
                                <div id="qrcode" class="equipment-qr-container-compact">
                                    <!-- El código QR se generará aquí -->
                                </div>
                                <div class="equipment-custom-id-compact">${equipment.custom_id}</div>
                                <button id="print-qr-btn" class="equipment-btn equipment-btn-secondary equipment-btn-small">
                                    <i data-lucide="printer"></i> Imprimir
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Tarjeta de Notas -->
                    <div class="equipment-card">
                        <div class="equipment-notes-header">
                            <h2 class="equipment-section-title">
                                <i data-lucide="sticky-note"></i>
                                Notas del Equipo
                            </h2>
                            <button id="add-note-btn" class="equipment-btn equipment-btn-primary">
                                <i data-lucide="plus"></i> Agregar Nota
                            </button>
                        </div>
                        
                        <!-- Formulario para nueva nota (inicialmente oculto) -->
                        <div id="note-form" class="equipment-note-form hidden">
                            <textarea id="note-textarea" placeholder="Escribe tu nota aquí..." class="equipment-note-textarea" rows="4"></textarea>
                            <div class="equipment-note-actions">
                                <button id="cancel-note-btn" class="equipment-btn equipment-btn-ghost">Cancelar</button>
                                <button id="save-note-btn" class="equipment-btn equipment-btn-success">Guardar Nota</button>
                            </div>
                        </div>
                        
                        <!-- Lista de notas -->
                        <div id="notes-container" class="equipment-notes-container">
                            <!-- Las notas se cargarán aquí -->
                        </div>
                    </div>

                    <!-- Tarjeta de Historial de Tickets -->
                    <div class="equipment-card">
                         <h2 class="equipment-section-title">
                             <i data-lucide="clipboard-list"></i>
                             Historial de Tickets
                         </h2>
                         <div class="equipment-tickets-list">${ticketsHtml}</div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            
            // Generar QR
            if (state.equipment && state.equipment.custom_id) {
                console.log('Generando código QR...');
                const qrContainer = document.getElementById('qrcode');
                if (!qrContainer) {
                    console.error('No se encontró el contenedor del QR');
                    return;
                }
                qrContainer.innerHTML = ''; // Limpiar por si acaso
                const qrUrl = `${window.location.origin}${window.location.pathname}?id=${state.equipment.id}`;
                console.log('URL del QR:', qrUrl);
                
                try {
                    new QRCode(qrContainer, {
                        text: qrUrl,
                        width: 100,
                        height: 100,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                    console.log('✅ QR generado exitosamente');
                } catch (error) {
                    const errorId = `QR_GEN_${Date.now()}`;
                    console.error(`❌ Error generando QR [${errorId}]:`, {
                        error: error.message,
                        stack: error.stack,
                        timestamp: new Date().toISOString(),
                        qrUrl,
                        equipmentId: state.equipment?.id
                    });

                    showError(`Error generando código QR. (Ref: ${errorId})`, 'generateQR');
                    qrContainer.innerHTML = '<p class="text-red-500">Error al generar código QR</p>';
                }
            } else {
                console.warn('No se puede generar QR: equipment o custom_id faltante');
            }
            
            // Cargar y renderizar notas
            render.notes();
        },
        
        notes: () => {
            const notesContainer = document.getElementById('notes-container');
            if (!notesContainer) return;
            
            if (state.notes.length === 0) {
                notesContainer.innerHTML = '<div class="equipment-empty">No hay notas para este equipo.</div>';
                return;
            }
            
            const notesHtml = state.notes.map(note => {
                const date = new Date(note.created_at).toLocaleString('es-CL');
                return `
                    <div class="equipment-note-item">
                        <div class="equipment-note-header">
                            <div class="equipment-note-meta">
                                <span class="equipment-note-date">${date}</span>
                                <span class="equipment-note-author">Por: ${note.author || 'Sistema'}</span>
                            </div>
                            <button class="equipment-note-delete delete-note-btn" data-note-id="${note.id}" title="Eliminar nota">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                        <div class="equipment-note-content">${note.note.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }).join('');
            
            notesContainer.innerHTML = notesHtml;
        }
    };

    const ui = {
        showEquipmentSelection: async () => {
            try {
                console.log('🔄 Iniciando selector de equipos...');
                
                // Obtener client_id de la URL si viene de la página de clientes
                const urlParams = new URLSearchParams(window.location.search);
                const preselectedClientId = urlParams.get('clientId');
                
                // Mostrar loading inicial
                mainContent.innerHTML = `
                    <div class="equipment-selector-container">
                        <div class="equipment-selector-loading">
                            <div class="spinner"></div>
                            <p>Cargando selector de equipos...</p>
                        </div>
                    </div>
                `;

                // Cargar datos iniciales
                const [equipments, clients] = await Promise.all([
                    api.getAllEquipment(preselectedClientId ? { client_id: preselectedClientId } : {}),
                    api.getAllClients()
                ]);

                // Renderizar el selector
                await this.renderEquipmentSelector(equipments, clients, preselectedClientId);
                
            } catch (error) {
                console.error('❌ Error mostrando selector de equipos:', error);
                const fallbackHTML = `
                    <div class="equipment-error-container">
                        <div class="equipment-error-card">
                            <div class="equipment-error-icon">
                                <i data-lucide="alert-triangle" class="h-12 w-12 text-red-500"></i>
                            </div>
                            <h2 class="equipment-error-title">Error cargando equipos</h2>
                            <p class="equipment-error-message">
                                No se pudo cargar la lista de equipos. Por favor, intenta navegar desde la página de clientes.
                            </p>
                            <div class="equipment-error-actions">
                                <a href="clientes.html" class="btn btn-primary">
                                    <i data-lucide="users" class="h-4 w-4 mr-2"></i>
                                    Ir a Clientes
                                </a>
                                <a href="dashboard.html" class="btn btn-secondary">
                                    <i data-lucide="home" class="h-4 w-4 mr-2"></i>
                                    Dashboard
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                mainContent.innerHTML = fallbackHTML;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        },

        renderEquipmentSelector: async (equipments, clients, preselectedClientId = null) => {
            // Actualizar título de la página
            pageTitle.textContent = 'Seleccionar Equipo';
            
            const selectorHTML = `
                <div class="equipment-selector-container">
                    <div class="equipment-selector-header">
                        <div class="equipment-selector-title">
                            <h1><i data-lucide="wrench" class="h-6 w-6 mr-2"></i>Seleccionar Equipo</h1>
                            <p>Selecciona un equipo para ver sus detalles, historial de mantenimiento y documentación.</p>
                        </div>
                    </div>

                    <div class="equipment-selector-filters">
                        <div class="equipment-filter-group">
                            <div class="equipment-search-container">
                                <i data-lucide="search" class="equipment-search-icon"></i>
                                <input 
                                    type="text" 
                                    id="equipment-search" 
                                    placeholder="Buscar por nombre, modelo o código..."
                                    class="equipment-search-input"
                                >
                            </div>
                        </div>
                        
                        <div class="equipment-filter-group">
                            <label for="client-filter" class="equipment-filter-label">
                                <i data-lucide="building" class="h-4 w-4 mr-1"></i>Cliente:
                            </label>
                            <select id="client-filter" class="equipment-filter-select">
                                <option value="">Todos los clientes</option>
                                ${clients.map(client => `
                                    <option value="${client.id}" ${client.id == preselectedClientId ? 'selected' : ''}>
                                        ${client.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div class="equipment-filter-group">
                            <label for="location-filter" class="equipment-filter-label">
                                <i data-lucide="map-pin" class="h-4 w-4 mr-1"></i>Ubicación:
                            </label>
                            <select id="location-filter" class="equipment-filter-select">
                                <option value="">Todas las ubicaciones</option>
                            </select>
                        </div>
                    </div>

                    <div class="equipment-selector-results">
                        <div class="equipment-results-header">
                            <span class="equipment-results-count" id="equipment-count">
                                ${equipments.length} equipos encontrados
                            </span>
                            <div class="equipment-view-toggle">
                                <button class="equipment-view-btn active" data-view="grid">
                                    <i data-lucide="grid" class="h-4 w-4"></i>
                                </button>
                                <button class="equipment-view-btn" data-view="list">
                                    <i data-lucide="list" class="h-4 w-4"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="equipment-list-container" id="equipment-list">
                            ${this.renderEquipmentGrid(equipments)}
                        </div>
                    </div>
                </div>
            `;

            mainContent.innerHTML = selectorHTML;
            
            // Inicializar iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Configurar event listeners
            this.setupSelectorEventListeners(equipments, clients);
            
            // Cargar ubicaciones si hay cliente preseleccionado
            if (preselectedClientId) {
                await this.loadLocationsByClient(preselectedClientId);
            }
        },

        renderEquipmentGrid: (equipments) => {
            if (equipments.length === 0) {
                return `
                    <div class="equipment-empty-state">
                        <i data-lucide="wrench" class="equipment-empty-icon"></i>
                        <h3>No se encontraron equipos</h3>
                        <p>Intenta ajustar los filtros o agregar equipos desde la gestión de clientes.</p>
                        <a href="clientes.html" class="btn btn-primary">
                            <i data-lucide="plus" class="h-4 w-4 mr-2"></i>
                            Gestionar Equipos
                        </a>
                    </div>
                `;
            }

            return `
                <div class="equipment-grid">
                    ${equipments.map(equipment => `
                        <div class="equipment-card-selector" data-equipment-id="${equipment.id}">
                            <div class="equipment-card-header">
                                <div class="equipment-card-title">
                                    <h3>${equipment.name || equipment.type}</h3>
                                    <span class="equipment-card-code">#${equipment.id}</span>
                                </div>
                                <div class="equipment-card-status ${equipment.activo ? 'active' : 'inactive'}">
                                    ${equipment.activo ? 'Activo' : 'Inactivo'}
                                </div>
                            </div>
                            
                            <div class="equipment-card-details">
                                <div class="equipment-detail-item">
                                    <i data-lucide="tag" class="equipment-detail-icon"></i>
                                    <span><strong>Modelo:</strong> ${equipment.model || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <i data-lucide="building" class="equipment-detail-icon"></i>
                                    <span><strong>Cliente:</strong> ${equipment.client_name || 'N/A'}</span>
                                </div>
                                <div class="equipment-detail-item">
                                    <i data-lucide="map-pin" class="equipment-detail-icon"></i>
                                    <span><strong>Ubicación:</strong> ${equipment.location_name || 'N/A'}</span>
                                </div>
                                ${equipment.serial_number ? `
                                <div class="equipment-detail-item">
                                    <i data-lucide="hash" class="equipment-detail-icon"></i>
                                    <span><strong>Serie:</strong> ${equipment.serial_number}</span>
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="equipment-card-actions">
                                <button class="btn btn-primary equipment-select-btn" data-equipment-id="${equipment.id}">
                                    <i data-lucide="eye" class="h-4 w-4 mr-2"></i>
                                    Ver Detalles
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        },

        setupSelectorEventListeners: (equipments, clients) => {
            // Búsqueda en tiempo real
            const searchInput = document.getElementById('equipment-search');
            const clientFilter = document.getElementById('client-filter');
            const locationFilter = document.getElementById('location-filter');
            const equipmentList = document.getElementById('equipment-list');
            const equipmentCount = document.getElementById('equipment-count');

            let currentEquipments = [...equipments];

            // Función para filtrar equipos
            const filterEquipments = () => {
                const searchTerm = searchInput.value.toLowerCase();
                const selectedClient = clientFilter.value;
                const selectedLocation = locationFilter.value;

                let filtered = equipments.filter(equipment => {
                    const matchesSearch = !searchTerm || 
                        (equipment.name && equipment.name.toLowerCase().includes(searchTerm)) ||
                        (equipment.model && equipment.model.toLowerCase().includes(searchTerm)) ||
                        (equipment.serial_number && equipment.serial_number.toLowerCase().includes(searchTerm)) ||
                        equipment.id.toString().includes(searchTerm);

                    const matchesClient = !selectedClient || equipment.client_id == selectedClient;
                    const matchesLocation = !selectedLocation || equipment.location_id == selectedLocation;

                    return matchesSearch && matchesClient && matchesLocation;
                });

                currentEquipments = filtered;
                equipmentList.innerHTML = this.renderEquipmentGrid(filtered);
                equipmentCount.textContent = `${filtered.length} equipos encontrados`;
                
                // Reconfigurar event listeners para botones de selección
                this.setupEquipmentSelectListeners();
                
                // Reinicializar iconos
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            };

            // Event listeners para filtros
            searchInput.addEventListener('input', filterEquipments);
            clientFilter.addEventListener('change', async (e) => {
                // Cargar ubicaciones del cliente seleccionado
                await this.loadLocationsByClient(e.target.value);
                filterEquipments();
            });
            locationFilter.addEventListener('change', filterEquipments);

            // Event listeners para botones de vista
            document.querySelectorAll('.equipment-view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.equipment-view-btn').forEach(b => b.classList.remove('active'));
                    e.target.closest('.equipment-view-btn').classList.add('active');
                    
                    const view = e.target.closest('.equipment-view-btn').dataset.view;
                    const container = document.querySelector('.equipment-list-container');
                    container.className = `equipment-list-container equipment-view-${view}`;
                });
            });

            // Configurar event listeners iniciales para selección de equipos
            this.setupEquipmentSelectListeners();
        },

        setupEquipmentSelectListeners: () => {
            // Event listeners para seleccionar equipos
            document.querySelectorAll('.equipment-select-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const equipmentId = e.target.closest('.equipment-select-btn').dataset.equipmentId;
                    const urlParams = new URLSearchParams(window.location.search);
                    const clientId = urlParams.get('clientId');
                    
                    // Navegar al equipo seleccionado
                    let targetUrl = `equipo.html?id=${equipmentId}`;
                    if (clientId) {
                        targetUrl += `&clientId=${clientId}`;
                    }
                    
                    console.log(`🔄 Navegando a equipo ${equipmentId}...`);
                    window.location.href = targetUrl;
                });
            });

            // También permitir click en toda la tarjeta
            document.querySelectorAll('.equipment-card-selector').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.equipment-select-btn')) {
                        const equipmentId = card.dataset.equipmentId;
                        const btn = card.querySelector('.equipment-select-btn');
                        if (btn) btn.click();
                    }
                });
            });
        },

        loadLocationsByClient: async (clientId) => {
            const locationFilter = document.getElementById('location-filter');
            if (!locationFilter || !clientId) return;

            try {
                const locations = await api.getLocationsByClient(clientId);
                
                locationFilter.innerHTML = `
                    <option value="">Todas las ubicaciones</option>
                    ${locations.map(location => `
                        <option value="${location.id}">${location.name}</option>
                    `).join('')}
                `;
                
            } catch (error) {
                console.error('❌ Error cargando ubicaciones:', error);
                locationFilter.innerHTML = '<option value="">Error cargando ubicaciones</option>';
            }
        }
    };

    const actions = {
        init: async () => {
            console.log('Iniciando carga de equipo...');
            const urlParams = new URLSearchParams(window.location.search);
            const equipmentId = urlParams.get('id');
            const clientId = urlParams.get('clientId');
            
            console.log('Parámetros URL:', { equipmentId, clientId });

            // Hacer el botón de volver inteligente
            if (clientId) {
                backButton.href = `clientes.html?openClient=${clientId}`;
            }

            if (!equipmentId) {
                console.error('No se proporcionó ID de equipo');
                await ui.showEquipmentSelection();
                return;
            }

            try {
                console.log('Cargando datos del equipo...');
                const [equipmentData, ticketsData, notesData] = await Promise.all([
                    api.getEquipment(equipmentId),
                    api.getEquipmentTickets(equipmentId),
                    api.getEquipmentNotes(equipmentId)
                ]);
                console.log('Datos cargados:', { equipmentData, ticketsData, notesData });
                state.equipment = equipmentData;
                state.tickets = ticketsData;
                state.notes = notesData;
                render.all();
                
            } catch (error) {
                console.error('Error al cargar los datos del equipo:', error);
                mainContent.innerHTML = `<div class="equipment-error">Error al cargar la información. ${error.message}</div>`;
            }
        },
        
        saveNote: async () => {
            const textarea = document.getElementById('note-textarea');
            const noteText = textarea.value.trim();
            
            if (!noteText) {
                alert('Por favor, escribe una nota antes de guardar.');
                return;
            }
            
            try {
                console.log('Guardando nota...');
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
                
                await api.addEquipmentNote(state.equipment.id, noteText);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                // Limpiar y ocultar formulario
                const noteForm = document.getElementById('note-form');
                textarea.value = '';
                noteForm.classList.add('hidden');
                
                console.log('Nota guardada exitosamente');
                
            } catch (error) {
                console.error('Error al guardar la nota:', error);
                alert('Error al guardar la nota. Por favor, inténtalo de nuevo.');
            } finally {
                const saveBtn = document.getElementById('save-note-btn');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Nota';
            }
        },
        
        deleteNote: async (noteId) => {
            if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
                return;
            }
            
            try {
                console.log('Eliminando nota...');
                await api.deleteEquipmentNote(noteId);
                
                // Recargar las notas
                state.notes = await api.getEquipmentNotes(state.equipment.id);
                render.notes();
                
                console.log('Nota eliminada exitosamente');
                
            } catch (error) {
                console.error('❌ Error al eliminar la nota:', error);
                showError('Error al eliminar la nota. Por favor, inténtalo de nuevo.', 'deleteNote');
            }
        }
    };

    const events = {
        setup: () => {
            document.body.addEventListener('click', e => {
                // Manejar impresión de QR
                if (e.target.matches('#print-qr-btn, #print-qr-btn *')) {
                    e.preventDefault();
                    console.log('Iniciando impresión del QR...');
                    
                    const qrContainer = document.getElementById('qrcode');
                    const canvas = qrContainer.querySelector('canvas');
                    if (!canvas) {
                        alert("El código QR no se ha generado todavía.");
                        return;
                    }

                    const customId = state.equipment.custom_id || 'Equipo sin ID';
                    const equipmentName = `${state.equipment.type} - ${state.equipment.model || state.equipment.name}`;
                    
                    // Crear ventana de impresión
                    const printWindow = window.open('', 'PRINT', 'height=700,width=900');
                    
                    if (!printWindow) {
                        alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueada por el navegador.');
                        return;
                    }

                    const qrDataUrl = canvas.toDataURL('image/png');
                    
                    const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Imprimir QR - ${customId}</title>
                            <style>
                                @media print {
                                    @page { margin: 1cm; }
                                    body { margin: 0; }
                                }
                                body {
                                    font-family: Arial, sans-serif;
                                    text-align: center;
                                    padding: 20px;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                    margin: 0;
                                }
                                .qr-container {
                                    border: 2px solid #000;
                                    padding: 20px;
                                    background: white;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                                }
                                h1 {
                                    font-size: 24px;
                                    margin: 0 0 10px 0;
                                    color: #333;
                                }
                                h2 {
                                    font-size: 18px;
                                    margin: 0 0 20px 0;
                                    color: #666;
                                    font-weight: normal;
                                }
                                .qr-image {
                                    width: 300px;
                                    height: 300px;
                                    margin: 20px 0;
                                }
                                .custom-id {
                                    font-family: 'Courier New', monospace;
                                    font-size: 20px;
                                    font-weight: bold;
                                    margin-top: 15px;
                                    letter-spacing: 2px;
                                }
                                .print-info {
                                    margin-top: 30px;
                                    font-size: 12px;
                                    color: #888;
                                }
                                @media screen {
                                    .no-print {
                                        margin-top: 30px;
                                    }
                                    button {
                                        padding: 10px 20px;
                                        margin: 0 10px;
                                        font-size: 16px;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                    }
                                    .print-btn {
                                        background: #007bff;
                                        color: white;
                                    }
                                    .close-btn {
                                        background: #6c757d;
                                        color: white;
                                    }
                                }
                                @media print {
                                    .no-print { display: none; }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="qr-container">
                                <h1>${customId}</h1>
                                <h2>${equipmentName}</h2>
                                <img src="${qrDataUrl}" alt="Código QR" class="qr-image">
                                <div class="custom-id">${customId}</div>
                                <div class="print-info">
                                    Gymtec ERP - ${new Date().toLocaleDateString('es-CL')}
                                </div>
                            </div>
                            <div class="no-print">
                                <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>
                                <button class="close-btn" onclick="window.close()">❌ Cerrar</button>
                            </div>
                        </body>
                        </html>
                    `;

                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    
                    // Esperar a que la ventana cargue completamente
                    printWindow.onload = function() {
                        console.log('Ventana de impresión cargada');
                        printWindow.focus();
                        
                        // Dar un pequeño delay para asegurar que todo esté renderizado
                        setTimeout(() => {
                            printWindow.print();
                        }, 500);
                    };
                    
                    console.log('Ventana de impresión creada');
                }
                
                // Manejar botón "Agregar Nota"
                if (e.target.matches('#add-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.remove('hidden');
                    textarea.focus();
                }
                
                // Manejar botón "Cancelar"
                if (e.target.matches('#cancel-note-btn')) {
                    e.preventDefault();
                    const noteForm = document.getElementById('note-form');
                    const textarea = document.getElementById('note-textarea');
                    noteForm.classList.add('hidden');
                    textarea.value = '';
                }
                
                // Manejar botón "Guardar Nota"
                if (e.target.matches('#save-note-btn')) {
                    e.preventDefault();
                    actions.saveNote();
                }
                
                // Manejar botón "Eliminar Nota"
                if (e.target.matches('.delete-note-btn, .delete-note-btn *')) {
                    e.preventDefault();
                    const button = e.target.closest('.delete-note-btn');
                    const noteId = button.getAttribute('data-note-id');
                    actions.deleteNote(noteId);
                }
            });
        }
    };

    actions.init();
    events.setup();
    lucide.createIcons();
}); 