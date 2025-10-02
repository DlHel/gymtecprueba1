/**
 * Editor de Checklist para Tickets de Gimnación
 * Sistema simplificado para mostrar templates de checklist
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
    console.log(' CHECKLIST EDITOR: Inicializando editor...');
    
    const templateSelect = document.getElementById('checklist-template-select');
    
    if (templateSelect) {
        templateSelect.addEventListener('change', onTemplateSelectChange);
        console.log(' CHECKLIST EDITOR: Event listener configurado para selector');
    } else {
        console.warn(' CHECKLIST EDITOR: Selector checklist-template-select no encontrado');
    }
    
    console.log(' CHECKLIST EDITOR: Editor inicializado correctamente');
}

/**
 * Cambio en selector de template
 */
async function onTemplateSelectChange(event) {
    const templateId = event.target.value;
    
    console.log(' CHECKLIST EDITOR: onTemplateSelectChange disparado con templateId:', templateId);
    
    if (!templateId) {
        console.log(' CHECKLIST EDITOR: Sin template seleccionado, ocultando preview');
        hideChecklistPreview();
        return;
    }
    
    try {
        console.log(' CHECKLIST EDITOR: Cargando template...');
        
        // Verificar que tenemos acceso a las funciones globales
        if (!window.ticketsState) {
            console.error(' CHECKLIST EDITOR: window.ticketsState no disponible');
            alert('Error: Estado de tickets no disponible');
            return;
        }
        
        if (!window.fetchTemplateItems) {
            console.error(' CHECKLIST EDITOR: window.fetchTemplateItems no disponible');
            alert('Error: Función fetchTemplateItems no disponible');
            return;
        }
        
        console.log(' CHECKLIST EDITOR: Funciones globales disponibles');
        
        // Usar funciones globales y estado de tickets.js
        const template = window.ticketsState?.gimnacion?.checklistTemplates?.find(t => t.id == templateId);
        
        if (!template) {
            console.error(' CHECKLIST EDITOR: Template no encontrado en estado');
            alert('Error: Template no encontrado');
            return;
        }
        
        console.log(' CHECKLIST EDITOR: Cargando items del template...');
        const templateItems = await window.fetchTemplateItems(templateId);
        console.log(' CHECKLIST EDITOR: Items cargados:', templateItems);
        
        checklistEditorState.currentTemplate = template;
        checklistEditorState.items = templateItems.map(item => ({
            id: item.id,
            item_description: item.item_description,
            sort_order: item.sort_order,
            is_required: item.is_required,
            category: item.category || 'general',
            completed: false,
            notes: ''
        }));
        
        // Mostrar vista previa del checklist
        showChecklistPreview();
        
        console.log(' CHECKLIST EDITOR: Template cargado con', checklistEditorState.items.length, 'items');
        
    } catch (error) {
        console.error(' CHECKLIST EDITOR: Error cargando template:', error);
        alert('Error al cargar el template seleccionado: ' + error.message);
    }
}

/**
 * Mostrar vista previa del checklist
 */
function showChecklistPreview() {
    console.log(' CHECKLIST EDITOR: Mostrando vista previa');
    
    const previewContainer = document.getElementById('checklist-preview-container');
    const preview = document.getElementById('checklist-preview');
    
    if (!preview) {
        console.warn(' CHECKLIST EDITOR: Elemento checklist-preview no encontrado');
        return;
    }
    
    if (checklistEditorState.items.length === 0) {
        hideChecklistPreview();
        return;
    }
    
    // Mostrar contenedor
    if (previewContainer) {
        previewContainer.classList.remove('hidden');
    }
    
    // Generar vista previa
    let html = '';
    checklistEditorState.items.forEach((item) => {
        const isRequired = item.is_required ? '<span class="text-red-500 font-bold">*</span>' : '';
        const category = item.category ? '<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">' + item.category + '</span>' : '';
        
        html += '<div class="flex items-start space-x-3 p-3 border-b border-gray-100 hover:bg-gray-50">';
        html += '<div class="flex items-center pt-1"><input type="checkbox" class="w-4 h-4 text-blue-600" disabled></div>';
        html += '<div class="flex-1">';
        html += '<div class="flex items-start justify-between">';
        html += '<span class="text-sm text-gray-900">' + (item.item_description || 'Sin descripción') + '</span>';
        html += '<div class="flex items-center space-x-2 ml-4">' + category + isRequired + '</div>';
        html += '</div></div></div>';
    });
    
    preview.innerHTML = html || '<p class="text-gray-500 p-4">No hay elementos en este checklist</p>';
    console.log(' CHECKLIST EDITOR: Vista previa actualizada con', checklistEditorState.items.length, 'items');
}

/**
 * Ocultar vista previa del checklist
 */
function hideChecklistPreview() {
    console.log(' CHECKLIST EDITOR: Ocultando vista previa');
    
    const previewContainer = document.getElementById('checklist-preview-container');
    const preview = document.getElementById('checklist-preview');
    
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
    
    if (preview) {
        preview.innerHTML = '';
    }
    
    checklistEditorState.currentTemplate = null;
    checklistEditorState.items = [];
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initChecklistEditor();
    }, 100);
});

// Exportar funciones para uso global
window.checklistEditor = {
    init: initChecklistEditor,
    getData: getChecklistData,
    state: checklistEditorState,
    showPreview: showChecklistPreview,
    hidePreview: hideChecklistPreview
};

console.log(' CHECKLIST EDITOR: Módulo cargado correctamente');
