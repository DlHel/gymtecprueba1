// Mantenedor de Modelos de Equipos - Gymtec ERP
class ModelosManager {
    constructor() {
        this.models = [];
        this.currentModel = null;
        this.currentTab = 'general';
        this.photos = [];
        this.manuals = [];
        this.spareParts = [];
        this.checklistItems = [];
        
        // Configurar la URL base de la API según el puerto actual
        this.apiBaseUrl = this.getApiBaseUrl();
        
        this.init();
    }

    getApiBaseUrl() {
        const currentPort = window.location.port;
        const currentHost = window.location.hostname;
        
        console.log('Current URL:', window.location.href);
        console.log('Current port:', currentPort);
        
        // Si estamos en el puerto 8080 (servidor frontend), apuntar al backend en 3000
        if (currentPort === '8080') {
            return 'http://localhost:3000';
        }
        
        // Si estamos en el puerto 3000 (servidor backend), usar la URL completa
        if (currentPort === '3000') {
            return `http://${currentHost}:3000`;
        }
        
        // Por defecto, asumir que estamos en el backend
        return 'http://localhost:3000';
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.setupFileUploads();
        this.loadModels();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('add-model-btn').addEventListener('click', () => this.openModelModal());
        document.getElementById('close-model-modal').addEventListener('click', () => this.closeModelModal());
        document.getElementById('close-model-view').addEventListener('click', () => this.closeViewModal());
        document.getElementById('cancel-model').addEventListener('click', () => this.closeModelModal());
        
        // Formulario
        document.getElementById('model-form').addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Búsqueda y filtros
        document.getElementById('search-models').addEventListener('input', async (e) => await this.filterModels());
        document.getElementById('filter-category').addEventListener('change', async (e) => await this.filterModels());
        
        // Botones de agregar elementos
        document.getElementById('add-spare-part').addEventListener('click', () => this.addSparePartRow());
        document.getElementById('add-checklist-item').addEventListener('click', () => this.addChecklistRow());
        
        // Validación en tiempo real
        this.setupRealTimeValidation();
        
        // Modal de edición desde vista (se configurará dinámicamente)
    }

    setupRealTimeValidation() {
        // Validación en tiempo real para campos obligatorios
        const requiredFields = ['name', 'brand', 'category'];
        requiredFields.forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldName, field.value));
                field.addEventListener('input', () => this.clearFieldError(fieldName));
            }
        });

        // Validación para campos numéricos
        const numericFields = ['weight', 'power'];
        numericFields.forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldName, field.value));
                field.addEventListener('input', () => this.clearFieldError(fieldName));
            }
        });

        // Validación para campos con formato específico
        const formatFields = ['dimensions'];
        formatFields.forEach(fieldName => {
            const field = document.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldName, field.value));
                field.addEventListener('input', () => this.clearFieldError(fieldName));
            }
        });
    }

    validateField(fieldName, value) {
        const errors = [];
        
        switch (fieldName) {
            case 'name':
                if (!value || value.trim() === '') {
                    errors.push('El nombre del modelo es obligatorio');
                } else if (value.length > 100) {
                    errors.push('El nombre no puede exceder 100 caracteres');
                }
                break;
                
            case 'brand':
                if (!value || value.trim() === '') {
                    errors.push('La marca es obligatoria');
                } else if (value.length > 50) {
                    errors.push('La marca no puede exceder 50 caracteres');
                }
                break;
                
            case 'category':
                if (!value || value.trim() === '') {
                    errors.push('La categoría es obligatoria');
                }
                break;
                
            case 'weight':
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    errors.push('El peso debe ser un número positivo');
                }
                break;
                
            case 'power':
                if (value && (isNaN(value) || parseInt(value) < 0)) {
                    errors.push('La potencia debe ser un número entero positivo');
                }
                break;
                
            case 'dimensions':
                if (value && value.trim() !== '') {
                    const dimensionPattern = /^\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*x\s*\d+(\.\d+)?$/i;
                    if (!dimensionPattern.test(value.trim())) {
                        errors.push('Formato: Largo x Ancho x Alto (ej: 200 x 80 x 150)');
                    }
                }
                break;
                
            case 'voltage':
                // No necesita validación - es un select con opciones predefinidas
                return;
        }
        
        if (errors.length > 0) {
            this.showFieldError(fieldName, errors[0]);
        } else {
            this.clearFieldError(fieldName);
        }
    }

    showFieldError(fieldName, message) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        // Limpiar error anterior
        this.clearFieldError(fieldName);
        
        // Agregar clase de error
        field.classList.add('error');
        
        // Crear elemento de error
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error text-red-500 text-sm mt-1';
        errorElement.textContent = message;
        
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(fieldName) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        
        field.classList.remove('error');
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }



    setupTabs() {
        const tabButtons = document.querySelectorAll('.model-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.model-tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Actualizar contenido
        document.querySelectorAll('.model-tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        this.currentTab = tabName;
    }

    setupFileUploads() {
        // Upload de fotos
        const photoArea = document.getElementById('photo-upload-area');
        const photoInput = document.getElementById('photo-input');
        
        photoArea.addEventListener('click', () => photoInput.click());
        photoArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoArea.classList.add('dragover');
        });
        photoArea.addEventListener('dragleave', () => {
            photoArea.classList.remove('dragover');
        });
        photoArea.addEventListener('drop', (e) => {
            e.preventDefault();
            photoArea.classList.remove('dragover');
            this.handlePhotoFiles(e.dataTransfer.files);
        });
        
        photoInput.addEventListener('change', (e) => {
            this.handlePhotoFiles(e.target.files);
        });

        // Upload de manuales
        const manualArea = document.getElementById('manual-upload-area');
        const manualInput = document.getElementById('manual-input');
        
        manualArea.addEventListener('click', () => manualInput.click());
        manualArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            manualArea.classList.add('dragover');
        });
        manualArea.addEventListener('dragleave', () => {
            manualArea.classList.remove('dragover');
        });
        manualArea.addEventListener('drop', (e) => {
            e.preventDefault();
            manualArea.classList.remove('dragover');
            this.handleManualFiles(e.dataTransfer.files);
        });
        
        manualInput.addEventListener('change', (e) => {
            this.handleManualFiles(e.target.files);
        });
    }

    async handlePhotoFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                this.showNotification(`${file.name}: Solo se permiten archivos de imagen`, 'error');
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification(`${file.name}: El archivo excede el límite de 5MB`, 'error');
                return false;
            }
            return true;
        });
        
        if (validFiles.length === 0) return;
        
        // Si estamos editando un modelo existente, subir inmediatamente
        if (this.currentModel && this.currentModel.id) {
            await this.uploadPhotos(validFiles, this.currentModel.id);
        } else {
            // Si es un modelo nuevo, almacenar temporalmente
            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const photo = {
                        id: Date.now() + Math.random(),
                        file: file,
                        url: e.target.result,
                        name: file.name,
                        isTemporary: true
                    };
                    this.photos.push(photo);
                    this.renderPhotoPreview();
                };
                reader.readAsDataURL(file);
            });
        }
    }

    handleManualFiles(files) {
        Array.from(files).forEach(file => {
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (allowedTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) {
                const manual = {
                    id: Date.now() + Math.random(),
                    file: file,
                    name: file.name,
                    size: this.formatFileSize(file.size),
                    type: file.type
                };
                this.manuals.push(manual);
                this.renderManualList();
            } else {
                this.showNotification('Error: Solo se permiten PDF, DOC, DOCX de hasta 10MB', 'error');
            }
        });
    }

    // Funciones para manejo de fotos con API
    async uploadPhotos(files, modelId) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('photos', file);
        });

        // Mostrar indicador de progreso
        const progressElement = document.getElementById('upload-progress');
        if (progressElement) {
            progressElement.classList.remove('hidden');
        }

        try {
            console.log('Uploading photos to:', `${this.apiBaseUrl}/api/models/${modelId}/photos`);
            console.log('Files to upload:', files.length);
            
            const response = await fetch(`${this.apiBaseUrl}/api/models/${modelId}/photos`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMessage = `Error ${response.status}: ${response.statusText}`;
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (parseError) {
                    // Si no se puede parsear como JSON, usar el texto de la respuesta
                    const errorText = await response.text();
                    console.error('Response is not JSON:', errorText);
                    errorMessage = `Error del servidor (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            // Agregar las fotos subidas a la lista
            result.photos.forEach(photo => {
                this.photos.push({
                    id: Date.now() + Math.random(),
                    name: photo.originalName,
                    url: `${this.apiBaseUrl}${photo.url}`,
                    filename: photo.filename,
                    isUploaded: true
                });
            });

            this.renderPhotoPreview();
            this.showNotification(`${result.photos.length} foto(s) subida(s) exitosamente`, 'success');

        } catch (error) {
            console.error('Error uploading photos:', error);
            this.showNotification(`Error al subir fotos: ${error.message}`, 'error');
        } finally {
            // Ocultar indicador de progreso
            if (progressElement) {
                progressElement.classList.add('hidden');
            }
        }
    }

    async loadModelPhotos(modelId) {
        try {
            console.log('🔍 Cargando fotos para modelo ID:', modelId);
            console.log('🌐 URL API:', `${this.apiBaseUrl}/api/models/${modelId}/photos`);
            
            const response = await fetch(`${this.apiBaseUrl}/api/models/${modelId}/photos`);
            if (!response.ok) {
                throw new Error('Error al cargar las fotos');
            }
            
            const photos = await response.json();
            console.log('✅ Fotos cargadas desde BD:', photos.length);
            console.log('📸 Datos de fotos:', photos);
            
            // Convertir fotos de BD al formato interno
            this.photos = photos.map(photo => ({
                id: photo.id,
                filename: photo.filename,
                name: photo.originalName,
                originalName: photo.originalName,
                size: photo.size,
                url: `${this.apiBaseUrl}${photo.url}`,
                isTemporary: false,
                isUploaded: true,
                uploadDate: photo.uploadDate
            }));
            
            console.log('🔄 Fotos convertidas:', this.photos);
            
            // Actualizar la vista de fotos
            this.renderPhotoPreview();
            console.log('🎨 Vista de fotos actualizada');
            
        } catch (error) {
            console.error('❌ Error loading model photos:', error);
            this.showNotification('Error al cargar las fotos: ' + error.message, 'error');
        }
    }

    async deletePhoto(filename) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models/photos/${filename}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar la foto');
            }

            this.showNotification('Foto eliminada exitosamente', 'success');

        } catch (error) {
            console.error('Error deleting photo:', error);
            this.showNotification(`Error al eliminar foto: ${error.message}`, 'error');
        }
    }

    renderPhotoPreview() {
        const container = document.getElementById('photo-preview');
        const infoElement = document.getElementById('photo-info');
        
        console.log('🎨 renderPhotoPreview - Fotos a renderizar:', this.photos.length);
        console.log('📋 Datos de fotos:', this.photos);
        
        const html = this.photos.map(photo => {
            console.log('🖼️ Generando HTML para foto:', photo.url);
            return `
            <div class="model-photo-item">
                <img src="${photo.url}" alt="${photo.name}">
                <button type="button" onclick="modelosManager.removePhoto('${photo.id}', '${photo.filename || ''}')" 
                        class="model-photo-remove">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
                <div class="model-photo-status ${photo.isUploaded ? 'uploaded' : photo.isTemporary ? 'pending' : ''}">
                    ${photo.isUploaded ? '✓' : photo.isTemporary ? '⏳' : ''}
                </div>
            </div>
        `;
        }).join('');
        
        console.log('📝 HTML generado:', html);
        container.innerHTML = html;
        console.log('✅ HTML insertado en container');
        
        // Mostrar/ocultar información según si hay fotos
        if (infoElement) {
            if (this.photos.length > 0) {
                infoElement.classList.remove('hidden');
                console.log('👁️ Mostrando info element');
            } else {
                infoElement.classList.add('hidden');
                console.log('🙈 Ocultando info element');
            }
        }
        
        lucide.createIcons();
        console.log('🎯 renderPhotoPreview completado');
    }

    renderManualList() {
        const container = document.getElementById('manual-list');
        container.innerHTML = this.manuals.map(manual => `
            <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-3">
                    <i data-lucide="file-text" class="w-6 h-6 text-gray-500"></i>
                    <div>
                        <p class="font-medium">${manual.name}</p>
                        <p class="text-sm text-gray-500">${manual.size}</p>
                    </div>
                </div>
                <button type="button" onclick="modelosManager.removeManual('${manual.id}')" 
                        class="text-red-500 hover:text-red-700">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
        lucide.createIcons();
    }

    addSparePartRow() {
        const sparePart = {
            id: Date.now() + Math.random(),
            name: '',
            code: '',
            description: '',
            price: ''
        };
        this.spareParts.push(sparePart);
        this.renderSpareParts();
    }

    renderSpareParts() {
        const container = document.getElementById('spare-parts-list');
        container.innerHTML = this.spareParts.map(part => `
            <div class="model-dynamic-item">
                <div class="model-dynamic-item-content">
                    <input type="text" placeholder="Nombre del repuesto" 
                           value="${part.name}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'name', this.value)"
                           class="model-form-input">
                    <input type="text" placeholder="Código" 
                           value="${part.code}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'code', this.value)"
                           class="model-form-input">
                    <input type="text" placeholder="Descripción" 
                           value="${part.description}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'description', this.value)"
                           class="model-form-input">
                    <input type="number" placeholder="Precio" 
                           value="${part.price}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'price', this.value)"
                           class="model-form-input">
                </div>
                <button type="button" onclick="modelosManager.removeSparePart('${part.id}')" 
                        class="model-dynamic-item-remove">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
        lucide.createIcons();
    }

    addChecklistRow() {
        const item = {
            id: Date.now() + Math.random(),
            title: '',
            description: '',
            category: 'preventivo',
            frequency: 'mensual'
        };
        this.checklistItems.push(item);
        this.renderChecklistItems();
    }

    renderChecklistItems() {
        const container = document.getElementById('checklist-items');
        container.innerHTML = this.checklistItems.map(item => `
            <div class="model-dynamic-item">
                <div class="model-dynamic-item-content">
                    <input type="text" placeholder="Título del ítem" 
                           value="${item.title}" 
                           onchange="modelosManager.updateChecklistItem('${item.id}', 'title', this.value)"
                           class="model-form-input">
                    <div class="flex gap-2">
                        <select onchange="modelosManager.updateChecklistItem('${item.id}', 'category', this.value)" 
                                class="model-form-select flex-1">
                            <option value="preventivo" ${item.category === 'preventivo' ? 'selected' : ''}>Preventivo</option>
                            <option value="correctivo" ${item.category === 'correctivo' ? 'selected' : ''}>Correctivo</option>
                            <option value="limpieza" ${item.category === 'limpieza' ? 'selected' : ''}>Limpieza</option>
                            <option value="inspeccion" ${item.category === 'inspeccion' ? 'selected' : ''}>Inspección</option>
                        </select>
                        <select onchange="modelosManager.updateChecklistItem('${item.id}', 'frequency', this.value)" 
                                class="model-form-select flex-1">
                            <option value="diario" ${item.frequency === 'diario' ? 'selected' : ''}>Diario</option>
                            <option value="semanal" ${item.frequency === 'semanal' ? 'selected' : ''}>Semanal</option>
                            <option value="mensual" ${item.frequency === 'mensual' ? 'selected' : ''}>Mensual</option>
                            <option value="trimestral" ${item.frequency === 'trimestral' ? 'selected' : ''}>Trimestral</option>
                            <option value="semestral" ${item.frequency === 'semestral' ? 'selected' : ''}>Semestral</option>
                            <option value="anual" ${item.frequency === 'anual' ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                    <textarea placeholder="Descripción detallada del procedimiento..." 
                              onchange="modelosManager.updateChecklistItem('${item.id}', 'description', this.value)"
                              class="model-form-textarea" rows="2">${item.description}</textarea>
                </div>
                <button type="button" onclick="modelosManager.removeChecklistItem('${item.id}')" 
                        class="model-dynamic-item-remove">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');
        lucide.createIcons();
    }

    // Métodos de actualización
    updateSparePart(id, field, value) {
        const part = this.spareParts.find(p => p.id === id);
        if (part) {
            part[field] = value;
        }
    }

    updateChecklistItem(id, field, value) {
        const item = this.checklistItems.find(i => i.id === id);
        if (item) {
            item[field] = value;
        }
    }

    // Métodos de eliminación
    async removePhoto(id, filename = '') {
        const photo = this.photos.find(p => p.id === id);
        if (!photo) return;

        // Si es una foto subida, eliminarla del servidor
        if (photo.isUploaded && filename) {
            await this.deletePhoto(filename);
        }

        // Eliminar de la lista local
        this.photos = this.photos.filter(p => p.id !== id);
        this.renderPhotoPreview();
    }

    removeManual(id) {
        this.manuals = this.manuals.filter(m => m.id !== id);
        this.renderManualList();
    }

    removeSparePart(id) {
        this.spareParts = this.spareParts.filter(p => p.id !== id);
        this.renderSpareParts();
    }

    removeChecklistItem(id) {
        this.checklistItems = this.checklistItems.filter(i => i.id !== id);
        this.renderChecklistItems();
    }

    // Gestión de modales usando el sistema estándar
    async openModelModal(model = null) {
        console.log('🚀 openModelModal ejecutándose, model:', model);
        this.currentModel = model;
        const modal = document.getElementById('model-modal');
        const title = document.getElementById('model-modal-title');
        
        if (model) {
            console.log('✏️ Modo edición - ID del modelo:', model.id);
            title.textContent = 'Editar Modelo de Equipo';
            this.populateForm(model);
            // Cargar fotos existentes desde la BD DESPUÉS de populateForm
            console.log('📸 Llamando a loadModelPhotos...');
            await this.loadModelPhotos(model.id);
            console.log('✅ loadModelPhotos completado');
            
            // Si hay fotos, cambiar automáticamente a la pestaña Fotos
            if (this.photos.length > 0) {
                console.log('📸 Hay fotos, cambiando a pestaña Fotos');
                this.switchTab('photos');
            }
        } else {
            console.log('➕ Modo creación');
            title.textContent = 'Nuevo Modelo de Equipo';
            this.resetForm();
        }
        
        // Limpiar cualquier error de validación previo
        setTimeout(() => {
            this.clearFieldError('voltage');
        }, 100);
        
        // Usar el sistema estándar de modales
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        // Forzar reflow para animación
        modal.offsetHeight;
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
        console.log('🎯 Modal abierto');
    }

    closeModelModal() {
        const modal = document.getElementById('model-modal');
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
        }, 300);
        document.body.classList.remove('modal-open');
        this.resetForm();
    }

    closeViewModal() {
        const modal = document.getElementById('model-view-modal');
        modal.classList.remove('is-open');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
        }, 300);
        document.body.classList.remove('modal-open');
    }

    populateForm(model) {
        const form = document.getElementById('model-form');
        const formData = new FormData();
        
        // Llenar campos básicos
        Object.keys(model).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = model[key] || '';
            }
        });

        // Cargar datos adicionales (NO sobrescribir fotos si ya están cargadas)
        // Las fotos se cargan desde BD en loadModelPhotos()
        if (!this.photos || this.photos.length === 0) {
            this.photos = model.photos || [];
        }
        this.manuals = model.manuals || [];
        this.spareParts = model.spareParts || [];
        this.checklistItems = model.checklistItems || [];

        // Limpiar errores de validación después de poblar
        setTimeout(() => {
            this.clearFieldError('voltage');
        }, 200);

        this.renderPhotoPreview();
        this.renderManualList();
        this.renderSpareParts();
        this.renderChecklistItems();
    }

    resetForm() {
        document.getElementById('model-form').reset();
        this.photos = [];
        this.manuals = [];
        this.spareParts = [];
        this.checklistItems = [];
        this.switchTab('general');
        
        // Limpiar errores de validación
        this.clearFieldError('voltage');
        this.clearFieldError('dimensions');
        this.clearFieldError('name');
        this.clearFieldError('brand');
        this.clearFieldError('category');
        
        this.renderPhotoPreview();
        this.renderManualList();
        this.renderSpareParts();
        this.renderChecklistItems();
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const modelData = Object.fromEntries(formData.entries());
        
        // Validar datos antes de enviar
        const validation = this.validateModelData(modelData);
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // Convertir números
        if (modelData.weight) modelData.weight = parseFloat(modelData.weight);
        if (modelData.power) modelData.power = parseInt(modelData.power);
        
        // Agregar datos adicionales
        modelData.photos = this.photos;
        modelData.manuals = this.manuals;
        modelData.spareParts = this.spareParts.filter(p => p.name.trim());
        modelData.checklistItems = this.checklistItems.filter(i => i.title.trim());
        
        if (this.currentModel) {
            await this.updateModel(modelData);
        } else {
            await this.createModel(modelData);
        }
    }

    async createModel(modelData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear el modelo');
            }
            
            const newModel = await response.json();
            
            // Subir fotos temporales si existen
            const temporaryPhotos = this.photos.filter(photo => photo.isTemporary && photo.file);
            if (temporaryPhotos.length > 0) {
                const files = temporaryPhotos.map(photo => photo.file);
                await this.uploadPhotos(files, newModel.id);
            }
            
            this.models.push(newModel);
            this.renderModels();
            this.closeModelModal();
            this.showNotification('Modelo creado exitosamente', 'success');
        } catch (error) {
            console.error('Error creating model:', error);
            this.showNotification('Error al crear el modelo: ' + error.message, 'error');
        }
    }

    async updateModel(modelData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models/${this.currentModel.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(modelData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al actualizar el modelo');
            }
            
            const index = this.models.findIndex(m => m.id === this.currentModel.id);
            if (index !== -1) {
                this.models[index] = { ...this.currentModel, ...modelData };
                this.renderModels();
                this.closeModelModal();
                this.showNotification('Modelo actualizado exitosamente', 'success');
            }
        } catch (error) {
            console.error('Error updating model:', error);
            this.showNotification('Error al actualizar el modelo: ' + error.message, 'error');
        }
    }

    async loadModels() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models`);
            if (!response.ok) {
                throw new Error('Error al cargar los modelos');
            }
            
            this.models = await response.json();
            this.renderModels();
        } catch (error) {
            console.error('Error loading models:', error);
            this.showNotification('Error al cargar los modelos: ' + error.message, 'error');
            
            // Mostrar estado vacío en caso de error
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('empty-state').classList.remove('hidden');
            document.getElementById('models-grid').classList.add('hidden');
        }
    }

    async renderModels() {
        const container = document.getElementById('models-grid');
        const loadingState = document.getElementById('loading-state');
        const emptyState = document.getElementById('empty-state');
        
        loadingState.classList.add('hidden');
        
        if (this.models.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        container.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        // Cargar fotos para cada modelo y crear las tarjetas
        const modelCards = await Promise.all(
            this.models.map(async (model) => await this.createModelCard(model))
        );
        
        container.innerHTML = modelCards.join('');
        lucide.createIcons();
    }

    async createModelCard(model) {
        // Cargar fotos del modelo desde la BD
        let photoUrl = null;
        let photoCount = 0;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models/${model.id}/photos`);
            if (response.ok) {
                const photos = await response.json();
                photoCount = photos.length;
                if (photos.length > 0) {
                    photoUrl = `${this.apiBaseUrl}${photos[0].url}`;
                }
            }
        } catch (error) {
            console.warn(`Error cargando fotos para modelo ${model.id}:`, error);
        }
        
        return `
            <div class="model-card app-card overflow-hidden cursor-pointer" onclick="modelosManager.viewModel('${model.id}')">
                ${photoUrl ? 
                    `<img src="${photoUrl}" alt="${model.name}" class="model-image">` :
                    `<div class="model-image-placeholder">
                        <i data-lucide="image" class="w-12 h-12"></i>
                    </div>`
                }
                <div class="p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-lg line-clamp-2">${model.name}</h3>
                        <span class="status-badge info text-xs">${model.category}</span>
                    </div>
                    <p class="text-gray-600 font-medium mb-2">${model.brand}</p>
                    <p class="text-sm text-gray-500 line-clamp-2 mb-4">${model.description || 'Sin descripción'}</p>
                    
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <div class="flex items-center gap-4">
                            <span class="flex items-center gap-1">
                                <i data-lucide="image" class="w-4 h-4"></i>
                                ${photoCount}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="file-text" class="w-4 h-4"></i>
                                ${model.manuals ? model.manuals.length : 0}
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="wrench" class="w-4 h-4"></i>
                                ${model.spareParts ? model.spareParts.length : 0}
                            </span>
                        </div>
                        <button onclick="event.stopPropagation(); modelosManager.openModelModal(modelosManager.models.find(m => m.id === '${model.id}'))" 
                                class="text-primary-600 hover:text-primary-800">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async viewModel(modelId) {
        const model = this.models.find(m => m.id == modelId);
        if (!model) return;
        
        // Cargar fotos del modelo
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/models/${modelId}/photos`);
            if (response.ok) {
                const photos = await response.json();
                model.photos = photos.map(photo => ({
                    ...photo,
                    url: `${this.apiBaseUrl}${photo.url}`
                }));
            }
        } catch (error) {
            console.warn(`Error cargando fotos para vista del modelo ${modelId}:`, error);
            model.photos = [];
        }
        
        const modal = document.getElementById('model-view-modal');
        const title = document.getElementById('model-view-title');
        const content = document.getElementById('model-view-content');
        
        title.textContent = model.name;
        content.innerHTML = this.createModelViewContent(model);
        
        // Usar el sistema estándar de modales
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        // Forzar reflow para animación
        modal.offsetHeight;
        modal.classList.add('is-open');
        document.body.classList.add('modal-open');
        
        // Configurar botón de editar
        document.getElementById('edit-model-btn').onclick = () => {
            this.closeViewModal();
            this.openModelModal(model);
        };
        
        lucide.createIcons();
    }

    createModelViewContent(model) {
        return `
            <div class="space-y-6">
                <!-- Información básica -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold mb-3">Información General</h4>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Marca:</span> ${model.brand}</div>
                            <div><span class="font-medium">Categoría:</span> ${model.category}</div>
                            <div><span class="font-medium">Código:</span> ${model.model_code || 'N/A'}</div>
                            <div><span class="font-medium">Peso:</span> ${model.weight ? model.weight + ' kg' : 'N/A'}</div>
                            <div><span class="font-medium">Dimensiones:</span> ${model.dimensions || 'N/A'}</div>
                            <div><span class="font-medium">Voltaje:</span> ${model.voltage || 'N/A'}</div>
                            <div><span class="font-medium">Potencia:</span> ${model.power ? model.power + ' W' : 'N/A'}</div>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-3">Descripción</h4>
                        <p class="text-sm text-gray-600">${model.description || 'Sin descripción disponible'}</p>
                        ${model.specifications ? `
                            <h4 class="font-semibold mb-3 mt-4">Especificaciones Técnicas</h4>
                            <p class="text-sm text-gray-600">${model.specifications}</p>
                        ` : ''}
                    </div>
                </div>

                <!-- Fotos -->
                ${model.photos && model.photos.length > 0 ? `
                    <div>
                        <h4 class="font-semibold mb-3">Fotos (${model.photos.length})</h4>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            ${model.photos.map(photo => `
                                <img src="${photo.url}" alt="${photo.name}" class="w-full h-32 object-cover rounded-lg">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Manuales -->
                ${model.manuals && model.manuals.length > 0 ? `
                    <div>
                        <h4 class="font-semibold mb-3">Manuales (${model.manuals.length})</h4>
                        <div class="space-y-2">
                            ${model.manuals.map(manual => `
                                <div class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                                    <i data-lucide="file-text" class="w-5 h-5 text-gray-500"></i>
                                    <div class="flex-1">
                                        <p class="font-medium">${manual.name}</p>
                                        <p class="text-sm text-gray-500">${manual.size}</p>
                                    </div>
                                    <button class="text-primary-600 hover:text-primary-800">
                                        <i data-lucide="download" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Repuestos -->
                ${model.spareParts && model.spareParts.length > 0 ? `
                    <div>
                        <h4 class="font-semibold mb-3">Repuestos Compatibles (${model.spareParts.length})</h4>
                        <div class="overflow-x-auto">
                            <table class="app-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Precio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${model.spareParts.map(part => `
                                        <tr>
                                            <td>${part.name}</td>
                                            <td>${part.code}</td>
                                            <td>${part.description}</td>
                                            <td>${part.price ? '$' + part.price : 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <!-- Checklist -->
                ${model.checklistItems && model.checklistItems.length > 0 ? `
                    <div>
                        <h4 class="font-semibold mb-3">Checklist de Mantenimiento (${model.checklistItems.length})</h4>
                        <div class="space-y-3">
                            ${model.checklistItems.map(item => `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <div class="flex justify-between items-start mb-2">
                                        <h5 class="font-medium">${item.title}</h5>
                                        <div class="flex gap-2">
                                            <span class="status-badge ${this.getCategoryColor(item.category)}">${item.category}</span>
                                            <span class="status-badge info">${item.frequency}</span>
                                        </div>
                                    </div>
                                    <p class="text-sm text-gray-600">${item.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCategoryColor(category) {
        const colors = {
            'preventivo': 'success',
            'correctivo': 'warning',
            'limpieza': 'info',
            'inspeccion': 'danger'
        };
        return colors[category] || 'info';
    }

    async filterModels() {
        const searchTerm = document.getElementById('search-models').value.toLowerCase();
        const categoryFilter = document.getElementById('filter-category').value;
        
        let filteredModels = this.models;
        
        if (searchTerm) {
            filteredModels = filteredModels.filter(model => 
                model.name.toLowerCase().includes(searchTerm) ||
                model.brand.toLowerCase().includes(searchTerm) ||
                model.category.toLowerCase().includes(searchTerm)
            );
        }
        
        if (categoryFilter) {
            filteredModels = filteredModels.filter(model => model.category === categoryFilter);
        }
        
        const container = document.getElementById('models-grid');
        
        // Crear las tarjetas de forma asíncrona como en renderModels()
        const modelCards = await Promise.all(
            filteredModels.map(async (model) => await this.createModelCard(model))
        );
        
        container.innerHTML = modelCards.join('');
        lucide.createIcons();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    validateModelData(data) {
        const errors = [];
        
        // Validaciones obligatorias
        if (!data.name || data.name.trim() === '') {
            errors.push({ field: 'name', message: 'El nombre del modelo es obligatorio' });
        }
        
        if (!data.brand || data.brand.trim() === '') {
            errors.push({ field: 'brand', message: 'La marca es obligatoria' });
        }
        
        if (!data.category || data.category.trim() === '') {
            errors.push({ field: 'category', message: 'La categoría es obligatoria' });
        }
        
        // Validaciones de formato
        if (data.name && data.name.length > 100) {
            errors.push({ field: 'name', message: 'El nombre no puede exceder 100 caracteres' });
        }
        
        if (data.brand && data.brand.length > 50) {
            errors.push({ field: 'brand', message: 'La marca no puede exceder 50 caracteres' });
        }
        
        if (data.model_code && data.model_code.length > 30) {
            errors.push({ field: 'model_code', message: 'El código del modelo no puede exceder 30 caracteres' });
        }
        
        // Validaciones numéricas
        if (data.weight && (isNaN(data.weight) || parseFloat(data.weight) < 0)) {
            errors.push({ field: 'weight', message: 'El peso debe ser un número positivo' });
        }
        
        if (data.power && (isNaN(data.power) || parseInt(data.power) < 0)) {
            errors.push({ field: 'power', message: 'La potencia debe ser un número entero positivo' });
        }
        
        // Validación de dimensiones (formato: LxAxH)
        if (data.dimensions && data.dimensions.trim() !== '') {
            const dimensionPattern = /^\d+(\.\d+)?\s*x\s*\d+(\.\d+)?\s*x\s*\d+(\.\d+)?$/i;
            if (!dimensionPattern.test(data.dimensions.trim())) {
                errors.push({ field: 'dimensions', message: 'Las dimensiones deben tener el formato: Largo x Ancho x Alto (ej: 200 x 80 x 150)' });
            }
        }
        
        // Validación de voltaje - ELIMINADA: El campo es un select con opciones predefinidas
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    showValidationErrors(errors) {
        // Limpiar errores anteriores
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
        
        // Mostrar nuevos errores
        errors.forEach(error => {
            const field = document.querySelector(`[name="${error.field}"]`);
            if (field) {
                field.classList.add('error');
                
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error text-red-500 text-sm mt-1';
                errorElement.textContent = error.message;
                
                field.parentNode.appendChild(errorElement);
            }
        });
        
        // Mostrar notificación general
        this.showNotification('Por favor corrige los errores en el formulario', 'error');
        
        // Hacer scroll al primer error
        if (errors.length > 0) {
            const firstErrorField = document.querySelector(`[name="${errors[0].field}"]`);
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstErrorField.focus();
            }
        }
    }

    showNotification(message, type = 'info') {
        // Sistema de notificaciones mejorado
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-lucide="${this.getNotificationIcon(type)}" class="w-5 h-5"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        lucide.createIcons();
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'alert-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        return icons[type] || 'info';
    }

    generateSampleData() {
        return [
            {
                id: 1,
                name: "Trotadora X1 Pro",
                brand: "Life Fitness",
                category: "Cardio",
                model_code: "LF-X1-2024",
                description: "Trotadora profesional con motor de 4.0 HP y superficie de carrera de 22\" x 60\"",
                weight: 180,
                dimensions: "200 x 90 x 160",
                voltage: "220V",
                power: 4000,
                specifications: "Motor AC de 4.0 HP, velocidad máxima 20 km/h, inclinación hasta 15%",
                photos: [],
                manuals: [],
                spareParts: [
                    { id: 1, name: "Banda de correr", code: "LF-X1-BELT", description: "Banda de correr original", price: "450000" },
                    { id: 2, name: "Motor principal", code: "LF-X1-MOTOR", description: "Motor AC 4.0 HP", price: "1200000" }
                ],
                checklistItems: [
                    { id: 1, title: "Lubricación de banda", description: "Aplicar lubricante en la banda de correr", category: "preventivo", frequency: "mensual" },
                    { id: 2, title: "Limpieza general", description: "Limpiar superficie y consola", category: "limpieza", frequency: "diario" }
                ]
            },
            {
                id: 2,
                name: "Prensa de Piernas 45°",
                brand: "Technogym",
                category: "Fuerza",
                model_code: "TG-LP45-2024",
                description: "Prensa de piernas con ángulo de 45 grados, capacidad máxima 500kg",
                weight: 320,
                dimensions: "180 x 120 x 140",
                voltage: "N/A",
                power: 0,
                specifications: "Estructura de acero, capacidad máxima 500kg, sistema de seguridad integrado",
                photos: [],
                manuals: [],
                spareParts: [
                    { id: 3, name: "Cojinetes lineales", code: "TG-LP45-BEAR", description: "Set de cojinetes para guías", price: "180000" }
                ],
                checklistItems: [
                    { id: 3, title: "Inspección de cables", description: "Verificar estado de cables y poleas", category: "inspeccion", frequency: "semanal" }
                ]
            }
        ];
    }
}

// Inicializar el manager cuando se carga la página
let modelosManager;
document.addEventListener('DOMContentLoaded', () => {
    modelosManager = new ModelosManager();
}); 