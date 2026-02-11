// clientes.js - Refactorizado con Alpine.js
// Skill: Code Quality Expert & GymTec Dev

// Inicialización de componentes Alpine
document.addEventListener('alpine:init', () => {
    // Inicializar Drawer de Equipos
    window.equipmentDrawer = new EquipmentDrawer();

    
    // --- Store Global de Notificaciones (si no existe) ---
    if (!Alpine.store('notifications')) {
        Alpine.store('notifications', {
            items: [],
            add(msg, type = 'info') {
                const id = Date.now();
                this.items.push({ id, msg, type });
                setTimeout(() => this.remove(id), 3000);
                
                // Fallback visual simple si no hay componente de notificaciones
                if (!document.querySelector('[x-data="notificationHandler"]')) {
                    alert(`${type.toUpperCase()}: ${msg}`);
                }
            },
            remove(id) {
                this.items = this.items.filter(i => i.id !== id);
            }
        });
    }

    // --- Componente Principal: Gestor de Clientes ---
    Alpine.data('clientsManager', () => ({
        clients: [],
        isLoading: false,
        searchTerm: '',
        selectedClient: null,
        selectedClientId: null, // Para persistencia visual

        init() {
            console.log('🚀 Iniciando clientsManager (Alpine.js)');
            this.loadClients();
            
            // Listeners globales
            window.addEventListener('reload-clients', () => this.loadClients());
        },

        get filteredClients() {
            if (!this.searchTerm) return this.clients;
            const term = this.searchTerm.toLowerCase();
            return this.clients.filter(c => 
                c.name.toLowerCase().includes(term) ||
                (c.rut && c.rut.toLowerCase().includes(term)) ||
                (c.email && c.email.toLowerCase().includes(term))
            );
        },

        async loadClients() {
            this.isLoading = true;
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/clients`);
                const result = await response.json();
                this.clients = result.data || result || []; // Manejo robusto de respuesta
                
                // Si había un cliente seleccionado, refrescarlo
                if (this.selectedClientId) {
                    const found = this.clients.find(c => c.id === this.selectedClientId);
                    if (found) this.selectClient(found);
                    else this.selectedClient = null;
                }
                this.$nextTick(() => { lucide.createIcons(); });
            } catch (e) {
                console.error('Error cargando clientes', e);
                Alpine.store('notifications').add('Error al cargar clientes', 'error');
            } finally {
                this.isLoading = false;
            }
        },

        selectClient(client) {
            this.selectedClient = client;
            this.selectedClientId = client.id;
        },

        async deleteClient(id) {
            if (!confirm('¿Estás seguro de eliminar este cliente? Se borrarán todas sus sedes y equipos.')) return;
            
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/clients/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Error al eliminar');
                
                Alpine.store('notifications').add('Cliente eliminado correctamente', 'success');
                this.selectedClient = null;
                this.selectedClientId = null;
                this.loadClients();
            } catch (e) {
                console.error(e);
                Alpine.store('notifications').add('Error al eliminar cliente', 'error');
            }
        }
    }));

    // --- Componente: Modal de Cliente ---
    Alpine.data('clientModal', () => ({
        isOpen: false,
        isEdit: false,
        isSubmitting: false,
        formData: {
            id: '', name: '', legal_name: '', rut: '', 
            business_activity: '', address: '', email: '', phone: '', contact_name: ''
        },

        openModal(client = null) {
            this.isEdit = !!client;
            if (client) {
                this.formData = { ...client };
            } else {
                this.resetForm();
            }
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.resetForm();
        },

        resetForm() {
            this.formData = {
                id: '', name: '', legal_name: '', rut: '', 
                business_activity: '', address: '', email: '', phone: '', contact_name: ''
            };
        },

        async submitForm() {
            this.isSubmitting = true;
            try {
                const url = this.isEdit 
                    ? `${window.API_URL}/clients/${this.formData.id}`
                    : `${window.API_URL}/clients`;
                const method = this.isEdit ? 'PUT' : 'POST';

                const response = await window.authenticatedFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.formData)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Error al guardar');
                }

                Alpine.store('notifications').add(`Cliente ${this.isEdit ? 'actualizado' : 'creado'} con éxito`, 'success');
                window.dispatchEvent(new Event('reload-clients'));
                this.closeModal();

            } catch (e) {
                console.error(e);
                Alpine.store('notifications').add(e.message, 'error');
            } finally {
                this.isSubmitting = false;
            }
        }
    }));

    // --- Componente: Gestor de Sedes ---
    // --- Componente: Gestor de Sedes ---
    Alpine.data('locationsManager', () => ({
        locations: [],
        
        init() {
            // Watch del scope padre: selectedClientId
            this.$watch('selectedClientId', (val) => {
                if (val) this.loadLocations();
                else this.locations = [];
            });
            
            // Carga inicial si ya hay cliente seleccionado
            if (this.selectedClientId) this.loadLocations();

            window.addEventListener('reload-locations', (e) => {
                 if (!e.detail || e.detail.clientId === this.selectedClientId) this.loadLocations();
            });
        },

        async loadLocations() {
            if (!this.selectedClientId) return;
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/clients/${this.selectedClientId}/locations`);
                const result = await response.json();
                this.locations = result.data || [];
                this.$nextTick(() => { lucide.createIcons(); });
            } catch (e) {
                console.error(e);
            }
        }
    }));

    // --- Componente: Modal de Sede ---
    Alpine.data('locationModal', () => ({
        isOpen: false,
        isEdit: false,
        isSubmitting: false,
        formData: { id: '', client_id: '', name: '', address: '' },

        openModal(detail) {
            if (detail.location) {
                this.isEdit = true;
                this.formData = { ...detail.location };
            } else if (detail.clientId) {
                this.isEdit = false;
                this.resetForm();
                this.formData.client_id = detail.clientId;
            }
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.resetForm();
        },

        resetForm() {
            this.formData = { id: '', client_id: '', name: '', address: '' };
        },

        async submitForm() {
            this.isSubmitting = true;
            try {
                const url = this.isEdit 
                    ? `${window.API_URL}/locations/${this.formData.id}`
                    : `${window.API_URL}/locations`;
                const method = this.isEdit ? 'PUT' : 'POST';

                const response = await window.authenticatedFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.formData)
                });

                if (!response.ok) throw new Error('Error al guardar sede');

                Alpine.store('notifications').add('Sede guardada correctamente', 'success');
                window.dispatchEvent(new CustomEvent('reload-locations', { detail: { clientId: this.formData.client_id } }));
                this.closeModal();
            } catch (e) {
                Alpine.store('notifications').add(e.message, 'error');
            } finally {
                this.isSubmitting = false;
            }
        }
    }));

    // --- Componente: Gestor de Equipos ---
    Alpine.data('equipmentManager', (locationId) => ({
        equipment: [],
        locationId: locationId,

        init() {
            this.loadEquipment();
            window.addEventListener('reload-equipment', (e) => {
                if (!e.detail || e.detail.locationId === this.locationId) this.loadEquipment();
            });
        },

        async loadEquipment() {
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/locations/${this.locationId}/equipment`);
                const result = await response.json();
                this.equipment = Array.isArray(result) ? result : (result.data || []);
                this.$nextTick(() => { lucide.createIcons(); });
            } catch (e) {
                console.error(e);
            }
        },

        async deleteEquipment(id) {
            if (!confirm('¿Eliminar equipo?')) return;
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/equipment/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Error al eliminar');
                
                Alpine.store('notifications').add('Equipo eliminado', 'success');
                this.loadEquipment();
            } catch (e) {
                Alpine.store('notifications').add(e.message, 'error');
            }
        }
    }));

    // --- Componente: Modal de Equipos (con Lógica Compleja) ---
    Alpine.data('equipmentModal', () => ({
        isOpen: false,
        isEdit: false,
        isSubmitting: false,
        isScanning: false,
        html5QrCode: null,
        
        // Model Search
        searchQuery: '',
        searchResults: [],
        selectedModel: null,

        formData: {
            id: '', location_id: '', model_id: '', 
            serial_number: '', acquisition_date: '', notes: ''
        },

        init() {
            // Cleanup on destroy logic if needed
        },

        openModal(detail) {
            this.resetForm();
            if (detail.equipment) {
                this.isEdit = true;
                this.formData = { ...detail.equipment };
                
                // Formatear fecha si existe
                if (this.formData.acquisition_date) {
                    this.formData.acquisition_date = this.formData.acquisition_date.split('T')[0];
                }

                // Cargar datos del modelo (nombre, marca) para mostrar en UI
                if (detail.equipment.model || detail.equipment.name) {
                    this.selectedModel = {
                        id: detail.equipment.model_id,
                        name: detail.equipment.model || detail.equipment.name,
                        brand: detail.equipment.brand || 'Desconocido',
                        category: detail.equipment.type || detail.equipment.category || 'Equipo'
                    };
                }
            } else if (detail.locationId) {
                this.isEdit = false;
                this.formData.location_id = detail.locationId;
            }
            this.isOpen = true;
        },

        closeModal() {
            this.stopScanner();
            this.isOpen = false;
            this.resetForm();
        },

        resetForm() {
            this.formData = {
                id: '', location_id: '', model_id: '', 
                serial_number: '', acquisition_date: '', notes: ''
            };
            this.searchQuery = '';
            this.searchResults = [];
            this.selectedModel = null;
        },

        // --- Model Search Logic ---
        async searchModels() {
            if (this.searchQuery.length < 2) {
                this.searchResults = [];
                return;
            }
            try {
                const response = await window.authenticatedFetch(`${window.API_URL}/equipment-models/search?q=${encodeURIComponent(this.searchQuery)}`);
                const result = await response.json();
                this.searchResults = result.data || [];
            } catch (e) {
                console.error(e);
            }
        },

        selectModel(model) {
            this.selectedModel = model;
            this.formData.model_id = model.id;
            this.searchQuery = '';
            this.searchResults = [];
        },

        clearModel() {
            this.selectedModel = null;
            this.formData.model_id = '';
        },

        // --- Barcode Scanner Logic ---
        toggleScanner() {
            if (this.isScanning) {
                this.stopScanner();
            } else {
                this.startScanner();
            }
        },

        async startScanner() {
            this.isScanning = true;
            this.$nextTick(() => {
                this.html5QrCode = new Html5Qrcode("barcode-reader");
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                
                this.html5QrCode.start(
                    { facingMode: "environment" }, 
                    config, 
                    (decodedText) => {
                        this.formData.serial_number = decodedText;
                        this.stopScanner();
                        Alpine.store('notifications').add('Código escaneado', 'success');
                    },
                    (errorMessage) => { 
                        // Ignorar errores de escaneo continuo 
                    }
                ).catch(err => {
                    console.error("Error iniciando scanner", err);
                    Alpine.store('notifications').add('No se pudo iniciar la cámara', 'error');
                    this.isScanning = false;
                });
            });
        },

        async stopScanner() {
            if (this.html5QrCode) {
                try {
                    await this.html5QrCode.stop();
                    this.html5QrCode.clear();
                } catch (e) {
                    console.error("Error deteniendo scanner", e);
                }
                this.html5QrCode = null;
            }
            this.isScanning = false;
        },

        async submitForm() {
            this.isSubmitting = true;
            try {
                const url = this.isEdit 
                    ? `${window.API_URL}/equipment/${this.formData.id}`
                    : `${window.API_URL}/equipment`;
                const method = this.isEdit ? 'PUT' : 'POST';

                const response = await window.authenticatedFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.formData)
                });

                if (!response.ok) throw new Error('Error al guardar equipo');

                Alpine.store('notifications').add('Equipo guardado correctamente', 'success');
                window.dispatchEvent(new CustomEvent('reload-equipment', { detail: { locationId: this.formData.location_id } }));
                this.closeModal();
            } catch (e) {
                Alpine.store('notifications').add(e.message, 'error');
            } finally {
                this.isSubmitting = false;
            }
        }
    }));
});

