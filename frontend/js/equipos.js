/**
 * Módulo de Gestión de Equipos
 * @description Manejo de lista, filtros y estadísticas de equipos
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // 1. PROTECCIÓN DE AUTENTICACIÓN (CRÍTICO)
    // ============================================
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        window.location.href = '/login.html';
        return;
    }

    console.log('✅ Usuario autenticado, cargando equipos...');

    // ============================================
    // 2. STATE MANAGEMENT
    // ============================================
    const state = {
        allEquipment: [],
        filteredEquipment: [],
        clients: [],
        locations: [],
        isLoading: false
    };

    // ============================================
    // 3. API FUNCTIONS
    // ============================================
    const api = {
        async loadEquipment() {
            try {
                const response = await window.authManager.authenticatedFetch(`${API_URL}/equipment`);
                
                if (!response.ok) {
                    throw new Error('Error al cargar equipos');
                }

                const result = await response.json();
                return result.data || [];
                
            } catch (error) {
                console.error('❌ Error cargando equipos:', error);
                ui.showError('No se pudieron cargar los equipos');
                throw error;
            }
        },

        async loadClients() {
            try {
                const response = await window.authManager.authenticatedFetch(`${API_URL}/clients`);
                const result = await response.json();
                return result.data || [];
                
            } catch (error) {
                console.error('❌ Error cargando clientes:', error);
                return [];
            }
        },

        async loadLocations() {
            try {
                const response = await window.authManager.authenticatedFetch(`${API_URL}/locations`);
                const result = await response.json();
                return result.data || [];
                
            } catch (error) {
                console.error('❌ Error cargando ubicaciones:', error);
                return [];
            }
        }
    };

    // ============================================
    // 4. UI FUNCTIONS
    // ============================================
    const ui = {
        showLoading() {
            const container = document.getElementById('equipment-container');
            if (container) {
                container.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                `;
            }
        },

        showError(message) {
            const container = document.getElementById('equipment-container');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="alert-circle" style="width: 64px; height: 64px; color: #ef4444;"></i>
                        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Error</h3>
                        <p>${message}</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        },

        showEmptyState() {
            const container = document.getElementById('equipment-container');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="package" style="width: 64px; height: 64px;"></i>
                        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">No se encontraron equipos</h3>
                        <p>No hay equipos que coincidan con los filtros seleccionados</p>
                    </div>
                `;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        },

        populateClientSelect() {
            const clientSelect = document.getElementById('filter-client');
            if (!clientSelect) return;

            clientSelect.innerHTML = '<option value="">Todos los clientes</option>';
            
            state.clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                clientSelect.appendChild(option);
            });
        },

        populateLocationSelect() {
            const locationSelect = document.getElementById('filter-location');
            if (!locationSelect) return;

            locationSelect.innerHTML = '<option value="">Todas las ubicaciones</option>';
            
            state.locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = `${location.name} (${location.client_name || 'Sin cliente'})`;
                locationSelect.appendChild(option);
            });
        },

        renderEquipment() {
            const container = document.getElementById('equipment-container');
            if (!container) return;
            
            if (state.filteredEquipment.length === 0) {
                this.showEmptyState();
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'equipment-grid';

            state.filteredEquipment.forEach(equipment => {
                const card = this.createEquipmentCard(equipment);
                grid.appendChild(card);
            });

            container.innerHTML = '';
            container.appendChild(grid);

            // Recrear iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        },

        createEquipmentCard(equipment) {
            const card = document.createElement('div');
            card.className = 'equipment-card';
            card.onclick = () => {
                window.location.href = `equipo.html?id=${equipment.id}`;
            };

            // Según @bitacora, Equipment NO tiene columna 'activo' - todos están activos
            const statusClass = 'status-active';
            const statusText = 'Activo';

            card.innerHTML = `
                <div class="equipment-header">
                    <div>
                        <div class="equipment-title">${equipment.name || equipment.custom_id || 'Sin nombre'}</div>
                        <div class="equipment-model">${equipment.model_name || 'Modelo no especificado'}</div>
                    </div>
                    <span class="equipment-status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="equipment-info">
                    <div class="equipment-info-row">
                        <i data-lucide="hash"></i>
                        <span>${equipment.serial_number || equipment.custom_id || 'Sin serial'}</span>
                    </div>
                    <div class="equipment-info-row">
                        <i data-lucide="map-pin"></i>
                        <span>${equipment.location_name || 'Sin ubicación'}</span>
                    </div>
                    <div class="equipment-info-row">
                        <i data-lucide="building"></i>
                        <span>${equipment.client_name || 'Sin cliente'}</span>
                    </div>
                </div>
            `;

            return card;
        },

        updateStats() {
            const statTotal = document.getElementById('stat-total');
            const statActive = document.getElementById('stat-active');
            const statClients = document.getElementById('stat-clients');
            const statLocations = document.getElementById('stat-locations');

            if (statTotal) statTotal.textContent = state.allEquipment.length;
            
            // Según @bitacora, todos los equipos están activos
            if (statActive) statActive.textContent = state.allEquipment.length;
            
            // Contar clientes únicos
            const uniqueClients = new Set(
                state.allEquipment
                    .map(e => {
                        const location = state.locations.find(l => l.id === e.location_id);
                        return location ? location.client_id : null;
                    })
                    .filter(Boolean)
            );
            if (statClients) statClients.textContent = uniqueClients.size;
            
            // Contar ubicaciones únicas
            const uniqueLocations = new Set(
                state.allEquipment.map(e => e.location_id).filter(Boolean)
            );
            if (statLocations) statLocations.textContent = uniqueLocations.size;
        }
    };

    // ============================================
    // 5. FILTER LOGIC
    // ============================================
    const filters = {
        applyFilters() {
            const searchTerm = document.getElementById('filter-search')?.value.toLowerCase() || '';
            const clientId = document.getElementById('filter-client')?.value || '';
            const locationId = document.getElementById('filter-location')?.value || '';

            state.filteredEquipment = state.allEquipment.filter(equipment => {
                // Filtro de búsqueda
                const matchesSearch = !searchTerm || 
                    equipment.name?.toLowerCase().includes(searchTerm) ||
                    equipment.custom_id?.toLowerCase().includes(searchTerm) ||
                    equipment.serial_number?.toLowerCase().includes(searchTerm);

                // Filtro de cliente (a través de location)
                let equipmentClientId = null;
                if (equipment.location_id) {
                    const location = state.locations.find(l => l.id === equipment.location_id);
                    if (location) {
                        equipmentClientId = location.client_id;
                    }
                }
                const matchesClient = !clientId || (equipmentClientId == clientId);

                // Filtro de ubicación
                const matchesLocation = !locationId || (equipment.location_id == locationId);

                return matchesSearch && matchesClient && matchesLocation;
            });

            ui.renderEquipment();
        }
    };

    // ============================================
    // 6. EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        const filterSearch = document.getElementById('filter-search');
        const filterClient = document.getElementById('filter-client');
        const filterLocation = document.getElementById('filter-location');

        if (filterSearch) {
            filterSearch.addEventListener('input', filters.applyFilters);
        }

        if (filterClient) {
            filterClient.addEventListener('change', filters.applyFilters);
        }

        if (filterLocation) {
            filterLocation.addEventListener('change', filters.applyFilters);
        }
    }

    // ============================================
    // 7. INITIALIZATION
    // ============================================
    async function init() {
        try {
            console.log('🚀 Inicializando módulo de equipos...');
            ui.showLoading();

            // Cargar datos en paralelo
            const [equipment, clients, locations] = await Promise.all([
                api.loadEquipment(),
                api.loadClients(),
                api.loadLocations()
            ]);

            state.allEquipment = equipment;
            state.filteredEquipment = [...equipment];
            state.clients = clients;
            state.locations = locations;

            // Configurar UI
            ui.populateClientSelect();
            ui.populateLocationSelect();
            ui.renderEquipment();
            ui.updateStats();
            setupEventListeners();

            // Inicializar iconos
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            console.log('✅ Módulo de equipos inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando módulo de equipos:', error);
            ui.showError('Error al inicializar la página de equipos');
        }
    }

    // Iniciar la aplicación
    init();
});
