// Mantenedor de Modelos de Equipos - Gymtec ERP
document.addEventListener('DOMContentLoaded', () => {
    // ✅ CRÍTICO: Verificación de autenticación REACTIVADA
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ Usuario no autenticado en modelos, redirigiendo a login...');
        window.authManager.redirectToLogin();
        return;
    }

    console.log('✅ Usuario autenticado, cargando módulo de modelos...');

class ModelosManager {
    constructor() {
        this.models = [];
        this.currentModel = null;
        this.currentTab = 'general';
        this.photos = [];
        this.manuals = [];
        this.spareParts = [];
        this.checklistItems = [];
        
        // Configurar la URL base de la API usando configuración dinámica
        this.apiBaseUrl = window.API_URL || this.getApiBaseUrl();
        
        this.init();
    }

    getApiBaseUrl() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:3000/api`;
        } else {
            return `${window.location.protocol}//${hostname}:3000/api`;
        }
    }

    init() {
        console.log('🚀 Inicializando ModelosManager...');
        this.setupEventListeners();
        this.loadModels();
        console.log('✅ ModelosManager inicializado');
    }

    setupEventListeners() {
        // Botón para agregar modelo
        document.getElementById('add-model-btn').addEventListener('click', () => {
            this.openModelModal();
        });

        // Botón para agregar primer modelo
        document.getElementById('add-first-model-btn').addEventListener('click', () => {
            this.openModelModal();
        });

        // Búsqueda de modelos
        document.getElementById('search-models').addEventListener('input', (e) => {
            this.filterModels(e.target.value);
        });

        // Filtro por categoría
        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filterModels(document.getElementById('search-models').value, e.target.value);
        });

        // Eventos del modal
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('model-modal');
        const form = document.getElementById('model-form');
        const closeBtn = modal.querySelector('.base-modal-close');
        const cancelBtn = modal.querySelector('.base-btn-cancel');

        // Cerrar modal
        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());

        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Envío del formulario
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveModel();
        });

        // Cambio de pestañas
        modal.querySelectorAll('.base-tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(btn.dataset.tab);
            });
        });

        // Eventos de archivos
        this.setupFileEvents();
    }

    setupFileEvents() {
        const photoInput = document.getElementById('photo-input');
        const photoUploadArea = document.getElementById('photo-upload-area');
        const manualInput = document.getElementById('manual-input');
        const manualUploadArea = document.getElementById('manual-upload-area');

        // Eventos de fotos
        photoInput.addEventListener('change', (e) => {
            this.handlePhotoSelection(e.target.files);
        });

        photoUploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        photoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoUploadArea.classList.add('dragover');
        });

        photoUploadArea.addEventListener('dragleave', () => {
            photoUploadArea.classList.remove('dragover');
        });

        photoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            photoUploadArea.classList.remove('dragover');
            this.handlePhotoSelection(e.dataTransfer.files);
        });

        // Eventos de manuales
        manualInput.addEventListener('change', (e) => {
            this.handleManualSelection(e.target.files);
        });

        manualUploadArea.addEventListener('click', () => {
            manualInput.click();
        });

        manualUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            manualUploadArea.classList.add('dragover');
        });

        manualUploadArea.addEventListener('dragleave', () => {
            manualUploadArea.classList.remove('dragover');
        });

        manualUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            manualUploadArea.classList.remove('dragover');
            this.handleManualSelection(e.dataTransfer.files);
        });
    }

    async loadModels() {
        try {
            console.log('📥 Cargando modelos desde la API...');
            
            // Mostrar indicador de carga (verificar si existe)
            const loadingDiv = document.getElementById('loading-models');
            if (loadingDiv) {
                loadingDiv.style.display = 'block';
            }
            
            // ✅ USAR authenticatedFetch en lugar de fetch
            const response = await window.authManager.authenticatedFetch(`${this.apiBaseUrl}/models`);
            if (!response.ok) {
                throw new Error('Error al cargar los modelos');
            }
            
            const data = await response.json();
            this.models = data.data || data || [];
            console.log(`✅ ${this.models.length} modelos cargados exitosamente`);
            
            await this.renderModels();
            this.updateSearchStats();
        } catch (error) {
            console.error('❌ Error loading models:', error);
            this.showNotification('Error al cargar los modelos: ' + error.message, 'error');
            this.showErrorState(error.message);
        }
    }

    async renderModels() {
        const container = document.getElementById('models-grid');
        const loadingDiv = document.getElementById('loading-models');
        const emptyState = document.getElementById('empty-state');
        
        // Ocultar loading (verificar si existe)
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        
        // Verificar si hay modelos
        if (!this.models || this.models.length === 0) {
            if (container) {
                container.innerHTML = '';
            }
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }

        // Ocultar estado vacío (verificar si existe)
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Generar HTML de las tarjetas
        const modelsHtml = await Promise.all(
            this.models.map(async (model) => {
                return await this.createModelCard(model);
            })
        );

        // Asignar HTML al contenedor (verificar si existe)
        if (container) {
            container.innerHTML = modelsHtml.join('');
        } else {
            console.warn('❌ No se pudo renderizar los modelos: elemento models-grid no encontrado');
        }
        
        // Inicializar iconos
        lucide.createIcons();
    }

    async createModelCard(model) {
        // Obtener foto principal
        let photoUrl = null;
        let photoCount = 0;
        
        try {
            const response = await window.authManager.authenticatedFetch(`${this.apiBaseUrl}/models/${model.id}/photos`);
            if (response.ok) {
                const photos = await response.json();
                photoCount = photos.length;
                if (photos.length > 0) {
                    photoUrl = photos[0].url;
                }
            }
        } catch (error) {
            console.warn('Error cargando fotos:', error);
        }

        // Obtener color de categoría
        const getCategoryColor = (category) => {
            const colors = {
                'Cardio': '#ef4444',
                'Fuerza': '#3b82f6',
                'Funcional': '#10b981',
                'Accesorios': '#f59e0b'
            };
            return colors[category] || '#6b7280';
        };

        return `
            <div class="model-card" data-model-id="${model.id}">
                <div class="model-card-header">
                    <h3 class="model-card-title">${model.name}</h3>
                    <span class="model-card-category" style="background-color: ${getCategoryColor(model.category)}">
                        ${model.category}
                    </span>
                </div>
                
                ${photoUrl ? 
                    `<img src="${photoUrl}" alt="${model.name}" class="model-image">` :
                    `<div class="model-image-placeholder">
                        <i data-lucide="image"></i>
                        <span>Sin imagen</span>
                    </div>`
                }
                
                <div class="model-card-info">
                    <div class="model-card-detail">
                        <i data-lucide="tag"></i>
                        <span>Marca: ${model.brand || 'N/A'}</span>
                    </div>
                    ${model.model_code ? `
                        <div class="model-card-detail">
                            <i data-lucide="hash"></i>
                            <span>Código: ${model.model_code}</span>
                        </div>
                    ` : ''}
                    ${model.weight ? `
                        <div class="model-card-detail">
                            <i data-lucide="weight"></i>
                            <span>Peso: ${model.weight} kg</span>
                        </div>
                    ` : ''}
                    ${model.power ? `
                        <div class="model-card-detail">
                            <i data-lucide="zap"></i>
                            <span>Potencia: ${model.power} W</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="model-card-footer">
                    <div class="model-card-stats">
                        <div class="model-card-stat">
                            <i data-lucide="image"></i>
                            <span>${photoCount} fotos</span>
                        </div>
                        <div class="model-card-stat">
                            <i data-lucide="file-text"></i>
                            <span>${model.has_manuals ? 'Con manuales' : 'Sin manuales'}</span>
                        </div>
                    </div>
                    
                    <div class="model-card-actions">
                        <button class="model-card-btn edit" onclick="modelosManager.editModel(${model.id})" title="Editar modelo">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="model-card-btn delete" onclick="modelosManager.deleteModel(${model.id})" title="Eliminar modelo">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    filterModels(searchTerm = '', category = '') {
        const searchLower = searchTerm.toLowerCase();
        const cards = document.querySelectorAll('.model-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const modelId = card.dataset.modelId;
            const model = this.models.find(m => m.id == modelId);
            
            if (!model) return;

            const matchesSearch = !searchTerm || 
                model.name.toLowerCase().includes(searchLower) ||
                (model.brand && model.brand.toLowerCase().includes(searchLower)) ||
                (model.category && model.category.toLowerCase().includes(searchLower)) ||
                (model.model_code && model.model_code.toLowerCase().includes(searchLower));

            const matchesCategory = !category || model.category === category;

            if (matchesSearch && matchesCategory) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Actualizar contador
        document.getElementById('models-count').textContent = `${visibleCount} modelos encontrados`;
    }

    updateSearchStats() {
        const totalCount = this.models.length;
        document.getElementById('models-count').textContent = `${totalCount} modelos encontrados`;
    }

    editModel(modelId) {
        const model = this.models.find(m => m.id == modelId);
        if (model) {
            this.openModelModal(model);
        }
    }

    async deleteModel(modelId) {
        const model = this.models.find(m => m.id == modelId);
        if (!model) return;

        if (!confirm(`¿Estás seguro de que quieres eliminar el modelo "${model.name}"?`)) {
            return;
        }

        try {
            // ✅ USAR authenticatedFetch en lugar de fetch
            const response = await window.authManager.authenticatedFetch(`${this.apiBaseUrl}/models/${modelId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar el modelo');
            }

            this.showNotification('Modelo eliminado exitosamente', 'success');
            this.loadModels();
        } catch (error) {
            console.error('Error al eliminar modelo:', error);
            this.showNotification('Error al eliminar el modelo: ' + error.message, 'error');
        }
    }

    showErrorState(message) {
        const container = document.getElementById('models-grid');
        const loadingDiv = document.getElementById('loading-models');
        const emptyState = document.getElementById('empty-state');

        // Verificar si los elementos existen antes de manipularlos
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i data-lucide="alert-circle" class="h-16 w-16 text-red-400 mx-auto mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Error al cargar modelos</h3>
                    <p class="text-gray-500 mb-4">${message}</p>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                        <i data-lucide="refresh-cw" class="h-4 w-4"></i>
                        Reintentar
                    </button>
                </div>
            `;
        } else {
            console.warn('❌ No se pudo mostrar el estado de error: elemento models-grid no encontrado');
        }
        
        lucide.createIcons();
    }

    async openModelModal(model = null) {
        console.log('🚀 openModelModal ejecutándose, model:', model);
        this.currentModel = model;
        const modal = document.getElementById('model-modal');
        const title = document.getElementById('model-modal-title');
        
        if (model) {
            console.log('✏️ Modo edición - ID del modelo:', model.id);
            title.textContent = 'Editar Modelo de Equipo';
            this.populateForm(model);
            
            // Cargar fotos y manuales existentes
            await this.loadModelPhotos(model.id);
            await this.loadModelManuals(model.id);
        } else {
            console.log('➕ Modo creación');
            title.textContent = 'Nuevo Modelo de Equipo';
            this.resetForm();
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        // Animación de entrada
        setTimeout(() => {
            modal.classList.add('is-open');
        }, 10);
    }

    closeModal() {
        const modal = document.getElementById('model-modal');
        
        modal.classList.remove('is-open');
        document.body.classList.remove('modal-open');
        
        setTimeout(() => {
            modal.style.display = 'none';
            this.resetForm();
        }, 300);
    }

    populateForm(model) {
        const form = document.getElementById('model-form');
        
        // Llenar campos básicos
        form.elements['id'].value = model.id || '';
        form.elements['brand'].value = model.brand || '';
        form.elements['name'].value = model.name || '';
        form.elements['category'].value = model.category || '';
        form.elements['model_code'].value = model.model_code || '';
        form.elements['description'].value = model.description || '';
        form.elements['weight'].value = model.weight || '';
        form.elements['dimensions'].value = model.dimensions || '';
        form.elements['power'].value = model.power || '';
        form.elements['voltage'].value = model.voltage || '';
        form.elements['technical_specs'].value = model.technical_specs || '';
        form.elements['maintenance_frequency'].value = model.maintenance_frequency || '';
        form.elements['estimated_lifespan'].value = model.estimated_lifespan || '';
        form.elements['maintenance_instructions'].value = model.maintenance_instructions || '';
    }

    resetForm() {
        document.getElementById('model-form').reset();
        this.photos = [];
        this.manuals = [];
        this.checklistItems = [];
        this.switchTab('general');
        this.renderPhotoPreview();
        this.renderManualList();
    }

    switchTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.base-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Desactivar todos los botones
        document.querySelectorAll('.base-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activar pestaña y botón seleccionados
        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        this.currentTab = tabName;
    }

    async loadModelPhotos(modelId) {
        try {
            const response = await authenticatedFetch(`${API_URL}/models/${modelId}/photos`);
            if (response.ok) {
                this.photos = await response.json();
                this.renderPhotoPreview();
            }
        } catch (error) {
            console.error('Error cargando fotos del modelo:', error);
        }
    }

    async loadModelManuals(modelId) {
        try {
            const response = await authenticatedFetch(`${API_URL}/models/${modelId}/manuals`);
            if (response.ok) {
                this.manuals = await response.json();
                this.renderManualList();
            }
        } catch (error) {
            console.error('Error cargando manuales del modelo:', error);
        }
    }

    handlePhotoSelection(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                if (file.size > 5 * 1024 * 1024) {
                    this.showNotification('El archivo es demasiado grande. Máximo 5MB.', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.photos.push({
                        name: file.name,
                        url: e.target.result,
                        file: file,
                        isNew: true
                    });
                    this.renderPhotoPreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    handleManualSelection(files) {
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || 
                file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                
                if (file.size > 10 * 1024 * 1024) {
                    this.showNotification('El archivo es demasiado grande. Máximo 10MB.', 'error');
                    return;
                }
                
                this.manuals.push({
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    file: file,
                    isNew: true
                });
                this.renderManualList();
            }
        });
    }

    renderPhotoPreview() {
        const container = document.getElementById('photo-preview');
        
        if (this.photos.length === 0) {
            container.innerHTML = '';
            return;
        }

        const photosHtml = this.photos.map((photo, index) => {
            return `
                <div class="model-photo-item">
                    <img src="${photo.url}" alt="${photo.name}">
                    <button class="model-photo-remove" onclick="modelosManager.removePhoto(${index})">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="model-photo-preview">${photosHtml}</div>`;
        lucide.createIcons();
    }

    renderManualList() {
        const container = document.getElementById('manual-list');
        
        if (this.manuals.length === 0) {
            container.innerHTML = '';
            return;
        }

        const manualsHtml = this.manuals.map((manual, index) => {
            return `
                <div class="model-manual-item">
                    <i data-lucide="file-text"></i>
                    <div class="model-manual-info">
                        <div class="model-manual-name">${manual.name}</div>
                        <div class="model-manual-size">${manual.size}</div>
                    </div>
                    <button class="model-manual-remove" onclick="modelosManager.removeManual(${index})">
                        Eliminar
                    </button>
                </div>
            `;
        }).join('');

        container.innerHTML = manualsHtml;
        lucide.createIcons();
    }

    removePhoto(index) {
        this.photos.splice(index, 1);
        this.renderPhotoPreview();
    }

    removeManual(index) {
        this.manuals.splice(index, 1);
        this.renderManualList();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async saveModel() {
        const form = document.getElementById('model-form');
        const formData = new FormData(form);
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const submitText = document.getElementById('submit-text');
        const submitSpinner = document.getElementById('submit-spinner');
        
        // Mostrar loading
        submitBtn.disabled = true;
        submitText.textContent = 'Guardando...';
        submitSpinner.classList.remove('hidden');
        
        try {
            // Convertir FormData a objeto JSON para envío
            const modelData = {};
            for (let [key, value] of formData.entries()) {
                if (key !== 'id' || value) { // Solo incluir id si tiene valor
                    modelData[key] = value;
                }
            }
            
            const isEditing = formData.get('id');
            const url = isEditing ? 
                `${this.apiBaseUrl}/models/${formData.get('id')}` : 
                `${this.apiBaseUrl}/models`;
            
            const method = isEditing ? 'PUT' : 'POST';
            
            // ✅ USAR authenticatedFetch con window prefix y JSON
            const response = await window.authManager.authenticatedFetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(modelData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar el modelo');
            }
            
            const result = await response.json();
            
            this.showNotification(
                isEditing ? 'Modelo actualizado exitosamente' : 'Modelo creado exitosamente', 
                'success'
            );
            
            this.closeModal();
            this.loadModels();
            
        } catch (error) {
            console.error('Error al guardar modelo:', error);
            this.showNotification('Error al guardar el modelo: ' + error.message, 'error');
        } finally {
            // Ocultar loading
            submitBtn.disabled = false;
            submitText.textContent = 'Guardar Modelo';
            submitSpinner.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else {
            notification.style.backgroundColor = '#3b82f6';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Inicialización manual desde modelos.html
// No inicializar automáticamente para evitar problemas de timing

// Estilos CSS para la animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .modal-open {
        overflow: hidden;
    }
`;
document.head.appendChild(style);

}); // Fin DOMContentLoaded