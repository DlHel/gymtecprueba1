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
        
        // Si estamos en el puerto 8080 (servidor frontend), apuntar al backend en 3000
        if (currentPort === '8080') {
            return 'http://localhost:3000';
        }
        
        // Si estamos en el puerto 3000 (servidor backend), usar rutas relativas
        if (currentPort === '3000') {
            return '';
        }
        
        // Por defecto, asumir que estamos en el backend
        return '';
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
        document.getElementById('search-models').addEventListener('input', (e) => this.filterModels());
        document.getElementById('filter-category').addEventListener('change', (e) => this.filterModels());
        
        // Botones de agregar elementos
        document.getElementById('add-spare-part').addEventListener('click', () => this.addSparePartRow());
        document.getElementById('add-checklist-item').addEventListener('click', () => this.addChecklistRow());
        
        // Modal de edición desde vista (se configurará dinámicamente)
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Actualizar contenido
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
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

    handlePhotoFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const photo = {
                        id: Date.now() + Math.random(),
                        file: file,
                        url: e.target.result,
                        name: file.name
                    };
                    this.photos.push(photo);
                    this.renderPhotoPreview();
                };
                reader.readAsDataURL(file);
            } else {
                this.showNotification('Error: Solo se permiten imágenes de hasta 5MB', 'error');
            }
        });
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

    renderPhotoPreview() {
        const container = document.getElementById('photo-preview');
        container.innerHTML = this.photos.map(photo => `
            <div class="relative group">
                <img src="${photo.url}" alt="${photo.name}" class="w-full h-32 object-cover rounded-lg">
                <button type="button" onclick="modelosManager.removePhoto('${photo.id}')" 
                        class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                    ${photo.name}
                </div>
            </div>
        `).join('');
        lucide.createIcons();
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
            <div class="spare-part-item">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <input type="text" placeholder="Nombre del repuesto" 
                           value="${part.name}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'name', this.value)"
                           class="form-input">
                    <input type="text" placeholder="Código" 
                           value="${part.code}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'code', this.value)"
                           class="form-input">
                    <input type="text" placeholder="Descripción" 
                           value="${part.description}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'description', this.value)"
                           class="form-input">
                    <input type="number" placeholder="Precio" 
                           value="${part.price}" 
                           onchange="modelosManager.updateSparePart('${part.id}', 'price', this.value)"
                           class="form-input">
                </div>
                <button type="button" onclick="modelosManager.removeSparePart('${part.id}')" 
                        class="ml-2 text-red-500 hover:text-red-700">
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
            <div class="checklist-item">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <input type="text" placeholder="Título del ítem" 
                           value="${item.title}" 
                           onchange="modelosManager.updateChecklistItem('${item.id}', 'title', this.value)"
                           class="form-input">
                    <div class="flex gap-2">
                        <select onchange="modelosManager.updateChecklistItem('${item.id}', 'category', this.value)" 
                                class="form-input flex-1">
                            <option value="preventivo" ${item.category === 'preventivo' ? 'selected' : ''}>Preventivo</option>
                            <option value="correctivo" ${item.category === 'correctivo' ? 'selected' : ''}>Correctivo</option>
                            <option value="limpieza" ${item.category === 'limpieza' ? 'selected' : ''}>Limpieza</option>
                            <option value="inspeccion" ${item.category === 'inspeccion' ? 'selected' : ''}>Inspección</option>
                        </select>
                        <select onchange="modelosManager.updateChecklistItem('${item.id}', 'frequency', this.value)" 
                                class="form-input flex-1">
                            <option value="diario" ${item.frequency === 'diario' ? 'selected' : ''}>Diario</option>
                            <option value="semanal" ${item.frequency === 'semanal' ? 'selected' : ''}>Semanal</option>
                            <option value="mensual" ${item.frequency === 'mensual' ? 'selected' : ''}>Mensual</option>
                            <option value="trimestral" ${item.frequency === 'trimestral' ? 'selected' : ''}>Trimestral</option>
                            <option value="semestral" ${item.frequency === 'semestral' ? 'selected' : ''}>Semestral</option>
                            <option value="anual" ${item.frequency === 'anual' ? 'selected' : ''}>Anual</option>
                        </select>
                    </div>
                </div>
                <div class="flex gap-2">
                    <textarea placeholder="Descripción detallada del procedimiento..." 
                              onchange="modelosManager.updateChecklistItem('${item.id}', 'description', this.value)"
                              class="form-input flex-1" rows="2">${item.description}</textarea>
                    <button type="button" onclick="modelosManager.removeChecklistItem('${item.id}')" 
                            class="text-red-500 hover:text-red-700 self-start mt-2">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
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
    removePhoto(id) {
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

    // Gestión de modales
    openModelModal(model = null) {
        this.currentModel = model;
        const modal = document.getElementById('model-modal');
        const title = document.getElementById('model-modal-title');
        
        if (model) {
            title.textContent = 'Editar Modelo de Equipo';
            this.populateForm(model);
        } else {
            title.textContent = 'Nuevo Modelo de Equipo';
            this.resetForm();
        }
        
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    closeModelModal() {
        const modal = document.getElementById('model-modal');
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
        this.resetForm();
    }

    closeViewModal() {
        const modal = document.getElementById('model-view-modal');
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
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

        // Cargar datos adicionales (fotos, manuales, etc.)
        this.photos = model.photos || [];
        this.manuals = model.manuals || [];
        this.spareParts = model.spareParts || [];
        this.checklistItems = model.checklistItems || [];

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
        
        this.renderPhotoPreview();
        this.renderManualList();
        this.renderSpareParts();
        this.renderChecklistItems();
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const modelData = Object.fromEntries(formData.entries());
        
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

    renderModels() {
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
        
        container.innerHTML = this.models.map(model => this.createModelCard(model)).join('');
        lucide.createIcons();
    }

    createModelCard(model) {
        const mainPhoto = model.photos && model.photos.length > 0 ? model.photos[0].url : null;
        
        return `
            <div class="model-card app-card overflow-hidden cursor-pointer" onclick="modelosManager.viewModel('${model.id}')">
                ${mainPhoto ? 
                    `<img src="${mainPhoto}" alt="${model.name}" class="model-image">` :
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
                                ${model.photos ? model.photos.length : 0}
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

    viewModel(modelId) {
        const model = this.models.find(m => m.id == modelId);
        if (!model) return;
        
        const modal = document.getElementById('model-view-modal');
        const title = document.getElementById('model-view-title');
        const content = document.getElementById('model-view-content');
        
        title.textContent = model.name;
        content.innerHTML = this.createModelViewContent(model);
        
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        
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

    filterModels() {
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
        container.innerHTML = filteredModels.map(model => this.createModelCard(model)).join('');
        lucide.createIcons();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Implementar sistema de notificaciones
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message); // Temporal
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