/**
 * GYMTEC ERP - Checklist Editor
 * Sistema de edición de checklists para servicios de gimnación
 * @bitacora: Editor completo de checklists con funcionalidades CRUD
 */

// Estado del editor de checklist
const checklistEditorState = {
    currentTemplate: null,
    items: [],
    isEditing: false,
    unsavedChanges: false
};

/**
 * Inicializar editor de checklist
 */
function initChecklistEditor() {
    console.log('🎨 CHECKLIST EDITOR: Inicializando editor de checklist...');
    
    // Event listeners para botones del editor
    const createNewBtn = document.getElementById('create-new-template');
    const saveTemplateBtn = document.getElementById('save-template');
    const cancelEditBtn = document.getElementById('cancel-template-edit');
    const addItemBtn = document.getElementById('add-checklist-item');
    const templateSelect = document.getElementById('checklist-template-select');
    
    if (createNewBtn) {
        createNewBtn.addEventListener('click', createNewTemplate);
    }
    
    if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', saveTemplate);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelTemplateEdit);
    }
    
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addChecklistItem);
    }
    
    if (templateSelect) {
        templateSelect.addEventListener('change', onTemplateSelectChange);
    }
    
    console.log('✅ CHECKLIST EDITOR: Editor inicializado correctamente');
}

/**
 * Crear nuevo template
 */
function createNewTemplate() {
    console.log('🆕 CHECKLIST EDITOR: Creando nuevo template...');
    
    checklistEditorState.currentTemplate = null;
    checklistEditorState.items = [];
    checklistEditorState.isEditing = true;
    checklistEditorState.unsavedChanges = false;
    
    // Mostrar editor
    const templateEditor = document.getElementById('template-editor');
    const templateNameInput = document.getElementById('template-name-input');
    
    if (templateEditor) {
        templateEditor.classList.remove('hidden');
    }
    
    if (templateNameInput) {
        templateNameInput.value = '';
        templateNameInput.focus();
    }
    
    // Limpiar lista de items
    renderChecklistItems();
}

/**
 * Cambio en selector de template
 */
async function onTemplateSelectChange(event) {
    const templateId = event.target.value;
    
    if (!templateId) {
        hideTemplateEditor();
        return;
    }
    
    try {
        console.log(`📋 CHECKLIST EDITOR: Cargando template ${templateId}...`);
        
        // Cargar template y sus items
        const template = state.gimnacion.checklistTemplates.find(t => t.id == templateId);
        const templateItems = await fetchTemplateItems(templateId);
        
        checklistEditorState.currentTemplate = template;
        checklistEditorState.items = templateItems;
        checklistEditorState.isEditing = true;
        checklistEditorState.unsavedChanges = false;
        
        // Mostrar editor con datos cargados
        showTemplateEditor(template, templateItems);
        
    } catch (error) {
        console.error('❌ CHECKLIST EDITOR: Error cargando template:', error);
        alert('Error al cargar el template seleccionado');
    }
}

/**
 * Mostrar editor de template
 */
function showTemplateEditor(template, items) {
    const templateEditor = document.getElementById('template-editor');
    const templateNameInput = document.getElementById('template-name-input');
    
    if (templateEditor) {
        templateEditor.classList.remove('hidden');
    }
    
    if (templateNameInput && template) {
        templateNameInput.value = template.template_name;
    }
    
    renderChecklistItems();
    updateProgress();
}

/**
 * Ocultar editor de template
 */
function hideTemplateEditor() {
    const templateEditor = document.getElementById('template-editor');
    
    if (templateEditor) {
        templateEditor.classList.add('hidden');
    }
    
    checklistEditorState.currentTemplate = null;
    checklistEditorState.items = [];
    checklistEditorState.isEditing = false;
    checklistEditorState.unsavedChanges = false;
}

/**
 * Agregar nuevo item al checklist
 */
function addChecklistItem() {
    console.log('➕ CHECKLIST EDITOR: Agregando nuevo item...');
    
    const newItem = {
        id: `temp_${Date.now()}`,
        item_description: '',
        is_required: false,
        sort_order: checklistEditorState.items.length + 1,
        completed: false,
        notes: '',
        isNew: true
    };
    
    checklistEditorState.items.push(newItem);
    checklistEditorState.unsavedChanges = true;
    
    renderChecklistItems();
    updateProgress();
    
    // Focus en el nuevo input
    setTimeout(() => {
        const newInput = document.querySelector(`input[data-item-id="${newItem.id}"]`);
        if (newInput) {
            newInput.focus();
        }
    }, 100);
}

/**
 * Eliminar item del checklist
 */
function removeChecklistItem(itemId) {
    console.log(`🗑️ CHECKLIST EDITOR: Eliminando item ${itemId}...`);
    
    if (confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
        checklistEditorState.items = checklistEditorState.items.filter(item => item.id !== itemId);
        checklistEditorState.unsavedChanges = true;
        
        renderChecklistItems();
        updateProgress();
    }
}

/**
 * Actualizar item del checklist
 */
function updateChecklistItem(itemId, field, value) {
    const item = checklistEditorState.items.find(item => item.id === itemId);
    
    if (item) {
        item[field] = value;
        checklistEditorState.unsavedChanges = true;
        
        if (field === 'completed') {
            updateProgress();
        }
        
        console.log(`📝 CHECKLIST EDITOR: Item ${itemId} actualizado: ${field} = ${value}`);
    }
}

/**
 * Renderizar items del checklist
 */
function renderChecklistItems() {
    const itemsList = document.getElementById('checklist-items-list');
    
    if (!itemsList) return;
    
    if (checklistEditorState.items.length === 0) {
        itemsList.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i data-lucide="clipboard" class="h-12 w-12 mx-auto mb-4 text-gray-300"></i>
                <p class="text-lg font-medium mb-2">No hay elementos en el checklist</p>
                <p>Haz clic en "Agregar Elemento" para comenzar</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    checklistEditorState.items.forEach((item, index) => {
        html += `
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" data-item-id="${item.id}">
                <div class="flex items-start space-x-4">
                    <!-- Checkbox -->
                    <div class="flex items-center pt-2">
                        <input 
                            type="checkbox" 
                            ${item.completed ? 'checked' : ''} 
                            class="w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-purple-500" 
                            onchange="updateChecklistItem('${item.id}', 'completed', this.checked)"
                        >
                    </div>
                    
                    <!-- Contenido principal -->
                    <div class="flex-1 min-w-0">
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <!-- Descripción -->
                            <div class="lg:col-span-7">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Descripción del elemento</label>
                                <input 
                                    type="text" 
                                    value="${item.item_description}" 
                                    placeholder="Ej: Verificar funcionamiento de motor..."
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                                    data-item-id="${item.id}"
                                    onchange="updateChecklistItem('${item.id}', 'item_description', this.value)"
                                >
                            </div>
                            
                            <!-- Obligatorio -->
                            <div class="lg:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                                <div class="flex flex-col space-y-1">
                                    <label class="flex items-center cursor-pointer text-sm">
                                        <input 
                                            type="radio" 
                                            name="required_${item.id}" 
                                            value="true" 
                                            ${item.is_required ? 'checked' : ''} 
                                            class="text-red-600 focus:ring-red-500"
                                            onchange="updateChecklistItem('${item.id}', 'is_required', true)"
                                        >
                                        <span class="ml-2 text-red-600 font-medium">Obligatorio</span>
                                    </label>
                                    <label class="flex items-center cursor-pointer text-sm">
                                        <input 
                                            type="radio" 
                                            name="required_${item.id}" 
                                            value="false" 
                                            ${!item.is_required ? 'checked' : ''} 
                                            class="text-gray-600 focus:ring-gray-500"
                                            onchange="updateChecklistItem('${item.id}', 'is_required', false)"
                                        >
                                        <span class="ml-2 text-gray-600">Opcional</span>
                                    </label>
                                </div>
                            </div>
                            
                            <!-- Orden -->
                            <div class="lg:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                                <input 
                                    type="number" 
                                    value="${item.sort_order}" 
                                    min="1" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 text-center"
                                    onchange="updateChecklistItem('${item.id}', 'sort_order', parseInt(this.value))"
                                >
                            </div>
                            
                            <!-- Acciones -->
                            <div class="lg:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Acciones</label>
                                <div class="flex space-x-1">
                                    <button 
                                        type="button" 
                                        onclick="moveItemUp('${item.id}')" 
                                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                                        title="Subir"
                                        ${index === 0 ? 'disabled' : ''}
                                    >
                                        <i data-lucide="arrow-up" class="h-4 w-4"></i>
                                    </button>
                                    <button 
                                        type="button" 
                                        onclick="moveItemDown('${item.id}')" 
                                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                                        title="Bajar"
                                        ${index === checklistEditorState.items.length - 1 ? 'disabled' : ''}
                                    >
                                        <i data-lucide="arrow-down" class="h-4 w-4"></i>
                                    </button>
                                    <button 
                                        type="button" 
                                        onclick="removeChecklistItem('${item.id}')" 
                                        class="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" 
                                        title="Eliminar"
                                    >
                                        <i data-lucide="trash-2" class="h-4 w-4"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Notas -->
                        <div class="mt-4">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Notas adicionales</label>
                            <textarea 
                                placeholder="Notas adicionales para este elemento (opcional)..."
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 resize-none"
                                rows="2"
                                onchange="updateChecklistItem('${item.id}', 'notes', this.value)"
                            >${item.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    itemsList.innerHTML = html;
    
    // Re-inicializar iconos de Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * Mover item hacia arriba
 */
function moveItemUp(itemId) {
    const currentIndex = checklistEditorState.items.findIndex(item => item.id === itemId);
    
    if (currentIndex > 0) {
        const items = [...checklistEditorState.items];
        [items[currentIndex - 1], items[currentIndex]] = [items[currentIndex], items[currentIndex - 1]];
        
        // Actualizar sort_order
        items.forEach((item, index) => {
            item.sort_order = index + 1;
        });
        
        checklistEditorState.items = items;
        checklistEditorState.unsavedChanges = true;
        
        renderChecklistItems();
    }
}

/**
 * Mover item hacia abajo
 */
function moveItemDown(itemId) {
    const currentIndex = checklistEditorState.items.findIndex(item => item.id === itemId);
    
    if (currentIndex < checklistEditorState.items.length - 1) {
        const items = [...checklistEditorState.items];
        [items[currentIndex], items[currentIndex + 1]] = [items[currentIndex + 1], items[currentIndex]];
        
        // Actualizar sort_order
        items.forEach((item, index) => {
            item.sort_order = index + 1;
        });
        
        checklistEditorState.items = items;
        checklistEditorState.unsavedChanges = true;
        
        renderChecklistItems();
    }
}

/**
 * Actualizar progreso del checklist
 */
function updateProgress() {
    const completed = checklistEditorState.items.filter(item => item.completed).length;
    const total = checklistEditorState.items.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    const completedSpan = document.getElementById('progress-completed');
    const totalSpan = document.getElementById('progress-total');
    const progressBar = document.getElementById('progress-bar');
    
    if (completedSpan) completedSpan.textContent = completed;
    if (totalSpan) totalSpan.textContent = total;
    if (progressBar) progressBar.style.width = `${percentage}%`;
}

/**
 * Guardar template
 */
async function saveTemplate() {
    const templateNameInput = document.getElementById('template-name-input');
    
    if (!templateNameInput || !templateNameInput.value.trim()) {
        alert('Por favor ingrese un nombre para el template');
        templateNameInput?.focus();
        return;
    }
    
    // Validar que haya al menos un elemento
    if (checklistEditorState.items.length === 0) {
        alert('Debe agregar al menos un elemento al checklist');
        return;
    }
    
    // Validar que todos los elementos tengan descripción
    const emptyItems = checklistEditorState.items.filter(item => !item.item_description.trim());
    if (emptyItems.length > 0) {
        alert('Todos los elementos deben tener una descripción');
        return;
    }
    
    try {
        console.log('💾 CHECKLIST EDITOR: Guardando template...');
        
        const templateData = {
            template_name: templateNameInput.value.trim(),
            items: checklistEditorState.items.map(item => ({
                item_description: item.item_description,
                is_required: item.is_required,
                sort_order: item.sort_order
            }))
        };
        
        const url = checklistEditorState.currentTemplate 
            ? `${API_URL}/gimnacion/checklist-templates/${checklistEditorState.currentTemplate.id}`
            : `${API_URL}/gimnacion/checklist-templates`;
        
        const method = checklistEditorState.currentTemplate ? 'PUT' : 'POST';
        
        const response = await authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar template');
        }
        
        const result = await response.json();
        console.log('✅ CHECKLIST EDITOR: Template guardado exitosamente:', result);
        
        // Actualizar estado
        checklistEditorState.unsavedChanges = false;
        
        // Refrescar templates disponibles
        await fetchChecklistTemplates();
        
        alert('Template guardado exitosamente');
        
    } catch (error) {
        console.error('❌ CHECKLIST EDITOR: Error guardando template:', error);
        alert(`Error al guardar template: ${error.message}`);
    }
}

/**
 * Cancelar edición de template
 */
function cancelTemplateEdit() {
    if (checklistEditorState.unsavedChanges) {
        if (!confirm('Hay cambios sin guardar. ¿Estás seguro de que deseas cancelar?')) {
            return;
        }
    }
    
    hideTemplateEditor();
    
    // Limpiar selector
    const templateSelect = document.getElementById('checklist-template-select');
    if (templateSelect) {
        templateSelect.value = '';
    }
}

/**
 * Obtener datos del checklist para envío
 */
function getChecklistData() {
    return checklistEditorState.items.map(item => ({
        item_id: item.id.toString().startsWith('temp_') ? null : item.id,
        item_description: item.item_description,
        is_required: item.is_required,
        completed: item.completed,
        notes: item.notes || '',
        sort_order: item.sort_order,
        completed_at: item.completed ? new Date().toISOString() : null
    }));
}

// Exportar funciones para uso global
window.checklistEditor = {
    init: initChecklistEditor,
    createNew: createNewTemplate,
    save: saveTemplate,
    cancel: cancelTemplateEdit,
    addItem: addChecklistItem,
    removeItem: removeChecklistItem,
    updateItem: updateChecklistItem,
    moveUp: moveItemUp,
    moveDown: moveItemDown,
    getData: getChecklistData,
    state: checklistEditorState
};

console.log('✅ CHECKLIST EDITOR: Módulo cargado correctamente');